<template>
  <el-dialog
    title="编辑凭证"
    :visible.sync="dialogVisible"
    width="520px"
    :close-on-click-modal="false"
  >
    <div v-loading="loadingSchema" class="space-y-4">
      <SchemaForm
        v-if="schema"
        :schema="schema"
        :values="values"
        @change="onFieldChange"
      />
      <p v-else class="text-sm text-muted-foreground">加载中...</p>
    </div>

    <span slot="footer" class="dialog-footer">
      <el-button @click="dialogVisible = false" :disabled="submitting">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!schema" @click="handleSubmit">
        保存
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { credentialApi } from '@/api';
import SchemaForm from '@/components/form/SchemaForm.vue';

export default defineComponent({
  name: 'EditCredentialDialog',
  components: { SchemaForm },
  props: {
    visible: { type: Boolean, default: false },
    credential: { type: Object, default: null },
    updateFn: { type: Function, required: true },
  },
  data() {
    return {
      schema: null,
      loadingSchema: false,
      values: {},
      submitting: false,
    };
  },
  computed: {
    dialogVisible: {
      get() { return this.visible; },
      set(val) { this.$emit('update:visible', val); },
    },
  },
  watch: {
    visible(val) {
      if (val) this.open();
      else this.reset();
    },
  },
  methods: {
    typeConst(schema) {
      return schema?.properties?.type?.const ?? '';
    },
    async open() {
      const type = this.credential?.data?.type;
      if (!type) return;
      this.loadingSchema = true;
      try {
        const res = await credentialApi.schemas();
        this.schema = res?.schemas?.find((s) => this.typeConst(s) === type) ?? null;
        if (this.schema) {
          const prefill = {};
          for (const [key, prop] of Object.entries(this.schema.properties)) {
            if (key === 'id' || key === 'type' || prop.const !== undefined) continue;
            if (prop.writeOnly) continue;
            const existing = this.credential.data[key];
            if (existing !== undefined) prefill[key] = existing;
          }
          this.values = prefill;
        }
      } finally {
        this.loadingSchema = false;
      }
    },
    reset() {
      this.schema = null;
      this.values = {};
      this.submitting = false;
    },
    onFieldChange(key, value) {
      this.$set(this.values, key, value);
    },
    async handleSubmit() {
      if (!this.schema || !this.credential) return;
      this.submitting = true;
      try {
        const data = { ...this.credential.data };
        for (const [key, prop] of Object.entries(this.schema.properties)) {
          if (key === 'id' || key === 'type' || prop.const !== undefined) continue;
          const val = this.values[key];
          if (val !== undefined && val !== '') data[key] = val;
        }
        await this.updateFn(this.credential.id, { data });
        this.dialogVisible = false;
        this.$emit('updated');
      } finally {
        this.submitting = false;
      }
    },
  },
});
</script>
