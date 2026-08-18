const webPush = require('web-push');
const Task = require('../models/Task');
const User = require('../models/User');

/**
 * Check for tasks that are due soon or overdue, and send push notifications.
 * Called every 5 minutes by node-cron in server.js.
 */
async function checkDueTasks() {
  try {
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

    // Find tasks due within 30 minutes that haven't been notified
    const dueSoonTasks = await Task.find({
      status: 'pending',
      dueDate: { $gte: now, $lte: thirtyMinutesFromNow },
      notifiedDueSoon: false,
    });

    // Find overdue tasks that haven't been notified
    const overdueTasks = await Task.find({
      status: 'pending',
      dueDate: { $lt: now },
      notifiedOverdue: false,
    });

    // Group tasks by userId
    const tasksByUser = {};

    for (const task of dueSoonTasks) {
      const uid = task.userId.toString();
      if (!tasksByUser[uid]) tasksByUser[uid] = { dueSoon: [], overdue: [] };
      tasksByUser[uid].dueSoon.push(task);
    }

    for (const task of overdueTasks) {
      const uid = task.userId.toString();
      if (!tasksByUser[uid]) tasksByUser[uid] = { dueSoon: [], overdue: [] };
      tasksByUser[uid].overdue.push(task);
    }

    // Send notifications per user
    for (const [userId, tasks] of Object.entries(tasksByUser)) {
      const user = await User.findById(userId);
      if (!user?.pushSubscription) continue;

      // Send due soon notifications
      for (const task of tasks.dueSoon) {
        try {
          const dueTime = task.dueDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });

          await webPush.sendNotification(
            user.pushSubscription,
            JSON.stringify({
              title: `⏰ Due soon: ${task.title}`,
              body: `Due at ${dueTime} — ${task.category}`,
              tag: `due-soon-${task._id}`,
              data: { taskId: task._id, type: 'due-soon' },
            })
          );

          await Task.findByIdAndUpdate(task._id, { notifiedDueSoon: true });
        } catch (pushErr) {
          console.error(`Push error (due soon) for task ${task._id}:`, pushErr.message);
          // If subscription is expired, clear it
          if (pushErr.statusCode === 410) {
            await User.findByIdAndUpdate(userId, { pushSubscription: null });
          }
        }
      }

      // Send overdue notifications
      for (const task of tasks.overdue) {
        try {
          await webPush.sendNotification(
            user.pushSubscription,
            JSON.stringify({
              title: `🚨 Overdue: ${task.title}`,
              body: `This task is past due — ${task.category}`,
              tag: `overdue-${task._id}`,
              data: { taskId: task._id, type: 'overdue' },
            })
          );

          await Task.findByIdAndUpdate(task._id, { notifiedOverdue: true });
        } catch (pushErr) {
          console.error(`Push error (overdue) for task ${task._id}:`, pushErr.message);
          if (pushErr.statusCode === 410) {
            await User.findByIdAndUpdate(userId, { pushSubscription: null });
          }
        }
      }
    }

    const total = dueSoonTasks.length + overdueTasks.length;
    if (total > 0) {
      console.log(`📬 Sent notifications for ${total} tasks`);
    }
  } catch (err) {
    console.error('Reminder scheduler error:', err);
  }
}

module.exports = { checkDueTasks };
