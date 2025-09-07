import Complaint from '../models/Complaint.js';

// SLA thresholds (in hours)
const SLA_THRESHOLDS = {
  'Filed': 24,        // 24 hours to assign
  'Assigned': 72,     // 72 hours to start investigation
  'Under Investigation': 168, // 7 days to complete investigation
  'Evidence Collected': 24    // 24 hours to finalize
};

// Check SLA compliance for a single complaint
const checkSLACompliance = (complaint) => {
  const now = new Date();
  const statusHistory = complaint.statusHistory || [];
  
  // Find the current status entry
  const currentStatus = statusHistory[statusHistory.length - 1];
  if (!currentStatus) return null;

  const statusStartTime = new Date(currentStatus.timestamp);
  const hoursElapsed = (now - statusStartTime) / (1000 * 60 * 60);
  const threshold = SLA_THRESHOLDS[currentStatus.status];

  if (!threshold) return null;

  return {
    complaintId: complaint._id,
    caseId: complaint.caseId,
    currentStatus: currentStatus.status,
    hoursElapsed: Math.round(hoursElapsed * 100) / 100,
    threshold,
    isOverdue: hoursElapsed > threshold,
    overdueBy: Math.max(0, hoursElapsed - threshold)
  };
};

// Monitor SLA compliance for all active complaints
export const startSLAMonitoring = () => {
  console.log('Starting SLA monitoring...');
  
  // Run SLA check every hour
  setInterval(async () => {
    try {
      await performSLACheck();
    } catch (error) {
      console.error('Error during SLA check:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  // Run initial check
  performSLACheck();
};

// Perform SLA compliance check
const performSLACheck = async () => {
  try {
    // Get all active complaints
    const activeComplaints = await Complaint.find({
      status: { $in: ['Filed', 'Assigned', 'Under Investigation', 'Evidence Collected'] }
    });

    const slaResults = [];
    const overdueCases = [];

    for (const complaint of activeComplaints) {
      const slaCheck = checkSLACompliance(complaint);
      if (slaCheck) {
        slaResults.push(slaCheck);
        
        if (slaCheck.isOverdue) {
          overdueCases.push(slaCheck);
        }
      }
    }

    // Log SLA summary
    console.log(`SLA Check - Total active cases: ${slaResults.length}, Overdue: ${overdueCases.length}`);

    // Log overdue cases
    if (overdueCases.length > 0) {
      console.log('Overdue cases:');
      overdueCases.forEach(case_ => {
        console.log(`  - Case ${case_.caseId}: ${case_.currentStatus} (${case_.hoursElapsed}h / ${case_.threshold}h threshold)`);
      });
    }

    // Update complaint SLA status
    await updateSLAStatus(overdueCases);

  } catch (error) {
    console.error('Error performing SLA check:', error);
  }
};

// Update SLA status for overdue cases
const updateSLAStatus = async (overdueCases) => {
  for (const case_ of overdueCases) {
    try {
      await Complaint.findByIdAndUpdate(case_.complaintId, {
        $set: {
          slaStatus: 'Overdue',
          lastSLACheck: new Date()
        }
      });
    } catch (error) {
      console.error(`Error updating SLA status for case ${case_.caseId}:`, error);
    }
  }
};

// Get SLA statistics
export const getSLAStatistics = async () => {
  try {
    const totalActive = await Complaint.countDocuments({
      status: { $in: ['Filed', 'Assigned', 'Under Investigation', 'Evidence Collected'] }
    });

    const overdueCount = await Complaint.countDocuments({
      slaStatus: 'Overdue'
    });

    const onTimeCount = totalActive - overdueCount;

    // Get average resolution time by status
    const avgResolutionTimes = await Complaint.aggregate([
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
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResolutionTime: { $avg: '$resolutionTime' }
        }
      }
    ]);

    return {
      totalActive,
      overdueCount,
      onTimeCount,
      complianceRate: totalActive > 0 ? (onTimeCount / totalActive) * 100 : 100,
      avgResolutionTime: avgResolutionTimes[0]?.avgResolutionTime || 0
    };
  } catch (error) {
    console.error('Error getting SLA statistics:', error);
    return null;
  }
};

// Get overdue cases
export const getOverdueCases = async () => {
  try {
    const overdueCases = await Complaint.find({
      slaStatus: 'Overdue'
    })
    .populate('assignedTo', 'name email')
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });

    return overdueCases.map(complaint => {
      const slaCheck = checkSLACompliance(complaint);
      return {
        ...complaint.toObject(),
        slaInfo: slaCheck
      };
    });
  } catch (error) {
    console.error('Error getting overdue cases:', error);
    return [];
  }
};
