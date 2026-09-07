<template>
  <el-dialog
    :visible.sync="dialogVisible"
    :title="TEXT.schedule.createSchedule.title"
    width="500px"
    :close-on-click-modal="false"
    @open="resetForm"
  >
    <p class="text-sm text-muted-foreground">{{ TEXT.schedule.createSchedule.description }}</p>
    <el-form
      ref="formRef"
      :model="form"
      label-position="left"
      label-width="100px"
      class="mt-4 max-h-[75vh] overflow-y-auto pr-2"
    >
      <el-form-item :label="COMMON.name">
        <el-input v-model="form.name" :placeholder="TEXT.schedule.createSchedule.namePlaceholder" />
      </el-form-item>

      <el-form-item :label="TEXT.schedule.createSchedule.descriptionLabel">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="4"
          :placeholder="TEXT.schedule.createSchedule.descriptionPlaceholder"
        />
      </el-form-item>

      <el-form-item :label="COMMON.date">
        <div class="flex gap-3">
          <el-date-picker v-model="form.date" type="date" :placeholder="TEXT.schedule.pickDate" value-format="yyyy-MM-dd" />
          <el-time-picker v-model="form.time" placeholder="选择时间" value-format="HH:mm:ss" class="w-40" />
        </div>
      </el-form-item>

      <el-form-item :label="TEXT.schedule.timezone">
        <TimezoneSelect :value="form.timezone" @change="(v) => form.timezone = v" />
      </el-form-item>

      <el-form-item :label="TEXT.schedule.frequency">
        <el-select v-model="form.freq" class="w-full">
          <el-option value="once" :label="TEXT.schedule.freqOnce" />
          <el-option value="daily" :label="TEXT.schedule.freqDaily" />
          <el-option value="weekly" :label="TEXT.schedule.freqWeekly" />
          <el-option value="monthly" :label="TEXT.schedule.freqMonthly" />
        </el-select>
      </el-form-item>

      <el-form-item :label="TEXT.schedule.endAt">
        <el-date-picker
          v-model="form.endDate"
          type="date"
          :placeholder="TEXT.schedule.pickDate"
          value-format="yyyy-MM-dd"
          :disabled="form.freq === 'once'"
          class="w-full"
        />
      </el-form-item>

      <el-form-item :label="COMMON.agent">
        <AgentSelect
          :agents="agents"
          :value="form.agentId"
          :placeholder="COMMON.selectAgent"
          class="w-full"
          @change="(id) => form.agentId = id"
        />
      </el-form-item>

      <el-form-item :label="COMMON.model">
        <LlmSelect :value="form.chatModelConfig" @change="(v) => form.chatModelConfig = v" />
      </el-form-item>

      <el-form-item :label="TEXT.schedule.permissionMode">
        <PermissionModeSelect :value="form.permissionMode" @change="(v) => form.permissionMode = v" />
      </el-form-item>

      <el-form-item>
        <div class="flex w-full items-center justify-between">
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-medium">{{ TEXT.schedule.stateful }}</span>
            <span class="text-xs text-muted-foreground">{{ TEXT.schedule.statefulDesc }}</span>
          </div>
          <el-switch v-model="form.stateful" />
        </div>
      </el-form-item>

      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
    </el-form>

    <span slot="footer" class="dialog-footer">
      <el-button @click="visible = false" :disabled="loading">{{ COMMON.cancel }}</el-button>
      <el-button type="primary" :loading="loading" :disabled="!isValid" @click="handleSubmit">
        {{ loading ? COMMON.creating : COMMON.create }}
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@vue/composition-api';
import AgentSelect from '@/components/select/AgentSelect.vue';
import LlmSelect from '@/components/select/LlmSelect.vue';
import PermissionModeSelect from '@/components/select/PermissionModeSelect.vue';
import TimezoneSelect from '@/components/select/TimezoneSelect.vue';
import { COMMON } from '@/constants/text';
import { TEXT } from './text';

export default defineComponent({
  name: 'CreateScheduleDialog',
  components: { AgentSelect, LlmSelect, PermissionModeSelect, TimezoneSelect },
  props: {
    visible: { type: Boolean, default: false },
    agents: { type: Array, default: () => [] },
  },
  setup(props, { emit }) {
    const formRef = ref(null);
    const loading = ref(false);
    const error = ref('');

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const form = ref({
      name: '',
      description: '',
      freq: 'daily',
      date: todayStr,
      time: `${hh}:${mm}:00`,
      endDate: '',
      agentId: '',
      chatModelConfig: null,
      permissionMode: 'dont_ask',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      stateful: false,
    });

    const isValid = computed(() => {
      return form.value.name.trim() && form.value.date && form.value.time && form.value.agentId && form.value.chatModelConfig;
    });

    function resetForm() {
      const n = new Date();
      const h = String(n.getHours()).padStart(2, '0');
      const m = String(n.getMinutes()).padStart(2, '0');
      const t = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
      form.value = {
        name: '',
        description: '',
        freq: 'daily',
        date: t,
        time: `${h}:${m}:00`,
        endDate: '',
        agentId: props.agents[0]?.id || '',

        chatModelConfig: null,
        permissionMode: 'dont_ask',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        stateful: false,
      };
      error.value = '';
    }

    watch(() => props.visible, (open) => {
      if (open) resetForm();
    });

    function buildCronExpr(freq, time, dateStr) {
      const [h, m] = time.split(':').map(Number);
      switch (freq) {
        case 'daily':
          return `${m} ${h} * * *`;
        case 'weekly': {
          const d = dateStr ? new Date(dateStr) : new Date();
          const weekday = d.getDay();
          return `${m} ${h} * * ${weekday}`;
        }
        case 'monthly': {
          const d = dateStr ? new Date(dateStr) : new Date();
          const monthDay = d.getDate();
          return `${m} ${h} ${monthDay} * *`;
        }
        default:
          return '';
      }
    }

    async function handleSubmit() {
      if (!isValid.value) return;
      error.value = '';
      loading.value = true;
      try {
        const d = new Date(form.value.date);
        const [h, m] = form.value.time.split(':').map(Number);
        d.setHours(h, m, 0, 0);

        let cronExpression;
        if (form.value.freq === 'once') {
          cronExpression = `${m} ${h} ${d.getDate()} ${d.getMonth() + 1} *`;
        } else {
          cronExpression = buildCronExpr(form.value.freq, form.value.time, form.value.date);
        }

        await emit('submit', {
          name: form.value.name.trim(),
          description: form.value.description.trim(),
          cron_expression: cronExpression,
          timezone: form.value.timezone,
          agent_id: form.value.agentId,
          chat_model_config: form.value.chatModelConfig,
          enabled: true,
          stateful: form.value.stateful,
          permission_mode: form.value.permissionMode,
          ended_at: form.value.endDate || null,
        });
        dialogVisible.value = false;
      } catch (e) {
        error.value = e?.message || String(e);
      } finally {
        loading.value = false;
      }
    }

    const dialogVisible = computed({
      get: () => props.visible,
      set: (v) => emit('update:visible', v),
    });

    return {
      formRef,
      form,
      loading,
      error,
      isValid,
      dialogVisible,
      resetForm,
      handleSubmit,
      COMMON,
      TEXT,
    };
  },
});
</script>
