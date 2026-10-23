// 各平台文件名非法字符（Windows 最严格，统一按它清洗）
const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|]/g;

/**
 * 清洗下载文件名：把非法字符替换为下划线并去掉首尾空白，空名回退到 fallback。
 *
 * @param {string} filename 原始文件名。
 * @param {string} [fallback] 清洗后为空时的回退名。
 * @returns {string} 可安全用于 download 属性的文件名。
 */
export function sanitizeFilename(filename, fallback = 'export') {
  const cleaned = String(filename ?? '')
    .replace(ILLEGAL_FILENAME_CHARS, '_')
    .trim();
  return cleaned || fallback;
}

/**
 * 触发浏览器下载文件
 * @param {Blob} blob
 * @param {string} filename
 */
export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizeFilename(filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
