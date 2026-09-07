<template>
  <div class="flex h-full flex-col gap-2">
    <span class="text-sm text-muted-foreground">当前会话已装备的技能。</span>
    <InputGroup>
      <InputGroupInput v-model="search" placeholder="搜索技能" />
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
        <Item v-for="skill in filtered" :key="skill.name" variant="outline" class="group/skill">
          <ItemMedia variant="image">
            <img
              v-if="installedByName[skill.name]?.icon_url"
              :src="installedByName[skill.name].icon_url"
              :alt="skill.name"
              class="size-full object-cover"
            />
            <span v-else class="flex size-full items-center justify-center text-sm font-medium">
              {{ skill.name.slice(0, 1).toUpperCase() }}
            </span>
          </ItemMedia>
          <ItemContent>
            <ItemTitle>
              <span class="truncate">{{ skill.name }}</span>
              <span v-if="installedByName[skill.name]?.author" class="text-xs text-muted-foreground">
                @{{ installedByName[skill.name].author }}
              </span>
            </ItemTitle>
            <ItemDescription v-if="skill.description" class="line-clamp-2">
              {{ skill.description }}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <el-button
              type="text"
              size="mini"
              class="opacity-0 group-hover/skill:opacity-100"
              @click="askRemove(skill.name)"
            >
              <Icon icon="lucide:trash" class="h-3 w-3" />
            </el-button>
          </ItemActions>
        </Item>
      </template>
    </div>

    <router-link to="/skill">
      <el-button type="primary" size="small" class="w-full">
        <Icon icon="lucide:plus-circle" class="h-4 w-4" />
        添加技能
      </el-button>
    </router-link>

    <DeleteDialog
      :visible.sync="deleteVisible"
      :title="deleteTitle"
      description="删除后无法恢复，是否继续？"
      :loading="deleteLoading"
      @confirm="doRemove"
    />
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
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from '@/components/ui/Item.js';
import PanelEmpty from './PanelEmpty.vue';
import DeleteDialog from '@/components/dialog/DeleteDialog.vue';
import { useSkills } from '@/composables/useSkills';

export default defineComponent({
  name: 'SkillPanel',
  components: {
    Icon,
    InputGroup,
    InputGroupInput,
    InputGroupAddon,
    Item,
    ItemMedia,
    ItemContent,
    ItemTitle,
    ItemDescription,
    ItemActions,
    PanelEmpty,
    DeleteDialog,
  },
  props: {
    skills: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    onRemove: { type: Function, default: null },
  },
  setup(props) {
    const search = ref('');
    const deleteVisible = ref(false);
    const deleteTarget = ref('');
    const deleteLoading = ref(false);

    const { skills: library } = useSkills();
    const installedByName = computed(() => {
      const map = {};
      for (const s of library.value) map[s.name] = s;
      return map;
    });

    const filtered = computed(() => {
      if (!search.value) return props.skills;
      const q = search.value.toLowerCase();
      return props.skills.filter((s) => s.name.toLowerCase().includes(q));
    });

    const emptyIcon = computed(() => (search.value ? 'lucide:search-x' : 'lucide:file-x'));
    const emptyTitle = computed(() => (search.value ? '无搜索结果' : '暂无技能'));
    const emptyDescription = computed(() =>
      search.value ? `没有匹配 "${search.value}" 的技能。` : '当前会话尚未装备任何技能。',
    );
    const deleteTitle = computed(() => `删除技能 "${deleteTarget.value}"？`);

    function askRemove(name) {
      deleteTarget.value = name;
      deleteVisible.value = true;
    }

    async function doRemove() {
      if (!props.onRemove || !deleteTarget.value) return;
      deleteLoading.value = true;
      try {
        await props.onRemove(deleteTarget.value);
      } finally {
        deleteLoading.value = false;
        deleteVisible.value = false;
        deleteTarget.value = '';
      }
    }

    return {
      search,
      filtered,
      installedByName,
      emptyIcon,
      emptyTitle,
      emptyDescription,
      deleteTitle,
      askRemove,
      deleteVisible,
      deleteTarget,
      deleteLoading,
      doRemove,
    };
  },
});
</script>
