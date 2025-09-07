import express from 'express';
import { body, validationResult, query } from 'express-validator';
import Complaint from '../models/Complaint.js';
import Investigation from '../models/Investigation.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all cases with filtering and pagination
router.get('/', authenticate, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['Filed', 'Assigned', 'Under Investigation', 'Evidence Collected', 'Completed', 'Closed']).withMessage('Invalid status'),
  query('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Invalid priority'),
  query('crimeType').optional().isString().withMessage('Crime type must be a string'),
  query('assignedTo').optional().isMongoId().withMessage('Invalid assigned staff ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.crimeType) filter.crimeType = new RegExp(req.query.crimeType, 'i');
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

    // Role-based filtering
    if (req.user.role === 'citizen') {
      filter.userId = req.user._id;
    }

    const cases = await Complaint.find(filter)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email staffId department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Complaint.countDocuments(filter);

    res.json({
      cases,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// Get case by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const caseId = req.params.id;
    
    const caseData = await Complaint.findById(caseId)
      .populate('userId', 'name email phone')
      .populate('assignedTo', 'name email staffId department')
      .populate('investigations', 'status notes createdAt updatedAt');

    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Check access permissions
    if (req.user.role === 'citizen' && caseData.userId._id.toString() !== req.user._id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(caseData);
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({ error: 'Failed to fetch case' });
  }
});

// Update case status
router.put('/:id/status', authenticate, authorize(['staff', 'admin']), [
  body('status').isIn(['Filed', 'Assigned', 'Under Investigation', 'Evidence Collected', 'Completed', 'Closed']).withMessage('Invalid status'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const caseId = req.params.id;
    const { status, notes } = req.body;

    const caseData = await Complaint.findById(caseId);
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Update case status
    caseData.status = status;
    caseData.updatedAt = new Date();

    // Add status update to history
    caseData.statusHistory.push({
      status,
      updatedBy: req.user._id,
      notes: notes || '',
      timestamp: new Date()
    });

    await caseData.save();

    res.json({ message: 'Case status updated successfully', case: caseData });
  } catch (error) {
    console.error('Error updating case status:', error);
    res.status(500).json({ error: 'Failed to update case status' });
  }
});

// Assign case to staff
router.put('/:id/assign', authenticate, authorize(['admin', 'supervisor']), [
  body('assignedTo').isMongoId().withMessage('Invalid staff ID'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const caseId = req.params.id;
    const { assignedTo, notes } = req.body;

    const caseData = await Complaint.findById(caseId);
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Update assignment
    caseData.assignedTo = assignedTo;
    caseData.status = 'Assigned';
    caseData.updatedAt = new Date();

    // Add assignment to history
    caseData.statusHistory.push({
      status: 'Assigned',
      updatedBy: req.user._id,
      notes: notes || `Assigned to staff member`,
      timestamp: new Date()
    });

    await caseData.save();

    res.json({ message: 'Case assigned successfully', case: caseData });
  } catch (error) {
    console.error('Error assigning case:', error);
    res.status(500).json({ error: 'Failed to assign case' });
  }
});

// Get case statistics
router.get('/stats/overview', authenticate, authorize(['admin', 'supervisor', 'staff']), async (req, res) => {
  try {
    const stats = await Complaint.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'Filed'] }, 1, 0] } },
          assigned: { $sum: { $cond: [{ $eq: ['$status', 'Assigned'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'Under Investigation'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } }
        }
      }
    ]);

    const crimeTypeStats = await Complaint.aggregate([
      { $group: { _id: '$crimeType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const priorityStats = await Complaint.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      overview: stats[0] || { total: 0, pending: 0, assigned: 0, inProgress: 0, completed: 0, closed: 0 },
      crimeTypeStats,
      priorityStats
    });
  } catch (error) {
    console.error('Error fetching case statistics:', error);
    res.status(500).json({ error: 'Failed to fetch case statistics' });
  }
});

export default router;
