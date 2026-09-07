<template>
  <div class="flex h-full flex-col p-5">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <div class="text-lg font-medium">{{ COMMON['my-skill'] }}</div>
        <div class="text-xs text-muted-foreground">{{ TEXT.skill.mineDescription }}</div>
      </div>
      <el-input v-if="skills.length > 0" v-model="query" :placeholder="TEXT.skill.mineSearchPlaceholder" size="small" class="w-48" />
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="loading" class="flex justify-center py-10">
        <Spinner class="h-6 w-6" />
      </div>
      <div v-else-if="skills.length === 0" class="flex flex-col items-center gap-2 py-10 text-center">
        <Icon icon="lucide:plug" class="h-8 w-8 text-muted-foreground" />
        <div class="text-sm font-medium">{{ TEXT.skill.mineEmptyTitle }}</div>
        <p class="text-xs text-muted-foreground">{{ TEXT.skill.mineEmptyDescription }}</p>
      </div>
      <div v-else-if="shown.length === 0" class="py-10 text-center text-sm text-muted-foreground">
        {{ TEXT.skill.noCardsTitle }}
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="skill in shown"
          :key="skill.id"
          class="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
          @click="openDetail(skill)"
        >
          <img v-if="skill.icon_url" :src="skill.icon_url" class="h-10 w-10 rounded-md object-cover" />
          <div v-else class="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-sm font-bold">
            {{ (skill.display_name || skill.name).slice(0, 1).toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ skill.display_name || skill.name }}</span>
              <span v-if="skill.hub_id" class="text-xs text-muted-foreground">@{{ skill.hub_id }}</span>
              <span v-for="tag in (skill.tags || []).slice(0, 4)" :key="tag" class="rounded-full bg-secondary px-1.5 py-0.5 text-[10px]">#{{ tag }}</span>
            </div>
            <p class="line-clamp-1 text-xs text-muted-foreground">{{ skill.description }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="skill.version" class="text-xs text-muted-foreground">{{ skill.version }}</span>
            <el-button type="text" size="mini" @click.stop="askRemove(skill)">
              <Icon icon="lucide:trash-2" class="h-3.5 w-3.5" />
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-drawer
      :title="detailSkill?.display_name || detailSkill?.name || '详情'"
      :visible.sync="detailOpen"
      direction="rtl"
      size="30rem"
    >
      <div v-if="detailLoading" class="flex justify-center py-10">
        <Spinner class="h-6 w-6" />
      </div>
      <div v-else-if="detailSkill" class="flex h-full flex-col gap-4 p-4">
        <p class="text-sm text-muted-foreground">{{ detailSkill.description }}</p>
        <div v-if="detailSkill.version" class="text-xs text-muted-foreground">
          {{ TEXT.skill.versionLabel }}: {{ detailSkill.version }}
        </div>
        <div v-if="detailSkill.hub_id" class="text-xs text-muted-foreground">
          {{ TEXT.skill.hubLabel }}: {{ detailSkill.hub_id }}
        </div>
        <div v-if="detailMarkdown" class="flex-1 overflow-y-auto">
          <MarkdownRenderer :content="detailMarkdown" />
        </div>
        <div v-else class="text-xs text-muted-foreground">{{ TEXT.skill.noReadme }}</div>
      </div>
    </el-drawer>

    <DeleteDialog
      :visible.sync="deleteOpen"
      :title="COMMON.deleteTitle(TEXT.skill.subtitle, deletingSkill?.display_name || deletingSkill?.name || '')"
      :description="COMMON.deleteDescription"
      :loading="deleteLoading"
      @confirm="confirmRemove"
    />
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@vue/composition-api';
import { Icon } from '@iconify/vue2';
import Spinner from '@/components/ui/Spinner.vue';
import DeleteDialog from '@/components/dialog/DeleteDialog.vue';
import MarkdownRenderer from '@/components/common/MarkdownRenderer.vue';
import { skillApi } from '@/api';
import { COMMON } from '@/constants/text';
import { TEXT } from './text';

export default defineComponent({
  name: 'SkillMinePanel',
  components: { Icon, Spinner, DeleteDialog, MarkdownRenderer },
  props: {
    skills: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
  },
  setup(props, { emit }) {
    const query = ref('');
    const shown = computed(() => {
      const needle = query.value.trim().toLowerCase();
      if (!needle) return props.skills;
      return props.skills.filter((skill) =>
        [skill.name, skill.display_name, skill.description, ...(skill.tags || [])]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(needle)),
      );
    });

    const detailOpen = ref(false);
    const detailSkill = ref(null);
    const detailMarkdown = ref('');
    const detailLoading = ref(false);

    async function openDetail(skill) {
      detailSkill.value = skill;
      detailMarkdown.value = '';
      detailOpen.value = true;
      detailLoading.value = true;
      try {
        const res = await skillApi.get(skill.id);
        detailSkill.value = res;
        detailMarkdown.value = res.markdown || '';
      } catch (e) {
        detailMarkdown.value = '';
      } finally {
        detailLoading.value = false;
      }
    }

    const deleteOpen = ref(false);
    const deletingSkill = ref(null);
    const deleteLoading = ref(false);

    function askRemove(skill) {
      deletingSkill.value = skill;
      deleteOpen.value = true;
    }

    async function confirmRemove() {
      if (!deletingSkill.value) return;
      deleteLoading.value = true;
      try {
        await emit('remove', deletingSkill.value.id);
        deleteOpen.value = false;
        deletingSkill.value = null;
      } finally {
        deleteLoading.value = false;
      }
    }

    return {
      query,
      shown,
      detailOpen,
      detailSkill,
      detailMarkdown,
      detailLoading,
      openDetail,
      deleteOpen,
      deletingSkill,
      deleteLoading,
      askRemove,
      confirmRemove,
      COMMON,
      TEXT,
    };
  },
});
</script>
