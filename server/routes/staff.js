import express from 'express';
import { body, validationResult, query } from 'express-validator';
import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all staff members (Admin only)
router.get('/', authenticate, authorize('admin'), [
  query('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
  query('department').optional().isString().withMessage('Invalid department')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const filter = { role: 'staff' };
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.department) {
      filter.department = { $regex: req.query.department, $options: 'i' };
    }

    const staff = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    // Get case counts for each staff member
    const staffWithCounts = await Promise.all(
      staff.map(async (member) => {
        const assignedCases = await Complaint.countDocuments({ 
          assignedStaff: member._id,
          status: { $nin: ['Completed', 'Closed'] }
        });
        
        const totalCases = await Complaint.countDocuments({ 
          assignedStaff: member._id 
        });

        return {
          ...member.toJSON(),
          caseStats: {
            assigned: assignedCases,
            total: totalCases
          }
        };
      })
    );

    res.json({
      staff: staffWithCounts,
      total: staff.length
    });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff members' });
  }
});

// Add new staff member (Admin only)
router.post('/add', authenticate, authorize('admin'), [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('mobile').matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Valid mobile number required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.pincode').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, email, password, mobile, department, address } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const staff = new User({
      name,
      email,
      password,
      mobile,
      role: 'staff',
      department,
      address: address || {}
    });

    await staff.save();

    res.status(201).json({
      message: 'Staff member added successfully',
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        staffId: staff.staffId,
        department: staff.department,
        status: staff.status
      }
    });
  } catch (error) {
    console.error('Add staff error:', error);
    res.status(500).json({ error: 'Failed to add staff member' });
  }
});

// Update staff member (Admin only)
router.put('/:staffId', authenticate, authorize('admin'), [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('mobile').optional().matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Valid mobile number required'),
  body('department').optional().trim().notEmpty().withMessage('Department cannot be empty'),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { staffId } = req.params;
    const updates = req.body;

    // Remove password from updates (should be handled separately)
    delete updates.password;
    delete updates.role; // Prevent role changes

    const staff = await User.findByIdAndUpdate(
      staffId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    if (staff.role !== 'staff') {
      return res.status(400).json({ error: 'Invalid staff member' });
    }

    res.json({
      message: 'Staff member updated successfully',
      staff
    });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});

// Get staff dashboard stats
router.get('/dashboard-stats', authenticate, authorize('staff'), async (req, res) => {
  try {
    const staffId = req.user._id;

    // Get case statistics
    const [
      totalAssigned,
      pendingCases,
      inProgress,
      completedCases
    ] = await Promise.all([
      Complaint.countDocuments({ assignedStaff: staffId }),
      Complaint.countDocuments({ 
        assignedStaff: staffId, 
        status: { $in: ['Assigned', 'Filed'] }
      }),
      Complaint.countDocuments({ 
        assignedStaff: staffId, 
        status: { $in: ['Under Investigation', 'Evidence Collected', 'Suspect Identified'] }
      }),
      Complaint.countDocuments({ 
        assignedStaff: staffId, 
        status: { $in: ['Completed', 'Closed'] }
      })
    ]);

    // Get recent cases
    const recentCases = await Complaint.find({ assignedStaff: staffId })
      .select('caseId title status priority createdAt')
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('userId', 'name');

    // Get priority breakdown
    const priorityStats = await Complaint.aggregate([
      { $match: { assignedStaff: staffId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    res.json({
      stats: {
        totalAssigned,
        pendingCases,
        inProgress,
        completedCases
      },
      recentCases,
      priorityStats: priorityStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Staff dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get staff profile
router.get('/profile', authenticate, authorize('staff'), async (req, res) => {
  try {
    const staff = await User.findById(req.user._id)
      .select('-password')
      .lean();

    if (!staff || staff.role !== 'staff') {
      return res.status(404).json({ error: 'Staff profile not found' });
    }

    res.json({ staff });
  } catch (error) {
    console.error('Get staff profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Delete/Deactivate staff member (Admin only)
router.delete('/:staffId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { staffId } = req.params;

    const staff = await User.findById(staffId);
    if (!staff || staff.role !== 'staff') {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Check if staff has active cases
    const activeCases = await Complaint.countDocuments({ 
      assignedStaff: staffId,
      status: { $nin: ['Completed', 'Closed'] }
    });

    if (activeCases > 0) {
      return res.status(400).json({ 
        error: `Cannot delete staff member with ${activeCases} active cases. Please reassign cases first.` 
      });
    }

    // Soft delete by setting status to inactive
    staff.status = 'inactive';
    await staff.save();

    res.json({
      message: 'Staff member deactivated successfully'
    });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Failed to delete staff member' });
  }
});

export default router;