import express from 'express';
import { body, validationResult, query } from 'express-validator';
import path from 'path';
import fs from 'fs';
import Complaint from '../models/Complaint.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import upload, { handleMulterError } from '../middleware/upload.js';

const router = express.Router();

// File a new complaint
router.post('/file', authenticate, upload.array('evidenceFiles', 5), [
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('description').trim().isLength({ min: 20, max: 2000 }).withMessage('Description must be 20-2000 characters'),
  body('crimeType').isIn(['Theft/Robbery', 'Assault', 'Fraud', 'Cybercrime', 'Domestic Violence', 'Drug Related', 'Property Crime', 'Traffic Violation', 'Missing Person', 'Other']).withMessage('Invalid crime type'),
  body('location.latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('location.longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('location.address').trim().notEmpty().withMessage('Address is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { title, description, crimeType, isAnonymous = false, priority = 'Medium' } = req.body;
    
    // Handle nested location data from FormData
    const location = {
      latitude: req.body['location.latitude'],
      longitude: req.body['location.longitude'],
      address: req.body['location.address']
    };

    // Process uploaded files - store as binary data
    const evidenceFiles = req.files?.map(file => {
      // Generate unique filename since we're not using disk storage
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, extension);
      const filename = `${baseName}-${uniqueSuffix}${extension}`;
      
      return {
        filename: filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        data: file.buffer // Store file data as binary
      };
    }) || [];

    const complaint = new Complaint({
      userId: req.user._id,
      title,
      description,
      crimeType,
      location: {
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
        address: location.address
      },
      evidenceFiles,
      isAnonymous,
      priority
    });

    await complaint.save();
    await complaint.populate('userId', 'name email mobile');

    res.status(201).json({
      message: 'Complaint filed successfully',
      complaint: {
        id: complaint._id,
        caseId: complaint.caseId,
        title: complaint.title,
        status: complaint.status,
        priority: complaint.priority,
        createdAt: complaint.createdAt
      }
    });
  } catch (error) {
    console.error('File complaint error:', error);
    res.status(500).json({ error: 'Failed to file complaint' });
  }
}, handleMulterError);

// Get user's complaints
router.get('/my-complaints', authenticate, authorize('user'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('status').optional().isIn(['Filed', 'Assigned', 'Under Investigation', 'Evidence Collected', 'Suspect Identified', 'Report Submitted', 'Completed', 'Closed', 'Rejected']).withMessage('Invalid status')
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

    const filter = { userId: req.user._id };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const complaints = await Complaint.find(filter)
      .select('caseId title status priority crimeType createdAt statusHistory assignedStaff')
      .populate('assignedStaff', 'name staffId department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Complaint.countDocuments(filter);

    res.json({
      complaints,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get user complaints error:', error);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// Get single complaint details
router.get('/:caseId', authenticate, async (req, res) => {
  try {
    const { caseId } = req.params;

    const complaint = await Complaint.findOne({ caseId })
      .populate('userId', 'name email mobile')
      .populate('assignedStaff', 'name staffId department')
      .populate('statusHistory.updatedBy', 'name');

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Check access permissions
    const isOwner = complaint.userId._id.toString() === req.user._id.toString();
    const isAssignedStaff = complaint.assignedStaff && complaint.assignedStaff._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAssignedStaff && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ complaint });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ error: 'Failed to fetch complaint' });
  }
});

// Get all complaints (Admin/Staff)
router.get('/', authenticate, authorize('admin', 'staff'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('status').optional().isIn(['Filed', 'Assigned', 'Under Investigation', 'Evidence Collected', 'Suspect Identified', 'Report Submitted', 'Completed', 'Closed', 'Rejected']).withMessage('Invalid status'),
  query('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Invalid priority'),
  query('crimeType').optional().isString().withMessage('Invalid crime type')
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

    const filter = {};

    // Staff can only see assigned complaints
    if (req.user.role === 'staff') {
      filter.assignedStaff = req.user._id;
    }

    // Apply filters
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.crimeType) filter.crimeType = req.query.crimeType;
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { caseId: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const complaints = await Complaint.find(filter)
      .populate('userId', 'name email mobile')
      .populate('assignedStaff', 'name staffId department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Complaint.countDocuments(filter);

    res.json({
      complaints,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// Assign complaint to staff (Admin only)
router.patch('/:caseId/assign', authenticate, authorize('admin'), [
  body('staffId').isMongoId().withMessage('Valid staff ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { caseId } = req.params;
    const { staffId } = req.body;

    const complaint = await Complaint.findOne({ caseId });
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Verify staff exists and is active
    const staff = await User.findById(staffId);
    if (!staff || staff.role !== 'staff' || staff.status !== 'active') {
      return res.status(400).json({ error: 'Invalid or inactive staff member' });
    }

    complaint.assignedStaff = staffId;
    complaint.assignmentDate = new Date();
    complaint.status = 'Assigned';

    complaint.statusHistory.push({
      status: 'Assigned',
      date: new Date(),
      updatedBy: req.user._id,
      notes: `Assigned to ${staff.name} (${staff.staffId})`
    });

    await complaint.save();
    await complaint.populate('assignedStaff', 'name staffId department');

    res.json({
      message: 'Complaint assigned successfully',
      complaint
    });
  } catch (error) {
    console.error('Assign complaint error:', error);
    res.status(500).json({ error: 'Failed to assign complaint' });
  }
});

// Update complaint status (Staff/Admin)
router.patch('/:caseId/status', authenticate, authorize('staff', 'admin'), [
  body('status').isIn(['Filed', 'Assigned', 'Under Investigation', 'Evidence Collected', 'Suspect Identified', 'Report Submitted', 'Completed', 'Closed', 'Rejected']).withMessage('Invalid status'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { caseId } = req.params;
    const { status, notes } = req.body;

    const complaint = await Complaint.findOne({ caseId });
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Check permissions
    const isAssignedStaff = complaint.assignedStaff && complaint.assignedStaff.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAssignedStaff && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to update this complaint' });
    }

    complaint.status = status;
    complaint.statusHistory.push({
      status,
      date: new Date(),
      updatedBy: req.user._id,
      notes
    });

    await complaint.save();

    res.json({
      message: 'Status updated successfully',
      complaint: {
        caseId: complaint.caseId,
        status: complaint.status,
        updatedAt: complaint.updatedAt
      }
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Serve evidence files from database
router.get('/:complaintId/evidence/:filename', authenticate, async (req, res) => {
  try {
    const { complaintId, filename } = req.params;
    
    // Find the complaint and verify the file exists
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    
    // Check if the file exists in the complaint's evidence files
    const evidenceFile = complaint.evidenceFiles?.find(file => file.filename === filename);
    if (!evidenceFile) {
      return res.status(404).json({ error: 'Evidence file not found' });
    }
    
    // Check if file data exists
    if (!evidenceFile.data) {
      return res.status(404).json({ error: 'File data not found' });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', evidenceFile.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${evidenceFile.originalName || filename}"`);
    res.setHeader('Content-Length', evidenceFile.size);
    
    // Send the file data directly from database
    res.send(evidenceFile.data);
    
  } catch (error) {
    console.error('Serve evidence file error:', error);
    res.status(500).json({ error: 'Failed to serve evidence file' });
  }
});

export default router;