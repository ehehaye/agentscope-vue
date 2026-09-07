<template>
  <div
    class="tw-group tw-flex tw-cursor-pointer tw-items-center tw-justify-between tw-gap-2 tw-rounded-md tw-px-2 tw-py-1.5 hover:tw-bg-row-hover"
    :class="{ 'tw-bg-accent tw-text-foreground': active, 'tw-text-muted-foreground': !active }"
    @click="$emit('click')"
  >
    <div class="tw-flex tw-min-w-0 tw-items-center tw-gap-2">
      <Icon v-if="showSourceIcon" :icon="sourceIcon" class="tw-h-3.5 tw-w-3.5 tw-shrink-0" />
      <span class="tw-truncate tw-text-xs">{{ view.session?.config?.name || view.session?.id }}</span>
    </div>
    <div class="tw-flex tw-shrink-0 tw-items-center tw-gap-1">
      <span class="tw-font-mono tw-text-10px tw-opacity-60">{{ timeLabel }}</span>
      <el-dropdown trigger="click" size="mini" @command="handleCommand" @click.native.stop>
        <span class="tw-inline-flex tw-h-5 tw-w-5 tw-items-center tw-justify-center tw-rounded tw-opacity-0 tw-transition-opacity tw-duration-150 group-hover:tw-opacity-100 hover:tw-bg-muted">
          <Icon icon="lucide:ellipsis" class="tw-h-3 tw-w-3" />
        </span>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item command="rename">
            <span class="tw-inline-flex tw-items-center tw-gap-1.5">
              <Icon icon="lucide:pencil" class="tw-h-3.5 tw-w-3.5" />
              重命名
            </span>
          </el-dropdown-item>
          <el-dropdown-item command="delete" class="tw-text-danger">
            <span class="tw-inline-flex tw-items-center tw-gap-1.5">
              <Icon icon="lucide:trash-2" class="tw-h-3.5 tw-w-3.5" />
              删除
            </span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
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
