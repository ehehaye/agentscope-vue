import DOMPurify from 'dompurify';
import remend from 'remend';
import { marked } from './marked';

export const SANITIZE_OPTIONS = { ALLOW_DATA_ATTR: true };

export function sanitizeMarkdownHtml(html) {
  return DOMPurify.sanitize(html, SANITIZE_OPTIONS);
}

export function renderMarkdownToHtml(markdown) {
  if (!markdown) return '';
  return sanitizeMarkdownHtml(marked(remend(markdown)));
}
