<template>
  <el-drawer
    :visible.sync="drawerOpen"
    :title="document?.filename || '文档详情'"
    direction="rtl"
    size="560px"
    :before-close="onClose"
    destroy-on-close
  >
    <div v-if="document" class="flex h-full flex-col gap-3">
      <p class="text-sm text-muted-foreground">
        共 {{ document.chunk_count || 0 }} 个分块
      </p>
      <el-tabs v-model="activeTab" class="flex-1 min-h-0 flex flex-col">
        <el-tab-pane label="分块" name="chunks">
          <div class="flex flex-col gap-2" v-loading="chunksLoading">
            <p v-if="chunksError" class="text-sm text-danger">{{ chunksError }}</p>
            <div v-if="chunksUnsupported" class="text-center py-6 text-sm text-muted-foreground">
              当前向量存储不支持列出分块
            </div>
            <template v-else-if="chunks.length > 0">
              <div
                v-for="chunk in chunks"
                :key="chunk.chunk_index"
                class="rounded-md border p-3"
              >
                <span class="text-xs text-muted-foreground font-mono">
                  #{{ chunk.chunk_index + 1 }} / {{ chunk.total_chunks }}
                </span>
                <p class="mt-1 text-sm whitespace-pre-wrap break-words">
                  {{ chunkContent(chunk) }}
                </p>
              </div>
            </template>
            <div v-else-if="!chunksLoading" class="text-center py-6 text-sm text-muted-foreground">
              暂无分块
            </div>
            <el-pagination
              v-if="total > CHUNK_PAGE_SIZE"
              small
              layout="prev, pager, next"
              :current-page="page"
              :page-size="CHUNK_PAGE_SIZE"
              :total="total"
              @current-change="onPageChange"
            />
          </div>
        </el-tab-pane>
        <el-tab-pane label="预览" name="preview">
          <div class="flex flex-col gap-2" v-loading="previewLoading">
            <p v-if="previewError" class="text-sm text-danger">{{ previewError }}</p>
            <template v-if="isText && text !== null">
              <MarkdownRenderer v-if="media === 'text/markdown'" :content="text" />
              <pre v-else class="text-sm whitespace-pre-wrap break-words">{{ text }}</pre>
            </template>
            <iframe
              v-else-if="isPdf && tokenUrl"
              :src="tokenUrl"
              :title="document.filename"
              class="h-[60vh] w-full border"
            />
            <img
              v-else-if="isImage && tokenUrl"
              :src="tokenUrl"
              :alt="document.filename"
              class="max-w-full"
            />
            <div v-else-if="!previewLoading" class="text-center py-6">
              <p class="text-sm text-muted-foreground">
                {{ tooLargeToInline ? '文件过大，无法内联预览' : '无法预览此文件类型' }}
              </p>
              <el-button size="small" class="mt-2" icon="el-icon-download" @click="handleDownload">
                下载文件
              </el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-drawer>
</template>

<script>
import { defineComponent, ref, computed, watch, watchEffect } from '@vue/composition-api';
import { knowledgeBaseApi } from '@/api';
import MarkdownRenderer from '@/components/common/MarkdownRenderer.vue';

const CHUNK_PAGE_SIZE = 20;
const MAX_INLINE_TEXT_BYTES = 2 * 1024 * 1024;
const INLINE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'];

function mediaType(doc) {
  return (doc.content_type || '').split(';')[0].trim().toLowerCase();
}

export default defineComponent({
  name: 'DocumentDetailDrawer',
  components: { MarkdownRenderer },
  props: {
    open: { type: Boolean, default: false },
    knowledgeBaseId: { type: String, default: '' },
    document: { type: Object, default: null },
  },
  emits: ['update:open'],
  setup(props, { emit }) {
    const drawerOpen = ref(props.open);
    const activeTab = ref('chunks');

    // chunks
    const page = ref(1);
    const chunks = ref([]);
    const total = ref(0);
    const chunksLoading = ref(false);
    const chunksError = ref(null);
    const chunksUnsupported = ref(false);

    // preview
    const previewLoading = ref(false);
    const previewError = ref(null);
    const text = ref(null);
    const tokenUrl = ref(null);

    const media = computed(() => (props.document ? mediaType(props.document) : ''));
    const isTextType = computed(() => media.value === 'text/markdown' || media.value === 'text/plain');
    const tooLargeToInline = computed(
      () => isTextType.value && (props.document?.size || 0) > MAX_INLINE_TEXT_BYTES,
    );
    const isText = computed(() => isTextType.value && !tooLargeToInline.value);
    const isPdf = computed(() => media.value === 'application/pdf');
    const isImage = computed(() => INLINE_IMAGE_TYPES.includes(media.value));

    watch(
      () => props.open,
      (v) => {
        drawerOpen.value = v;
        if (v) {
          activeTab.value = 'chunks';
          loadChunks();
        }
      },
    );

    watch(drawerOpen, (v) => {
      emit('update:open', v);
    });

    // watch activeTab to load preview when switching
    watch(activeTab, (tab) => {
      if (tab === 'preview' && text.value === null && !tokenUrl.value && !previewLoading.value) {
        loadPreview();
      }
    });

    watch(
      () => [props.knowledgeBaseId, props.document?.id],
      () => {
        if (props.open) {
          chunks.value = [];
          text.value = null;
          tokenUrl.value = null;
          page.value = 1;
          loadChunks();
        }
      },
    );

    async function loadChunks() {
      if (!props.knowledgeBaseId || !props.document) return;
      chunksLoading.value = true;
      chunksError.value = null;
      chunksUnsupported.value = false;
      try {
        const res = await knowledgeBaseApi.listDocumentChunks(
          props.knowledgeBaseId,
          props.document.id,
          page.value,
          CHUNK_PAGE_SIZE,
        );
        chunks.value = res.chunks || [];
        total.value = res.total || 0;
      } catch (e) {
        if (e?.status === 501) chunksUnsupported.value = true;
        else chunksError.value = e?.message || String(e);
      } finally {
        chunksLoading.value = false;
      }
    }

    async function loadPreview() {
      if (!props.knowledgeBaseId || !props.document) return;
      previewLoading.value = true;
      previewError.value = null;
      try {
        if (isText.value) {
          text.value = await knowledgeBaseApi.fetchDocumentText(props.knowledgeBaseId, props.document.id);
        } else if (isPdf.value || isImage.value) {
          const { token } = await knowledgeBaseApi.createDocumentDownloadToken(
            props.knowledgeBaseId,
            props.document.id,
          );
          tokenUrl.value = knowledgeBaseApi.documentContentUrl(props.knowledgeBaseId, props.document.id, token);
        }
      } catch (e) {
        previewError.value = e?.message || String(e);
      } finally {
        previewLoading.value = false;
      }
    }

    async function handleDownload() {
      try {
        const { token } = await knowledgeBaseApi.createDocumentDownloadToken(
          props.knowledgeBaseId,
          props.document.id,
        );
        window.open(
          knowledgeBaseApi.documentContentUrl(props.knowledgeBaseId, props.document.id, token, true),
          '_blank',
        );
      } catch (e) {
        // error is toasted by client
      }
    }

    function onPageChange(p) {
      page.value = p;
      loadChunks();
    }

    function chunkContent(chunk) {
      if (chunk.content && typeof chunk.content === 'object' && 'text' in chunk.content) {
        return String(chunk.content.text || '');
      }
      return JSON.stringify(chunk.content);
    }

    function onClose() {
      drawerOpen.value = false;
    }

    return {
      drawerOpen,
      activeTab,
      page,
      chunks,
      total,
      chunksLoading,
      chunksError,
      chunksUnsupported,
      previewLoading,
      previewError,
      text,
      tokenUrl,
      media,
      isText,
      isPdf,
      isImage,
      tooLargeToInline,
      CHUNK_PAGE_SIZE,
      loadChunks,
      loadPreview,
      handleDownload,
      onPageChange,
      chunkContent,
      onClose,
    };
  },
});
</script>
