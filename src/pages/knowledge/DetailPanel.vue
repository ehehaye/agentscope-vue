<template>
  <div class="flex h-full flex-col">
    <div class="flex items-start justify-between gap-x-4 p-[18px_18px_16px] shrink-0">
      <div class="flex min-w-0 flex-col gap-y-1">
        <div class="flex items-center gap-x-2">
          <span class="truncate text-lg font-medium tracking-[-0.015em] text-foreground">
            {{ knowledgeBase.name }}
          </span>
          <span v-if="!knowledgeBase.editable" class="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium" :title="COMMON.readOnlyTooltip">
            {{ COMMON.readOnly }}
          </span>
        </div>
        <p v-if="knowledgeBase.description" class="text-sm text-muted-foreground">{{ knowledgeBase.description }}</p>
      </div>
      <div class="flex shrink-0 items-center gap-x-2">
        <el-button size="small" @click="$emit('test')">
          <Icon icon="lucide:flask-conical" class="mr-1 h-3.5 w-3.5" />
          {{ TEXT.knowledge.test.button }}
        </el-button>
      </div>
    </div>

    <el-divider class="shrink-0" />

    <div class="min-h-0 flex-1 overflow-y-auto p-[20px_18px_24px]">
      <div class="flex flex-col gap-y-6">
        <ConfigCard :knowledge-base="knowledgeBase" />
        <KnowledgeDocumentsPanel :knowledge-base-id="knowledgeBase.id" />
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from '@vue/composition-api';
import { Icon } from '@iconify/vue2';
import KnowledgeDocumentsPanel from '@/components/knowledge/KnowledgeDocumentsPanel.vue';
import ConfigCard from './ConfigCard.vue';
import { COMMON } from '@/constants/text';
import { TEXT } from './text';

export default defineComponent({
  name: 'KnowledgeDetailPanel',
  components: { Icon, ConfigCard, KnowledgeDocumentsPanel },
  props: {
    knowledgeBase: { type: Object, required: true },
  },
  setup() {
    return { COMMON, TEXT };
  },
});
</script>
