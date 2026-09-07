<template>
  <div class="tw-flex tw-flex-col tw-gap-3">
    <div
      v-for="(binding, i) in value"
      :key="i"
      class="tw-rounded-lg tw-border tw-p-3"
      :class="i === value.length - 1 ? 'tw-border-dashed tw-bg-muted/30' : ''"
    >
      <div v-if="i === value.length - 1" class="tw-mb-2">
        <span class="tw-text-xs tw-font-medium">默认路由</span>
        <p class="tw-mt-0.5 tw-text-xs tw-text-muted-foreground">匹配所有未命中的消息</p>
      </div>
      <div v-else class="tw-mb-2 tw-flex tw-items-center tw-justify-between">
        <span class="tw-text-xs tw-font-medium tw-text-muted-foreground">规则 {{ i + 1 }}</span>
        <el-button type="text" class="tw-h-auto tw-p-0 tw-text-destructive" @click="removeRule(i)">
          <Icon icon="lucide:trash-2" class="tw-h-3.5 tw-w-3.5" />
        </el-button>
      </div>

      <div class="tw-grid tw-grid-cols-2 tw-gap-2.5" :class="{ 'tw-mb-2.5': i !== value.length - 1 }">
        <div v-if="i !== value.length - 1" class="tw-flex tw-flex-col tw-gap-1">
          <span class="tw-text-xs tw-text-muted-foreground">匹配字段</span>
          <el-input v-model="binding.match_key" size="small" placeholder="chat_id" />
        </div>
        <div v-if="i !== value.length - 1" class="tw-flex tw-flex-col tw-gap-1">
          <span class="tw-text-xs tw-text-muted-foreground">匹配值</span>
          <el-input v-model="binding.match_value" size="small" placeholder="* 或具体值" />
        </div>
      </div>

      <div class="tw-grid tw-grid-cols-2 tw-gap-2.5">
        <div class="tw-flex tw-flex-col tw-gap-1">
          <span class="tw-text-xs tw-text-muted-foreground">路由到助手</span>
          <AgentSelect
            :agents="agents"
            :value="binding.agent_id"
            size="small"
            class="tw-w-full"
            @change="(id) => update(i, { agent_id: id })"
          />
        </div>
        <div class="tw-flex tw-flex-col tw-gap-1">
          <span class="tw-text-xs tw-text-muted-foreground">会话范围</span>
          <el-select :value="binding.session_scope" size="small" class="tw-w-full" @change="(v) => update(i, { session_scope: v })">
            <el-option label="按聊天" value="per_chat" />
            <el-option label="按聊天用户" value="per_chat_user" />
          </el-select>
        </div>
      </div>
    </div>

    <el-button type="text" class="tw-self-start" @click="addRule">
      <Icon icon="lucide:plus" class="tw-mr-1 tw-h-3.5 tw-w-3.5" />
      添加规则
    </el-button>
  </div>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import AgentSelect from '@/components/select/AgentSelect.vue';

export default defineComponent({
  name: 'BindingsEditor',
  components: { AgentSelect, Icon },
  props: {
    value: { type: Array, default: () => [] },
    agents: { type: Array, default: () => [] },
  },
  setup(props, { emit }) {
    function update(i, patch) {
      const next = props.value.map((b, idx) => (idx === i ? { ...b, ...patch } : b));
      emit('input', next);
    }

    function removeRule(i) {
      emit('input', props.value.filter((_, idx) => idx !== i));
    }

    function addRule() {
      const catchAll = props.value[props.value.length - 1];
      const rule = {
        match_key: 'chat_id',
        match_value: '',
        agent_id: catchAll?.agent_id || props.agents[0]?.id || '',
        session_scope: 'per_chat',
      };
      emit('input', [...props.value.slice(0, -1), rule, ...props.value.slice(-1)]);
    }

    return { update, removeRule, addRule };
  },
});
</script>
