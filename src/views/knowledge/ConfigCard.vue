<template>
  <div class="tw-flex tw-flex-col tw-gap-y-3">
    <h3 class="tw-text-13_5px tw-font-medium tw-text-foreground">配置信息</h3>
    <div class="tw-grid tw-grid-cols-2 tw-gap-x-4 tw-gap-y-3 tw-rounded-lg tw-border tw-border-border tw-bg-card tw-p-3 sm:tw-grid-cols-3">
      <ConfigItem label="嵌入模型" :value="embedding.model" />
      <ConfigItem label="维度" :value="String(embedding.dimensions || '—')" />
      <ConfigItem label="凭证" :value="knowledgeBase.credential_name || embedding.credential_id" />
      <ConfigItem label="分块器" :value="chunkerValue" />
      <ConfigItem label="统计" :value="countsValue" />
      <ConfigItem v-if="statusValue" label="状态" :value="statusValue" />
      <ConfigItem label="创建时间" :value="createdAt" />
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import ConfigItem from './ConfigItem.vue';

export default defineComponent({
  name: 'KnowledgeConfigCard',
  components: { ConfigItem },
  props: {
    knowledgeBase: { type: Object, required: true },
  },
  setup(props) {
    const embedding = computed(() => props.knowledgeBase.embedding_model_config || {});
    const chunker = computed(() => props.knowledgeBase.chunker_config || null);
    const counts = computed(() => props.knowledgeBase.status_counts || { ready: 0, pending: 0, parsing: 0, chunking: 0, indexing: 0, error: 0 });

    const chunkerValue = computed(() => {
      if (!chunker.value) return '—';
      const params = chunker.value.parameters || {};
      const keys = Object.keys(params);
      if (keys.length === 0) return chunker.value.type;
      return `${chunker.value.type} · ${keys.map((k) => `${k}=${params[k]}`).join(', ')}`;
    });

    const countsValue = computed(() => {
      return `${props.knowledgeBase.document_count || 0} 文档 · ${props.knowledgeBase.chunk_count || 0} 分块`;
    });

    const unfinished = computed(() => {
      const c = counts.value;
      return (c.pending || 0) + (c.parsing || 0) + (c.chunking || 0) + (c.indexing || 0);
    });

    const statusValue = computed(() => {
      const c = counts.value;
      if (c.error > 0 || unfinished.value > 0) {
        return `就绪 ${c.ready || 0} · 索引中 ${unfinished.value} · 失败 ${c.error || 0}`;
      }
      return null;
    });

    const createdAt = computed(() => {
      const d = new Date(props.knowledgeBase.created_at);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    });

    return { embedding, chunkerValue, countsValue, statusValue, createdAt };
  },
});
</script>
