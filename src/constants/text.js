/**
 * 高频复用中文文案常量（去 i18n 后的唯一运行时文案层）。
 *
 * 来源：去 i18n 时从旧 zh.json 的 common / error 命名空间抽取的一次性产物
 * （原生成脚本 scripts/extract-i18n-texts.py 已随 src/i18n 一并移除）。
 * - 纯文案为字符串常量；带 {{占位符}} 的文案为函数，参数名与旧占位符一致。
 * - 页面/组件私有文案不进这里，直接在 .vue 中写字面量（见 migration/04.TEXTS.md）。
 */

// ── 通用按钮 / 状态 / 名词（common） ──
export const COMMON = {
	add: '添加',
	agent: '智能体',
	cancel: '取消',
	channel: '频道',
	chat: '聊天',
	close: '关闭',
	confirm: '确认',
	create: '创建',
	creating: '创建中…',
	credential: '凭证',
	date: '日期',
	delete: '删除',
	disabled: '已禁用',
	edit: '编辑',
	error: '出错了',
	information: '信息',
	knowledge: '知识库',
	loading: '加载中...',
	shownCount: (count) => `已显示 ${count} 个`,
	selectedCount: (selected, total) => `已选中 ${selected} 个，共 ${total} 个`,
	model: '模型',
	name: '名称',
	no: '否',
	noData: '暂无数据',
	readOnly: '只读',
	readOnlyTooltip: '该资源以只读方式共享给你，编辑和删除均被禁用。',
	completed: '已完成',
	failed: '已失败',
	running: '运行中',
	save: '保存',
	saving: '保存中…',
	schedule: '日程',
	selectAgent: '选择智能体',
	settings: '设置',
	team: '团队',
	uploading: '上传中',
	leader: '队长',
	time: '时间',
	yes: '是',
	deleteTitle: (entity, name) => `删除${entity} "${name}"？`,
	deleteDescription: '此操作无法撤销。',
	'mcp-hub': 'MCP 中心',
	mine: '我的',
	'my-mcp': '已安装的 MCP',
	'skill-hub': '技能中心',
	'my-skill': '已安装的技能',
	message: '消息',
	llm: 'LLM',
	tts: 'TTS',
	embedding: '向量',
};

// ── 错误边界（RouteError）（error） ──
export const ERROR = {
	description: '页面遇到意外错误。你可以重试或返回首页。',
	retry: '重试',
	home: '返回首页',
};
