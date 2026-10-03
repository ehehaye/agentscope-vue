<template>
  <el-dialog
    append-to-body
    :title="'新建知识库'"
    :visible.sync="dialogVisible"
    width="500px"
    :close-on-click-modal="false"
  >
    <p class="tw-text-sm tw-text-muted-foreground">配置嵌入模型与分块器以创建知识库。</p>

    <!-- 后端锁定了唯一维度时，所有知识库必须共用同一套嵌入模型。 -->
    <el-alert
      v-if="isLockedPolicy && policy && policy.dimension != null"
      type="info"
      :closable="false"
      class="tw-mt-4"
      :title="`嵌入维度已固定为 ${policy.dimension}`"
    >
      当前服务已锁定统一的嵌入维度，只能选择维度为 {{ policy.dimension }} 的模型。
    </el-alert>

    <el-alert
      v-if="noCompatibleModels"
      type="error"
      :closable="false"
      class="tw-mt-4"
      title="没有可用的嵌入模型"
    >
      {{
        isLockedPolicy && policy && policy.dimension != null
          ? `没有维度为 ${policy.dimension} 的可用嵌入模型，请先添加对应凭证。`
          : '请先到「凭证」页添加一个嵌入模型凭证。'
      }}
    </el-alert>

    <el-form
      label-position="top"
      class="tw-mt-4 tw-space-y-4"
    >
      <el-form-item label="名称">
        <el-input
          v-model="name"
          placeholder="例如：产品文档库"
        />
      </el-form-item>

      <el-form-item label="描述">
        <el-input
          v-model="description"
          type="textarea"
          :rows="3"
          placeholder="描述这个知识库的用途..."
        />
      </el-form-item>

      <el-form-item label="嵌入模型">
        <div class="tw-flex tw-w-full tw-items-center tw-gap-2">
          <el-select
            v-model="selectedEmbedding"
            value-key="key"
            class="tw-flex-1"
            :loading="loadingModels"
            placeholder="选择嵌入模型"
          >
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
          <el-button
            v-if="onAddCredential"
            size="small"
            @click="onAddCredential"
            >添加凭证</el-button
          >
        </div>
      </el-form-item>

      <el-form-item label="维度">
        <el-select
          v-model="dimension"
          class="tw-w-full"
          placeholder="选择维度"
        >
          <el-option
            v-for="d in dimensionOptions"
            :key="d"
            :label="String(d)"
            :value="d"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="分块器">
        <el-select
          v-model="selectedChunkerType"
          class="tw-w-full"
          placeholder="选择分块器"
        >
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

      <p
        v-if="error"
        class="tw-text-sm tw-text-destructive"
      >
        {{ error }}
      </p>
    </el-form>

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
        :disabled="!canSubmit || noCompatibleModels"
        @click="handleSubmit"
      >
        {{ submitting ? '创建中…' : '创建' }}
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@/composables/vue';
import { knowledgeBaseApi } from '@/api';
import SchemaForm from '@/components/form/SchemaForm.vue';
import { useKbEmbeddingModels } from '@/composables/useKbEmbeddingModels';

export default defineComponent({
  name: 'CreateKnowledgeBaseDialog',
  components: { SchemaForm },
  props: {
    visible: { type: Boolean, default: false },
    onAddCredential: { type: Function, default: null },
    credentialRefetchTrigger: { type: Number, default: 0 },
  },
  setup(props, { emit }) {
    const dialogVisible = computed({
      get: () => props.visible,
      set: (v) => emit('update:visible', v),
    });

    const trigger = computed(() => props.credentialRefetchTrigger);
    const { providers, policy, loading: loadingModels } = useKbEmbeddingModels(trigger);

    const name = ref('');
    const description = ref('');
    const selectedEmbedding = ref(null);
    const dimension = ref(null);
    const chunkers = ref([]);
    const selectedChunkerType = ref('');
    const chunkerParams = ref({});
    const submitting = ref(false);
    const error = ref('');

    const isLockedPolicy = computed(() => !!policy.value && policy.value.kind !== 'any');
    const noCompatibleModels = computed(() => !loadingModels.value && providers.value.length === 0);

    const selectedChunker = computed(() => chunkers.value.find((c) => c.type === selectedChunkerType.value) || null);
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

    watch(
      () => props.visible,
      async (open) => {
        if (!open) return;
        reset();
        // 嵌入模型由 composable 在挂载时/凭证变更时拉取，这里只补默认选中。
        if (!selectedEmbedding.value && providers.value.length > 0) {
          const p = providers.value[0];
          if (p.models && p.models.length > 0) selectedEmbedding.value = embeddingValue(p, p.models[0]);
        }
        try {
          const chunkersRes = await knowledgeBaseApi.listChunkers();
          chunkers.value = chunkersRes.chunkers || [];
          if (chunkers.value.length > 0) {
            selectedChunkerType.value = chunkers.value[0].type;
          }
        } catch {
          chunkers.value = [];
        }
      },
    );

    watch(providers, (list) => {
      if (props.visible && !selectedEmbedding.value && list.length > 0) {
        const p = list[0];
        if (p.models && p.models.length > 0) selectedEmbedding.value = embeddingValue(p, p.models[0]);
      }
    });

    watch(selectedEmbedding, (sel) => {
      if (!sel) {
        dimension.value = null;
        return;
      }
      const sd = sel.card?.supported_dimensions;
      const defaultDim =
        sd && sd.length > 0 ? (sd.includes(sel.card?.dimensions) ? sel.card?.dimensions : sd[0]) : sel.card?.dimensions;
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
              Object.entries(chunkerParams.value).filter(([, v]) => v !== undefined && v !== null && v !== ''),
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
      policy,
      isLockedPolicy,
      noCompatibleModels,
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
      onAddCredential: props.onAddCredential,
    };
  },
});
</script>
