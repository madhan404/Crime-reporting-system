import express from 'express';
import { body, validationResult, query } from 'express-validator';
import path from 'path';
import Investigation from '../models/Investigation.js';
import Complaint from '../models/Complaint.js';
import { authenticate, authorize } from '../middleware/auth.js';
import upload, { handleMulterError } from '../middleware/upload.js';

const router = express.Router();

// Add investigation log
router.post('/', authenticate, authorize('staff', 'admin'), upload.array('attachments', 3), [
  body('caseId').trim().notEmpty().withMessage('Case ID is required'),
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('notes').trim().isLength({ min: 10, max: 2000 }).withMessage('Notes must be 10-2000 characters'),
  body('investigationType').isIn(['Initial Assessment', 'Evidence Collection', 'Witness Interview', 'Scene Investigation', 'Suspect Investigation', 'Follow-up', 'Final Report']).withMessage('Invalid investigation type'),
  body('hoursSpent').optional().isNumeric().withMessage('Hours spent must be a number'),
  body('statusUpdate').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) {
      return true; // Allow empty values
    }
    const validStatuses = ['Filed', 'Assigned', 'Under Investigation', 'Evidence Collected', 'Suspect Identified', 'Report Submitted', 'Completed', 'Closed'];
    return validStatuses.includes(value);
  }).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Investigation validation errors:', errors.array());
      console.error('Request body:', req.body);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { 
      caseId, 
      title, 
      notes, 
      investigationType, 
      hoursSpent = 0, 
      statusUpdate: rawStatusUpdate,
      mapMarkers = [],
      witnesses = [],
      suspects = [],
      nextActions = []
    } = req.body;

    // Convert empty string to undefined for statusUpdate
    const statusUpdate = rawStatusUpdate === '' ? undefined : rawStatusUpdate;

    // Verify complaint exists and user has access
    const complaint = await Complaint.findOne({ caseId });
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Check permissions
    const isAssignedStaff = complaint.assignedStaff && complaint.assignedStaff.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAssignedStaff && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to add investigations for this case' });
    }

    // Process uploaded attachments - store as binary data
    const attachments = req.files?.map(file => {
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
        data: file.buffer, // Store file data as binary
        description: req.body[`description_${file.fieldname}`] || ''
      };
    }) || [];

    // Parse JSON fields if they're strings
    let parsedMapMarkers = [];
    let parsedWitnesses = [];
    let parsedSuspects = [];
    let parsedNextActions = [];

    try {
      if (typeof mapMarkers === 'string') {
        parsedMapMarkers = JSON.parse(mapMarkers);
      } else if (Array.isArray(mapMarkers)) {
        parsedMapMarkers = mapMarkers;
      }

      if (typeof witnesses === 'string') {
        parsedWitnesses = JSON.parse(witnesses);
      } else if (Array.isArray(witnesses)) {
        parsedWitnesses = witnesses;
      }

      if (typeof suspects === 'string') {
        parsedSuspects = JSON.parse(suspects);
      } else if (Array.isArray(suspects)) {
        parsedSuspects = suspects;
      }

      if (typeof nextActions === 'string') {
        parsedNextActions = JSON.parse(nextActions);
      } else if (Array.isArray(nextActions)) {
        parsedNextActions = nextActions;
      }
    } catch (parseError) {
      console.warn('JSON parsing error:', parseError);
    }

    const investigation = new Investigation({
      caseId,
      staffId: req.user._id,
      title,
      notes,
      investigationType,
      hoursSpent: parseFloat(hoursSpent),
      statusUpdate,
      mapMarkers: parsedMapMarkers,
      attachments,
      witnesses: parsedWitnesses,
      suspects: parsedSuspects,
      nextActions: parsedNextActions
    });

    await investigation.save();

    // Update complaint status if provided
    if (statusUpdate && statusUpdate !== complaint.status) {
      complaint.status = statusUpdate;
      complaint.statusHistory.push({
        status: statusUpdate,
        date: new Date(),
        updatedBy: req.user._id,
        notes: `Investigation update: ${title}`
      });
      await complaint.save();
    }

    await investigation.populate('staffId', 'name staffId');

    res.status(201).json({
      message: 'Investigation log added successfully',
      investigation
    });
  } catch (error) {
    console.error('Add investigation error:', error);
    res.status(500).json({ error: 'Failed to add investigation log' });
  }
}, handleMulterError);

// Get investigations for a case
router.get('/case/:caseId', authenticate, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Verify access to the case
    const complaint = await Complaint.findOne({ caseId });
    if (!complaint) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Check permissions
    const isOwner = complaint.userId.toString() === req.user._id.toString();
    const isAssignedStaff = complaint.assignedStaff && complaint.assignedStaff.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAssignedStaff && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const investigations = await Investigation.find({ caseId })
      .populate('staffId', 'name staffId department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Investigation.countDocuments({ caseId });

    res.json({
      investigations,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get investigations error:', error);
    res.status(500).json({ error: 'Failed to fetch investigations' });
  }
});

// Get investigation details
router.get('/:investigationId', authenticate, async (req, res) => {
  try {
    const { investigationId } = req.params;

    const investigation = await Investigation.findById(investigationId)
      .populate('staffId', 'name staffId department');

    if (!investigation) {
      return res.status(404).json({ error: 'Investigation not found' });
    }

    // Verify access permissions
    const complaint = await Complaint.findOne({ caseId: investigation.caseId });
    if (!complaint) {
      return res.status(404).json({ error: 'Related case not found' });
    }

    const isOwner = complaint.userId.toString() === req.user._id.toString();
    const isAssignedStaff = complaint.assignedStaff && complaint.assignedStaff.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAssignedStaff && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ investigation });
  } catch (error) {
    console.error('Get investigation error:', error);
    res.status(500).json({ error: 'Failed to fetch investigation' });
  }
});

// Get staff investigations
router.get('/staff/my-investigations', authenticate, authorize('staff'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
  query('type').optional().isIn(['Initial Assessment', 'Evidence Collection', 'Witness Interview', 'Scene Investigation', 'Suspect Investigation', 'Follow-up', 'Final Report']).withMessage('Invalid investigation type')
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

    const filter = { staffId: req.user._id };
    if (req.query.type) {
      filter.investigationType = req.query.type;
    }

    const investigations = await Investigation.find(filter)
      .select('caseId title investigationType hoursSpent statusUpdate createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Investigation.countDocuments(filter);

    // Get related case information
    const investigationsWithCases = await Promise.all(
      investigations.map(async (inv) => {
        const complaint = await Complaint.findOne({ caseId: inv.caseId })
          .select('title crimeType priority status')
          .populate('userId', 'name');

        return {
          ...inv.toJSON(),
          complaint: complaint || null
        };
      })
    );

    res.json({
      investigations: investigationsWithCases,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get staff investigations error:', error);
    res.status(500).json({ error: 'Failed to fetch investigations' });
  }
});

// Update investigation
router.put('/:investigationId', authenticate, authorize('staff', 'admin'), [
  body('title').optional().trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('notes').optional().trim().isLength({ min: 10, max: 2000 }).withMessage('Notes must be 10-2000 characters'),
  body('hoursSpent').optional().isFloat({ min: 0 }).withMessage('Hours spent must be positive')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { investigationId } = req.params;
    const updates = req.body;

    const investigation = await Investigation.findById(investigationId);
    if (!investigation) {
      return res.status(404).json({ error: 'Investigation not found' });
    }

    // Check permissions
    const isOwner = investigation.staffId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to update this investigation' });
    }

    const updatedInvestigation = await Investigation.findByIdAndUpdate(
      investigationId,
      updates,
      { new: true, runValidators: true }
    ).populate('staffId', 'name staffId department');

    res.json({
      message: 'Investigation updated successfully',
      investigation: updatedInvestigation
    });
  } catch (error) {
    console.error('Update investigation error:', error);
    res.status(500).json({ error: 'Failed to update investigation' });
  }
});

// Delete investigation
router.delete('/:investigationId', authenticate, authorize('staff', 'admin'), async (req, res) => {
  try {
    const { investigationId } = req.params;

    const investigation = await Investigation.findById(investigationId);
    if (!investigation) {
      return res.status(404).json({ error: 'Investigation not found' });
    }

    // Check permissions
    const isOwner = investigation.staffId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this investigation' });
    }

    await Investigation.findByIdAndDelete(investigationId);

    res.json({
      message: 'Investigation deleted successfully'
    });
  } catch (error) {
    console.error('Delete investigation error:', error);
    res.status(500).json({ error: 'Failed to delete investigation' });
  }
});

// Serve investigation attachments from database
router.get('/:investigationId/attachments/:filename', authenticate, async (req, res) => {
  try {
    const { investigationId, filename } = req.params;
    
    // Find the investigation and verify the file exists
    const investigation = await Investigation.findById(investigationId);
    if (!investigation) {
      return res.status(404).json({ error: 'Investigation not found' });
    }
    
    // Check if the file exists in the investigation's attachments
    const attachment = investigation.attachments?.find(file => file.filename === filename);
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    // Check if file data exists
    if (!attachment.data) {
      return res.status(404).json({ error: 'File data not found' });
    }
    
    // Verify access permissions
    const complaint = await Complaint.findOne({ caseId: investigation.caseId });
    if (!complaint) {
      return res.status(404).json({ error: 'Related case not found' });
    }
    
    const isOwner = complaint.userId.toString() === req.user._id.toString();
    const isAssignedStaff = complaint.assignedStaff && complaint.assignedStaff.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isInvestigationStaff = investigation.staffId.toString() === req.user._id.toString();
    
    if (!isOwner && !isAssignedStaff && !isAdmin && !isInvestigationStaff) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', attachment.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${attachment.originalName || filename}"`);
    res.setHeader('Content-Length', attachment.size);
    
    // Send the file data directly from database
    res.send(attachment.data);
    
  } catch (error) {
    console.error('Serve investigation attachment error:', error);
    res.status(500).json({ error: 'Failed to serve investigation attachment' });
  }
});

export default router;