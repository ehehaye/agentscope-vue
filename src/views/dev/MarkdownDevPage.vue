<template>
	<div class="tw-flex tw-h-full tw-flex-col">
		<!-- 工具栏 -->
		<header
			class="tw-flex tw-flex-wrap tw-items-center tw-gap-3 tw-border-b tw-border-border tw-bg-card tw-px-6 tw-py-3"
		>
			<h1 class="tw-text-sm tw-font-semibold tw-text-foreground">Markdown 渲染验证</h1>
			<div class="tw-flex-1"></div>
			<el-button size="small" @click="onToggleDark">
				{{ dark ? '切换浅色' : '切换深色' }}
			</el-button>
			<el-button size="small" type="primary" :loading="streaming" @click="startStream">
				{{ streaming ? '流式输出中…' : '模拟流式输出' }}
			</el-button>
			<el-button size="small" @click="reset">重置</el-button>
		</header>

		<!-- 内容区：静态样例 + 流式样例 -->
		<div class="tw-flex-1 tw-overflow-auto tw-bg-canvas tw-px-6 tw-py-6">
			<div class="tw-mx-auto tw-max-w-3xl tw-space-y-8">
				<section class="tw-rounded-lg tw-border tw-border-border tw-bg-card tw-p-6">
					<h2 class="tw-mb-4 tw-text-sm tw-font-medium tw-text-muted-foreground">
						静态样例（标题/表格/代码块/引用/列表）
					</h2>
					<MarkdownRenderer :content="staticSample" />
				</section>

				<section class="tw-rounded-lg tw-border tw-border-border tw-bg-card tw-p-6">
					<h2 class="tw-mb-4 tw-text-sm tw-font-medium tw-text-muted-foreground">
						流式样例（remend 自愈，分块追加）
					</h2>
					<MarkdownRenderer :content="streamContent" />
				</section>

				<section class="tw-rounded-lg tw-border tw-border-border tw-bg-card tw-p-6">
					<h2 class="tw-mb-4 tw-text-sm tw-font-medium tw-text-muted-foreground">
						XSS 过滤验证（应只显示文本，不弹窗）
					</h2>
					<MarkdownRenderer :content="xssSample" />
				</section>
			</div>
		</div>
	</div>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import MarkdownRenderer from '@/components/common/MarkdownRenderer.vue';

const STATIC_SAMPLE = `# AgentScope 渲染验证

## 文本样式
支持 **加粗**、*斜体*、~~删除线~~、\`行内代码\` 以及[链接](https://agentscope.io)。

> 引用块：这是一段引用文字，用于验证 md-blockquote 样式。

## 代码高亮
\`\`\`javascript
function greet(name) {
  // 验证 highlight.js 主题（浅色 vs.css / 深色待 Phase 4 切 github-dark）
  return \`你好，\${name}！\`;
}
console.log(greet('AgentScope'));
\`\`\`

\`\`\`python
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)
\`\`\`

## 表格
| 事件类型 | 说明 | 数量 |
| --- | --- | --- |
| TEXT_BLOCK_DELTA | 文本增量 | 27 |
| THINKING_BLOCK_DELTA | 思考增量 | 25 |
| TOOL_CALL_START | 工具调用开始 | 1 |

## 列表
1. 有序项一
2. 有序项二
   - 无序子项
   - 无序子项
3. 有序项三

---

分割线以下为结束。
`;

const STREAM_SAMPLE = `## 正在分析任务

我将分 **三步** 完成：

1. 读取会话配置
2. 调用模型生成回复
3. 渲染流式 Markdown

\`\`\`python
result = await agent.reply(user_msg)
print(result)
\`\`\`

> 流式输出过程中，未闭合的 **粗体**、代码块等由 remend 自愈，避免整页闪烁。

输出完成 ✅
`;

const SCRIPT_OPEN = '<' + 'script>';
const SCRIPT_CLOSE = '<' + '/script>';
const XSS_SAMPLE = `安全测试：

${SCRIPT_OPEN}alert('xss1')${SCRIPT_CLOSE}

<img src="x" onerror="alert('xss2')" />

[危险链接](javascript:alert('xss3'))

以上均应被 DOMPurify 过滤，页面不应弹出任何对话框。`;

export default defineComponent({
	name: 'MarkdownDevPage',
	components: { MarkdownRenderer },
	data() {
		return {
			staticSample: STATIC_SAMPLE,
			xssSample: XSS_SAMPLE,
			streamContent: '',
			streaming: false,
			timer: null,
		};
	},
	computed: {
		dark() {
			return this.$store.state.app.dark;
		},
	},
	beforeDestroy() {
		this.clearTimer();
	},
	methods: {
		onToggleDark() {
			this.$store.dispatch('app/toggleDark');
		},
		clearTimer() {
			if (this.timer) {
				clearInterval(this.timer);
				this.timer = null;
			}
		},
		startStream() {
			if (this.streaming) return;
			this.streamContent = '';
			this.streaming = true;
			// 按 2-4 个字符分块追加，模拟 SSE TEXT_BLOCK_DELTA 的真实节奏
			const chars = Array.from(STREAM_SAMPLE);
			let i = 0;
			this.timer = setInterval(() => {
				const step = 2 + Math.floor(Math.random() * 3);
				i = Math.min(i + step, chars.length);
				this.streamContent = chars.slice(0, i).join('');
				if (i >= chars.length) {
					this.clearTimer();
					this.streaming = false;
				}
			}, 60);
		},
		reset() {
			this.clearTimer();
			this.streaming = false;
			this.streamContent = '';
		},
	},
});
</script>
