import express from 'express';
import { body, validationResult } from 'express-validator';
import Complaint from '../models/Complaint.js';

const router = express.Router();

// Public statistics (no authentication required)
router.get('/stats', async (req, res) => {
  try {
    const stats = await Complaint.aggregate([
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

    const crimeTypeStats = await Complaint.aggregate([
      { $group: { _id: '$crimeType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const monthlyStats = await Complaint.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      overview: stats[0] || { totalCases: 0, resolvedCases: 0, pendingCases: 0, inProgressCases: 0 },
      crimeTypeStats,
      monthlyStats
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Submit anonymous tip
router.post('/tip', [
  body('description').trim().isLength({ min: 20, max: 1000 }).withMessage('Description must be 20-1000 characters'),
  body('crimeType').isIn(['Theft/Robbery', 'Assault', 'Fraud', 'Cybercrime', 'Domestic Violence', 'Drug Related', 'Property Crime', 'Traffic Violation', 'Missing Person', 'Other']).withMessage('Invalid crime type'),
  body('location.latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('location.longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('location.address').trim().notEmpty().withMessage('Address is required'),
  body('contactInfo').optional().isString().withMessage('Contact info must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { description, crimeType, location, contactInfo } = req.body;

    const tip = new Complaint({
      title: 'Anonymous Tip',
      description,
      crimeType,
      location: {
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
        address: location.address
      },
      isAnonymous: true,
      priority: 'Medium',
      status: 'Filed',
      contactInfo: contactInfo || '',
      userId: null // Anonymous tip
    });

    await tip.save();

    res.json({ 
      message: 'Anonymous tip submitted successfully',
      tipId: tip._id
    });
  } catch (error) {
    console.error('Error submitting anonymous tip:', error);
    res.status(500).json({ error: 'Failed to submit tip' });
  }
});

// Get crime prevention tips
router.get('/prevention-tips', (req, res) => {
  const tips = [
    {
      category: 'General Safety',
      tips: [
        'Always be aware of your surroundings',
        'Keep your phone charged and with you',
        'Trust your instincts - if something feels wrong, it probably is',
        'Avoid walking alone at night in unfamiliar areas'
      ]
    },
    {
      category: 'Home Security',
      tips: [
        'Install good lighting around your property',
        'Keep doors and windows locked',
        'Don\'t advertise when you\'re away from home',
        'Consider installing a security system'
      ]
    },
    {
      category: 'Online Safety',
      tips: [
        'Use strong, unique passwords',
        'Be cautious with personal information online',
        'Keep your software updated',
        'Be wary of suspicious emails and links'
      ]
    },
    {
      category: 'Vehicle Safety',
      tips: [
        'Always lock your car doors',
        'Don\'t leave valuables in plain sight',
        'Park in well-lit areas',
        'Keep your car keys secure'
      ]
    }
  ];

  res.json(tips);
});

// Get emergency contacts
router.get('/emergency-contacts', (req, res) => {
  const contacts = [
    {
      name: 'Police Emergency',
      number: '911',
      description: 'For immediate police assistance'
    },
    {
      name: 'Non-Emergency Police',
      number: '(555) 123-4567',
      description: 'For non-urgent police matters'
    },
    {
      name: 'Crime Stoppers',
      number: '(555) 123-4567',
      description: 'Anonymous crime reporting'
    },
    {
      name: 'Domestic Violence Hotline',
      number: '1-800-799-7233',
      description: '24/7 support for domestic violence'
    },
    {
      name: 'Cyber Crime Unit',
      number: '(555) 123-4568',
      description: 'Report cyber crimes and online fraud'
    }
  ];

  res.json(contacts);
});

export default router;
