<template>
  <div class="tw-flex tw-h-full tw-flex-col tw-gap-2">
    <span class="tw-text-sm tw-text-muted-foreground">当前会话已装备的技能。</span>
    <InputGroup>
      <InputGroupInput v-model="search" placeholder="搜索技能" />
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
        <Item v-for="skill in filtered" :key="skill.name" variant="outline" class="tw-group/skill">
          <ItemMedia variant="image">
            <img
              v-if="installedByName[skill.name]?.icon_url"
              :src="installedByName[skill.name].icon_url"
              :alt="skill.name"
              class="tw-size-full tw-object-cover"
            />
            <span v-else class="tw-flex tw-size-full tw-items-center tw-justify-center tw-text-sm tw-font-medium">
              {{ skill.name.slice(0, 1).toUpperCase() }}
            </span>
          </ItemMedia>
          <ItemContent>
            <ItemTitle>
              <span class="tw-truncate">{{ skill.name }}</span>
              <span v-if="installedByName[skill.name]?.author" class="tw-text-xs tw-text-muted-foreground">
                @{{ installedByName[skill.name].author }}
              </span>
            </ItemTitle>
            <ItemDescription v-if="skill.description" class="tw-line-clamp-2">
              {{ skill.description }}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <el-button
              type="text"
              size="mini"
              class="tw-opacity-0 group-hover/skill:tw-opacity-100"
              @click="askRemove(skill.name)"
            >
              <Icon icon="lucide:trash" class="tw-h-3 tw-w-3" />
            </el-button>
          </ItemActions>
        </Item>
      </template>
    </div>

    <router-link to="/skill">
      <el-button type="primary" size="small" class="tw-w-full">
        <Icon icon="lucide:plus-circle" class="tw-h-4 tw-w-4" />
        添加技能
      </el-button>
    </router-link>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';
import { MessageBox } from 'element-ui';
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
  },
  props: {
    skills: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    onRemove: { type: Function, default: null },
  },
  setup(props) {
    const search = ref('');

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

    function askRemove(name) {
      if (!name) return;
      MessageBox.confirm('删除后无法恢复，是否继续？', `删除技能 "${name}"？`, {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      })
        .then(async () => {
          if (!props.onRemove) return;
          await props.onRemove(name);
        })
        .catch(() => {});
    }

    return {
      search,
      filtered,
      installedByName,
      emptyIcon,
      emptyTitle,
      emptyDescription,
      askRemove,
    };
  },
});
</script>
