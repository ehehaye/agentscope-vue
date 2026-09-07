<template>
  <el-drawer
    :title="`检索测试 - ${knowledgeBaseName}`"
    :visible.sync="drawerVisible"
    direction="rtl"
    size="30rem"
  >
    <div class="tw-flex tw-h-full tw-flex-col tw-gap-4 tw-p-4">
      <el-input v-model="query" placeholder="输入查询..." @keyup.enter.native="handleSearch" />
      <el-button type="primary" :loading="loading" @click="handleSearch">搜索</el-button>
      <div class="tw-flex-1 tw-overflow-y-auto tw-space-y-2">
        <div v-if="results.length === 0 && !loading" class="tw-text-sm tw-text-muted-foreground">输入查询并点击搜索</div>
        <div
          v-for="(item, index) in results"
          :key="index"
          class="tw-rounded-md tw-border tw-border-border tw-p-3 tw-text-sm"
        >
          <p class="tw-text-muted-foreground">{{ item.content || item.text || JSON.stringify(item) }}</p>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';
import { knowledgeBaseApi } from '@/api';

export default defineComponent({
  name: 'KnowledgeSearchDrawer',
  props: {
    visible: { type: Boolean, default: false },
    knowledgeBaseId: { type: String, required: true },
    knowledgeBaseName: { type: String, default: '' },
  },
  setup(props, { emit }) {
    const drawerVisible = computed({
      get: () => props.visible,
      set: (v) => emit('update:visible', v),
    });

    const query = ref('');
    const results = ref([]);
    const loading = ref(false);

    async function handleSearch() {
      if (!query.value.trim()) return;
      loading.value = true;
      try {
        const res = await knowledgeBaseApi.search(props.knowledgeBaseId, { query: query.value.trim() });
        results.value = res.results || res.documents || [];
      } catch {
        results.value = [];
      } finally {
        loading.value = false;
      }
    }

    return { drawerVisible, query, results, loading, handleSearch };
  },
});
</script>
