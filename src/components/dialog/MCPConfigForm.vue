<template>
  <div class="tw-space-y-4">
    <div>
      <div class="tw-mb-1 tw-text-sm tw-font-medium">配置 (JSON)</div>
      <el-input
        type="textarea"
        :rows="14"
        :value="value"
        :placeholder="placeholder"
        @input="(v) => $emit('update:value', v)"
      />
    </div>

    <div class="tw-flex tw-items-start tw-gap-2">
      <el-checkbox
        :value="stateful"
        @change="(v) => $emit('update:stateful', v)"
      />
      <div class="tw-leading-tight">
        <div class="tw-text-sm tw-font-medium">保持连接</div>
        <div class="tw-text-xs tw-text-muted-foreground">让 MCP 服务在会话期间常驻（有状态）。</div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from '@/composables/vue';

/**
 * 粘贴配置表单——只负责字段，提交按钮属于渲染它的对话框。
 * 两栏结构（配置 + 保持连接）与 React 版一致。
 */
export default defineComponent({
  name: 'MCPConfigForm',
  props: {
    /** 配置 JSON 文本。 */
    value: { type: String, default: '' },
    /** 是否让 MCP 服务保持常驻。 */
    stateful: { type: Boolean, default: true },
  },
  setup() {
    const placeholder = `{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}`;
    return { placeholder };
  },
});
</script>
