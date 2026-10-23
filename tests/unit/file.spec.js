import { sanitizeFilename, triggerDownload } from '@/utils/file';

describe('sanitizeFilename', () => {
  it('把各平台非法字符替换为下划线', () => {
    expect(sanitizeFilename('第 1 步 · a/b: c - 交付内容.docx')).toBe('第 1 步 · a_b_ c - 交付内容.docx');
  });

  it('裁剪首尾空白', () => {
    expect(sanitizeFilename('  export.docx  ')).toBe('export.docx');
  });

  it('清洗后为空时回退到 fallback', () => {
    expect(sanitizeFilename('///')).toBe('___');
    expect(sanitizeFilename('   ', 'fallback.docx')).toBe('fallback.docx');
    expect(sanitizeFilename(undefined)).toBe('export');
  });
});

describe('triggerDownload', () => {
  it('用消毒后的文件名触发下载', () => {
    URL.createObjectURL = jest.fn(() => 'blob:mock');
    URL.revokeObjectURL = jest.fn();
    let downloaded = '';
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function onDownload() {
      downloaded = this.download;
    });

    triggerDownload(new Blob(['x']), 'a/b: c.docx');

    expect(downloaded).toBe('a_b_ c.docx');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    clickSpy.mockRestore();
  });
});
