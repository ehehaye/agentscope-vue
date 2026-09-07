<template>
  <div class="tw-flex tw-flex-col" :class="$attrs.class">
    <slot name="header" />
    <div class="tw-flex tw-w-full tw-flex-col tw-rounded-28px tw-border tw-bg-background tw-px-2">
      <div v-if="files.length > 0" class="tw-flex tw-flex-wrap tw-gap-2 tw-px-1 tw-pt-1">
        <div
          v-for="(file, index) in files"
          :key="index"
          class="tw-flex tw-max-w-full tw-items-center tw-gap-2 tw-rounded-md tw-bg-muted tw-px-2 tw-py-1 tw-text-xs"
        >
          <Icon icon="lucide:file-text" class="tw-h-3 tw-w-3 tw-shrink-0" />
          <span class="tw-truncate">{{ file.name }}</span>
          <Icon
            icon="lucide:x"
            class="tw-h-3 tw-w-3 tw-shrink-0 tw-cursor-pointer"
            @click="removeFile(index)"
          />
        </div>
      </div>
      <div class="tw-relative tw-flex tw-flex-wrap tw-items-end tw-justify-end">
        <textarea
          ref="textareaRef"
          v-model="value"
          :disabled="disabled"
          :placeholder="TEXT.inputPlaceholder"
          rows="1"
          class="tw-block tw-min-w-0 tw-flex-1 tw-resize-none tw-rounded-md tw-border-0 tw-bg-transparent tw-px-3 tw-py-3 tw-text-sm tw-outline-none placeholder:tw-text-muted-foreground focus:tw-outline-none disabled:tw-cursor-not-allowed disabled:tw-opacity-50"
          style="min-height: 52px; max-height: 168px; line-height: 21px; overflow-y: auto"
          @keydown="handleKeyDown"
        />
        <div class="tw-flex tw-shrink-0 tw-items-center tw-gap-2 tw-py-2">
          <el-button
            type="text"
            size="small"
            circle
            :disabled="attachDisabled"
            @click="openFilePicker"
          >
            <Icon icon="lucide:paperclip" class="tw-h-4 tw-w-4" />
          </el-button>
          <el-button
            type="primary"
            size="small"
            circle
            :disabled="sendButton.disabled"
            @click="sendButton.onClick"
          >
            <Icon :icon="sendButton.icon" class="tw-h-4 tw-w-4" />
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
import { Icon } from '@iconify/vue2';
import { TEXT } from './text';

export default defineComponent({
  name: 'TextInput',
  components: { Icon },
  props: {
    disabled: { type: Boolean, default: false },
    phase: { type: String, default: 'idle' },
    allowedInputTypes: { type: Array, default: () => [] },
  },
  emits: ['send', 'interrupt'],
  setup(props, { emit }) {
    const value = ref('');
    const files = ref([]);
    const textareaRef = ref(null);
    const fileInputRef = ref(null);

    const acceptAttr = computed(() =>
      props.allowedInputTypes && props.allowedInputTypes.length > 0
        ? props.allowedInputTypes.join(',')
        : undefined,
    );

    const attachDisabled = computed(
      () => props.disabled || (props.allowedInputTypes !== undefined && props.allowedInputTypes.length === 0),
    );

    const sendButton = computed(() => {
      if (props.phase === 'streaming') {
        return {
          icon: 'lucide:square',
          disabled: false,
          onClick: () => emit('interrupt'),
        };
      }
      if (props.phase === 'interrupting') {
        return {
          icon: 'lucide:square',
          disabled: true,
          onClick: () => emit('interrupt'),
        };
      }
      return {
        icon: 'lucide:arrow-up',
        disabled: props.disabled || !value.value.trim(),
        onClick: handleSend,
      };
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
      value,
      files,
      textareaRef,
      fileInputRef,
      acceptAttr,
      attachDisabled,
      sendButton,
      handleKeyDown,
      handleSend,
      openFilePicker,
      removeFile,
      handleFileSelect,
      TEXT,
    };
  },
});
</script>
