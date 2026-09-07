<template>
  <span>
  <el-dialog
    :visible.sync="dialogOpen"
    title="选择工作目录"
    width="560px"
    :close-on-click-modal="false"
    @open="onOpen"
  >
    <p class="tw-text-sm tw-text-muted-foreground tw-mb-3">选择会话的工作目录，仅目录可选。</p>
    <el-input
      v-model="path"
      placeholder="输入路径后回车浏览"
      class="tw-font-mono tw-text-sm tw-mb-2"
      @keyup.enter.native="load(path)"
    >
      <el-button
        slot="prepend"
        size="mini"
        icon="el-icon-house"
        title="根目录"
        @click="load('')"
      />
    </el-input>
    <div class="tw-h-45vh tw-overflow-y-auto tw-border tw-rounded-lg tw-p-1">
      <div v-if="loading" class="tw-flex tw-h-full tw-items-center tw-justify-center tw-text-sm tw-text-muted-foreground">
        <i class="el-icon-loading" />
      </div>
      <div v-else-if="error" class="tw-flex tw-h-full tw-flex-col tw-items-center tw-justify-center tw-text-center tw-px-4">
        <i class="el-icon-folder-opened tw-text-2xl tw-text-muted-foreground tw-mb-2" />
        <p class="tw-text-sm tw-font-medium">无法列出目录</p>
        <p class="tw-text-xs tw-text-muted-foreground tw-break-all tw-mt-1">{{ error }}</p>
      </div>
      <div v-else>
        <el-button
          size="small"
          icon="el-icon-top"
          plain
          class="tw-w-full tw-justify-start tw-mb-1"
          @click="load(`${listedPath || ''}/..`)"
        >
          上级目录
        </el-button>
        <div v-if="entries.length === 0" class="tw-px-2 tw-py-3 tw-text-center tw-text-xs tw-text-muted-foreground">
          该目录为空
        </div>
        <el-button
          v-for="entry in entries"
          :key="entry.name"
          size="small"
          class="tw-w-full tw-justify-start tw-mb-0.5"
          :disabled="!entry.is_dir"
          @click="load(`${listedPath || ''}/${entry.name}`)"
        >
          <i :class="entry.is_dir ? 'el-icon-folder' : 'el-icon-document'" class="tw-mr-1" />
          <span class="tw-truncate">{{ entry.name }}</span>
        </el-button>
      </div>
    </div>
    <span slot="footer">
      <el-button size="small" :disabled="saving" @click="dialogOpen = false">取消</el-button>
      <el-button
        size="small"
        type="primary"
        :loading="saving"
        :disabled="listedPath !== path"
        @click="onConfirm"
      >
        确认
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
import { workspaceApi } from '@/api';

function basename(p) {
  if (!p) return '';
  const trimmed = p.replace(/\/+$/, '');
  const cut = trimmed.lastIndexOf('/');
  return cut === -1 ? trimmed : trimmed.slice(cut + 1);
}

export default defineComponent({
  name: 'WorkingDirectoryDialog',
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
    };
  },
});
</script>
