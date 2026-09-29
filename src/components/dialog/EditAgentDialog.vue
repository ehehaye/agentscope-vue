<template>
  <el-dialog
    title="编辑助手"
    :visible.sync="dialogVisible"
    width="640px"
    :close-on-click-modal="false"
    append-to-body
  >
    <AgentFormFields
      v-if="schema && values"
      :schema="schema"
      :values="values"
      @change="handleChange"
    />
    <p
      v-else
      class="tw-text-sm tw-text-muted-foreground"
    >
      加载中…
    </p>
    <p
      v-if="errorMsg"
      class="tw-mt-3 tw-mb-0 tw-rounded-md tw-bg-red-50 tw-p-2 tw-text-xs tw-text-red-600 dark:tw-bg-red-950 dark:tw-text-red-400"
    >
      {{ errorMsg }}
    </p>
    <span
      slot="footer"
      class="tw-dialog-footer"
    >
      <el-button
        size="small"
        @click="dialogVisible = false"
        :disabled="submitting"
        >取消</el-button
      >
      <el-button
        size="small"
        type="primary"
        :loading="submitting"
        :disabled="!nameValid || !schema || !values"
        @click="handleSubmit"
      >
        保存
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@/composables/vue';
import { useAgents } from '@/composables/useAgents';
import { useAgentSchema } from '@/composables/useAgentSchema';
import { defaultAgentFormValues } from '@/components/form/agentForm';
import AgentFormFields from '@/components/form/AgentFormFields.vue';

export default defineComponent({
  name: 'EditAgentDialog',
  components: { AgentFormFields },
  props: {
    visible: { type: Boolean, default: false },
    agent: { type: Object, default: null },
  },
  emits: ['update:visible', 'updated'],
  setup(props, { emit }) {
    const { update } = useAgents();
    const { schema } = useAgentSchema();
    const dialogVisible = computed({
      get: () => props.visible,
      set: (v) => emit('update:visible', v),
    });

    const values = ref(null);
    const submitting = ref(false);
    const errorMsg = ref('');

    watch(
      () => [props.visible, schema.value, props.agent],
      ([open, s, agent]) => {
        if (!open) {
          values.value = null;
          errorMsg.value = '';
          return;
        }
        if (!s || !agent) return;
        // 先铺 schema 默认值，再盖住已有的 data，使未设置字段回落到默认值而非空。
        const base = defaultAgentFormValues(s);
        const d = agent.data || {};
        values.value = {
          identity: { ...base.identity, name: d.name, system_prompt: d.system_prompt },
          context_config: { ...base.context_config, ...(d.context_config || {}) },
          react_config: { ...base.react_config, ...(d.react_config || {}) },
          invite_config: { ...base.invite_config, ...(d.invite_config || {}) },
        };
        errorMsg.value = '';
      },
      { immediate: true },
    );

    function handleChange(section, key, value) {
      errorMsg.value = '';
      values.value = { ...values.value, [section]: { ...values.value[section], [key]: value } };
    }

    const nameValid = computed(() => !!String(values.value?.identity?.name || '').trim());

    async function handleSubmit() {
      if (!values.value || !props.agent) return;
      const name = String(values.value.identity.name || '').trim();
      if (!name) return;
      submitting.value = true;
      errorMsg.value = '';
      try {
        await update(
          props.agent.id,
          {
            name,
            system_prompt: values.value.identity.system_prompt || undefined,
            context_config: values.value.context_config,
            react_config: values.value.react_config,
            invite_config: values.value.invite_config,
          },
          { silent: true },
        );
        dialogVisible.value = false;
        emit('updated');
      } catch (e) {
        errorMsg.value = e?.message || '保存失败';
      } finally {
        submitting.value = false;
      }
    }

    return { dialogVisible, schema, values, submitting, errorMsg, nameValid, handleChange, handleSubmit };
  },
});
</script>
