import express from 'express';
import { query, validationResult } from 'express-validator';
import Complaint from '../models/Complaint.js';
import Investigation from '../models/Investigation.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard analytics
router.get('/dashboard', authenticate, authorize(['admin', 'supervisor', 'staff']), async (req, res) => {
  try {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startOfYear = new Date(currentDate.getFullYear(), 0, 1);

    // Basic statistics
    const totalComplaints = await Complaint.countDocuments();
    const monthlyComplaints = await Complaint.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    const yearlyComplaints = await Complaint.countDocuments({
      createdAt: { $gte: startOfYear }
    });

    // Status distribution
    const statusStats = await Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Crime type distribution
    const crimeTypeStats = await Complaint.aggregate([
      { $group: { _id: '$crimeType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Priority distribution
    const priorityStats = await Complaint.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Monthly trends (last 12 months)
    const monthlyTrends = await Complaint.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1)
          }
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

    // Resolution time analysis
    const resolutionStats = await Complaint.aggregate([
      {
        $match: {
          status: { $in: ['Completed', 'Closed'] },
          completedAt: { $exists: true }
        }
      },
      {
        $project: {
          resolutionTime: {
            $divide: [
              { $subtract: ['$completedAt', '$createdAt'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResolutionTime: { $avg: '$resolutionTime' },
          minResolutionTime: { $min: '$resolutionTime' },
          maxResolutionTime: { $max: '$resolutionTime' }
        }
      }
    ]);

    res.json({
      overview: {
        totalComplaints,
        monthlyComplaints,
        yearlyComplaints
      },
      statusStats,
      crimeTypeStats,
      priorityStats,
      monthlyTrends,
      resolutionStats: resolutionStats[0] || {
        avgResolutionTime: 0,
        minResolutionTime: 0,
        maxResolutionTime: 0
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
  }
});

// Get performance metrics
router.get('/performance', authenticate, authorize(['admin', 'supervisor']), [
  query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be valid ISO 8601 date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Staff performance
    const staffPerformance = await Complaint.aggregate([
      {
        $match: {
          assignedTo: { $exists: true },
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$assignedTo',
          totalCases: { $sum: 1 },
          completedCases: {
            $sum: { $cond: [{ $in: ['$status', ['Completed', 'Closed']] }, 1, 0] }
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $in: ['$status', ['Completed', 'Closed']] },
                {
                  $divide: [
                    { $subtract: ['$completedAt', '$createdAt'] },
                    1000 * 60 * 60 * 24
                  ]
                },
                null
              ]
            }
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
          staffEmail: '$staff.email',
          totalCases: 1,
          completedCases: 1,
          completionRate: {
            $multiply: [
              { $divide: ['$completedCases', '$totalCases'] },
              100
            ]
          },
          avgResolutionTime: { $round: ['$avgResolutionTime', 2] }
        }
      },
      { $sort: { completionRate: -1 } }
    ]);

    // Department performance
    const departmentPerformance = await Complaint.aggregate([
      {
        $match: {
          assignedTo: { $exists: true },
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'staff'
        }
      },
      {
        $unwind: '$staff'
      },
      {
        $group: {
          _id: '$staff.department',
          totalCases: { $sum: 1 },
          completedCases: {
            $sum: { $cond: [{ $in: ['$status', ['Completed', 'Closed']] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          department: '$_id',
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

    res.json({
      staffPerformance,
      departmentPerformance,
      period: {
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

// Get geographic analytics
router.get('/geographic', authenticate, authorize(['admin', 'supervisor']), async (req, res) => {
  try {
    // Crime hotspots
    const hotspots = await Complaint.aggregate([
      {
        $match: {
          location: { $exists: true },
          'location.latitude': { $exists: true },
          'location.longitude': { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            lat: { $round: ['$location.latitude', 2] },
            lng: { $round: ['$location.longitude', 2] }
          },
          count: { $sum: 1 },
          crimeTypes: { $addToSet: '$crimeType' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 50 }
    ]);

    // City-wise distribution
    const cityStats = await Complaint.aggregate([
      {
        $match: {
          'location.address': { $exists: true }
        }
      },
      {
        $project: {
          city: {
            $arrayElemAt: [
              { $split: ['$location.address', ','] },
              -2
            ]
          }
        }
      },
      {
        $group: {
          _id: { $trim: { input: '$city' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json({
      hotspots,
      cityStats
    });
  } catch (error) {
    console.error('Error fetching geographic analytics:', error);
    res.status(500).json({ error: 'Failed to fetch geographic analytics' });
  }
});

export default router;
