import express from 'express';
import { body, validationResult, query } from 'express-validator';
import Complaint from '../models/Complaint.js';
import Investigation from '../models/Investigation.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Generate case report
router.post('/case-report', authenticate, authorize(['admin', 'supervisor', 'staff']), [
  body('caseId').isMongoId().withMessage('Invalid case ID'),
  body('reportType').isIn(['summary', 'detailed', 'evidence']).withMessage('Invalid report type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { caseId, reportType } = req.body;

    const caseData = await Complaint.findById(caseId)
      .populate('userId', 'name email phone')
      .populate('assignedTo', 'name email staffId department')
      .populate('investigations', 'status notes createdAt updatedAt');

    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    let report = {
      caseId: caseData._id,
      caseNumber: caseData.caseId,
      title: caseData.title,
      status: caseData.status,
      priority: caseData.priority,
      crimeType: caseData.crimeType,
      createdAt: caseData.createdAt,
      updatedAt: caseData.updatedAt,
      complainant: {
        name: caseData.userId?.name || 'Anonymous',
        email: caseData.userId?.email || 'N/A',
        phone: caseData.userId?.phone || 'N/A'
      },
      assignedTo: caseData.assignedTo ? {
        name: caseData.assignedTo.name,
        email: caseData.assignedTo.email,
        staffId: caseData.assignedTo.staffId,
        department: caseData.assignedTo.department
      } : null,
      location: caseData.location,
      description: caseData.description
    };

    if (reportType === 'detailed' || reportType === 'evidence') {
      report.statusHistory = caseData.statusHistory;
      report.investigations = caseData.investigations;
    }

    if (reportType === 'evidence') {
      report.evidenceFiles = caseData.evidenceFiles;
    }

    res.json({
      report,
      generatedAt: new Date(),
      generatedBy: req.user.name
    });
  } catch (error) {
    console.error('Error generating case report:', error);
    res.status(500).json({ error: 'Failed to generate case report' });
  }
});

// Generate statistical report
router.post('/statistical-report', authenticate, authorize(['admin', 'supervisor']), [
  body('startDate').isISO8601().withMessage('Start date must be valid ISO 8601 date'),
  body('endDate').isISO8601().withMessage('End date must be valid ISO 8601 date'),
  body('reportType').isIn(['overview', 'performance', 'trends']).withMessage('Invalid report type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { startDate, endDate, reportType } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);

    let report = {
      period: { startDate: start, endDate: end },
      generatedAt: new Date(),
      generatedBy: req.user.name
    };

    if (reportType === 'overview' || reportType === 'performance') {
      // Basic statistics
      const basicStats = await Complaint.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalCases: { $sum: 1 },
            resolvedCases: { $sum: { $cond: [{ $in: ['$status', ['Completed', 'Closed']] }, 1, 0] } },
            pendingCases: { $sum: { $cond: [{ $eq: ['$status', 'Filed'] }, 1, 0] } },
            inProgressCases: { $sum: { $cond: [{ $eq: ['$status', 'Under Investigation'] }, 1, 0] } }
          }
        }
      ]);

      report.basicStats = basicStats[0] || {
        totalCases: 0,
        resolvedCases: 0,
        pendingCases: 0,
        inProgressCases: 0
      };

      // Crime type distribution
      const crimeTypeStats = await Complaint.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        { $group: { _id: '$crimeType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      report.crimeTypeDistribution = crimeTypeStats;

      // Priority distribution
      const priorityStats = await Complaint.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      report.priorityDistribution = priorityStats;
    }

    if (reportType === 'performance') {
      // Staff performance
      const staffPerformance = await Complaint.aggregate([
        {
          $match: {
            assignedTo: { $exists: true },
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$assignedTo',
            totalCases: { $sum: 1 },
            completedCases: {
              $sum: { $cond: [{ $in: ['$status', ['Completed', 'Closed']] }, 1, 0] }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'staff'
          }
        },
        {
          $unwind: '$staff'
        },
        {
          $project: {
            staffName: '$staff.name',
            totalCases: 1,
            completedCases: 1,
            completionRate: {
              $multiply: [
                { $divide: ['$completedCases', '$totalCases'] },
                100
              ]
            }
          }
        },
        { $sort: { completionRate: -1 } }
      ]);

      report.staffPerformance = staffPerformance;
    }

    if (reportType === 'trends') {
      // Monthly trends
      const monthlyTrends = await Complaint.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      report.monthlyTrends = monthlyTrends;

      // Resolution time trends
      const resolutionTrends = await Complaint.aggregate([
        {
          $match: {
            status: { $in: ['Completed', 'Closed'] },
            completedAt: { $exists: true },
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $project: {
            resolutionTime: {
              $divide: [
                { $subtract: ['$completedAt', '$createdAt'] },
                1000 * 60 * 60 * 24
              ]
            },
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          }
        },
        {
          $group: {
            _id: { year: '$year', month: '$month' },
            avgResolutionTime: { $avg: '$resolutionTime' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      report.resolutionTrends = resolutionTrends;
    }

    res.json(report);
  } catch (error) {
    console.error('Error generating statistical report:', error);
    res.status(500).json({ error: 'Failed to generate statistical report' });
  }
});

// Get available report templates
router.get('/templates', authenticate, authorize(['admin', 'supervisor']), async (req, res) => {
  const templates = [
    {
      id: 'case-summary',
      name: 'Case Summary Report',
      description: 'Basic case information and status',
      type: 'case-report',
      parameters: ['caseId']
    },
    {
      id: 'case-detailed',
      name: 'Detailed Case Report',
      description: 'Complete case information including investigations',
      type: 'case-report',
      parameters: ['caseId']
    },
    {
      id: 'monthly-overview',
      name: 'Monthly Overview Report',
      description: 'Monthly statistics and trends',
      type: 'statistical-report',
      parameters: ['startDate', 'endDate']
    },
    {
      id: 'staff-performance',
      name: 'Staff Performance Report',
      description: 'Individual staff performance metrics',
      type: 'statistical-report',
      parameters: ['startDate', 'endDate']
    },
    {
      id: 'crime-trends',
      name: 'Crime Trends Report',
      description: 'Crime patterns and trends analysis',
      type: 'statistical-report',
      parameters: ['startDate', 'endDate']
    }
  ];

  res.json(templates);
});

export default router;
