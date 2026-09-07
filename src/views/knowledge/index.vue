<template>
  <div class="flex size-full gap-2 p-2">
    <aside class="flex w-64 min-w-0 flex-col overflow-hidden tw-rounded-22px bg-card">
      <div class="flex flex-col gap-y-1 p-5 pb-3">
        <div class="text-xl font-medium tw-tracking-neg-0_02em">{{ COMMON.knowledge }}</div>
        <div class="text-xs text-muted-foreground">{{ TEXT.knowledge.subtitle }}</div>
      </div>
      <div class="flex-1 overflow-y-auto px-2">
        <div class="mb-2 flex items-center justify-between px-2 text-xs font-medium text-muted-foreground">
          <span>{{ TEXT.knowledge.list.label }}</span>
          <el-button type="text" size="mini" @click="createOpen = true">
            <Icon icon="lucide:plus" class="h-3.5 w-3.5" />
          </el-button>
        </div>
        <div v-if="loading" class="flex flex-1 flex-col items-center justify-center py-8">
          <Spinner className="h-6 w-6" />
          <p class="mt-2 text-xs text-muted-foreground">加载中…</p>
        </div>
        <PanelEmpty
          v-else-if="knowledgeBases.length === 0"
          icon="lucide:files"
          :title="TEXT.knowledge.list.emptyTitle"
          :description="TEXT.knowledge.list.emptyDescription"
        >
          <el-button size="small" @click="createOpen = true">
            <Icon icon="lucide:plus" class="mr-1 h-3.5 w-3.5" />
            {{ TEXT.knowledge.list.createButton }}
          </el-button>
        </PanelEmpty>
        <div v-else class="space-y-1">
          <div
            v-for="kb in knowledgeBases"
            :key="kb.id"
            class="group flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
            :class="{ 'bg-muted': selectedKbId === kb.id }"
            @click="selectKb(kb)"
          >
            <span class="min-w-0 flex-1 truncate">{{ kb.name }}</span>
            <span v-if="!kb.editable" class="ml-1 shrink-0 rounded border border-border px-1 tw-text-10px">{{ COMMON.readOnly }}</span>
            <el-dropdown v-if="kb.editable" trigger="click" @command="handleCommand($event, kb)">
              <span class="ml-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100" @click.stop>
                <Icon icon="lucide:ellipsis" class="h-3.5 w-3.5" />
              </span>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="edit">
                  <Icon icon="lucide:pencil" class="mr-1 h-3.5 w-3.5" />
                  {{ COMMON.edit }}
                </el-dropdown-item>
                <el-dropdown-item command="delete" divided>
                  <Icon icon="lucide:trash-2" class="mr-1 h-3.5 w-3.5" />
                  {{ COMMON.delete }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </div>
        </div>
      </div>
    </aside>

    <main class="shadow-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden tw-rounded-22px bg-card">
      <DetailPanel v-if="selectedKb" :knowledge-base="selectedKb" @test="testOpen = true" />
      <div v-else class="flex h-full items-center justify-center">
        <div class="flex max-w-sm flex-col items-center gap-2 text-center">
          <div class="text-sm font-medium">{{ TEXT.knowledge.selectHint }}</div>
          <p class="text-xs text-muted-foreground">{{ TEXT.knowledge.selectHintDescription }}</p>
        </div>
      </div>
    </main>

    <CreateKnowledgeBaseDialog :visible.sync="createOpen" @created="handleCreated" />
    <CreateCredentialDialog :visible.sync="credentialOpen" :create-fn="credentialApi.create" @created="credentialTrigger++" />
    <EditKnowledgeBaseDialog :visible.sync="editOpen" :knowledge-base="editTarget" @updated="refetch" />
    <DeleteDialog
      :visible.sync="deleteOpen"
      :title="TEXT.knowledge.dialogDelete.title"
      :description="deleteDescription"
      :loading="deleting"
      @confirm="handleConfirmDelete"
    />
    <KnowledgeSearchDrawer
      v-if="selectedKb"
      :visible.sync="testOpen"
      :knowledge-base-id="selectedKb.id"
      :knowledge-base-name="selectedKb.name"
    />
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import { useRoute, useRouter } from '@/composables/vue-router';
import CreateKnowledgeBaseDialog from '@/components/dialog/CreateKnowledgeBaseDialog.vue';
import CreateCredentialDialog from '@/components/dialog/CreateCredentialDialog.vue';
import EditKnowledgeBaseDialog from '@/components/dialog/EditKnowledgeBaseDialog.vue';
import DeleteDialog from '@/components/dialog/DeleteDialog.vue';
import KnowledgeSearchDrawer from '@/components/drawer/KnowledgeSearchDrawer.vue';
import Spinner from '@/components/ui/Spinner.vue';
import PanelEmpty from '@/components/panel/PanelEmpty.vue';
import DetailPanel from './DetailPanel.vue';
import { useKnowledgeBases } from '@/composables/useKnowledgeBases';
import { credentialApi } from '@/api';
import { COMMON } from '@/constants/text';
import { TEXT } from './text';

export default defineComponent({
  name: 'KnowledgePage',
  components: {
    Icon,
    Spinner,
    PanelEmpty,
    CreateKnowledgeBaseDialog,
    CreateCredentialDialog,
    EditKnowledgeBaseDialog,
    DeleteDialog,
    KnowledgeSearchDrawer,
    DetailPanel,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const { knowledgeBases, loading, refetch, remove, create } = useKnowledgeBases();

    const selectedKbId = ref(route.params.kbId);
    const createOpen = ref(false);
    const credentialOpen = ref(false);
    const credentialTrigger = ref(0);
    const editTarget = ref(null);
    const editOpen = ref(false);
    const deleteTarget = ref(null);
    const deleteOpen = ref(false);
    const deleting = ref(false);
    const testOpen = ref(false);

    const selectedKb = computed(() => knowledgeBases.value.find((kb) => kb.id === selectedKbId.value));

    watch(() => route.params.kbId, (id) => {
      selectedKbId.value = id;
    });

    watch(knowledgeBases, (list) => {
      if (list.length === 0) return;
      if (list.some((kb) => kb.id === selectedKbId.value)) return;
      const first = list[0].id;
      selectedKbId.value = first;
      router.replace(`/knowledge/${first}`);
    }, { immediate: true });

    function selectKb(kb) {
      selectedKbId.value = kb.id;
      router.push(`/knowledge/${kb.id}`);
    }

    function handleCommand(command, kb) {
      if (command === 'edit') {
        editTarget.value = kb;
        editOpen.value = true;
      } else if (command === 'delete') {
        deleteTarget.value = kb;
        deleteOpen.value = true;
      }
    }

    async function handleCreated(kbId) {
      await refetch();
      selectedKbId.value = kbId;
      router.push(`/knowledge/${kbId}`);
      createOpen.value = false;
    }

    async function handleConfirmDelete() {
      if (!deleteTarget.value) return;
      deleting.value = true;
      try {
        const id = deleteTarget.value.id;
        await remove(id);
        if (selectedKbId.value === id) {
          selectedKbId.value = null;
          router.replace('/knowledge');
        }
        deleteOpen.value = false;
      } finally {
        deleting.value = false;
      }
    }

    const deleteDescription = computed(() => {
      return TEXT.knowledge.dialogDelete.description(deleteTarget.value?.name || '');
    });

    return {
      knowledgeBases,
      loading,
      selectedKbId,
      selectedKb,
      createOpen,
      credentialOpen,
      credentialTrigger,
      editTarget,
      editOpen,
      deleteTarget,
      deleteOpen,
      deleting,
      testOpen,
      selectKb,
      handleCommand,
      handleCreated,
      handleConfirmDelete,
      deleteDescription,
      refetch,
      credentialApi,
      COMMON,
      TEXT,
    };
  },
});
</script>
