<template>
  <div
    class="group flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-row-hover"
    :class="{ 'bg-accent text-foreground': active, 'text-muted-foreground': !active }"
    @click="$emit('click')"
  >
    <div class="flex min-w-0 items-center gap-2">
      <Icon v-if="showSourceIcon" :icon="sourceIcon" class="h-3.5 w-3.5 shrink-0" />
      <span class="truncate text-xs">{{ view.session?.config?.name || view.session?.id }}</span>
    </div>
    <div class="flex shrink-0 items-center gap-1">
      <span class="font-mono tw-text-10px opacity-60">{{ timeLabel }}</span>
      <el-dropdown trigger="click" size="mini" @command="handleCommand" @click.native.stop>
        <span class="inline-flex h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-muted">
          <Icon icon="lucide:ellipsis" class="h-3 w-3" />
        </span>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item command="rename">
            <span class="inline-flex items-center gap-1.5">
              <Icon icon="lucide:pencil" class="h-3.5 w-3.5" />
              重命名
            </span>
          </el-dropdown-item>
          <el-dropdown-item command="delete" class="text-danger">
            <span class="inline-flex items-center gap-1.5">
              <Icon icon="lucide:trash-2" class="h-3.5 w-3.5" />
              删除
            </span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from '@vue/composition-api';
import { Icon } from '@iconify/vue2';
import { format } from 'date-fns';

const SOURCE_ICON = {
  user: 'lucide:bot-message-square',
  schedule: 'lucide:calendar-clock',
  channel: 'lucide:cable',
};

export default defineComponent({
  name: 'SessionListItem',
  components: { Icon },
  props: {
    view: { type: Object, required: true },
    active: { type: Boolean, default: false },
    showSourceIcon: { type: Boolean, default: false },
  },
  emits: ['click', 'rename', 'delete'],
  setup(props, { emit }) {
    const sourceIcon = computed(() => SOURCE_ICON[props.view.session?.source] || 'lucide:message-square');
    const timeLabel = computed(() => {
      const createdAt = props.view.session?.created_at;
      if (!createdAt) return '';
      return format(new Date(createdAt), 'HH:mm');
    });

    function handleCommand(command) {
      if (command === 'rename') emit('rename', props.view);
      if (command === 'delete') emit('delete', props.view);
    }

    return { sourceIcon, timeLabel, handleCommand };
  },
});
</script>
