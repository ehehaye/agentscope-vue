<template>
  <span>
  <el-dialog
    append-to-body
    custom-class="workdir-dialog"
    :visible.sync="dialogOpen"
    width="600px"
    :close-on-click-modal="false"
    @open="onOpen"
  >
    <template slot="title">
      <div class="tw-text-lg tw-font-semibold tw-text-foreground">工作目录</div>
      <div class="tw-mt-1 tw-text-sm tw-text-muted-foreground">选择智能体的工作目录。</div>
    </template>

    <div class="tw-mb-3 tw-flex tw-items-center tw-gap-2 tw-rounded-full tw-border tw-border-input tw-bg-background tw-px-3 tw-py-1.5 focus-within:tw-border-foreground">
      <button type="button" class="workdir-icon-btn" title="根目录" @click="load('')">
        <Icon icon="lucide:home" class="tw-h-4 tw-w-4" />
      </button>
      <input
        v-model="path"
        type="text"
        placeholder="输入路径后回车浏览"
        class="tw-min-w-0 tw-flex-1 tw-bg-transparent tw-py-1 tw-font-mono tw-text-sm tw-text-foreground placeholder:tw-text-muted-foreground focus:tw-outline-none"
        @keyup.enter="load(path)"
      />
      <button type="button" class="workdir-icon-btn" title="进入" @click="load(path)">
        <Icon icon="lucide:corner-down-left" class="tw-h-4 tw-w-4" />
      </button>
    </div>

    <div class="tw-h-45vh tw-overflow-y-auto tw-rounded-2xl tw-border tw-p-2">
      <div v-if="loading" class="tw-flex tw-h-full tw-items-center tw-justify-center tw-text-muted-foreground">
        <Spinner class="tw-h-5 tw-w-5" />
      </div>
      <div v-else-if="error" class="tw-flex tw-h-full tw-flex-col tw-items-center tw-justify-center tw-px-4 tw-text-center">
        <Icon icon="lucide:folder-open" class="tw-mb-2 tw-h-6 tw-w-6 tw-text-muted-foreground" />
        <p class="tw-text-sm tw-font-medium tw-text-foreground">无法列出目录</p>
        <p class="tw-mt-1 tw-break-all tw-text-xs tw-text-muted-foreground">{{ error }}</p>
      </div>
      <template v-else>
        <button type="button" class="workdir-row" @click="load(`${listedPath || ''}/..`)">
          <Icon icon="lucide:arrow-up" class="tw-h-4 tw-w-4 tw-shrink-0" />
          <span class="tw-truncate">上一级</span>
        </button>
        <div v-if="entries.length === 0" class="tw-px-3 tw-py-6 tw-text-center tw-text-xs tw-text-muted-foreground">
          该目录为空
        </div>
        <button
          v-for="entry in entries"
          :key="entry.name"
          type="button"
          class="workdir-row"
          :disabled="!entry.is_dir"
          @click="load(`${listedPath || ''}/${entry.name}`)"
        >
          <Icon :icon="entry.is_dir ? 'lucide:folder' : 'lucide:file'" class="tw-h-4 tw-w-4 tw-shrink-0" />
          <span
            class="tw-truncate"
            :class="entry.is_dir && !entry.name.startsWith('.') ? 'tw-text-foreground' : 'tw-text-muted-foreground'"
          >
            {{ entry.name }}
          </span>
        </button>
      </template>
    </div>

    <span slot="footer">
      <el-button size="small" :disabled="saving" @click="dialogOpen = false">{{ COMMON.cancel }}</el-button>
      <el-button
        size="small"
        type="primary"
        :loading="saving"
        :disabled="listedPath !== path"
        @click="onConfirm"
      >
        {{ COMMON.confirm }}
      </el-button>
    </span>
  </el-dialog>
  <el-button
    size="small"
    icon="el-icon-folder"
    :disabled="disabled || !agentId || !sessionId"
    @click="dialogOpen = true"
  >
    <span class="tw-truncate" style="max-width: 10rem;">{{ label }}</span>
    <i class="el-icon-arrow-down el-icon--right tw-ml-1" />
  </el-button>
  </span>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import Spinner from '@/components/ui/Spinner.vue';
import { workspaceApi } from '@/api';
import { COMMON } from '@/constants/text';

function basename(p) {
  if (!p) return '';
  const trimmed = p.replace(/\/+$/, '');
  const cut = trimmed.lastIndexOf('/');
  return cut === -1 ? trimmed : trimmed.slice(cut + 1);
}

export default defineComponent({
  name: 'WorkingDirectoryDialog',
  components: { Icon, Spinner },
  props: {
    agentId: { type: String, default: null },
    sessionId: { type: String, default: null },
    value: { type: String, default: null },
    disabled: { type: Boolean, default: false },
  },
  emits: ['change'],
  setup(props, { emit }) {
    const dialogOpen = ref(false);
    const path = ref('');
    const listedPath = ref(null);
    const entries = ref([]);
    const loading = ref(true);
    const error = ref(null);
    const saving = ref(false);
    let reqId = 0;

    const label = computed(() => (props.value ? basename(props.value) : '根目录'));

    async function load(target) {
      const id = ++reqId;
      if (!props.agentId || !props.sessionId) {
        loading.value = false;
        return;
      }
      loading.value = true;
      error.value = null;
      try {
        const listing = await workspaceApi.directories(props.agentId, props.sessionId, target);
        if (id !== reqId) return;
        entries.value = listing.entries || [];
        path.value = listing.path;
        listedPath.value = listing.path;
      } catch (e) {
        if (id !== reqId) return;
        listedPath.value = null;
        entries.value = [];
        error.value = e?.message || '列出目录失败';
      } finally {
        if (id === reqId) loading.value = false;
      }
    }

    function onOpen() {
      load(props.value || '');
    }

    async function onConfirm() {
      saving.value = true;
      error.value = null;
      try {
        await emit('change', path.value);
        dialogOpen.value = false;
      } catch (e) {
        error.value = e?.message || '保存失败';
      } finally {
        saving.value = false;
      }
    }

    watch(
      () => props.value,
      () => {
        if (dialogOpen.value) load(props.value || '');
      },
    );

    return {
      dialogOpen,
      path,
      listedPath,
      entries,
      loading,
      error,
      saving,
      label,
      load,
      onOpen,
      onConfirm,
      COMMON,
    };
  },
});
</script>

<style>
.workdir-dialog {
  border-radius: 20px;
}
.workdir-dialog .el-dialog__header {
  padding: 24px 24px 0;
}
.workdir-dialog .el-dialog__body {
  padding: 16px 24px 24px;
}
.workdir-dialog .el-dialog__footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border);
}
</style>

<style scoped>
.workdir-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 9999px;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;
}
.workdir-icon-btn:hover {
  color: var(--foreground);
  background-color: var(--accent);
}
.workdir-row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 14px;
  text-align: left;
  color: var(--foreground);
  cursor: pointer;
  transition: background-color 0.15s;
}
.workdir-row:hover:not(:disabled) {
  background-color: var(--accent);
}
.workdir-row:disabled {
  cursor: not-allowed;
}
</style>
