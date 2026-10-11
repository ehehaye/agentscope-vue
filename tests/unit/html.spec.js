import { escapeHtml } from '@/utils/html';

describe('escapeHtml', () => {
  it('转义全部 HTML 特殊字符', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });

  it('null / undefined 视作空串', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('普通文本原样返回', () => {
    expect(escapeHtml('plain text')).toBe('plain text');
    expect(escapeHtml(0)).toBe('0');
  });
});
