import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import { authenticate, authorize } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticate, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('mobile').optional().isMobilePhone().withMessage('Valid mobile number required'),
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

    const updates = req.body;
    
    // Remove sensitive fields that shouldn't be updated here
    delete updates.password;
    delete updates.email;
    delete updates.role;
    delete updates.staffId;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get user dashboard stats
router.get('/dashboard-stats', authenticate, authorize('user'), async (req, res) => {
  try {
    const userId = req.user._id;

    const [
      totalComplaints,
      pendingComplaints,
      inProgressComplaints,
      resolvedComplaints
    ] = await Promise.all([
      Complaint.countDocuments({ userId }),
      Complaint.countDocuments({ 
        userId, 
        status: { $in: ['Filed', 'Assigned'] }
      }),
      Complaint.countDocuments({ 
        userId, 
        status: { $in: ['Under Investigation', 'Evidence Collected', 'Suspect Identified'] }
      }),
      Complaint.countDocuments({ 
        userId, 
        status: { $in: ['Completed', 'Closed'] }
      })
    ]);

    // Get recent complaints
    const recentComplaints = await Complaint.find({ userId })
      .select('caseId title status priority createdAt')
      .populate('assignedStaff', 'name staffId')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      stats: {
        totalComplaints,
        pendingComplaints,
        inProgressComplaints,
        resolvedComplaints
      },
      recentComplaints
    });
  } catch (error) {
    console.error('User dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get all users (Admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('-password')
      .sort({ createdAt: -1 });

    // Get complaint counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const complaintCount = await Complaint.countDocuments({ userId: user._id });
        return {
          ...user.toJSON(),
          complaintCount
        };
      })
    );

    res.json({
      users: usersWithStats,
      total: users.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get admin dashboard stats
router.get('/admin-stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [
      totalUsers,
      totalStaff,
      totalComplaints,
      pendingComplaints,
      assignedComplaints,
      resolvedComplaints
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'staff', status: 'active' }),
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'Filed' }),
      Complaint.countDocuments({ 
        status: { $in: ['Assigned', 'Under Investigation', 'Evidence Collected', 'Suspect Identified'] }
      }),
      Complaint.countDocuments({ 
        status: { $in: ['Completed', 'Closed'] }
      })
    ]);

    // Get recent activities
    const recentComplaints = await Complaint.find()
      .select('caseId title status crimeType createdAt')
      .populate('userId', 'name email')
      .populate('assignedStaff', 'name staffId')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get crime type distribution
    const crimeTypeStats = await Complaint.aggregate([
      { $group: { _id: '$crimeType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get status distribution
    const statusStats = await Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      stats: {
        totalUsers,
        totalStaff,
        totalComplaints,
        pendingComplaints,
        assignedComplaints,
        resolvedComplaints
      },
      recentComplaints,
      crimeTypeStats,
      statusStats: statusStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

export default router;