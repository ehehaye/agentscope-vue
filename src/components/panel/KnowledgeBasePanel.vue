<template>
  <div class="tw-flex tw-h-full tw-flex-col tw-gap-2">
    <div class="tw-flex tw-items-center tw-justify-between tw-gap-2">
      <span class="tw-text-sm tw-text-muted-foreground">选择要附加到当前会话的知识库。</span>
      <KnowledgeBaseParametersPopover
        :value="value"
        :schema="schema"
        :disabled="disabled"
        @change="onChange"
      />
    </div>
    <InputGroup>
      <InputGroupInput v-model="search" placeholder="搜索知识库" :disabled="disabled" />
      <InputGroupAddon align="inline-end">
        <Icon icon="lucide:search" class="tw-h-4 tw-w-4" />
      </InputGroupAddon>
    </InputGroup>

    <div class="tw-flex tw-flex-1 tw-flex-col tw-gap-2 tw-overflow-y-auto">
      <template v-if="loading">
        <div class="tw-flex tw-flex-1 tw-items-center tw-justify-center tw-text-sm tw-text-muted-foreground">加载中…</div>
      </template>
      <template v-else-if="filtered.length === 0">
        <PanelEmpty
          :icon="emptyIcon"
          :title="emptyTitle"
          :description="emptyDescription"
        />
      </template>
      <template v-else>
        <Item
          v-for="kb in filtered"
          :key="kb.id"
          variant="outline"
          class="tw-cursor-pointer"
          @click="toggle(kb.id)"
        >
          <el-checkbox :value="selectedIds.has(kb.id)" :disabled="disabled" @click.native.stop />
          <ItemContent>
            <ItemTitle>
              <span class="tw-cursor-pointer">{{ kb.name }}</span>
            </ItemTitle>
            <ItemDescription v-if="kb.description">{{ kb.description }}</ItemDescription>
            <div class="tw-flex tw-flex-wrap tw-gap-1">
              <span class="tw-rounded tw-border tw-px-1 tw-py-0 tw-text-10px">{{ kb.embedding_model_config?.model }}</span>
              <span class="tw-rounded tw-border tw-px-1 tw-py-0 tw-text-10px">{{ kb.embedding_model_config?.dimensions }}d</span>
            </div>
          </ItemContent>
        </Item>
      </template>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from '@/components/ui/InputGroup.js';
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from '@/components/ui/Item.js';
import PanelEmpty from './PanelEmpty.vue';
import KnowledgeBaseParametersPopover from '@/components/popover/KnowledgeBaseParametersPopover.vue';
import { useKnowledgeBaseMiddlewareSchema } from '@/composables/useKnowledgeBaseMiddlewareSchema.js';

export default defineComponent({
  name: 'KnowledgeBasePanel',
  components: {
    Icon,
    InputGroup,
    InputGroupInput,
    InputGroupAddon,
    Item,
    ItemContent,
    ItemTitle,
    ItemDescription,
    PanelEmpty,
    KnowledgeBaseParametersPopover,
  },
  props: {
    knowledgeBases: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    value: { type: Object, default: null },
    disabled: { type: Boolean, default: false },
    onChange: { type: Function, default: null },
  },
  setup(props) {
    const search = ref('');
    const { schema } = useKnowledgeBaseMiddlewareSchema();

    const selectedIds = computed(() => new Set(props.value?.knowledge_base_ids ?? []));

    const filtered = computed(() => {
      if (!search.value) return props.knowledgeBases;
      const q = search.value.toLowerCase();
      return props.knowledgeBases.filter((kb) => kb.name.toLowerCase().includes(q));
    });

    const emptyIcon = computed(() => (search.value ? 'lucide:search-x' : 'lucide:file-x'));
    const emptyTitle = computed(() => (search.value ? '无搜索结果' : '暂无知识库'));
    const emptyDescription = computed(() =>
      search.value ? `没有匹配 "${search.value}" 的知识库。` : '当前没有可用的知识库。',
    );

    function toggle(kbId) {
      if (props.disabled) return;
      const next = new Set(selectedIds.value);
      if (next.has(kbId)) next.delete(kbId);
      else next.add(kbId);
      const ids = Array.from(next);
      if (ids.length === 0) {
        props.onChange?.(null);
        return;
      }
      props.onChange?.({
        knowledge_base_ids: ids,
        parameters: props.value?.parameters ?? {},
      });
    }

    return {
      search,
      filtered,
      selectedIds,
      emptyIcon,
      emptyTitle,
      emptyDescription,
      toggle,
      schema,
    };
  },
});
</script>
