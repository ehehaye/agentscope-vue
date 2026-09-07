<template>
  <div class="tw-flex tw-h-full tw-flex-col">
    <div class="tw-flex tw-items-start tw-justify-between tw-gap-x-4 tw-p-18_18_16px tw-shrink-0">
      <div class="tw-flex tw-min-w-0 tw-flex-col tw-gap-y-1">
        <div class="tw-flex tw-items-center tw-gap-x-2">
          <span class="tw-truncate tw-text-lg tw-font-medium tw-tracking-neg-0_015em tw-text-foreground">
            {{ knowledgeBase.name }}
          </span>
          <span v-if="!knowledgeBase.editable" class="tw-rounded-md tw-border tw-border-border tw-bg-secondary tw-px-1.5 tw-py-0.5 tw-text-10px tw-font-medium" :title="COMMON.readOnlyTooltip">
            {{ COMMON.readOnly }}
          </span>
        </div>
        <p v-if="knowledgeBase.description" class="tw-text-sm tw-text-muted-foreground">{{ knowledgeBase.description }}</p>
      </div>
      <div class="tw-flex tw-shrink-0 tw-items-center tw-gap-x-2">
        <el-button size="small" @click="$emit('test')">
          <Icon icon="lucide:flask-conical" class="tw-mr-1 tw-h-3.5 tw-w-3.5" />
          {{ TEXT.knowledge.test.button }}
        </el-button>
      </div>
    </div>

    <el-divider class="tw-shrink-0" />

    <div class="tw-min-h-0 tw-flex-1 tw-overflow-y-auto tw-p-20_18_24px">
      <div class="tw-flex tw-flex-col tw-gap-y-6">
        <ConfigCard :knowledge-base="knowledgeBase" />
        <KnowledgeDocumentsPanel :knowledge-base-id="knowledgeBase.id" />
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from '@/composables/vue';
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
