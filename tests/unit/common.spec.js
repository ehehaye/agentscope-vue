// element-ui 仅被 confirmDialog 使用；此处测试纯函数，屏蔽其重量级副作用导入。
jest.mock('element-ui', () => ({ MessageBox: { confirm: jest.fn() } }));

import { credentialLabel, formatNumber, formatTime, avatarTint, isValidJsonStr, copyToClipboard } from '@/utils/common';

describe('credentialLabel', () => {
  it('优先使用用户设置的名字', () => {
    expect(credentialLabel({ id: 'abcdefgh1234', data: { name: 'My Key' } })).toBe('My Key');
  });

  it('无名字时退化为 id 前 8 位', () => {
    expect(credentialLabel({ id: 'abcdefgh1234', data: {} })).toBe('abcdefgh');
  });

  it('id 短于 8 位时全量返回', () => {
    expect(credentialLabel({ id: 'abc', data: {} })).toBe('abc');
  });
});

describe('formatNumber', () => {
  it('小于 1000 时按原值输出', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
  });

  it('千位及以上使用 k/M/B 后缀', () => {
    expect(formatNumber(1000)).toBe('1k');
    expect(formatNumber(10200)).toBe('10.2k');
    expect(formatNumber(1000000)).toBe('1M');
    // 注意：<10 的进位值用 2 位小数，仅剥离纯 ".0"，故 1.5M 实际渲染为 "1.50M"
    // （与 formatNumber JSDoc 中的 "1.5M" 示例不一致，此处记录当前行为）
    expect(formatNumber(1500000)).toBe('1.50M');
    expect(formatNumber(1000000000)).toBe('1B');
    expect(formatNumber(2500000000)).toBe('2.50B');
  });

  it('进位到大于等于 10 的值只保留一位小数', () => {
    expect(formatNumber(10000)).toBe('10k');
  });
});

describe('formatTime', () => {
  it('秒级', () => {
    expect(formatTime(0)).toBe('0s');
    expect(formatTime(45)).toBe('45s');
    expect(formatTime(59.9)).toBe('59s');
  });

  it('分钟级：整除省略秒，否则保留', () => {
    expect(formatTime(60)).toBe('1m');
    expect(formatTime(150)).toBe('2m30s');
    expect(formatTime(150, { leadingUnitOnly: true })).toBe('2m');
  });

  it('小时/天/月/年各自取整', () => {
    expect(formatTime(3600)).toBe('1h');
    expect(formatTime(7200)).toBe('2h');
    expect(formatTime(86400)).toBe('1d');
    expect(formatTime(2629746)).toBe('1mo');
    expect(formatTime(31556952)).toBe('1y');
  });
});

describe('avatarTint', () => {
  it('同一 seed 结果稳定', () => {
    expect(avatarTint('hub-alpha')).toEqual(avatarTint('hub-alpha'));
  });

  it('返回合法的 6 位 hex 配色对', () => {
    const tint = avatarTint('some-skill');
    expect(tint.backgroundColor).toMatch(/^#[0-9a-f]{6}$/);
    expect(tint.color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('不同 seed 产生不同配色', () => {
    expect(avatarTint('seed-a')).not.toEqual(avatarTint('seed-b'));
  });
});

describe('isValidJsonStr', () => {
  it('合法 JSON 返回 true', () => {
    expect(isValidJsonStr('{"a":1}')).toBe(true);
    expect(isValidJsonStr('123')).toBe(true);
    expect(isValidJsonStr('null')).toBe(true);
  });

  it('非法或空串返回 false', () => {
    expect(isValidJsonStr('not json')).toBe(false);
    expect(isValidJsonStr('')).toBe(false);
    expect(isValidJsonStr()).toBe(false);
  });
});

describe('copyToClipboard', () => {
  it('优先走 clipboard API 并返回 true', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await expect(copyToClipboard('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('clipboard API 失败时回退 execCommand', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    const execCommand = jest.fn().mockReturnValue(true);
    document.execCommand = execCommand;
    await expect(copyToClipboard('fallback')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });
});
