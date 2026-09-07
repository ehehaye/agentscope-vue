<template>
  <div class="flex flex-col gap-y-3">
    <h3 class="tw-text-13_5px font-medium text-foreground">{{ TEXT.knowledge.config.title }}</h3>
    <div class="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-3">
      <ConfigItem :label="TEXT.knowledge.config.embeddingModel" :value="embedding.model" />
      <ConfigItem :label="TEXT.knowledge.config.dimensions" :value="String(embedding.dimensions || '—')" />
      <ConfigItem :label="TEXT.knowledge.config.credential" :value="knowledgeBase.credential_name || embedding.credential_id" />
      <ConfigItem :label="TEXT.knowledge.config.chunker" :value="chunkerValue" />
      <ConfigItem :label="TEXT.knowledge.config.counts" :value="countsValue" />
      <ConfigItem v-if="statusValue" :label="TEXT.knowledge.config.status" :value="statusValue" />
      <ConfigItem :label="TEXT.knowledge.config.createdAt" :value="createdAt" />
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import ConfigItem from './ConfigItem.vue';
import { TEXT } from './text';

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
      return TEXT.knowledge.config.countsValue(
        props.knowledgeBase.document_count || 0,
        props.knowledgeBase.chunk_count || 0,
      );
    });

    const unfinished = computed(() => {
      const c = counts.value;
      return (c.pending || 0) + (c.parsing || 0) + (c.chunking || 0) + (c.indexing || 0);
    });

    const statusValue = computed(() => {
      const c = counts.value;
      if (c.error > 0 || unfinished.value > 0) {
        return TEXT.knowledge.config.statusValue(c.ready || 0, unfinished.value, c.error || 0);
      }
      return null;
    });

    const createdAt = computed(() => {
      const d = new Date(props.knowledgeBase.created_at);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    });

    return { embedding, chunkerValue, countsValue, statusValue, createdAt, TEXT };
  },
});
</script>
