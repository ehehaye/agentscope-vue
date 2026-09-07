<template>
  <el-dialog
    :title="TEXT.knowledge.dialogCreate.title"
    :visible.sync="dialogVisible"
    width="500px"
    :close-on-click-modal="false"
    @open="reset"
  >
    <p class="tw-text-sm tw-text-muted-foreground">{{ TEXT.knowledge.dialogCreate.description }}</p>
    <el-form label-position="top" class="tw-mt-4 tw-space-y-4">
      <el-form-item :label="TEXT.knowledge.dialogCreate.nameLabel">
        <el-input v-model="name" :placeholder="TEXT.knowledge.dialogCreate.namePlaceholder" />
      </el-form-item>

      <el-form-item :label="TEXT.knowledge.dialogCreate.descriptionLabel">
        <el-input v-model="description" type="textarea" :rows="3" :placeholder="TEXT.knowledge.dialogCreate.descriptionPlaceholder" />
      </el-form-item>

      <el-form-item :label="TEXT.knowledge.dialogCreate.embeddingModelLabel">
        <el-select v-model="selectedEmbedding" value-key="key" class="tw-w-full" :loading="loadingModels" placeholder="选择嵌入模型">
          <el-option-group
            v-for="provider in providers"
            :key="provider.type"
            :label="provider.type"
          >
            <el-option
              v-for="model in provider.models"
              :key="embeddingKey(provider, model)"
              :label="model.label || model.name"
              :value="embeddingValue(provider, model)"
            />
          </el-option-group>
        </el-select>
      </el-form-item>

      <el-form-item :label="TEXT.knowledge.dialogCreate.dimensionLabel">
        <el-select v-model="dimension" class="tw-w-full" placeholder="选择维度">
          <el-option
            v-for="d in dimensionOptions"
            :key="d"
            :label="String(d)"
            :value="d"
          />
        </el-select>
      </el-form-item>

      <el-form-item :label="TEXT.knowledge.dialogCreate.chunkerLabel">
        <el-select v-model="selectedChunkerType" class="tw-w-full" placeholder="选择分块器">
          <el-option
            v-for="chunker in chunkers"
            :key="chunker.type"
            :label="chunker.type"
            :value="chunker.type"
          />
        </el-select>
      </el-form-item>

      <SchemaForm
        v-if="chunkerParamSchema && Object.keys(chunkerParamSchema.properties || {}).length > 0"
        :schema="chunkerParamSchema"
        :values="chunkerParams"
        @change="handleChunkerParamChange"
      />

      <p v-if="error" class="tw-text-sm tw-text-destructive">{{ error }}</p>
    </el-form>

    <span slot="footer" class="tw-dialog-footer">
      <el-button @click="dialogVisible = false" :disabled="submitting">{{ COMMON.cancel }}</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="handleSubmit">
        {{ submitting ? COMMON.creating : COMMON.create }}
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@/composables/vue';
import { knowledgeBaseApi } from '@/api';
import { COMMON } from '@/constants/text';
import SchemaForm from '@/components/form/SchemaForm.vue';

const TEXT = {
  knowledge: {
    dialogCreate: {
      title: '新建知识库',
      description: '配置嵌入模型与分块器以创建知识库。',
      nameLabel: '名称',
      namePlaceholder: '例如：产品文档库',
      descriptionLabel: '描述',
      descriptionPlaceholder: '描述这个知识库的用途...',
      embeddingModelLabel: '嵌入模型',
      dimensionLabel: '维度',
      chunkerLabel: '分块器',
    },
  },
};

export default defineComponent({
  name: 'CreateKnowledgeBaseDialog',
  components: { SchemaForm },
  props: {
    visible: { type: Boolean, default: false },
  },
  setup(props, { emit }) {
    const dialogVisible = computed({
      get: () => props.visible,
      set: (v) => emit('update:visible', v),
    });

    const name = ref('');
    const description = ref('');
    const providers = ref([]);
    const loadingModels = ref(false);
    const selectedEmbedding = ref(null);
    const dimension = ref(null);
    const chunkers = ref([]);
    const selectedChunkerType = ref('');
    const chunkerParams = ref({});
    const submitting = ref(false);
    const error = ref('');

    const selectedChunker = computed(() =>
      chunkers.value.find((c) => c.type === selectedChunkerType.value) || null,
    );
    const chunkerParamSchema = computed(() => selectedChunker.value?.parameter_schema || null);

    function defaultValuesFromSchema(schema) {
      const result = {};
      const props = schema?.properties || {};
      for (const [key, prop] of Object.entries(props)) {
        if (prop.default !== undefined) result[key] = prop.default;
      }
      return result;
    }

    watch(selectedChunkerType, (type) => {
      const info = chunkers.value.find((c) => c.type === type);
      chunkerParams.value = info?.parameter_schema ? defaultValuesFromSchema(info.parameter_schema) : {};
    });

    const dimensionOptions = computed(() => {
      if (!selectedEmbedding.value) return [];
      const sd = selectedEmbedding.value.card?.supported_dimensions;
      if (sd && sd.length > 0) return sd;
      return [selectedEmbedding.value.card?.dimensions].filter(Boolean);
    });

    watch(() => props.visible, async (open) => {
      if (!open) return;
      reset();
      loadingModels.value = true;
      try {
        const [modelsRes, chunkersRes] = await Promise.all([
          knowledgeBaseApi.listEmbeddingModels(),
          knowledgeBaseApi.listChunkers().catch(() => ({ chunkers: [] })),
        ]);
        providers.value = modelsRes.providers || [];
        chunkers.value = chunkersRes.chunkers || [];
        if (chunkers.value.length > 0) {
          selectedChunkerType.value = chunkers.value[0].type;
        }
        if (providers.value.length > 0) {
          const p = providers.value[0];
          if (p.models && p.models.length > 0) {
            selectedEmbedding.value = embeddingValue(p, p.models[0]);
          }
        }
      } finally {
        loadingModels.value = false;
      }
    });

    watch(selectedEmbedding, (sel) => {
      if (!sel) {
        dimension.value = null;
        return;
      }
      const sd = sel.card?.supported_dimensions;
      const defaultDim = sd && sd.length > 0
        ? (sd.includes(sel.card?.dimensions) ? sel.card?.dimensions : sd[0])
        : sel.card?.dimensions;
      dimension.value = defaultDim;
    });

    function reset() {
      name.value = '';
      description.value = '';
      selectedEmbedding.value = null;
      dimension.value = null;
      selectedChunkerType.value = '';
      chunkerParams.value = {};
      error.value = '';
      submitting.value = false;
    }

    function handleChunkerParamChange(key, value) {
      chunkerParams.value = { ...chunkerParams.value, [key]: value };
    }

    function embeddingKey(provider, model) {
      return `${provider.type}:${model.credential_id || provider.credentials?.[0]?.id || ''}:${model.name}`;
    }

    function embeddingValue(provider, model) {
      return {
        key: embeddingKey(provider, model),
        type: provider.type,
        credentialId: model.credential_id || provider.credentials?.[0]?.id || '',
        model: model.name,
        card: model,
      };
    }

    const canSubmit = computed(() => {
      return name.value.trim() && selectedEmbedding.value && dimension.value && selectedChunkerType.value;
    });

    async function handleSubmit() {
      if (!canSubmit.value) return;
      error.value = '';
      submitting.value = true;
      try {
        const body = {
          name: name.value.trim(),
          description: description.value.trim(),
          embedding_model_config: {
            type: selectedEmbedding.value.type,
            credential_id: selectedEmbedding.value.credentialId,
            model: selectedEmbedding.value.model,
            dimensions: dimension.value,
            parameters: {},
          },
          chunker_config: {
            type: selectedChunkerType.value,
            parameters: Object.fromEntries(
              Object.entries(chunkerParams.value).filter(
                ([, v]) => v !== undefined && v !== null && v !== '',
              ),
            ),
          },
        };
        const res = await knowledgeBaseApi.create(body);
        emit('created', res.knowledge_base_id);
        dialogVisible.value = false;
      } catch (e) {
        error.value = e?.message || String(e);
      } finally {
        submitting.value = false;
      }
    }

    return {
      dialogVisible,
      name,
      description,
      providers,
      loadingModels,
      selectedEmbedding,
      dimension,
      dimensionOptions,
      chunkers,
      selectedChunkerType,
      chunkerParams,
      chunkerParamSchema,
      handleChunkerParamChange,
      submitting,
      error,
      canSubmit,
      handleSubmit,
      embeddingKey,
      embeddingValue,
      reset,
      COMMON,
      TEXT,
    };
  },
});
</script>
