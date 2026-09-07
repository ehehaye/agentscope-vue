<template>
  <div class="flex flex-col" :class="$attrs.class">
    <slot name="header" />
    <div class="flex w-full flex-col tw-rounded-28px border bg-background px-2">
      <div v-if="files.length > 0" class="flex flex-wrap gap-2 px-1 pt-1">
        <div
          v-for="(file, index) in files"
          :key="index"
          class="flex max-w-full items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs"
        >
          <Icon icon="lucide:file-text" class="h-3 w-3 shrink-0" />
          <span class="truncate">{{ file.name }}</span>
          <Icon
            icon="lucide:x"
            class="h-3 w-3 shrink-0 cursor-pointer"
            @click="removeFile(index)"
          />
        </div>
      </div>
      <div class="relative flex flex-wrap items-end justify-end">
        <textarea
          ref="textareaRef"
          v-model="value"
          :disabled="disabled"
          :placeholder="TEXT.inputPlaceholder"
          rows="1"
          class="block min-w-0 flex-1 resize-none rounded-md border-0 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          style="min-height: 52px; max-height: 168px; line-height: 21px; overflow-y: auto"
          @keydown="handleKeyDown"
        />
        <div class="flex shrink-0 items-center gap-2 py-2">
          <el-button
            type="text"
            size="small"
            circle
            :disabled="attachDisabled"
            @click="openFilePicker"
          >
            <Icon icon="lucide:paperclip" class="h-4 w-4" />
          </el-button>
          <el-button
            type="primary"
            size="small"
            circle
            :disabled="sendButton.disabled"
            @click="sendButton.onClick"
          >
            <Icon :icon="sendButton.icon" class="h-4 w-4" />
          </el-button>
        </div>
      </div>
    </div>
    <input
      ref="fileInputRef"
      type="file"
      multiple
      class="hidden"
      :accept="acceptAttr"
      @change="handleFileSelect"
    />
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@vue/composition-api';
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
