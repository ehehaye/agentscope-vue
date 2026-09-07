<template>
  <el-form label-position="top" class="schema-form">
    <el-form-item
      v-for="[key, prop] in entries"
      :key="key"
      :label="labelFor(key, prop)"
    >
      <template v-if="effectiveType(prop) === 'boolean'">
        <el-switch
          :value="values[key]"
          @change="(val) => onChange(key, val)"
        />
      </template>

      <template v-else-if="enumValues(prop)">
        <el-select
          :value="values[key]"
          @change="(val) => onChange(key, val)"
          :placeholder="placeholderFor(key, prop)"
          class="w-full"
        >
          <el-option
            v-for="opt in enumValues(prop)"
            :key="String(opt)"
            :label="String(opt)"
            :value="String(opt)"
          />
        </el-select>
      </template>

      <template v-else-if="prop.format === 'textarea'">
        <el-input
          type="textarea"
          :rows="3"
          :value="values[key]"
          @input="(val) => onChange(key, val)"
          :placeholder="placeholderFor(key, prop)"
        />
      </template>

      <template v-else-if="effectiveType(prop) === 'number' || effectiveType(prop) === 'integer'">
        <el-input-number
          :value="values[key]"
          @change="(val) => onChange(key, val)"
          :min="prop.minimum"
          :max="prop.maximum"
          :step="effectiveType(prop) === 'integer' ? 1 : 0.1"
          :placeholder="placeholderFor(key, prop)"
          class="w-full"
          controls-position="right"
        />
      </template>

      <template v-else>
        <el-input
          :value="values[key]"
          @input="(val) => onChange(key, val)"
          :placeholder="placeholderFor(key, prop)"
          :show-password="prop.format === 'password'"
        />
      </template>

      <div v-if="descriptionFor(key, prop)" class="text-xs text-muted-foreground mt-1">
        {{ descriptionFor(key, prop) }}
      </div>
    </el-form-item>
  </el-form>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';

function effectiveType(prop) {
  return prop.type ?? prop.anyOf?.find((t) => t.type !== 'null')?.type ?? 'string';
}

function enumValues(prop) {
  if (prop.enum) return prop.enum;
  for (const variant of prop.anyOf ?? []) {
    const v = variant.enum;
    if (v) return v;
  }
  return null;
}

export default defineComponent({
  name: 'SchemaForm',
  props: {
    schema: { type: Object, required: true },
    values: { type: Object, default: () => ({}) },
    skipFields: { type: Array, default: () => ['id', 'type'] },
    labelFor: {
      type: Function,
      default: (key, prop) => prop.title ?? key.replace(/_/g, ' '),
    },
    placeholderFor: {
      type: Function,
      default: (key, prop) => prop.description,
    },
    descriptionFor: {
      type: Function,
      default: () => undefined,
    },
  },
  setup(props, { emit }) {
    const entries = computed(() => {
      return Object.entries(props.schema.properties ?? {}).filter(
        ([key, prop]) => !props.skipFields.includes(key) && prop.const === undefined,
      );
    });

    function onChange(key, value) {
      emit('change', key, value);
    }

    return {
      entries,
      effectiveType,
      enumValues,
      onChange,
    };
  },
});
</script>
