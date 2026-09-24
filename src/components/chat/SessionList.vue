<template>
  <div class="tw-flex tw-h-full tw-w-60 tw-shrink-0 tw-flex-col tw-gap-3 tw-overflow-hidden tw-rounded-22px tw-bg-card tw-p-3 tw-shadow-panel">
    <!-- Agent -->
    <div class="tw-flex tw-flex-col tw-gap-1.5">
      <div class="tw-flex tw-items-center tw-justify-between tw-px-1">
        <span class="tw-text-sm tw-text-muted-foreground">助手</span>
        <el-button size="mini" type="text" class="tw-h-auto tw-px-1 tw-py-0" @click="$emit('create-agent')">
          <Icon icon="lucide:plus" class="tw-h-3.5 tw-w-3.5" />
        </el-button>
      </div>
      <div class="tw-flex tw-items-center tw-gap-1">
        <AgentSelect
          class="tw-flex-1 tw-min-w-0"
          :agents="agents"
          :value="agentId"
          @change="$emit('agent-change', $event)"
        />
        <el-dropdown trigger="click" @command="handleAgentCommand">
          <el-button
            size="mini"
            type="text"
            class="tw-h-auto tw-px-1 tw-py-0"
            :disabled="!selectedAgent || !selectedAgent.editable"
          >
            <Icon icon="lucide:ellipsis" class="tw-h-3.5 tw-w-3.5" />
          </el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="edit">
              <span class="tw-inline-flex tw-items-center tw-gap-1.5">
                <Icon icon="lucide:settings-2" class="tw-h-3.5 tw-w-3.5" />
                设置
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

    <!-- Sessions -->
    <div class="tw-flex tw-min-h-0 tw-flex-col tw-gap-2">
      <div class="tw-flex tw-items-center tw-justify-between tw-px-1">
        <span class="tw-text-sm tw-text-muted-foreground">会话</span>
        <!-- <span class="tw-font-mono tw-text-xs tw-text-muted-foreground">{{ sessions.length }}</span> -->
      </div>
      <el-button size="small" class="tw-w-full" :disabled="!agentId" @click="$emit('create-session')">
        <span class="tw-flex tw-items-center tw-text-sm tw-text-muted-foreground">
          <Icon icon="lucide:plus" class="tw-mr-1 tw-h-3.5 tw-w-3.5" />
          新会话
        </span>
      </el-button>

      <div v-if="sessionsLoading" class="tw-flex tw-flex-1 tw-flex-col tw-items-center tw-justify-center tw-py-4">
        <Spinner className="h-5 tw-w-5" />
      </div>
      <PanelEmpty
        v-else-if="sessions.length === 0"
        icon="lucide:message-square-dashed"
        title="暂无会话"
        :description="agentId ? '当前助手下还没有会话' : '请先选择一个助手'"
      />
      <div v-else class="tw-min-h-0 tw-flex-1 tw-overflow-y-auto tw-py-2">
        <Collapsible
          v-for="(group, index) in dayGroups"
          :key="group.key"
          class="tw-mb-2"
          default-open
          trigger-class="tw-text-muted-foreground"
        >
          <template #trigger>
            <span class="tw-text-xs tw-px-1">{{ group.label }}</span>
            <span class="tw-font-mono tw-text-xs tw-opacity-60">{{ group.items.length }}</span>
            <span class="tw-flex-1"></span>
          </template>
          <ul class="tw-flex tw-flex-col tw-gap-0.5">
            <li v-for="v in group.items" :key="v.session.id">
              <SessionListItem
                :view="v"
                :active="v.session.id === sessionId"
                :show-source-icon="showSourceIcons"
                @click="$emit('session-change', v.session.id)"
                @rename="$emit('rename-session', v)"
                @delete="$emit('delete-session', v)"
              />
            </li>
          </ul>
        </Collapsible>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { Icon } from '@/plugins/iconify';
import { isToday, isYesterday, isValid, format } from 'date-fns';
import AgentSelect from '@/components/select/AgentSelect.vue';
import Spinner from '@/components/ui/Spinner.vue';
import PanelEmpty from '@/components/panel/PanelEmpty.vue';
import Collapsible from '@/components/ui/Collapsible.vue';
import SessionListItem from './SessionListItem.vue';

export default defineComponent({
  name: 'SessionList',
  components: { Icon, AgentSelect, Spinner, PanelEmpty, Collapsible, SessionListItem },
  props: {
    agents: { type: Array, default: () => [] },
    agentId: { type: String, default: '' },
    sessions: { type: Array, default: () => [] },
    sessionId: { type: String, default: '' },
    sessionsLoading: { type: Boolean, default: false },
  },
  emits: [
    'agent-change',
    'create-agent',
    'edit-agent',
    'delete-agent',
    'create-session',
    'session-change',
    'rename-session',
    'delete-session',
  ],
  setup(props, { emit }) {
    const selectedAgent = computed(() => props.agents.find((a) => a.id === props.agentId) || null);
    const dayGroups = computed(() => {
      const UNKNOWN_KEY = 'unknown';
      const groups = new Map();
      for (const v of props.sessions) {
        const raw = v.session?.created_at;
        const date = raw ? new Date(raw) : null;
        const valid = date && isValid(date);
        const key = valid ? format(date, 'yyyy-MM-dd') : UNKNOWN_KEY;
        if (!groups.has(key)) {
          groups.set(key, { key, label: dayLabel(date, valid), items: [] });
        }
        groups.get(key).items.push(v);
      }
      return Array.from(groups.values()).sort((a, b) => {
        if (a.key === UNKNOWN_KEY) return 1;
        if (b.key === UNKNOWN_KEY) return -1;
        return a.key < b.key ? 1 : -1;
      });
    });
    const showSourceIcons = computed(
      () => new Set(props.sessions.map((v) => v.session?.source)).size > 1,
    );

    function dayLabel(date, valid) {
      if (!valid) return '未知日期';
      if (isToday(date)) return '今天';
      if (isYesterday(date)) return '昨天';
      return date.getFullYear() === new Date().getFullYear()
        ? format(date, 'M月d日')
        : format(date, 'yyyy年M月d日');
    }

    function handleAgentCommand(command) {
      if (command === 'edit') emit('edit-agent', selectedAgent.value);
      if (command === 'delete') emit('delete-agent', selectedAgent.value);
    }

    return {
      selectedAgent,
      dayGroups,
      showSourceIcons,
      handleAgentCommand,
    };
  },
});
</script>
