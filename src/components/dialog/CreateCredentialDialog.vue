<template>
  <el-dialog
    title="新建凭证"
    :visible.sync="dialogVisible"
    width="520px"
    :close-on-click-modal="false"
  >
    <div v-loading="loadingSchemas" class="tw-space-y-4">
      <el-form label-position="top">
        <el-form-item label="凭证类型">
          <el-select v-model="selectedType" placeholder="选择凭证类型" class="tw-w-full">
            <el-option
              v-for="s in schemas"
              :key="typeConst(s)"
              :label="s.title"
              :value="typeConst(s)"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <SchemaForm
        v-if="selectedSchema"
        :schema="selectedSchema"
        :values="values"
        @change="onFieldChange"
      />
    </div>

    <span slot="footer" class="tw-dialog-footer">
      <el-button @click="dialogVisible = false" :disabled="submitting">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!selectedSchema" @click="handleSubmit">
        创建
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { credentialApi } from '@/api';
import SchemaForm from '@/components/form/SchemaForm.vue';

export default defineComponent({
  name: 'CreateCredentialDialog',
  components: { SchemaForm },
  props: {
    visible: { type: Boolean, default: false },
    defaultType: { type: String, default: '' },
    createFn: { type: Function, required: true },
  },
  data() {
    return {
      schemas: [],
      loadingSchemas: false,
      selectedType: '',
      values: {},
      submitting: false,
    };
  },
  computed: {
    dialogVisible: {
      get() { return this.visible; },
      set(val) { this.$emit('update:visible', val); },
    },
    selectedSchema() {
      return this.schemas.find((s) => this.typeConst(s) === this.selectedType) ?? null;
    },
  },
  watch: {
    visible(val) {
      if (val) this.open();
      else this.reset();
    },
    selectedType() {
      this.values = {};
    },
  },
  methods: {
    typeConst(schema) {
      return schema?.properties?.type?.const ?? '';
    },
    async open() {
      this.loadingSchemas = true;
      try {
        const res = await credentialApi.schemas();
        this.schemas = res?.schemas ?? [];
        if (this.schemas.length > 0) {
          this.selectedType = this.defaultType || this.typeConst(this.schemas[0]);
        }
      } finally {
        this.loadingSchemas = false;
      }
    },
    reset() {
      this.schemas = [];
      this.selectedType = '';
      this.values = {};
      this.submitting = false;
    },
    onFieldChange(key, value) {
      this.$set(this.values, key, value);
    },
    async handleSubmit() {
      if (!this.selectedSchema) return;
      this.submitting = true;
      try {
        const data = { type: this.selectedType };
        for (const [key, prop] of Object.entries(this.selectedSchema.properties)) {
          if (key === 'id' || key === 'type' || prop.const !== undefined) continue;
          const val = this.values[key];
          if (val !== undefined && val !== '') data[key] = val;
        }
        await this.createFn({ data });
        this.dialogVisible = false;
        this.$emit('created');
      } finally {
        this.submitting = false;
      }
    },
  },
});
</script>
