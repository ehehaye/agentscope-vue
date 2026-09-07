<template>
  <div class="tw-flex tw-h-full tw-w-full tw-gap-2 tw-p-2">
    <!-- 左侧列表 -->
    <aside class="tw-flex tw-w-64 tw-flex-col tw-rounded-2xl tw-border tw-border-border tw-bg-card">
      <div class="tw-border-b tw-border-border tw-p-4">
        <h1 class="tw-text-lg tw-font-medium tw-text-foreground">凭证</h1>
        <p class="tw-text-xs tw-text-muted-foreground">管理模型服务商 API 凭据</p>
      </div>

      <div class="tw-flex-1 tw-overflow-y-auto tw-p-2">
        <div v-if="loading" class="tw-space-y-2 tw-p-2">
          <el-skeleton v-for="i in 3" :key="i" :rows="1" animated />
        </div>

        <el-empty v-else-if="groupedByType.length === 0" description="暂无凭证类型" />

        <template v-else>
          <div v-for="group in configuredGroups" :key="group.type" class="tw-mb-4">
            <div class="tw-px-2 tw-py-1 tw-text-xs tw-font-medium tw-uppercase tw-tracking-wider tw-text-muted-foreground">
              {{ group.title }}
            </div>
            <div
              v-for="rec in group.records"
              :key="rec.id"
              class="tw-flex tw-cursor-pointer tw-items-center tw-justify-between tw-rounded-md tw-px-2 tw-py-2 tw-text-sm hover:tw-bg-row-hover"
              :class="{ 'tw-bg-accent tw-text-foreground': selectedId === rec.id }"
              @click="selectedId = rec.id"
            >
              <span class="tw-truncate">{{ rec.data.name || rec.id }}</span>
              <el-tag v-if="!rec.editable" size="mini" type="info">只读</el-tag>
            </div>
          </div>

          <div class="tw-mt-4 tw-border-t tw-border-border tw-pt-3">
            <div class="tw-px-2 tw-py-1 tw-text-xs tw-font-medium tw-uppercase tw-tracking-wider tw-text-muted-foreground">
              添加凭据
            </div>
            <div
              v-for="group in groupedByType"
              :key="'add-' + group.type"
              class="tw-flex tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-md tw-px-2 tw-py-2 tw-text-sm tw-text-muted-foreground hover:tw-bg-row-hover hover:tw-text-foreground"
              @click="openCreate(group.type)"
            >
              <Icon icon="lucide:plus" class="tw-h-4 tw-w-4" />
              <span class="tw-truncate">{{ group.title }}</span>
            </div>
          </div>
        </template>
      </div>
    </aside>

    <!-- 右侧详情 -->
    <main class="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-overflow-hidden tw-rounded-2xl tw-border tw-border-border tw-bg-card">
      <template v-if="selectedCredential">
        <!-- 头部 -->
        <div class="tw-flex tw-items-start tw-justify-between tw-border-b tw-border-border tw-p-4">
          <div>
            <h2 class="tw-text-lg tw-font-medium tw-text-foreground">
              {{ selectedCredential.data.name || selectedCredential.id }}
            </h2>
            <p class="tw-font-mono tw-text-sm tw-text-muted-foreground">{{ selectedType }}</p>
            <el-tag v-if="!selectedCredential.editable" size="small" type="info" class="tw-mt-1">只读</el-tag>
          </div>
          <div class="tw-flex tw-items-center tw-gap-2">
            <el-button
              size="small"
              icon="el-icon-edit"
              :disabled="!selectedCredential.editable"
              @click="editOpen = true"
            >编辑</el-button>
            <el-button
              size="small"
              type="danger"
              icon="el-icon-delete"
              :disabled="!selectedCredential.editable"
              @click="deleteOpen = true"
            >删除</el-button>
          </div>
        </div>

        <!-- 字段 -->
        <div class="tw-flex-1 tw-overflow-y-auto tw-p-4">
          <el-descriptions :column="1" border>
            <el-descriptions-item
              v-for="[key, prop] in displayFields"
              :key="key"
              :label="prop.title || key"
            >
              <MaskedValue v-if="isSecret(prop)" :value="String(selectedCredential.data[key] ?? '')" />
              <span v-else class="tw-break-all">{{ selectedCredential.data[key] }}</span>
            </el-descriptions-item>
          </el-descriptions>

          <!-- 可用模型 -->
          <div class="tw-mt-6">
            <div class="tw-mb-3 tw-flex tw-items-center tw-justify-between">
              <span class="tw-text-sm tw-font-medium tw-text-foreground">可用模型</span>
              <el-tabs v-if="hasMultipleModelTypes" v-model="modelTab" class="tw-model-tabs">
                <el-tab-pane label="LLM" name="llm" />
                <el-tab-pane v-if="ttsModels.length > 0" label="TTS" name="tts" />
                <el-tab-pane v-if="embeddingModels.length > 0" label="Embedding" name="embedding" />
              </el-tabs>
            </div>

            <div v-loading="modelsLoading">
              <el-empty v-if="shownModels.length === 0" description="无可用模型" />
              <el-table v-else :data="shownModels" size="small" border>
                <el-table-column prop="label" label="模型" show-overflow-tooltip>
                  <template slot-scope="scope">
                    <span>{{ scope.row.label || scope.row.name }}</span>
                    <el-tag v-if="scope.row.input_types?.includes(THINKING_TYPE)" size="mini" class="tw-ml-2">推理</el-tag>
                    <el-tag v-if="scope.row.realtime" size="mini" class="tw-ml-2">实时</el-tag>
                    <el-tag v-if="scope.row.status && scope.row.status !== 'active'" size="mini" type="warning" class="tw-ml-2">{{ scope.row.status }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column v-if="modelTab === 'llm' || modelTab === 'embedding'" label="上下文" width="120">
                  <template slot-scope="scope">
                    {{ formatNumber(scope.row.context_size) || '—' }}
                  </template>
                </el-table-column>
                <el-table-column v-if="modelTab === 'llm'" label="最大输出" width="120">
                  <template slot-scope="scope">
                    {{ formatNumber(scope.row.output_size) || '—' }}
                  </template>
                </el-table-column>
                <el-table-column v-if="modelTab === 'embedding'" label="维度" width="120">
                  <template slot-scope="scope">
                    {{ scope.row.dimensions || '—' }}
                  </template>
                </el-table-column>
                <el-table-column label="输入" show-overflow-tooltip>
                  <template slot-scope="scope">
                    {{ modalities(scope.row.input_types).join(' · ') || '—' }}
                  </template>
                </el-table-column>
                <el-table-column label="输出" show-overflow-tooltip>
                  <template slot-scope="scope">
                    {{ modalities(scope.row.output_types).join(' · ') || '—' }}
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </div>
      </template>

      <el-empty v-else class="tw-h-full tw-justify-center" description="选择左侧凭据查看详情" />
    </main>

    <CreateCredentialDialog
      :visible.sync="createOpen"
      :default-type="createDefaultType"
      :create-fn="create"
      @created="onCreated"
    />

    <EditCredentialDialog
      v-if="selectedCredential"
      :visible.sync="editOpen"
      :credential="selectedCredential"
      :update-fn="update"
      @updated="onUpdated"
    />

    <DeleteDialog
      v-if="selectedCredential"
      :visible.sync="deleteOpen"
      :title="deleteTitle"
      description="删除后无法恢复，是否继续？"
      :loading="deleteLoading"
      @confirm="handleDelete"
    />
  </div>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import { useCredentials } from '@/composables/useCredentials';
import { credentialApi, modelApi, ttsModelApi, embeddingModelApi } from '@/api';
import CreateCredentialDialog from '@/components/dialog/CreateCredentialDialog.vue';
import EditCredentialDialog from '@/components/dialog/EditCredentialDialog.vue';
import DeleteDialog from '@/components/dialog/DeleteDialog.vue';
import MaskedValue from './MaskedValue.vue';
import { formatNumber } from '@/utils/common';

const MODALITIES = new Set(['text', 'image', 'video', 'audio']);
const THINKING_TYPE = 'application/x-thinking';
const EMBEDDING_TYPE = 'application/x-embedding';

export default defineComponent({
  name: 'CredentialPage',
  components: { Icon, CreateCredentialDialog, EditCredentialDialog, DeleteDialog, MaskedValue },
  setup() {
    const { credentials, loading, create, update, remove } = useCredentials();
    return { credentials, loading, create, update, remove, THINKING_TYPE };
  },
  data() {
    return {
      schemas: [],
      selectedId: null,
      createOpen: false,
      createDefaultType: '',
      editOpen: false,
      deleteOpen: false,
      deleteLoading: false,
      modelsLoading: false,
      modelTab: 'llm',
      models: [],
      ttsModels: [],
      embeddingModels: [],
    };
  },
  computed: {
    groupedByType() {
      return this.schemas.map((s) => {
        const type = s.properties?.type?.const;
        return {
          type,
          title: s.title || type,
          records: this.credentials.filter((c) => c.data?.type === type),
        };
      });
    },
    configuredGroups() {
      return this.groupedByType.filter((g) => g.records.length > 0);
    },
    selectedCredential() {
      return this.credentials.find((c) => c.id === this.selectedId) || null;
    },
    selectedSchema() {
      if (!this.selectedCredential) return null;
      const type = this.selectedCredential.data?.type;
      return this.schemas.find((s) => s.properties?.type?.const === type) || null;
    },
    selectedType() {
      return this.selectedCredential?.data?.type || '';
    },
    displayFields() {
      const schema = this.selectedSchema;
      const credential = this.selectedCredential;
      if (!credential) return [];
      if (schema) {
        return Object.entries(schema.properties).filter(
          ([key, prop]) => key !== 'id' && key !== 'type' && prop.const === undefined,
        );
      }
      return Object.entries(credential.data)
        .filter(([key]) => key !== 'id' && key !== 'type')
        .map(([key]) => [key, { title: key }]);
    },
    hasMultipleModelTypes() {
      return this.ttsModels.length > 0 || this.embeddingModels.length > 0;
    },
    shownModels() {
      if (this.modelTab === 'tts') return this.ttsModels;
      if (this.modelTab === 'embedding') return this.embeddingModels;
      return this.models;
    },
    deleteTitle() {
      if (!this.selectedCredential) return '确认删除';
      const name = this.selectedCredential.data?.name || this.selectedCredential.id;
      return `删除凭证「${name}」`;
    },
  },
  watch: {
    credentials(val) {
      if (!this.selectedId && val.length > 0) {
        this.selectedId = val[0].id;
      }
    },
    selectedCredential(val, oldVal) {
      if (val && val.id !== oldVal?.id) {
        this.modelTab = 'llm';
        this.loadModels();
      }
    },
  },
  mounted() {
    this.loadSchemas();
  },
  methods: {
    formatNumber,
    modalities(types) {
      if (!Array.isArray(types)) return [];
      const out = new Set();
      for (const type of types) {
        if (type === THINKING_TYPE) continue;
        if (type === EMBEDDING_TYPE) {
          out.add('vector');
          continue;
        }
        const main = type.split('/')[0];
        out.add(MODALITIES.has(main) ? main : 'file');
      }
      return [...out];
    },
    isSecret(prop) {
      return prop.writeOnly || prop.format === 'password';
    },
    async loadSchemas() {
      const res = await credentialApi.schemas();
      this.schemas = res?.schemas || [];
    },
    async loadModels() {
      const type = this.selectedCredential?.data?.type;
      if (!type) return;
      this.modelsLoading = true;
      try {
        const [chat, tts, embedding] = await Promise.all([
          modelApi.list(type).then((r) => r?.models || []).catch(() => []),
          ttsModelApi.list(type).then((r) => r?.models || []).catch(() => []),
          embeddingModelApi.list(type).then((r) => r?.models || []).catch(() => []),
        ]);
        this.models = chat;
        this.ttsModels = tts;
        this.embeddingModels = embedding;
      } finally {
        this.modelsLoading = false;
      }
    },
    openCreate(type) {
      this.createDefaultType = type;
      this.createOpen = true;
    },
    onCreated() {
      this.selectedId = this.credentials[0]?.id || null;
    },
    onUpdated() {
      this.loadModels();
    },
    async handleDelete() {
      if (!this.selectedCredential) return;
      this.deleteLoading = true;
      try {
        await this.remove(this.selectedCredential.id);
        this.selectedId = null;
        this.deleteOpen = false;
      } finally {
        this.deleteLoading = false;
      }
    },
  },
});
</script>
