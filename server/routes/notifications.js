import express from 'express';
import { body, validationResult, query } from 'express-validator';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// In-memory notification store (in production, use a database)
let notifications = [];

// Get user notifications
router.get('/', authenticate, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('unread').optional().isBoolean().withMessage('Unread must be a boolean')
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
    const unreadOnly = req.query.unread === 'true';
    const skip = (page - 1) * limit;

    let userNotifications = notifications.filter(n => n.userId === req.user._id);
    
    if (unreadOnly) {
      userNotifications = userNotifications.filter(n => !n.read);
    }

    // Sort by creation date (newest first)
    userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = userNotifications.length;
    const paginatedNotifications = userNotifications.slice(skip, skip + limit);

    res.json({
      notifications: paginatedNotifications,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    const notification = notifications.find(n => 
      n._id === notificationId && n.userId === req.user._id
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.read = true;
    notification.readAt = new Date();

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticate, async (req, res) => {
  try {
    const userNotifications = notifications.filter(n => 
      n.userId === req.user._id && !n.read
    );

    userNotifications.forEach(notification => {
      notification.read = true;
      notification.readAt = new Date();
    });

    res.json({ 
      message: 'All notifications marked as read',
      count: userNotifications.length
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Delete notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    const notificationIndex = notifications.findIndex(n => 
      n._id === notificationId && n.userId === req.user._id
    );

    if (notificationIndex === -1) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notifications.splice(notificationIndex, 1);

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Get notification count
router.get('/count', authenticate, async (req, res) => {
  try {
    const unreadCount = notifications.filter(n => 
      n.userId === req.user._id && !n.read
    ).length;

    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching notification count:', error);
    res.status(500).json({ error: 'Failed to fetch notification count' });
  }
});

// Create notification (internal function)
export const createNotification = (userId, type, title, message, data = {}) => {
  const notification = {
    _id: Date.now().toString(),
    userId,
    type,
    title,
    message,
    data,
    read: false,
    createdAt: new Date(),
    readAt: null
  };

  notifications.push(notification);
  return notification;
};

// Notification types
export const NOTIFICATION_TYPES = {
  CASE_UPDATE: 'case_update',
  CASE_ASSIGNED: 'case_assigned',
  CASE_RESOLVED: 'case_resolved',
  EVIDENCE_ADDED: 'evidence_added',
  INVESTIGATION_UPDATE: 'investigation_update',
  SYSTEM_ALERT: 'system_alert'
};

export default router;
