/**
 * @typedef {Object} ParsedSchedule
 * @property {'daily'|'weekly'|'monthly'|'once'|'custom'} frequency
 * @property {string} time HH:mm 格式
 * @property {number} [weekday] 0-6，weekly 用
 * @property {number} [dayOfMonth] 1-31，monthly 用
 * @property {Date} [date] once 用
 */

/**
 * 解析 cron 表达式为可读结构。
 * @param {string} cronExpression
 * @param {string} startedAt
 * @returns {ParsedSchedule}
 */
export function parseCronExpression(cronExpression, startedAt) {
  const parts = String(cronExpression || '').trim().split(/\s+/);
  if (parts.length !== 5) {
    return { frequency: 'custom', time: '00:00' };
  }

  const [minute, hour, day, month, weekday] = parts;
  const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

  if (day === '*' && month === '*' && weekday === '*') {
    return { frequency: 'daily', time };
  }
  if (day === '*' && month === '*' && weekday !== '*') {
    return { frequency: 'weekly', time, weekday: parseInt(weekday, 10) };
  }
  if (day !== '*' && month === '*' && weekday === '*') {
    return { frequency: 'monthly', time, dayOfMonth: parseInt(day, 10) };
  }
  if (day !== '*' && month !== '*') {
    return { frequency: 'once', time, date: new Date(startedAt) };
  }

  return { frequency: 'custom', time };
}

/**
 * 获取频率中文标签。
 * @param {ParsedSchedule} parsed
 * @returns {string}
 */
export function getFrequencyLabel(parsed) {
  switch (parsed.frequency) {
    case 'daily':
      return '每天';
    case 'weekly':
      return '每周';
    case 'monthly':
      return '每月';
    case 'once':
      return '一次';
    default:
      return 'Custom';
  }
}
