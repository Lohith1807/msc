import Log from '../models/Log.js';

export const recordLog = async ({
  action,
  details,
  category = 'System',
  user = null,
  severity = 'info',
  ip = '127.0.0.1',
}) => {
  try {
    await Log.create({
      action,
      details,
      category,
      userId: user?._id || user?.id || null,
      userName: user?.name || 'Guest User',
      userRole: user?.role || 'visitor',
      severity,
      ip,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
};
