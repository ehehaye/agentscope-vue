<template>
  <div class="flex flex-col gap-y-3">
    <div class="flex items-center justify-between">
      <h3 class="tw-text-13_5px font-medium">文档</h3>
      <div class="flex items-center gap-2">
        <el-button
          v-if="hasTerminalTasks"
          size="small"
          text
          @click="handleClearFinished"
        >
          清除已完成
        </el-button>
        <el-button size="small" type="primary" @click="openFilePicker">
          <Icon icon="lucide:upload" class="mr-1 h-3.5 w-3.5" />
          上传文档
        </el-button>
        <input
          ref="fileInputRef"
          type="file"
          multiple
          class="hidden"
          :accept="acceptAttr"
          @change="handleFileSelect"
        />
      </div>
    </div>

    <div v-if="loading" class="py-4 text-center text-sm text-muted-foreground">加载中...</div>
    <template v-else>
      <div v-if="rows.length === 0" class="py-4 text-center text-sm text-muted-foreground">
        暂无文档
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="row in rows"
          :key="row.key"
          class="flex flex-col gap-y-2 rounded-lg border border-border bg-card p-3"
        >
          <div class="flex items-start gap-x-3">
            <Icon icon="lucide:file-text" class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div class="flex min-w-0 flex-1 flex-col gap-y-0.5">
              <div class="flex items-center gap-x-2">
                <span
                  class="truncate text-sm font-medium"
                  :class="row.doc && row.phase === 'ready' ? 'cursor-pointer text-primary hover:underline' : ''"
                  @click="row.doc && row.phase === 'ready' && handleOpenDetail(row.doc)"
                >{{ row.filename }}</span>
                <span
                  class="inline-flex shrink-0 items-center gap-x-1 rounded-md px-1.5 py-0.5 tw-text-10px font-medium whitespace-nowrap"
                  :class="statusTone(row.phase)"
                >
                  <Icon v-if="row.phase === 'ready'" icon="lucide:check-circle-2" class="h-3 w-3" />
                  <Icon v-else-if="row.phase === 'error'" icon="lucide:alert-circle" class="h-3 w-3" />
                  <Icon v-else-if="row.phase !== 'cancelled'" icon="lucide:loader-2" class="h-3 w-3 animate-spin" />
                  {{ statusLabel(row.phase) }}
                </span>
              </div>
              <div class="flex items-center gap-x-2 text-xs text-muted-foreground">
                <span>{{ formatSize(row.size) }}</span>
                <template v-if="row.chunkCount > 0">
                  <span>·</span>
                  <span>{{ row.chunkCount }} 个分块</span>
                </template>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-x-1">
              <el-button
                v-if="row.canCancel"
                type="text"
                size="mini"
                @click="handleCancel(row.task.taskId)"
              >
                <Icon icon="lucide:x" class="h-3.5 w-3.5" />
              </el-button>
              <el-button
                v-else-if="row.canDismiss"
                type="text"
                size="mini"
                @click="handleDismiss(row.task.taskId)"
              >
                <Icon icon="lucide:x" class="h-3.5 w-3.5" />
              </el-button>
              <el-button v-else-if="row.doc" type="text" size="mini" @click="handleDelete(row.doc)">
                <Icon icon="lucide:trash-2" class="h-3.5 w-3.5" />
              </el-button>
            </div>
          </div>
          <div
            v-if="row.showProgress"
            class="relative h-1 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              class="h-full rounded-full transition-all"
              :class="row.phase === 'error' ? 'bg-red-500' : 'bg-primary'"
              :style="{ width: row.progressValue + '%' }"
            />
          </div>
          <p v-if="row.phase === 'error' && row.error" class="text-xs text-red-500">
            {{ row.error }}
          </p>
        </div>
      </div>
    </template>

    <DeleteDialog
      :visible.sync="deleteVisible"
      title="删除文档"
      :description="deleteTarget ? `确定删除「${deleteTarget.filename}」吗？` : ''"
      :loading="deleting"
      @confirm="confirmDelete"
    />
    <DocumentDetailDrawer
      :open.sync="detailVisible"
      :knowledge-base-id="knowledgeBaseId"
      :document="detailDoc"
    />
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch, toRef } from '@vue/composition-api';
import { Icon } from '@iconify/vue2';
import { knowledgeBaseApi } from '@/api';
import { toast } from '@/lib/toast';
import DeleteDialog from '@/components/dialog/DeleteDialog.vue';
import DocumentDetailDrawer from '@/components/knowledge/DocumentDetailDrawer.vue';
import { useUploadCenter } from '@/composables/useUploadCenter.js';
import { useDocumentStatusPolling } from '@/composables/useDocumentStatusPolling.js';
import { useKnowledgeDocuments } from '@/composables/useKnowledgeDocuments.js';
import { useKnowledgeSupportedContentTypes } from '@/composables/useKnowledgeSupportedContentTypes.js';

const TERMINAL_SERVER_STATUSES = ['ready', 'error'];

function isTerminal(phase) {
  return phase === 'ready' || phase === 'error' || phase === 'cancelled';
}

function formatSize(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

const STATUS_LABELS = {
  queued: '排队中',
  uploading: '上传中',
  pending: '待处理',
  parsing: '解析中',
  chunking: '分块中',
  indexing: '索引中',
  ready: '已就绪',
  error: '失败',
  cancelled: '已取消',
};

function statusLabel(phase) {
  return STATUS_LABELS[phase] || phase;
}

function statusTone(phase) {
  switch (phase) {
    case 'ready':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
    case 'error':
      return 'bg-red-500/10 text-red-600 dark:text-red-400';
    case 'cancelled':
      return 'bg-muted text-muted-foreground';
    case 'queued':
    case 'uploading':
    case 'pending':
    case 'parsing':
    case 'chunking':
    case 'indexing':
    default:
      return 'bg-primary/10 text-primary';
  }
}

export default defineComponent({
  name: 'KnowledgeDocumentsPanel',
  components: { Icon, DeleteDialog, DocumentDetailDrawer },
  props: {
    knowledgeBaseId: { type: String, required: true },
  },
  setup(props) {
    const fileInputRef = ref(null);
    const deleteVisible = ref(false);
    const deleteTarget = ref(null);
    const deleting = ref(false);
    const detailVisible = ref(false);
    const detailDoc = ref(null);
    let lastRefetchedKey = '';

    const kbIdRef = toRef(props, 'knowledgeBaseId');

    const { documents, loading, refetch } = useKnowledgeDocuments(kbIdRef);
    const { enqueue, cancel, dismiss, tasksForKb, clearFinishedForKb } = useUploadCenter();
    const { statuses } = useDocumentStatusPolling({
      knowledgeBaseId: kbIdRef,
      documents,
    });
    const { extensions, mediaTypes } = useKnowledgeSupportedContentTypes();

    const tasks = computed(() => tasksForKb(props.knowledgeBaseId));

    const extensionSet = computed(
      () => new Set(extensions.value.map((ext) => ext.toLowerCase())),
    );
    const acceptAttr = computed(() =>
      [...extensions.value, ...mediaTypes.value].join(','),
    );

    // 合并服务端文档 + 本地上传任务为统一行列表，任务在前
    const rows = computed(() => {
      const unclaimed = new Map(documents.value.map((doc) => [doc.id, doc]));
      const taskRows = tasks.value.map((task) => {
        const doc = task.documentId ? unclaimed.get(task.documentId) : undefined;
        if (!doc) return buildRow({ kind: 'local', task });
        unclaimed.delete(doc.id);
        return buildRow({ kind: 'server', doc, localTask: task });
      });
      const documentRows = [...unclaimed.values()].map((doc) =>
        buildRow({ kind: 'server', doc, localTask: null }),
      );
      return [...taskRows, ...documentRows];
    });

    function buildRow(row) {
      const filename = row.kind === 'server' ? row.doc.filename : row.task.filename;
      const size = row.kind === 'server' ? row.doc.size : row.task.size;

      // 阶段：本地任务未到服务端终态时以本地为准
      let phase;
      if (row.kind === 'local') {
        phase = row.task.phase;
      } else {
        const localPhase = row.localTask?.phase;
        if (localPhase && !TERMINAL_SERVER_STATUSES.includes(row.doc.status)) {
          phase = localPhase;
        } else {
          phase = row.doc.status;
        }
      }

      // 进度：uploading 用字节进度，其余用阶段估算值
      let progressValue = 0;
      let indeterminate = false;
      if (phase === 'uploading' && row.kind === 'local') {
        if (!row.task.size) {
          progressValue = 0;
          indeterminate = true;
        } else {
          progressValue = Math.min(100, Math.round((row.task.loaded / row.task.size) * 100));
        }
      } else {
        switch (phase) {
          case 'queued': progressValue = 5; break;
          case 'pending': progressValue = 35; indeterminate = true; break;
          case 'parsing': progressValue = 55; indeterminate = true; break;
          case 'chunking': progressValue = 75; indeterminate = true; break;
          case 'indexing': progressValue = 90; indeterminate = true; break;
          case 'ready': progressValue = 100; break;
          default: progressValue = 0;
        }
      }

      const error = row.kind === 'local' ? row.task.error : row.doc.error;
      const chunkCount = row.kind === 'server' ? row.doc.chunk_count : 0;
      const task = row.kind === 'local' ? row.task : row.localTask;
      const doc = row.kind === 'server' ? row.doc : null;
      const taskIdForCancel = task?.taskId ?? null;

      const canCancel = phase === 'queued' || phase === 'uploading';
      const canDismiss =
        (phase === 'cancelled' || phase === 'error') && row.kind === 'local';

      return {
        key: doc ? doc.id : (task?.documentId ?? task?.taskId),
        filename,
        size,
        phase,
        progressValue,
        indeterminate,
        error,
        chunkCount,
        showProgress: phase !== 'ready' && phase !== 'cancelled',
        canCancel,
        canDismiss,
        task,
        doc,
        taskIdForCancel,
      };
    }

    const hasTerminalTasks = computed(() =>
      tasks.value.some((t) => isTerminal(t.phase)),
    );

    // 轮询到终态时拉取一次文档列表（拿最终 chunk_count / error）
    const terminalIdsKey = computed(() => {
      const ids = [];
      for (const id of Object.keys(statuses.value)) {
        const s = statuses.value[id];
        if (s.status === 'ready' || s.status === 'error') ids.push(id);
      }
      return ids.sort().join(',');
    });
    watch(terminalIdsKey, (key) => {
      if (!key) return;
      if (key === lastRefetchedKey) return;
      lastRefetchedKey = key;
      void refetch();
    });

    function openFilePicker() {
      fileInputRef.value?.click();
    }

    function handleFileSelect(e) {
      const files = e.target.files;
      if (files) handleFiles(files);
      e.target.value = '';
    }

    function handleFiles(fileList) {
      const arr = Array.from(fileList);
      if (arr.length === 0) return;
      const accepted = [];
      for (const f of arr) {
        if (extensionSet.value.size === 0) {
          accepted.push(f);
          continue;
        }
        const dot = f.name.lastIndexOf('.');
        const ext = dot >= 0 ? f.name.slice(dot).toLowerCase() : '';
        if (ext && extensionSet.value.has(ext)) {
          accepted.push(f);
        } else {
          toast.error(`不支持的文件类型：${f.name}`);
        }
      }
      if (accepted.length === 0) return;
      enqueue(props.knowledgeBaseId, accepted);
    }

    function handleCancel(taskId) {
      cancel(taskId);
    }

    function handleDismiss(taskId) {
      dismiss(taskId);
    }

    function handleClearFinished() {
      clearFinishedForKb(props.knowledgeBaseId);
    }

    function handleDelete(doc) {
      deleteTarget.value = doc;
      deleteVisible.value = true;
    }

    function handleOpenDetail(doc) {
      if (!doc) return;
      detailDoc.value = doc;
      detailVisible.value = true;
    }

    async function confirmDelete() {
      if (!deleteTarget.value) return;
      deleting.value = true;
      try {
        await knowledgeBaseApi.deleteDocument(props.knowledgeBaseId, deleteTarget.value.id);
        deleteVisible.value = false;
        deleteTarget.value = null;
        await refetch();
      } catch {
        toast.error('删除失败');
      } finally {
        deleting.value = false;
      }
    }

    return {
      fileInputRef,
      documents,
      loading,
      rows,
      hasTerminalTasks,
      acceptAttr,
      statusLabel,
      statusTone,
      formatSize,
      openFilePicker,
      handleFileSelect,
      handleCancel,
      handleDismiss,
      handleDelete,
      handleClearFinished,
      deleteVisible,
      deleteTarget,
      deleting,
      detailVisible,
      detailDoc,
      handleOpenDetail,
      confirmDelete,
    };
  },
});
</script>
