import * as XLSX from 'xlsx';
import { triggerDownload } from '@/utils/file';

/**
 * 将已渲染好的 HTML <table> 元素导出为 xlsx 文件并触发下载
 *
 * @param {HTMLTableElement} tableEl - 浏览器 DOM 中的 <table> 元素
 * @param {string} [filename] - 文件名，缺省为 export-YYYYMMDD-HHmmss.xlsx
 */
export function downloadXlsxFromTable(tableEl, filename) {
  if (!tableEl || tableEl.tagName !== 'TABLE') {
    console.warn('[downloadXlsxFromTable] 需要一个 <table> DOM 元素');
    return;
  }
  const name = filename || `export-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}.xlsx`;

  const ws = XLSX.utils.table_to_sheet(tableEl);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, name);
}
