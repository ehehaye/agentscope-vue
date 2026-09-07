<template>
  <div class="flex h-full flex-col gap-3 overflow-y-auto text-sm">
    <template v-if="!team">
      <PanelEmpty icon="lucide:users-round" title="暂无团队" description="当前会话不属于任何团队。" />
    </template>
    <template v-else>
      <div class="px-2">
        <span class="truncate text-sm font-medium">{{ team.team?.data?.name }}</span>
      </div>

      <section v-if="team.leader_agent" class="flex flex-col gap-0.5">
        <span class="px-2 text-xs text-muted-foreground">队长</span>
        <ul class="flex flex-col gap-0.5">
          <li>
            <el-button
              type="text"
              size="mini"
              class="w-full justify-start gap-2 font-normal"
              :class="isActive(leaderSessionId) ? 'text-primary' : 'text-foreground'"
              @click="goTo(leaderAgentId, leaderSessionId, null)"
            >
              <Icon icon="lucide:crown" class="h-3.5 w-3.5 shrink-0" />
              <span class="truncate">{{ team.leader_agent.data?.name }}</span>
            </el-button>
          </li>
        </ul>
      </section>

      <section class="flex flex-col gap-0.5">
        <span class="px-2 text-xs text-muted-foreground">成员</span>
        <ul v-if="team.members && team.members.length > 0" class="flex flex-col gap-0.5">
          <li v-for="member in team.members" :key="member.agent?.id">
            <el-button
              type="text"
              size="mini"
              class="w-full justify-start gap-2 font-normal"
              :class="isActive(member.session_id) ? 'text-primary' : 'text-foreground'"
              :disabled="!member.session_id"
              @click="goTo(member.agent?.id, member.session_id, member.agent?.id)"
            >
              <Icon icon="lucide:bot" class="h-3.5 w-3.5 shrink-0" />
              <span class="truncate">{{ member.agent?.data?.name }}</span>
            </el-button>
          </li>
        </ul>
        <p v-else class="px-2 py-1 text-xs text-muted-foreground">暂无成员</p>
      </section>
    </template>
  </div>
</template>

<script>
import { defineComponent, computed } from '@vue/composition-api';
import { Icon } from '@iconify/vue2';
import { useRouter } from '@/composables/vue-router';
import PanelEmpty from './PanelEmpty.vue';

export default defineComponent({
  name: 'TeamPanel',
  components: { Icon, PanelEmpty },
  props: {
    team: { type: Object, default: null },
    currentAgentId: { type: String, default: '' },
    currentSessionId: { type: String, default: '' },
  },
  setup(props) {
    const router = useRouter();

    const leaderAgentId = computed(() => props.team?.leader_agent?.id);
    const leaderSessionId = computed(() => props.team?.team?.session_id);

    function isActive(sessionId) {
      return sessionId && sessionId === props.currentSessionId;
    }

    function goTo(targetAgentId, targetSessionId, memberId) {
      if (!targetAgentId || !targetSessionId) return;
      const query = {
        agentId: props.currentAgentId || targetAgentId,
        sessionId: props.currentSessionId || targetSessionId,
      };
      if (memberId) query.memberId = memberId;
      router.push({ path: '/chat', query });
    }

    return {
      leaderAgentId,
      leaderSessionId,
      isActive,
      goTo,
    };
  },
});
</script>
