<template>
  <el-dialog
    title="新建助手"
    :visible.sync="dialogVisible"
    width="500px"
    :close-on-click-modal="false"
    append-to-body
  >
    <el-form :model="form" label-position="top">
      <el-form-item label="名称" required>
        <el-input v-model="form.name" placeholder="助手名称" />
      </el-form-item>
      <el-form-item label="系统提示词">
        <el-input
          v-model="form.system_prompt"
          type="textarea"
          :rows="5"
          placeholder="定义助手的角色和行为"
        />
      </el-form-item>
    </el-form>
    <p v-if="errorMsg" class="mb-0 rounded-md bg-red-50 p-2 text-xs text-red-600 dark:bg-red-950 dark:text-red-400">
      {{ errorMsg }}
    </p>
    <span slot="footer" class="dialog-footer">
      <el-button @click="dialogVisible = false" :disabled="submitting">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!form.name.trim()" @click="handleSubmit">
        创建
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
import { defineComponent, ref, computed, reactive } from '@/composables/vue';
import { useAgents } from '@/composables/useAgents';

export default defineComponent({
  name: 'AgentDialog',
  props: {
    visible: { type: Boolean, default: false },
  },
  emits: ['update:visible', 'created'],
  setup(props, { emit }) {
    const { create } = useAgents();
    const dialogVisible = computed({
      get: () => props.visible,
      set: (v) => emit('update:visible', v),
    });
    const form = reactive({ name: '', system_prompt: '' });
    const submitting = ref(false);
    const errorMsg = ref('');

    async function handleSubmit() {
      if (!form.name.trim()) return;
      submitting.value = true;
      errorMsg.value = '';
      try {
        await create({
          name: form.name.trim(),
          system_prompt: form.system_prompt.trim() || undefined,
        }, { silent: true });
        form.name = '';
        form.system_prompt = '';
        dialogVisible.value = false;
        emit('created');
      } catch (e) {
        errorMsg.value = e?.message || '创建失败';
      } finally {
        submitting.value = false;
      }
    }

    return { dialogVisible, form, submitting, errorMsg, handleSubmit };
  },
});
</script>
