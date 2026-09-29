<template>
  <div class="tw-flex tw-flex-col">
    <div v-for="(row, idx) in rows" :key="row.key" class="tw-flex tw-flex-col">
      <div v-if="idx > 0" class="tw-my-4 tw-border-t tw-border-border" />
      <div class="tw-text-sm tw-font-medium">{{ row.label }}</div>
      <SchemaForm
        class="tw-mt-2"
        :schema="row.schema"
        :values="values[row.key] || {}"
        :columns="2"
        :label-for="(key, prop) => agentFieldLabel(row.key, key, prop)"
        :placeholder-for="(key, prop) => agentFieldPlaceholder(row.key, key, prop)"
        :description-for="(key) => agentFieldDescription(row.key, key)"
        @change="(key, value) => $emit('change', row.key, key, value)"
      />
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import SchemaForm from './SchemaForm.vue';
import {
  AGENT_SECTIONS,
  SECTION_LABELS,
  agentFieldDescription,
  agentFieldLabel,
  agentFieldPlaceholder,
  sliceAgentSchema,
} from './agentForm';

export default defineComponent({
  name: 'AgentFormFields',
  components: { SchemaForm },
  props: {
    /** 后端 `GET /agent/schema/v2` 返回的扁平 `AgentData` JSON Schema。 */
    schema: { type: Object, required: true },
    /** `{ identity, context_config, react_config, invite_config }` 四段表单值。 */
    values: { type: Object, required: true },
  },
  setup(props) {
    const rows = computed(() => {
      const sections = sliceAgentSchema(props.schema);
      return AGENT_SECTIONS.map((key) => ({
        key,
        label: SECTION_LABELS[key],
        schema: sections[key],
      }));
    });
    return { rows, agentFieldDescription, agentFieldLabel, agentFieldPlaceholder };
  },
});
</script>
