<template>
  <div class="tw-flex tw-h-full tw-flex-col tw-gap-3 tw-text-sm">
    <div v-if="tasksContext && tasks.length > 0" class="tw-flex tw-shrink-0 tw-items-center tw-gap-2 tw-pb-2">
      <span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-bg-secondary tw-px-2 tw-py-0.5 tw-text-xs">
        已完成 {{ completedCount }}
      </span>
      <span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-bg-secondary tw-px-2 tw-py-0.5 tw-text-xs">
        共 {{ tasks.length }}
      </span>
    </div>

    <div class="tw-flex tw-flex-1 tw-flex-col tw-overflow-y-auto">
      <template v-if="!tasksContext || tasks.length === 0">
        <PanelEmpty icon="lucide:list-x" title="暂无任务" description="当前会话没有任务计划。" />
      </template>
      <template v-else>
        <button
          v-if="showEllipsis && !expanded"
          type="button"
          class="tw-flex tw-w-full tw-items-center tw-justify-center tw-rounded tw-py-1 hover:tw-bg-muted"
          @click="expanded = true"
        >
          <Icon icon="lucide:ellipsis" class="tw-h-4 tw-w-4 tw-text-muted-foreground" />
        </button>
        <div
          v-for="task in displayedTasks"
          :key="task.id"
          class="tw-flex tw-items-center tw-gap-2 tw-rounded tw-px-2 tw-py-1"
          :class="task.state === 'completed' ? 'tw-opacity-60' : ''"
        >
          <Icon
            :icon="stateIcon(task.state)"
            class="tw-h-3 tw-w-3 tw-shrink-0"
            :class="task.state === 'in_progress' ? 'tw-animate-spin' : ''"
          />
          <div class="tw-flex tw-min-w-0 tw-flex-1 tw-flex-col tw-gap-0.5">
            <span class="tw-flex tw-items-center tw-gap-1.5">
              <span class="tw-font-mono tw-text-xs tw-text-muted-foreground">#{{ task.id }}</span>
              <span class="tw-truncate" :class="task.state === 'completed' ? 'tw-line-through' : ''">{{ task.subject }}</span>
            </span>
            <span v-if="task.blocked_by && task.blocked_by.length > 0" class="tw-text-xs tw-text-muted-foreground">
              ← 依赖 {{ task.blocked_by.map((id) => `#${id}`).join(', ') }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import PanelEmpty from './PanelEmpty.vue';

export default defineComponent({
  name: 'TaskPanel',
  components: { Icon, PanelEmpty },
  props: {
    tasksContext: { type: Object, default: null },
  },
  setup(props) {
    const expanded = ref(false);
    const tasks = computed(() => props.tasksContext?.tasks ?? []);
    const completedCount = computed(() => tasks.value.filter((t) => t.state === 'completed').length);

    const MAX_VISIBLE_COMPLETED = 3;
    const ellipsisInfo = computed(() => {
      let consecutive = 0;
      for (const task of tasks.value) {
        if (task.state === 'completed') consecutive += 1;
        else break;
      }
      if (consecutive <= MAX_VISIBLE_COMPLETED) {
        return { showEllipsis: false, visibleTasks: tasks.value };
      }
      return {
        showEllipsis: true,
        visibleTasks: tasks.value.slice(consecutive - MAX_VISIBLE_COMPLETED),
      };
    });

    const showEllipsis = computed(() => ellipsisInfo.value.showEllipsis);
    const visibleTasks = computed(() => ellipsisInfo.value.visibleTasks);
    const displayedTasks = computed(() => (expanded.value ? tasks.value : visibleTasks.value));

    function stateIcon(state) {
      if (state === 'completed') return 'lucide:square-check';
      if (state === 'in_progress') return 'lucide:loader-2';
      return 'lucide:square';
    }

    return {
      expanded,
      tasks,
      completedCount,
      showEllipsis,
      displayedTasks,
      stateIcon,
    };
  },
});
</script>
