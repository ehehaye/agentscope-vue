<template>
  <div class="flex h-full flex-col gap-3 text-sm">
    <div v-if="tasksContext && tasks.length > 0" class="flex shrink-0 items-center gap-2 pb-2">
      <span class="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs">
        已完成 {{ completedCount }}
      </span>
      <span class="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs">
        共 {{ tasks.length }}
      </span>
    </div>

    <div class="flex flex-1 flex-col overflow-y-auto">
      <template v-if="!tasksContext || tasks.length === 0">
        <PanelEmpty icon="lucide:list-x" title="暂无任务" description="当前会话没有任务计划。" />
      </template>
      <template v-else>
        <button
          v-if="showEllipsis && !expanded"
          type="button"
          class="flex w-full items-center justify-center rounded py-1 hover:bg-muted"
          @click="expanded = true"
        >
          <Icon icon="lucide:ellipsis" class="h-4 w-4 text-muted-foreground" />
        </button>
        <div
          v-for="task in displayedTasks"
          :key="task.id"
          class="flex items-center gap-2 rounded px-2 py-1"
          :class="task.state === 'completed' ? 'opacity-60' : ''"
        >
          <Icon
            :icon="stateIcon(task.state)"
            class="h-3 w-3 shrink-0"
            :class="task.state === 'in_progress' ? 'animate-spin' : ''"
          />
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="flex items-center gap-1.5">
              <span class="font-mono text-xs text-muted-foreground">#{{ task.id }}</span>
              <span class="truncate" :class="task.state === 'completed' ? 'line-through' : ''">{{ task.subject }}</span>
            </span>
            <span v-if="task.blocked_by && task.blocked_by.length > 0" class="text-xs text-muted-foreground">
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
