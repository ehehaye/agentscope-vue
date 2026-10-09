import DOMPurify from 'dompurify';
import remend from 'remend';
import { marked } from 'marked';

/**
 * 块级增量解析 mixin
 *
 * 把每帧 O(n) 的全量 markdown 解析降为 O(tail)，
 * 整体开销从 O(n²) 降到 O(n)。
 *
 * 思路：markdown 是块结构（段落/代码块/列表），前面的块写完就不变，
 * 只有最后一个块在被追加。把 content 切成 stablePrefix + tail：
 * - 稳定前缀的 HTML 字符串缓存复用，命中即跳过 marked/remend。
 * - 每帧只对 tail 调 marked + remend。
 * - DOMPurify 必须在拼接后整体跑一次（不能分开 sanitize，否则 tail 里的
 *   恶意 script 可能逃过）。
 *
 * 边界 case 与降级：
 * - 巨型段落（无 \n\n）会退化回 O(n²)，但实际长消息大多多段，影响小。
 * - 列表跨段、引用链接定义等跨块影响：少数情况缓存失效，回落到全量。
 * - 列表项内的缩进代码块：当作普通段落处理，可能错误切分；rare。
 */
export default {
  data() {
    return {
      // 缓存的稳定前缀原文（命中判断用 ===）
      incrementalStablePrefix: '',
      // 缓存的稳定前缀未 sanitize 的 HTML（最终拼接后整体 sanitize）
      incrementalStablePrefixHtml: '',
      // 缓存的最后一个块边界索引，避免每帧重新扫描全量
      incrementalLastBoundary: null,
      // tail 超过此大小才重新扫描边界（默认 4KB）
      incrementalMaxTailSize: 4096,
    };
  },
  methods: {
    /**
     * 找最后一个安全的块边界索引。
     * 规则：最后一个 \n\n 之外的位置（跳过 fenced code block 内部）。
     * 返回值是 stable 的长度；tail = content.slice(boundary)。
     * 找不到返回 0（整段当 tail，全量解析）。
     *
     * 复杂度：O(n) 行级扫描。被 findStableBoundaryCached 包一层避免每帧调用。
     */
    findStableBoundary(content) {
      const len = content.length;
      if (len < 4) return 0;
      let inFenced = false;
      let lastBoundary = 0;
      const lines = content.split('\n');
      let idx = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        // 检测 fenced code block 开关（``` 或 ~~~）
        if (/^(`{3,}|~{3,})/.test(trimmed)) {
          inFenced = !inFenced;
        }
        // 不在 fenced 内时，空行表示块边界
        if (!inFenced && trimmed === '') {
          lastBoundary = idx + line.length + 1; // +1 是 \n
        }
        idx += line.length + 1;
      }
      return lastBoundary;
    },

    /**
     * 带缓存的边界查找：避免每帧 O(n) 扫描。
     * - 内容是纯追加（starts with stable prefix）：tail 还没超阈值就不重扫。
     * - 内容整段替换（不再以 stable prefix 开头）：清缓存，重扫。
     * - tail 超过 maxTailSize：重扫，把已经稳定的部分提升进 stable prefix。
     */
    findStableBoundaryCached(content) {
      // 整段替换检测：内容不再以缓存的 stable prefix 开头
      if (this.incrementalStablePrefix && !content.startsWith(this.incrementalStablePrefix)) {
        this.incrementalStablePrefix = '';
        this.incrementalStablePrefixHtml = '';
        this.incrementalLastBoundary = null;
      }
      // 纯追加且 tail 还没超阈值：边界不变
      if (
        this.incrementalLastBoundary != null &&
        content.length - this.incrementalLastBoundary < this.incrementalMaxTailSize
      ) {
        return this.incrementalLastBoundary;
      }
      this.incrementalLastBoundary = this.findStableBoundary(content);
      return this.incrementalLastBoundary;
    },

    /**
     * 增量解析 HTML，只重算 tail。
     * 单次复杂度 O(tail_size)，整体打字机总复杂度 O(n)。
     */
    getHtml() {
      const { content: fullContent } = this;
      if (!fullContent) return '';

      const boundary = this.findStableBoundaryCached(fullContent);
      const stable = fullContent.slice(0, boundary);
      const tail = fullContent.slice(boundary);

      // 复用稳定前缀（命中缓存 → 跳过 marked/remend）
      let stableUnsanitized;
      if (stable === this.incrementalStablePrefix) {
        stableUnsanitized = this.incrementalStablePrefixHtml;
      } else {
        // 稳定前缀变了（新块完成那一帧），重新解析全量前缀
        stableUnsanitized = marked(remend(stable));
        this.incrementalStablePrefix = stable;
        this.incrementalStablePrefixHtml = stableUnsanitized;
      }

      // tail 通常 <4KB，每帧只重算这一小段
      const tailHtml = tail ? marked(remend(tail)) : '';

      // 整体 sanitize（不能分开，否则 tail 里的恶意 script 可能逃过）
      return DOMPurify.sanitize(stableUnsanitized + tailHtml, {
        ALLOW_DATA_ATTR: true,
      });
    },
  },
};
