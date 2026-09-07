<template>
  <div class="flex h-full w-60 shrink-0 flex-col gap-3 overflow-hidden rounded-[22px] bg-card p-3 shadow-panel">
    <!-- Agent -->
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between px-1">
        <span class="text-xs text-muted-foreground">助手</span>
        <el-button size="mini" type="text" class="h-auto px-1 py-0" @click="$emit('create-agent')">
          <Icon icon="lucide:plus" class="h-3.5 w-3.5" />
        </el-button>
      </div>
      <div class="flex items-center gap-1">
        <AgentSelect
          class="flex-1 min-w-0"
          :agents="agents"
          :value="agentId"
          @change="$emit('agent-change', $event)"
        />
        <el-dropdown trigger="click" @command="handleAgentCommand">
          <el-button
            size="mini"
            type="text"
            class="h-auto px-1 py-0"
            :disabled="!selectedAgent || !selectedAgent.editable"
          >
            <Icon icon="lucide:ellipsis" class="h-3.5 w-3.5" />
          </el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="edit">
              <span class="inline-flex items-center gap-1.5">
                <Icon icon="lucide:settings-2" class="h-3.5 w-3.5" />
                设置
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

    <el-divider class="my-0" />

    <!-- Sessions -->
    <div class="flex min-h-0 flex-col gap-2">
      <div class="flex items-center justify-between px-1">
        <span class="text-xs text-muted-foreground">会话</span>
        <span class="font-mono text-[10px] text-muted-foreground">{{ sessions.length }}</span>
      </div>
      <el-button size="small" class="w-full" :disabled="!agentId" @click="$emit('create-session')">
        <Icon icon="lucide:plus" class="mr-1 h-3.5 w-3.5" />
        新会话
      </el-button>

      <div v-if="sessionsLoading" class="flex flex-1 flex-col items-center justify-center py-4">
        <Spinner className="h-5 w-5" />
      </div>
      <PanelEmpty
        v-else-if="sessions.length === 0"
        icon="lucide:message-square-dashed"
        title="暂无会话"
        :description="agentId ? '当前助手下还没有会话' : '请先选择一个助手'"
      />
      <div v-else class="min-h-0 flex-1 overflow-y-auto pr-1">
        <div v-if="todaySessions.length > 0" class="mb-2">
          <div class="px-1 py-1 text-[10px] text-muted-foreground">今天</div>
          <ul class="flex flex-col gap-0.5">
            <li v-for="v in todaySessions" :key="v.session.id">
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
        </div>
        <div v-if="earlierSessions.length > 0">
          <div class="px-1 py-1 text-[10px] text-muted-foreground">更早</div>
          <ul class="flex flex-col gap-0.5">
            <li v-for="v in earlierSessions" :key="v.session.id">
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
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from '@vue/composition-api';
import { Icon } from '@iconify/vue2';
import { isToday } from 'date-fns';
import AgentSelect from '@/components/select/AgentSelect.vue';
import Spinner from '@/components/ui/Spinner.vue';
import PanelEmpty from '@/components/panel/PanelEmpty.vue';
import SessionListItem from './SessionListItem.vue';

export default defineComponent({
  name: 'SessionList',
  components: { Icon, AgentSelect, Spinner, PanelEmpty, SessionListItem },
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
    const todaySessions = computed(() =>
      props.sessions.filter((v) => isToday(new Date(v.session?.created_at))),
    );
    const earlierSessions = computed(() =>
      props.sessions.filter((v) => !isToday(new Date(v.session?.created_at))),
    );
    const showSourceIcons = computed(
      () => new Set(props.sessions.map((v) => v.session?.source)).size > 1,
    );

    function handleAgentCommand(command) {
      if (command === 'edit') emit('edit-agent', selectedAgent.value);
      if (command === 'delete') emit('delete-agent', selectedAgent.value);
    }

    return {
      selectedAgent,
      todaySessions,
      earlierSessions,
      showSourceIcons,
      handleAgentCommand,
    };
  },
});
</script>
