<template>
  <el-drawer
    :title="`检索测试 - ${knowledgeBaseName}`"
    :visible.sync="drawerVisible"
    direction="rtl"
    size="30rem"
  >
    <div class="flex h-full flex-col gap-4 p-4">
      <el-input v-model="query" placeholder="输入查询..." @keyup.enter.native="handleSearch" />
      <el-button type="primary" :loading="loading" @click="handleSearch">搜索</el-button>
      <div class="flex-1 overflow-y-auto space-y-2">
        <div v-if="results.length === 0 && !loading" class="text-sm text-muted-foreground">输入查询并点击搜索</div>
        <div
          v-for="(item, index) in results"
          :key="index"
          class="rounded-md border border-border p-3 text-sm"
        >
          <p class="text-muted-foreground">{{ item.content || item.text || JSON.stringify(item) }}</p>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script>
import { defineComponent, ref, computed } from '@vue/composition-api';
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
