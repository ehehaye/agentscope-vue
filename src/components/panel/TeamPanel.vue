<template>
  <div class="tw-flex tw-h-full tw-flex-col tw-gap-3 tw-overflow-y-auto tw-text-sm">
    <template v-if="!team">
      <PanelEmpty icon="lucide:users-round" title="暂无团队" description="当前会话不属于任何团队。" />
    </template>
    <template v-else>
      <div class="tw-px-2">
        <span class="tw-truncate tw-text-sm tw-font-medium">{{ team.team?.data?.name }}</span>
      </div>

      <section v-if="team.leader_agent" class="tw-flex tw-flex-col tw-gap-0.5">
        <span class="tw-px-2 tw-text-xs tw-text-muted-foreground">队长</span>
        <ul class="tw-flex tw-flex-col tw-gap-0.5">
          <li>
            <el-button
              type="text"
              size="mini"
              class="tw-w-full tw-justify-start tw-gap-2 tw-font-normal"
              :class="isActive(leaderSessionId) ? 'tw-text-primary' : 'tw-text-foreground'"
              @click="goTo(leaderAgentId, leaderSessionId, null)"
            >
              <Icon icon="lucide:crown" class="tw-h-3.5 tw-w-3.5 tw-shrink-0" />
              <span class="tw-truncate">{{ team.leader_agent.data?.name }}</span>
            </el-button>
          </li>
        </ul>
      </section>

      <section class="tw-flex tw-flex-col tw-gap-0.5">
        <span class="tw-px-2 tw-text-xs tw-text-muted-foreground">成员</span>
        <ul v-if="team.members && team.members.length > 0" class="tw-flex tw-flex-col tw-gap-0.5">
          <li v-for="member in team.members" :key="member.agent?.id">
            <el-button
              type="text"
              size="mini"
              class="tw-w-full tw-justify-start tw-gap-2 tw-font-normal"
              :class="isActive(member.session_id) ? 'tw-text-primary' : 'tw-text-foreground'"
              :disabled="!member.session_id"
              @click="goTo(member.agent?.id, member.session_id, member.agent?.id)"
            >
              <Icon icon="lucide:bot" class="tw-h-3.5 tw-w-3.5 tw-shrink-0" />
              <span class="tw-truncate">{{ member.agent?.data?.name }}</span>
            </el-button>
          </li>
        </ul>
        <p v-else class="tw-px-2 tw-py-1 tw-text-xs tw-text-muted-foreground">暂无成员</p>
      </section>
    </template>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
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
    mainSessionId: { type: String, default: '' },
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
      // 已有外层主会话（展示本团队的会话）时保留它，仅切换 memberId，避免丢失主会话
      const query = {
        agentId: props.mainSessionId ? props.currentAgentId : targetAgentId,
        sessionId: props.mainSessionId || targetSessionId,
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
