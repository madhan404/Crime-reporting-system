import express from 'express';
import { body, validationResult } from 'express-validator';
import Complaint from '../models/Complaint.js';
import { authenticate, authorize } from '../middleware/auth.js';
import upload, { handleMulterError } from '../middleware/upload.js';

const router = express.Router();

// Upload evidence files for a case
router.post('/upload/:caseId', authenticate, upload.array('evidenceFiles', 10), [
  body('description').optional().isString().withMessage('Description must be a string'),
  body('evidenceType').isIn(['Photo', 'Video', 'Document', 'Audio', 'Other']).withMessage('Invalid evidence type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const caseId = req.params.caseId;
    const { description, evidenceType } = req.body;

    const caseData = await Complaint.findById(caseId);
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Check permissions
    if (req.user.role === 'citizen' && caseData.userId.toString() !== req.user._id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Process uploaded files
    const evidenceFiles = req.files?.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path.replace('server/', ''),
      description: description || '',
      evidenceType: evidenceType || 'Other',
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    })) || [];

    // Add evidence to case
    caseData.evidenceFiles.push(...evidenceFiles);
    caseData.updatedAt = new Date();

    await caseData.save();

    res.json({ 
      message: 'Evidence uploaded successfully', 
      evidenceFiles,
      case: caseData 
    });
  } catch (error) {
    console.error('Error uploading evidence:', error);
    res.status(500).json({ error: 'Failed to upload evidence' });
  }
});

// Get evidence for a case
router.get('/:caseId', authenticate, async (req, res) => {
  try {
    const caseId = req.params.caseId;

    const caseData = await Complaint.findById(caseId)
      .select('evidenceFiles userId')
      .populate('evidenceFiles.uploadedBy', 'name email');

    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Check permissions
    if (req.user.role === 'citizen' && caseData.userId.toString() !== req.user._id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(caseData.evidenceFiles);
  } catch (error) {
    console.error('Error fetching evidence:', error);
    res.status(500).json({ error: 'Failed to fetch evidence' });
  }
});

// Delete evidence file
router.delete('/:caseId/:evidenceId', authenticate, async (req, res) => {
  try {
    const { caseId, evidenceId } = req.params;

    const caseData = await Complaint.findById(caseId);
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Check permissions
    if (req.user.role === 'citizen' && caseData.userId.toString() !== req.user._id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Find and remove evidence
    const evidenceIndex = caseData.evidenceFiles.findIndex(
      evidence => evidence._id.toString() === evidenceId
    );

    if (evidenceIndex === -1) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    caseData.evidenceFiles.splice(evidenceIndex, 1);
    caseData.updatedAt = new Date();

    await caseData.save();

    res.json({ message: 'Evidence deleted successfully' });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    res.status(500).json({ error: 'Failed to delete evidence' });
  }
});

// Update evidence metadata
router.put('/:caseId/:evidenceId', authenticate, [
  body('description').optional().isString().withMessage('Description must be a string'),
  body('evidenceType').optional().isIn(['Photo', 'Video', 'Document', 'Audio', 'Other']).withMessage('Invalid evidence type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { caseId, evidenceId } = req.params;
    const { description, evidenceType } = req.body;

    const caseData = await Complaint.findById(caseId);
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Check permissions
    if (req.user.role === 'citizen' && caseData.userId.toString() !== req.user._id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Find and update evidence
    const evidence = caseData.evidenceFiles.find(
      evidence => evidence._id.toString() === evidenceId
    );

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    if (description) evidence.description = description;
    if (evidenceType) evidence.evidenceType = evidenceType;
    evidence.updatedAt = new Date();

    caseData.updatedAt = new Date();
    await caseData.save();

    res.json({ message: 'Evidence updated successfully', evidence });
  } catch (error) {
    console.error('Error updating evidence:', error);
    res.status(500).json({ error: 'Failed to update evidence' });
  }
});

export default router;
