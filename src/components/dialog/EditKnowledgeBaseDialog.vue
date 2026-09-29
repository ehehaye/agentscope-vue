<template>
  <el-dialog
    append-to-body
    title="编辑知识库"
    :visible.sync="dialogVisible"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form label-position="top" class="tw-space-y-4">
      <el-form-item label="名称">
        <el-input v-model="form.name" placeholder="知识库名称" :disabled="submitting" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="form.description" type="textarea" :rows="3" placeholder="描述" :disabled="submitting" />
      </el-form-item>

      <!-- 嵌入模型在创建时固定（底层集合按其维度建立），此处只读展示。 -->
      <el-form-item label="嵌入模型">
        <span class="tw-rounded tw-bg-secondary tw-px-2 tw-py-0.5 tw-font-mono tw-text-xs">
          {{ embeddingModelLabel }}
        </span>
      </el-form-item>
      <el-form-item v-if="chunkerLabel" label="分块器">
        <span class="tw-rounded tw-bg-secondary tw-px-2 tw-py-0.5 tw-font-mono tw-text-xs">
          {{ chunkerLabel }}
        </span>
      </el-form-item>

      <p v-if="errorMsg" class="tw-mb-0 tw-text-sm tw-text-destructive">{{ errorMsg }}</p>
    </el-form>
    <span slot="footer" class="tw-dialog-footer">
      <el-button size="small" @click="dialogVisible = false" :disabled="submitting">取消</el-button>
      <el-button size="small" type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@/composables/vue';
import { knowledgeBaseApi } from '@/api';

export default defineComponent({
  name: 'EditKnowledgeBaseDialog',
  props: {
    visible: { type: Boolean, default: false },
    knowledgeBase: { type: Object, default: null },
  },
  setup(props, { emit }) {
    const dialogVisible = computed({
      get: () => props.visible,
      set: (v) => emit('update:visible', v),
    });

    const form = ref({ name: '', description: '' });
    const submitting = ref(false);
    const errorMsg = ref('');

    watch(
      () => [props.visible, props.knowledgeBase],
      ([open, kb]) => {
        if (open && kb) {
          form.value = { name: kb.name || '', description: kb.description || '' };
          errorMsg.value = '';
        }
      },
      { immediate: true },
    );

    const embeddingModelLabel = computed(() => {
      const cfg = props.knowledgeBase?.embedding_model_config;
      return cfg ? `${cfg.model} · ${cfg.dimensions}d` : '';
    });

    const chunkerLabel = computed(() => {
      const cfg = props.knowledgeBase?.chunker_config;
      if (!cfg) return '';
      const params = Object.entries(cfg.parameters || {})
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      return params ? `${cfg.type} (${params})` : cfg.type;
    });

    async function handleSubmit() {
      if (!props.knowledgeBase) return;
      const trimmedName = form.value.name.trim();
      if (!trimmedName) {
        errorMsg.value = '名称不能为空。';
        return;
      }
      errorMsg.value = '';
      submitting.value = true;
      try {
        await knowledgeBaseApi.update(props.knowledgeBase.id, {
          name: trimmedName,
          description: form.value.description.trim(),
        });
        emit('updated');
        dialogVisible.value = false;
      } catch (e) {
        errorMsg.value = e?.message || '保存失败';
      } finally {
        submitting.value = false;
      }
    }

    return { dialogVisible, form, submitting, errorMsg, embeddingModelLabel, chunkerLabel, handleSubmit };
  },
});
</script>
