import { messageText, buildExportSections } from '@/utils/export';

describe('messageText', () => {
  it('字符串 content 直接作为纯文本', () => {
    expect(messageText('hello')).toBe('hello');
  });

  it('拼接 text 块，忽略 thinking / tool 等非文本块', () => {
    const content = [
      { type: 'text', text: '第一段' },
      { type: 'thinking', thinking: '内心戏不导出' },
      { type: 'tool_call', name: 'bash', input: '{}' },
      { type: 'tool_result', output: '结果不导出' },
      { type: 'text', text: '第二段' },
    ];
    expect(messageText(content)).toBe('第一段\n\n第二段');
  });

  it('剔除空文本块并裁剪首尾空白', () => {
    expect(
      messageText([
        { type: 'text', text: '  ' },
        { type: 'text', text: '' },
        { type: 'text', text: ' 内容 \n' },
      ]),
    ).toBe('内容');
  });

  it('缺失或非法 content 返回空串', () => {
    expect(messageText(undefined)).toBe('');
    expect(messageText(null)).toBe('');
    expect(messageText({ type: 'text' })).toBe('');
  });
});

describe('buildExportSections', () => {
  const textMsg = (role, text, extra = {}) => ({ role, content: [{ type: 'text', text }], ...extra });

  it('用户按纯文本、助手按 Markdown 导出', () => {
    const sections = buildExportSections([textMsg('user', '你好'), textMsg('assistant', '**好的**')]);
    expect(sections).toEqual([
      { label: '用户', content: '你好', format: 'text' },
      { label: '助手', content: '**好的**', format: 'markdown' },
    ]);
  });

  it('连续同角色消息合并为一个 section', () => {
    const sections = buildExportSections([
      textMsg('user', '第一条'),
      textMsg('assistant', '回答一'),
      textMsg('assistant', '回答二'),
      textMsg('user', '第二条'),
    ]);
    expect(sections.map((s) => `${s.label}:${s.content}`)).toEqual([
      '用户:第一条',
      '助手:回答一\n\n回答二',
      '用户:第二条',
    ]);
  });

  it('无文本的消息整条跳过', () => {
    const sections = buildExportSections([
      { role: 'user', content: [{ type: 'thinking', thinking: 'x' }] },
      textMsg('assistant', '只有这条进文档'),
    ]);
    expect(sections).toEqual([{ label: '助手', content: '只有这条进文档', format: 'markdown' }]);
  });

  it('兼容字符串形态的 content（曾在此处崩溃）', () => {
    expect(buildExportSections([{ role: 'user', content: '纯字符串' }])).toEqual([
      { label: '用户', content: '纯字符串', format: 'text' },
    ]);
  });

  it('system 角色标为「系统」，未知/缺失角色兜底「助手」', () => {
    const sections = buildExportSections([
      { role: 'system', content: '系统提示' },
      { role: undefined, content: '无角色' },
    ]);
    expect(sections.map((s) => s.label)).toEqual(['系统', '助手']);
  });

  it('空入参返回空数组', () => {
    expect(buildExportSections(undefined)).toEqual([]);
    expect(buildExportSections([])).toEqual([]);
  });
});
