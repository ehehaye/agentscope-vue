<template>
  <el-dialog
    :title="editing ? '编辑 MCP' : '安装 MCP'"
    :visible.sync="dialogVisible"
    width="520px"
    :close-on-click-modal="false"
  >
    <div v-if="card" class="tw-space-y-4">
      <div class="tw-flex tw-items-center tw-gap-3">
        <img v-if="card.icon_url" :src="card.icon_url" class="tw-h-10 tw-w-10 tw-rounded-md tw-object-cover" />
        <div v-else class="tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-md tw-bg-muted tw-text-sm tw-font-bold">
          {{ (card.display_name || card.name).slice(0, 1).toUpperCase() }}
        </div>
        <div>
          <div class="tw-font-medium">{{ card.display_name || card.name }}</div>
          <div class="tw-text-xs tw-text-muted-foreground">{{ card.description }}</div>
        </div>
      </div>

      <el-form label-position="top">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="MCP 名称" />
        </el-form-item>
        <el-form-item label="配置(JSON)">
          <el-input v-model="form.values" type="textarea" :rows="6" placeholder='{"key": "value"}' />
        </el-form-item>
      </el-form>
    </div>

    <span slot="footer" class="tw-dialog-footer">
      <el-button @click="dialogVisible = false" :disabled="submitting">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!card" @click="handleSubmit">
        {{ editing ? '保存' : '安装' }}
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@/composables/vue';
import { hubApi, mcpApi } from '@/api';

export default defineComponent({
  name: 'InstallMCPDialog',
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

    const form = ref({ name: '', values: '{}' });
    const submitting = ref(false);

    watch(() => [props.card, props.editing], () => {
      const target = props.editing || props.card;
      form.value.name = target?.name || target?.display_name || '';
      form.value.values = JSON.stringify(target?.config_template || {}, null, 2);
    }, { immediate: true });

    async function handleSubmit() {
      if (!props.card && !props.editing) return;
      submitting.value = true;
      try {
        let values = {};
        try {
          values = JSON.parse(form.value.values);
        } catch {
          // ignore parse error, send empty
        }
        if (props.editing) {
          await mcpApi.update(props.editing.id, {
            name: form.value.name,
            values,
          });
        } else if (props.card?.hub_id && props.card?.id) {
          await hubApi.mcp.install(props.card.hub_id, props.card.id, {
            name: form.value.name,
            values,
          });
        }
        emit('installed');
      } finally {
        submitting.value = false;
      }
    }

    return { dialogVisible, form, submitting, handleSubmit };
  },
});
</script>
