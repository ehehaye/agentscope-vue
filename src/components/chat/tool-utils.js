/**
 * 工具调用渲染共享函数。
 */
const TODO_TOOLS = new Set(['TaskGet', 'TaskUpdate', 'TaskList', 'TaskCreate']);
const MCP_TOOL_PREFIX = 'mcp__';

export function parseInput(input) {
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function tryGetFilePath(input) {
  const { file_path } = parseInput(input);
  return typeof file_path === 'string' && file_path.length > 0 ? file_path : undefined;
}

export function tryGetFileName(input) {
  const filePath = tryGetFilePath(input);
  if (!filePath) return undefined;
  const segments = filePath.split(/[/\\]+/).filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : filePath;
}

export function getResultText(result) {
  if (!result) return '';
  if (typeof result.output === 'string') return result.output;
  if (Array.isArray(result.output)) {
    return result.output.map((b) => (b.type === 'text' ? b.text : '')).join('\n');
  }
  return '';
}

export function getResultDiff(result) {
  const diff = result.metadata?.diff;
  return typeof diff === 'string' && diff.length > 0 ? diff : undefined;
}

export function countDiffStats(diffText) {
  let insertions = 0;
  let deletions = 0;
  for (const line of diffText.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) insertions++;
    else if (line.startsWith('-') && !line.startsWith('---')) deletions++;
  }
  return { insertions, deletions };
}

export function summarizeToolGroup(calls) {
  let nBash = 0;
  let nRead = 0;
  let nEdit = 0;
  let nSearch = 0;
  let nTodo = 0;
  let nMCP = 0;

  for (const { call } of calls) {
    const name = call.name;
    if (name === 'Bash') nBash += 1;
    else if (name === 'Read') nRead += 1;
    else if (name === 'Edit' || name === 'Write') nEdit += 1;
    else if (name === 'Grep' || name === 'Glob') nSearch += 1;
    else if (TODO_TOOLS.has(name)) nTodo += 1;
    else if (name.startsWith(MCP_TOOL_PREFIX)) nMCP += 1;
  }

  const parts = [];
  if (nBash > 0) parts.push(`运行 ${nBash} 个命令`);
  if (nRead > 0) parts.push(`读取 ${nRead} 个文件`);
  if (nEdit > 0) parts.push(`修改 ${nEdit} 个文件`);
  if (nSearch > 0) parts.push(`搜索 ${nSearch} 次`);
  if (nTodo > 0) parts.push(`更新 ${nTodo} 个任务`);
  if (nMCP > 0) parts.push(`调用 ${nMCP} 个 MCP 工具`);

  return parts.length > 0 ? parts.join('，') : `调用 ${calls.length} 个工具`;
}

