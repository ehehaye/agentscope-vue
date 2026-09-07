<template>
  <el-dialog
    title="编辑知识库"
    :visible.sync="dialogVisible"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form label-position="top" class="space-y-4">
      <el-form-item label="名称">
        <el-input v-model="form.name" placeholder="知识库名称" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="form.description" type="textarea" :rows="3" placeholder="描述" />
      </el-form-item>
    </el-form>
    <span slot="footer" class="dialog-footer">
      <el-button @click="dialogVisible = false" :disabled="submitting">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@vue/composition-api';
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

    watch(() => props.knowledgeBase, (kb) => {
      if (kb) {
        form.value = { name: kb.name || '', description: kb.description || '' };
      }
    }, { immediate: true });

    async function handleSubmit() {
      if (!props.knowledgeBase) return;
      submitting.value = true;
      try {
        await knowledgeBaseApi.update(props.knowledgeBase.id, {
          name: form.value.name.trim(),
          description: form.value.description.trim(),
        });
        emit('updated');
        dialogVisible.value = false;
      } finally {
        submitting.value = false;
      }
    }

    return { dialogVisible, form, submitting, handleSubmit };
  },
});
</script>
