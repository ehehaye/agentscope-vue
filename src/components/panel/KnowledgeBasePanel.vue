<template>
  <div class="flex h-full flex-col gap-2">
    <div class="flex items-center justify-between gap-2">
      <span class="text-sm text-muted-foreground">选择要附加到当前会话的知识库。</span>
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
        <Icon icon="lucide:search" class="h-4 w-4" />
      </InputGroupAddon>
    </InputGroup>

    <div class="flex flex-1 flex-col gap-2 overflow-y-auto">
      <template v-if="loading">
        <div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">加载中…</div>
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
          class="cursor-pointer"
          @click="toggle(kb.id)"
        >
          <el-checkbox :value="selectedIds.has(kb.id)" :disabled="disabled" @click.native.stop />
          <ItemContent>
            <ItemTitle>
              <span class="cursor-pointer">{{ kb.name }}</span>
            </ItemTitle>
            <ItemDescription v-if="kb.description">{{ kb.description }}</ItemDescription>
            <div class="flex flex-wrap gap-1">
              <span class="rounded border px-1 py-0 tw-text-10px">{{ kb.embedding_model_config?.model }}</span>
              <span class="rounded border px-1 py-0 tw-text-10px">{{ kb.embedding_model_config?.dimensions }}d</span>
            </div>
          </ItemContent>
        </Item>
      </template>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@vue/composition-api';
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
