<template>
  <div class="flex flex-col gap-3">
    <div
      v-for="(binding, i) in value"
      :key="i"
      class="rounded-lg border p-3"
      :class="i === value.length - 1 ? 'border-dashed bg-muted/30' : ''"
    >
      <div v-if="i === value.length - 1" class="mb-2">
        <span class="text-xs font-medium">默认路由</span>
        <p class="mt-0.5 text-xs text-muted-foreground">匹配所有未命中的消息</p>
      </div>
      <div v-else class="mb-2 flex items-center justify-between">
        <span class="text-xs font-medium text-muted-foreground">规则 {{ i + 1 }}</span>
        <el-button type="text" class="h-auto p-0 text-destructive" @click="removeRule(i)">
          <Icon icon="lucide:trash-2" class="h-3.5 w-3.5" />
        </el-button>
      </div>

      <div class="grid grid-cols-2 gap-2.5" :class="{ 'mb-2.5': i !== value.length - 1 }">
        <div v-if="i !== value.length - 1" class="flex flex-col gap-1">
          <span class="text-xs text-muted-foreground">匹配字段</span>
          <el-input v-model="binding.match_key" size="small" placeholder="chat_id" />
        </div>
        <div v-if="i !== value.length - 1" class="flex flex-col gap-1">
          <span class="text-xs text-muted-foreground">匹配值</span>
          <el-input v-model="binding.match_value" size="small" placeholder="* 或具体值" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2.5">
        <div class="flex flex-col gap-1">
          <span class="text-xs text-muted-foreground">路由到助手</span>
          <AgentSelect
            :agents="agents"
            :value="binding.agent_id"
            size="small"
            class="w-full"
            @change="(id) => update(i, { agent_id: id })"
          />
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs text-muted-foreground">会话范围</span>
          <el-select :value="binding.session_scope" size="small" class="w-full" @change="(v) => update(i, { session_scope: v })">
            <el-option label="按聊天" value="per_chat" />
            <el-option label="按聊天用户" value="per_chat_user" />
          </el-select>
        </div>
      </div>
    </div>

    <el-button type="text" class="self-start" @click="addRule">
      <Icon icon="lucide:plus" class="mr-1 h-3.5 w-3.5" />
      添加规则
    </el-button>
  </div>
</template>

<script>
import { defineComponent } from '@vue/composition-api';
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
