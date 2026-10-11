import { parseCronExpression, getFrequencyLabel } from '@/views/schedule/schedule-utils';

describe('parseCronExpression', () => {
  it('每日表达式', () => {
    expect(parseCronExpression('0 9 * * *')).toEqual({ frequency: 'daily', time: '09:00' });
  });

  it('每周表达式带 weekday', () => {
    expect(parseCronExpression('30 8 * * 1')).toEqual({ frequency: 'weekly', time: '08:30', weekday: 1 });
  });

  it('每月表达式带 dayOfMonth', () => {
    expect(parseCronExpression('0 0 15 * *')).toEqual({ frequency: 'monthly', time: '00:00', dayOfMonth: 15 });
  });

  it('一次性表达式带 date', () => {
    const parsed = parseCronExpression('0 0 1 3 *', '2026-03-01T00:00:00Z');
    expect(parsed.frequency).toBe('once');
    expect(parsed.date).toEqual(new Date('2026-03-01T00:00:00Z'));
  });

  it('时间为个位数时左侧补零', () => {
    expect(parseCronExpression('5 9 * * *')).toEqual({ frequency: 'daily', time: '09:05' });
  });

  it('非 5 段表达式退化为 custom', () => {
    expect(parseCronExpression('0 9 * *')).toEqual({ frequency: 'custom', time: '00:00' });
    expect(parseCronExpression('')).toEqual({ frequency: 'custom', time: '00:00' });
  });

  it('步进等无法识别的 5 段仍归为 daily（day/month/weekday 均为 *）', () => {
    expect(parseCronExpression('*/5 * * * *').frequency).toBe('daily');
  });
});

describe('getFrequencyLabel', () => {
  it('各频率映射中文标签', () => {
    expect(getFrequencyLabel({ frequency: 'daily' })).toBe('每天');
    expect(getFrequencyLabel({ frequency: 'weekly' })).toBe('每周');
    expect(getFrequencyLabel({ frequency: 'monthly' })).toBe('每月');
    expect(getFrequencyLabel({ frequency: 'once' })).toBe('一次');
  });

  it('未知频率回退 Custom', () => {
    expect(getFrequencyLabel({ frequency: 'custom' })).toBe('Custom');
    expect(getFrequencyLabel({})).toBe('Custom');
  });
});
