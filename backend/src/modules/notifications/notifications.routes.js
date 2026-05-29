const express = require('express');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const { authenticate } = require('../../middleware/auth');
const notificationsService = require('./notifications.service');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { notifications, total, page, limit, unreadCount } = await notificationsService.getUserNotifications(req.user.id, req.query);
    return res.json({ success: true, data: notifications, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }, unreadCount });
  } catch (err) { next(err); }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    await notificationsService.markAsRead(req.params.id, req.user.id);
    return sendSuccess(res, null, 'Notification marked as read');
  } catch (err) { next(err); }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    await notificationsService.markAllAsRead(req.user.id);
    return sendSuccess(res, null, 'All notifications marked as read');
  } catch (err) { next(err); }
});

module.exports = router;
