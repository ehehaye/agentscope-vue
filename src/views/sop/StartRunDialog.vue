<template>
  <el-dialog
    append-to-body
    :visible.sync="dialogVisible"
    title="发起运行"
    width="560px"
    :close-on-click-modal="false"
    @open="resetForm"
  >
    <p class="tw-text-sm tw-text-muted-foreground">
      运行「{{ sop?.data?.name || '' }}」会在后台推进；起步输入会交给第一步的执行者。
    </p>

    <el-form
      label-position="top"
      class="tw-mt-4"
    >
      <el-form-item label="起步输入（可选）">
        <el-input
          v-model="text"
          type="textarea"
          :rows="4"
          placeholder="例如：面向初学者。"
        />
      </el-form-item>
    </el-form>

    <p
      v-if="error"
      class="tw-whitespace-pre-wrap tw-text-sm tw-text-destructive"
    >
      {{ error }}
    </p>

    <span
      slot="footer"
      class="tw-dialog-footer"
    >
      <el-button
        size="small"
        :disabled="loading"
        @click="dialogVisible = false"
        >取消</el-button
      >
      <el-button
        size="small"
        type="primary"
        :loading="loading"
        @click="handleStart"
      >
        {{ loading ? '发起中…' : '发起运行' }}
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@/composables/vue';
import { UserMsg } from '@agentscope-ai/agentscope/message';
import { sopApi } from '@/api';

export default defineComponent({
  name: 'StartRunDialog',
  props: {
    visible: { type: Boolean, default: false },
    sop: { type: Object, default: null },
  },
  setup(props, { emit }) {
    const text = ref('');
    const loading = ref(false);
    const error = ref('');

    const dialogVisible = computed({
      get: () => props.visible,
      set: (value) => emit('update:visible', value),
    });

    function resetForm() {
      text.value = '';
      loading.value = false;
      error.value = '';
    }

    watch(
      () => props.visible,
      (open) => {
        if (open) resetForm();
      },
    );

    async function handleStart() {
      if (!props.sop?.id || loading.value) return;
      loading.value = true;
      error.value = '';
      try {
        const value = text.value.trim();
        const inputs = value
          ? [
              UserMsg({
                name: 'user',
                content: [
                  {
                    id: crypto.randomUUID(),
                    type: 'text',
                    text: value,
                    created_at: new Date().toISOString(),
                    finished_at: new Date().toISOString(),
                  },
                ],
              }),
            ]
          : [];
        const run = await sopApi.startRun(props.sop.id, inputs);
        emit('started', run);
        dialogVisible.value = false;
      } catch (e) {
        error.value = e?.message || String(e);
      } finally {
        loading.value = false;
      }
    }

    return { text, loading, error, dialogVisible, resetForm, handleStart };
  },
});
</script>
