<template>
  <div
    class="tw-flex tw-flex-col"
    :class="$attrs.class"
  >
    <div class="tw-flex tw-w-full tw-flex-col tw-rounded-28px tw-border tw-bg-background tw-px-2 tw-group">
      <div
        v-if="files.length > 0"
        class="tw-flex tw-flex-wrap tw-gap-2 tw-px-1 tw-pt-1"
      >
        <div
          v-for="(file, index) in files"
          :key="index"
          class="tw-flex tw-max-w-full tw-items-center tw-gap-2 tw-rounded-md tw-bg-muted tw-px-2 tw-py-1 tw-text-xs"
        >
          <Icon
            icon="lucide:file-text"
            class="tw-h-3 tw-w-3 tw-shrink-0"
          />
          <span class="tw-truncate">{{ file.name }}</span>
          <Icon
            icon="lucide:x"
            class="tw-h-3 tw-w-3 tw-shrink-0 tw-cursor-pointer"
            @click.native="removeFile(index)"
          />
        </div>
      </div>

      <Scrollbar
        class="tw-w-full"
        :style="{
          height: `${inputHeight}px`,
          maxHeight: `${inputHeight}px`,
        }"
        wrapClass="tw-overflow-x-hidden"
      >
        <el-input
          ref="textareaRef"
          v-model="value"
          class="chat-textarea"
          type="textarea"
          :autosize="{ minRows: 1 }"
          resize="none"
          :maxlength="maxlength"
          :disabled="disabled"
          :placeholder="placeholder"
          @keydown.native="handleKeyDown"
        />
      </Scrollbar>
      <!-- 底部工具栏：左侧错误/会话状态，右侧根目录、附件与操作按钮 -->
      <div class="tw-flex tw-items-center tw-justify-between tw-gap-2 tw-px-2 tw-pb-2">
        <div class="tw-flex tw-min-w-0 tw-flex-1 tw-items-center tw-gap-1 tw-pl-3 tw-text-xs">
          <template v-if="errorText">
            <span
              class="tw-min-w-0 tw-truncate tw-text-red-500 dark:tw-text-red-400"
              :title="errorText"
              >{{ errorText }}</span
            >
          </template>
          <DotSpinner
            class="tw-pl-2"
            v-else-if="phase === AppReplyPhase.STREAMING"
          />
        </div>
        <div class="actions tw-flex tw-shrink-0 tw-items-center">
          <!-- 修复 el-input[type="textarea"] 时 clearable 无效 -->
          <el-button
            class="tw-opacity-0 tw-transition-opacity tw-duration-150 group-hover:tw-opacity-100 group-focus-within:tw-opacity-100"
            type="text"
            size="small"
            circle
            v-show="value.length"
            @click="value = ''"
          >
            <Icon
              icon="lucide:circle-x"
              class="tw-h-4 tw-w-4"
            />
          </el-button>
          <PrintHistoryButton
            target="#as-chat-history"
            v-show="exportable"
          />
          <slot name="actions" />
          <el-button
            type="text"
            size="small"
            circle
            :disabled="attachDisabled"
            @click="openFilePicker"
          >
            <Icon
              icon="lucide:paperclip"
              class="tw-h-4 tw-w-4"
            />
          </el-button>
          <el-button
            class="send-btn"
            type="primary"
            size="small"
            circle
            :disabled="sendButton.disabled"
            @click="sendButton.onClick"
          >
            <Icon
              :icon="sendButton.icon"
              class="tw-h-4 tw-w-4"
            />
          </el-button>
        </div>
      </div>
    </div>
    <input
      ref="fileInputRef"
      type="file"
      multiple
      class="tw-hidden"
      :accept="acceptAttr"
      @change="handleFileSelect"
    />
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';
import { Icon } from '@/components/iconify/index';
import DotSpinner from '@/components/ui/DotSpinner.vue';
import Scrollbar from '@/components/ui/Scrollbar.vue';
import PrintHistoryButton from './PrintHistoryButton.vue';
import { AppConnectionState, AppReplyPhase } from '@/constants/app-state';

export default defineComponent({
  name: 'TextInput',
  components: { Icon, DotSpinner, Scrollbar, PrintHistoryButton },
  props: {
    disabled: { type: Boolean, default: false },
    /**
     * 输入框相位。取值来自两处，都是本应用自定义（SDK 没有相位概念）：
     * - AppReplyPhase：`idle / streaming / interrupting`，由 chat store 维护；
     * - AppConnectionState.LOADING：会话未就绪，由 ChatContent 覆盖相位以禁用发送。
     */
    phase: { type: String, default: AppReplyPhase.IDLE },
    allowedInputTypes: { type: Array, default: () => [] },
    /** 最近一次交互的错误（chat store 的 error），存在时优先于阶段状态展示 */
    error: { type: [Object, String, Error], default: null },
    /** 是否允许导出历史消息。空会话（无消息渲染）时为 false，避免 v-print 找不到目标节点。 */
    exportable: { type: Boolean, default: true },
    maxRows: { type: Number, default: 3 },
    maxlength: { type: Number, default: 200 },
  },
  emits: ['send', 'interrupt'],
  setup(props, { emit }) {
    const value = ref('');
    const files = ref([]);
    const textareaRef = ref(null);
    const fileInputRef = ref(null);

    const acceptAttr = computed(() =>
      props.allowedInputTypes && props.allowedInputTypes.length > 0 ? props.allowedInputTypes.join(',') : undefined,
    );

    const attachDisabled = computed(
      () => props.disabled || (props.allowedInputTypes !== undefined && props.allowedInputTypes.length === 0),
    );

    // 占位符与发送按钮状态保持一致，提示当前不可发送的原因
    const placeholder = computed(() => {
      if (props.phase === AppReplyPhase.INTERRUPTING) return '正在中断回复...';
      if (props.disabled) return '请先选择助手与模型';
      return '输入消息...';
    });

    const sendButton = computed(() => {
      if (props.phase === AppReplyPhase.STREAMING) {
        return {
          icon: 'lucide:square',
          disabled: false,
          onClick: () => emit('interrupt'),
        };
      }
      if (props.phase === AppReplyPhase.INTERRUPTING) {
        return {
          icon: 'lucide:square',
          disabled: true,
          onClick: () => emit('interrupt'),
        };
      }
      // 会话加载中，禁止重复发送
      if (props.phase === AppConnectionState.LOADING) {
        return {
          icon: 'lucide:arrow-up',
          disabled: true,
          onClick: handleSend,
        };
      }
      return {
        icon: 'lucide:arrow-up',
        disabled: props.disabled || !value.value.trim(),
        onClick: handleSend,
      };
    });

    // 底部左侧：有错误时展示错误文案，否则在 streaming 阶段用三点跳动表示"工作中"
    const errorText = computed(() => (!props.error ? '' : props.error?.message || String(props.error)));

    // 输入框高度自适应，根据内容动态调整展示滚动条
    const inputHeight = computed(() => {
      const textRows = value.value.split('\n').length;
      const effectiveRows = textRows >= props.maxRows ? props.maxRows : textRows;
      const lineHeight = 26;
      const paddingY = 12;
      return effectiveRows * lineHeight + paddingY * 2;
    });

    function handleKeyDown(e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        handleSend();
      }
    }

    function handleSend() {
      const text = value.value.trim();
      if (!text || props.disabled || sendButton.value.disabled) return;

      const blocks = [
        {
          id: crypto.randomUUID(),
          type: 'text',
          text,
          created_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
      ];

      for (const file of files.value) {
        if (file.block) blocks.push(file.block);
      }

      emit('send', blocks);
      value.value = '';
      files.value = [];
    }

    function openFilePicker() {
      fileInputRef.value?.click();
    }

    function removeFile(index) {
      files.value.splice(index, 1);
    }

    async function processFile(file) {
      const filePath = file.path;
      if (filePath) {
        return {
          id: crypto.randomUUID(),
          type: 'data',
          source: {
            type: 'url',
            url: `file://${filePath}`,
            media_type: file.type || 'application/octet-stream',
          },
          name: file.name,
          created_at: new Date().toISOString(),
        };
      }

      if (file.type === 'text/plain') {
        const text = await file.text();
        return {
          id: crypto.randomUUID(),
          type: 'text',
          text: `[File: ${file.name}]\n${text}`,
          created_at: new Date().toISOString(),
        };
      }

      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      return {
        id: crypto.randomUUID(),
        type: 'data',
        source: {
          type: 'base64',
          media_type: file.type || 'application/octet-stream',
          data: base64,
        },
        name: file.name,
        created_at: new Date().toISOString(),
      };
    }

    async function handleFileSelect(e) {
      if (!e.target.files) return;
      const selected = Array.from(e.target.files);
      e.target.value = '';

      for (const file of selected) {
        const placeholder = { name: file.name, status: 'processing', block: null };
        files.value.push(placeholder);
        try {
          const block = await processFile(file);
          placeholder.status = 'done';
          placeholder.block = block;
        } catch {
          const idx = files.value.indexOf(placeholder);
          if (idx > -1) files.value.splice(idx, 1);
        }
      }
    }

    return {
      // 模板里比较相位时使用，避免散落字面量
      AppReplyPhase,
      value,
      files,
      textareaRef,
      fileInputRef,
      acceptAttr,
      attachDisabled,
      placeholder,
      sendButton,
      errorText,
      inputHeight,
      handleKeyDown,
      handleSend,
      openFilePicker,
      removeFile,
      handleFileSelect,
    };
  },
});
</script>

<style lang="less" scoped>
/* 还原原 textarea 的外观：容器已提供边框，这里只保留内边距与透明背景；
   高度交给 autosize 按行数计算（1~8 行），单行最小高度固定为 50px */
.chat-textarea {
  ::v-deep .el-textarea__inner {
    padding: 12px;
    min-height: 50px !important; /* autosize 会写入 45px 的行内 minHeight，需覆盖 */
    overflow-y: auto;
    background-color: transparent;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    color: var(--as-foreground);
    font-size: 14px;
    line-height: 21px;
  }

  &.is-disabled ::v-deep .el-textarea__inner {
    background-color: transparent;
    color: var(--as-foreground);
    cursor: not-allowed;
    opacity: 0.5;
  }
}

/* 发送按钮的实心圆盘收小一号，与仅图标的圆形按钮（附件/工作目录）观感一致。
   Element 的 .el-button--small.is-circle{padding:9px} 是双类选择器，
   这里需三个类才能稳定覆盖。 */
.send-btn.el-button.is-circle {
  padding: 3px;
  margin: 0 5px 0 5px !important;
}

.actions {
  > .el-button {
    margin: 0 !important;
  }
}
</style>
