/**
 * 工具调用渲染映射表（迁移自 tool-renderers/index.tsx）。
 */
import BashRenderer from './BashRenderer.vue';
import ReadRenderer from './ReadRenderer.vue';
import WriteRenderer from './WriteRenderer.vue';
import EditRenderer from './EditRenderer.vue';
import GlobRenderer from './GlobRenderer.vue';
import GrepRenderer from './GrepRenderer.vue';
import TaskCreateRenderer from './TaskCreateRenderer.vue';

export const renderers = {
  Bash: BashRenderer,
  Read: ReadRenderer,
  Write: WriteRenderer,
  Edit: EditRenderer,
  Glob: GlobRenderer,
  Grep: GrepRenderer,
  TaskCreate: TaskCreateRenderer,
};

export function getRenderer(toolName) {
  return renderers[toolName] || null;
}
