<template>
  <el-dialog
    append-to-body
    :title="editing ? `编辑 MCP：${name || ''}` : `安装 MCP：${card?.display_name || card?.name || ''}`"
    :visible.sync="dialogVisible"
    width="520px"
    :close-on-click-modal="false"
  >
    <div
      v-if="card"
      class="tw-space-y-4"
    >
      <div class="tw-flex tw-items-center tw-gap-3">
        <img
          v-if="card.icon_url"
          :src="card.icon_url"
          class="tw-h-10 tw-w-10 tw-rounded-md tw-object-cover"
        />
        <div
          v-else
          class="tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-md tw-bg-muted tw-text-sm tw-font-bold"
        >
          {{ (card.display_name || card.name).slice(0, 1).toUpperCase() }}
        </div>
        <div>
          <div class="tw-font-medium">{{ card.display_name || card.name }}</div>
          <div class="tw-text-xs tw-text-muted-foreground">{{ card.description }}</div>
        </div>
      </div>

      <el-form
        label-position="top"
        class="tw-space-y-2"
      >
        <el-form-item label="名称">
          <el-input
            v-model="name"
            :placeholder="card.name"
          />
        </el-form-item>
      </el-form>

      <!-- 需要输入的卡片：按 inputs_schema 渲染表单，密钥交给服务端渲染进配置。 -->
      <SchemaForm
        v-if="card.auth === 'inputs' && card.inputs_schema"
        :schema="card.inputs_schema"
        :values="values"
        :skip-fields="[]"
        @change="handleChange"
      />
    </div>

    <p
      v-if="error"
      class="tw-mt-3 tw-mb-0 tw-whitespace-pre-wrap tw-rounded-md tw-bg-red-50 tw-p-2 tw-text-xs tw-text-red-600 dark:tw-bg-red-950 dark:tw-text-red-400"
    >
      {{ error }}
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
        :disabled="!card || !name"
        @click="handleSubmit"
      >
        {{ editing ? '保存' : '安装' }}
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@/composables/vue';
import { hubApi, mcpApi } from '@/api';
import SchemaForm from '@/components/form/SchemaForm.vue';

/** 从 schema 的 default 提取初始值。安装时不过滤任何字段。 */
function defaultValuesFromSchema(schema) {
  const out = {};
  for (const [key, prop] of Object.entries(schema?.properties || {})) {
    if (prop.default !== undefined) out[key] = prop.default;
  }
  return out;
}

export default defineComponent({
  name: 'InstallMCPDialog',
  components: { SchemaForm },
  props: {
    visible: { type: Boolean, default: false },
    card: { type: Object, default: null },
    editing: { type: Object, default: null },
  },
  setup(props, { emit }) {
    const dialogVisible = computed({
      get: () => props.visible,
      set: (v) => emit('update:visible', v),
    });

    const name = ref('');
    const values = ref({});
    const submitting = ref(false);
    const error = ref('');

    watch(
      () => [props.card, props.editing],
      () => {
        const target = props.editing || props.card;
        name.value = props.editing?.name ?? props.card?.name ?? target?.display_name ?? '';
        // 编辑时留空：服务端不会回传密钥，强行预填会把它覆盖掉。
        values.value = props.editing ? {} : defaultValuesFromSchema(props.card?.inputs_schema);
        error.value = '';
      },
      { immediate: true },
    );

    function handleChange(key, value) {
      values.value = { ...values.value, [key]: value };
    }

    async function handleSubmit() {
      if (!props.card) return;
      submitting.value = true;
      error.value = '';
      try {
        if (props.editing) {
          // 只发送用户真正填写的键，服务端覆盖合并，留空的密钥保持不变。
          const filled = Object.fromEntries(
            Object.entries(values.value).filter(([, v]) => v !== undefined && v !== ''),
          );
          await mcpApi.update(props.editing.id, {
            name: name.value,
            ...(Object.keys(filled).length > 0 ? { values: filled } : {}),
          });
        } else if (props.card.hub_id && props.card.id) {
          await hubApi.mcp.install(props.card.hub_id, props.card.id, {
            name: name.value || null,
            values: values.value,
          });
        }
        emit('installed');
        dialogVisible.value = false;
      } catch (e) {
        error.value = e?.detail || e?.message || '安装失败';
      } finally {
        submitting.value = false;
      }
    }

    return { dialogVisible, name, values, submitting, error, handleChange, handleSubmit };
  },
});
</script>
