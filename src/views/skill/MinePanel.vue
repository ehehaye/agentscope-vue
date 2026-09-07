<template>
  <div class="tw-flex tw-h-full tw-flex-col tw-p-5">
    <div class="tw-mb-4 tw-flex tw-items-center tw-justify-between">
      <div>
        <div class="tw-text-lg tw-font-medium">{{ COMMON['my-skill'] }}</div>
        <div class="tw-text-xs tw-text-muted-foreground">{{ TEXT.skill.mineDescription }}</div>
      </div>
      <el-input v-if="skills.length > 0" v-model="query" :placeholder="TEXT.skill.mineSearchPlaceholder" size="small" class="tw-w-48" />
    </div>

    <div class="tw-flex-1 tw-overflow-y-auto">
      <div v-if="loading" class="tw-flex tw-justify-center tw-py-10">
        <Spinner class="tw-h-6 tw-w-6" />
      </div>
      <div v-else-if="skills.length === 0" class="tw-flex tw-flex-col tw-items-center tw-gap-2 tw-py-10 tw-text-center">
        <Icon icon="lucide:plug" class="tw-h-8 tw-w-8 tw-text-muted-foreground" />
        <div class="tw-text-sm tw-font-medium">{{ TEXT.skill.mineEmptyTitle }}</div>
        <p class="tw-text-xs tw-text-muted-foreground">{{ TEXT.skill.mineEmptyDescription }}</p>
      </div>
      <div v-else-if="shown.length === 0" class="tw-py-10 tw-text-center tw-text-sm tw-text-muted-foreground">
        {{ TEXT.skill.noCardsTitle }}
      </div>
      <div v-else class="tw-space-y-2">
        <div
          v-for="skill in shown"
          :key="skill.id"
          class="tw-flex tw-cursor-pointer tw-items-center tw-gap-3 tw-rounded-lg tw-border tw-border-border tw-p-3 tw-transition-colors hover:tw-bg-muted"
          @click="openDetail(skill)"
        >
          <img v-if="skill.icon_url" :src="skill.icon_url" class="tw-h-10 tw-w-10 tw-rounded-md tw-object-cover" />
          <div v-else class="tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-md tw-bg-muted tw-text-sm tw-font-bold">
            {{ (skill.display_name || skill.name).slice(0, 1).toUpperCase() }}
          </div>
          <div class="tw-min-w-0 tw-flex-1">
            <div class="tw-flex tw-items-center tw-gap-2">
              <span class="tw-font-medium">{{ skill.display_name || skill.name }}</span>
              <span v-if="skill.hub_id" class="tw-text-xs tw-text-muted-foreground">@{{ skill.hub_id }}</span>
              <span v-for="tag in (skill.tags || []).slice(0, 4)" :key="tag" class="tw-rounded-full tw-bg-secondary tw-px-1.5 tw-py-0.5 tw-text-10px">#{{ tag }}</span>
            </div>
            <p class="tw-line-clamp-1 tw-text-xs tw-text-muted-foreground">{{ skill.description }}</p>
          </div>
          <div class="tw-flex tw-items-center tw-gap-2">
            <span v-if="skill.version" class="tw-text-xs tw-text-muted-foreground">{{ skill.version }}</span>
            <el-button type="text" size="mini" @click.stop="askRemove(skill)">
              <Icon icon="lucide:trash-2" class="tw-h-3.5 tw-w-3.5" />
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
      <div v-if="detailLoading" class="tw-flex tw-justify-center tw-py-10">
        <Spinner class="tw-h-6 tw-w-6" />
      </div>
      <div v-else-if="detailSkill" class="tw-flex tw-h-full tw-flex-col tw-gap-4 tw-p-4">
        <p class="tw-text-sm tw-text-muted-foreground">{{ detailSkill.description }}</p>
        <div v-if="detailSkill.version" class="tw-text-xs tw-text-muted-foreground">
          {{ TEXT.skill.versionLabel }}: {{ detailSkill.version }}
        </div>
        <div v-if="detailSkill.hub_id" class="tw-text-xs tw-text-muted-foreground">
          {{ TEXT.skill.hubLabel }}: {{ detailSkill.hub_id }}
        </div>
        <div v-if="detailMarkdown" class="tw-flex-1 tw-overflow-y-auto">
          <MarkdownRenderer :content="detailMarkdown" />
        </div>
        <div v-else class="tw-text-xs tw-text-muted-foreground">{{ TEXT.skill.noReadme }}</div>
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
import { defineComponent, ref, computed } from '@/composables/vue';
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
