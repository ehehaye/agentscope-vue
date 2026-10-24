# 数据流向：会话 / Markdown → Word（.docx）导出

本文以「点击导出 Word 按钮」为入口，端到端追踪数据从消息列表到 `.docx` 文件下载的完整走向。涉及的核心文件为 [src/components/exports/ExportWordButton.vue](../src/components/exports/ExportWordButton.vue) 与 [src/utils/word.js](../src/utils/word.js)。涉及的所有源码路径均为相对仓库根的相对路径。

## 1. 总览

```text
msgs（SDK Msg[]：聊天消息 / SOP 交付内容）
   │ 作为 props 传入
   ▼
ExportButton（type="word" 分发）
   │
   ▼
ExportWordButton
   │ setup 阶段：
   ├── buildExportSections(msgs)                     ──▶ src/utils/export.js
   │      └── 连续同角色合并 → [{ label, content, format: 'text'|'markdown' }]
   │
   │ 点击 trigger()：
   ▼
createDocxBuilder()                                   ──▶ src/utils/word.js
   │
   ├── 动态 import('docx')                           （按需加载，不进首屏包）
   └── createConverter(docx)                          （转换器工厂，不持模块级状态）
          │
          ▼
   for section of sections：
   ├── sectionLabel(docx, section.label)              （组件内展示原语：角色标签）
   ├── format === 'text' → plainBlocks(docx, content) （组件内展示原语：纯文本段落）
   └── format === 'markdown' → builder.markdownBlocks(content)
          │
          ▼
   renderMarkdownToHtml(markdown)                     ──▶ components/md/render.js
          │  marked + remend → DOMPurify 消毒 HTML
          ▼
   parseDocument(html).children                       ──▶ htmlparser2 AST
          │
          ▼
   nodeBlocks(node, state) 逐节点分派：
   ├── 1. registry 的 toDocx（resolveDocxRenderer）    ──▶ components/md/registry.js
   │        └── echarts → ctx.renderEcharts(option) → PNG ImageRun
   ├── 2. 内置 HTML 标签映射（h1~h6 / p / ul / ol / table / pre / blockquote …）
   └── 3. 未识别标签递归子节点，最终纯文本兜底
          │
          ▼
   docx 元素数组（Paragraph / Table / ImageRun …）
          │
          ▼
builder.save(children, filename)
   ├── new docx.Document({ numbering: { config: [orderedListDefinition] }, sections: [{ children }] })
   ├── docx.Packer.toBlob(doc)
   └── triggerDownload(blob, filename)                ──▶ src/utils/file.js
```

## 2. 入口与分发

### 2.1 使用位置

`ExportButton` 是按 `type` 分发的薄壳（`word` → `ExportWordButton`，`pdf` → `ExportPdfButton`），属性与事件全部透传：

| 使用位置 | 传入内容 | 场景 |
| --- | --- | --- |
| [ChatContent.vue](../src/components/chat/ChatContent.vue) | `:msgs="msgs"`（当前会话消息） | 聊天历史导出 |
| [SopStepDelivery.vue](../src/components/sop/SopStepDelivery.vue) | `:msgs="exportMsgs"`（合成的单条 assistant 消息）+ `:filename` | SOP 交付内容导出 |

注意 SOP 场景并非传入真实会话，而是把交付内容块包成 `[{ role: 'assistant', content: submissionBlocks }]`——只要结构符合 SDK `Msg` 形态即可复用同一条导出管线。

### 2.2 组件状态：[ExportWordButton.vue](../src/components/exports/ExportWordButton.vue)

```js
const sections = computed(() => buildExportSections(props.msgs));
const isDisabled = computed(() => props.disabled || loading.value || sections.value.length === 0);
```

- `sections` 由 `props.msgs` 派生，无可导出文本时按钮禁用并给出 title 提示。
- `trigger()` 先置 `loading`（图标转圈），完成后复位；失败时 `toast.error` 并打控制台日志。

组件内保留两个**展示原语**（`sectionLabel` / `plainBlocks`），负责「角色标签 / 纯文本段落」这类会话语义的排版；`utils/word.js` 只提供通用转换原语，两者刻意解耦（见文件头注释）。

## 3. 段落分组：[src/utils/export.js](../src/utils/export.js)

纯函数层，把 SDK `Msg[]` 归一成导出段落：

- `messageText(content)`：`content` 兼容纯字符串与 `ContentBlock[]`，只保留 `type === 'text'` 的块并以空行拼接；`thinking` / `tool_call` / `tool_result` / `data` / `hint` 等一律跳过。
- `buildExportSections(msgs)`：按角色打标签（`用户` / `助手` / `系统`，未知角色兜底「助手」），**连续同角色消息合并**为一个段落；`format` 规则——用户消息按 `'text'`（纯文本，保留原始换行），其余按 `'markdown'`（富文本）。

输出形态：`{ label, content, format }[]`。这层不感知 Word，只感知会话语义。

## 4. 转换器：[src/utils/word.js](../src/utils/word.js)

### 4.1 `createDocxBuilder()` —— 懒加载与组装

- `await import('docx')` 动态导入，保证 `docx` 依赖不进首屏包；随后 `createConverter(docx)` 创建转换器。工厂返回 `{ blocks, orderedListDefinition }`，**不持有模块级状态**，便于多次调用互不干扰。
- 对外暴露三个能力：
  - `markdownBlocks(markdown)`：md → 消毒 HTML → htmlparser2 AST → docx 块数组；
  - `save(children, filename)`：组装 `Document` 并触发下载（空文档补空段落，避免生成 Word 打不开的 section）；
  - `docx` 模块本身（供组件内展示原语构造 `Paragraph` / `TextRun`）。
- 默认文件名 `export-YYYYMMDD-HHmmss.docx`，可由 `props.filename` 覆盖。

### 4.2 「md → 消毒 HTML」与渲染层共用

`renderMarkdownToHtml`（[components/md/render.js](../src/components/md/render.js)）即 `DOMPurify.sanitize(marked(remend(markdown)))`，与界面渲染走同一份管线。因此**自定义节点的识别规则只有一份**：`registry.js` 按 `data-lang`（代码块）或 `tagName`（标签）匹配，导出层通过 `resolveDocxRenderer(node)` 拿到注册时提供的 `toDocx(props, ctx)`。

### 4.3 `nodeBlocks` 分派顺序

每个 AST 节点依次尝试：

1. **registry 的 `toDocx`**：注册组件自行决定如何落成 Word 元素；返回空时继续走原生映射（不直接丢内容）。
2. **内置 HTML 标签映射**：
   - `h1~h6` → `HeadingLevel` 段落；`p` → 普通段落；
   - `blockquote` → state 标记 `quote`，内部所有块级元素统一加左缩进 + 左侧竖线（`QUOTE_PROPS`）；
   - `ul` / `ol` → `listBlocks`：`li` 内 `<p>` 视为行内内容，其余块级节点递归；嵌套列表降一级；
   - `table` → `tableFromNode`：整行全 `th` 才算表头（加粗 + 灰底），宽度 100%；
   - `pre` / 带 `data-lang` 或 `md-code-wrapper` 类的 `div` → `codeBlock`：单段落 + 行内 `break` 保证底色连续，未注册（含流式未闭合）代码块也按代码文本导出；
   - `img` → `[图片：alt]` 占位文本；`hr` → 底部边框段落。
3. **兜底**：未识别标签递归子节点，最终由纯文本段落兜底。

行内节点由 `inlineRuns` 处理，样式随嵌套层级向下累积（加粗套斜体等）：`strong/b`、`em/i`、`del/s`、`code`（等宽 + 灰底）、`a`（蓝色下划线）、`br`。

### 4.4 有序列表编号

每个**顶层**有序列表独立计数，对应一个 numbering instance（重新从 1 开始）；嵌套有序列表复用父列表的 instance，保证多级编号连续。`orderedListDefinition`（reference `md-ordered-list`，9 级 `Decimal`）随 `Document` 一次性注册。

### 4.5 转换器 API（`ctx`）——注册组件依赖的原语

```js
api = {
  table(node),                       // AST <table> → docx.Table
  codeBlock(text),                   // 文本 → 带底色边框的代码段落
  inlineRuns(nodes, flags),          // 行内 AST → TextRun[]
  image(data, opts),                 // 图片数据 → ImageRun 段落
  renderEcharts(option, opts),       // 离屏渲染 ECharts → PNG ImageRun
}
```

组件实现只依赖这些原语，**不直接 import docx**。`renderEcharts` 按 800×400 离屏渲染（[components/echarts/image.js](../src/components/echarts/image.js)），再等比缩到正文宽度（最多 600px），避免图表在 Word 里溢出。

## 5. 保存与下载

`builder.save(children, filename)`：

```js
new docx.Document({ numbering: { config: [orderedListDefinition] }, sections: [{ children }] })
  → docx.Packer.toBlob(doc)
  → triggerDownload(blob, filename)      // src/utils/file.js
```

整条链路在 `trigger()` 的 `try/finally` 内完成，保证 `loading` 状态一定复位；任一环节抛错统一走 `toast.error('导出 Word 失败，详见控制台')`。

## 6. 扩展点

- **新增可导出的 Markdown 自定义节点**：在 [components/md/registry.js](../src/components/md/registry.js) 注册（`registerCodeBlockComp` / `registerTagComp`）时补上 `toDocx(props, ctx)` 即可，渲染与导出共用同一匹配规则，无需改动 `word.js`。现成示例：[plugins/md-components.js](../src/plugins/md-components.js) 的 `echarts` 代码块 → `ctx.renderEcharts(option)`。
- **新增导出入口**：复用 `ExportButton`（传 `msgs` / `filename`），会话分组语义放 [utils/export.js](../src/utils/export.js)，排版原语按需留在调用组件内。
- **`docx` 依赖必须保持按需 `import()`**，避免进入首屏包（见 AGENTS.md Notes）。

## 7. 涉及文件一览

| 文件 | 职责 |
| --- | --- |
| [src/components/exports/ExportButton.vue](../src/components/exports/ExportButton.vue) | 按 `type` 分发到 Word / PDF 导出按钮 |
| [src/components/exports/ExportWordButton.vue](../src/components/exports/ExportWordButton.vue) | 入口组件：段落分组、触发导出、loading/禁用态、角色标签与纯文本展示原语 |
| [src/utils/export.js](../src/utils/export.js) | 会话语义：消息文本提取、连续同角色合并、text/markdown 分类 |
| [src/utils/word.js](../src/utils/word.js) | 通用 Markdown/HTML AST → docx 转换器 + 构建器（懒加载 docx） |
| [src/components/md/render.js](../src/components/md/render.js) | md → 消毒 HTML（marked + remend + DOMPurify），与渲染层共用 |
| [src/components/md/registry.js](../src/components/md/registry.js) | 自定义节点注册与 `resolveDocxRenderer` 匹配 |
| [src/components/echarts/image.js](../src/components/echarts/image.js) | ECharts 离屏渲染为图片数据 |
| [src/utils/file.js](../src/utils/file.js) | `triggerDownload` 触发浏览器下载 |
| [src/plugins/md-components.js](../src/plugins/md-components.js) | `echarts` 代码块的渲染/导出注册示例 |
