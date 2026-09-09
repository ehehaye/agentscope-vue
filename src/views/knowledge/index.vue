<template>
  <div class="tw-flex tw-size-full tw-gap-2 tw-p-2">
    <aside class="tw-flex tw-w-64 tw-min-w-0 tw-flex-col tw-overflow-hidden tw-rounded-22px tw-bg-card">
      <div class="tw-flex tw-flex-col tw-gap-y-1 tw-p-5 tw-pb-3">
        <div class="tw-text-xl tw-font-medium tw-tracking-neg-0_02em">{{ COMMON.knowledge }}</div>
        <div class="tw-text-xs tw-text-muted-foreground">{{ TEXT.knowledge.subtitle }}</div>
      </div>
      <div class="tw-flex-1 tw-overflow-y-auto tw-px-2">
        <div class="tw-mb-2 tw-flex tw-items-center tw-justify-between tw-px-2 tw-text-xs tw-font-medium tw-text-muted-foreground">
          <span>{{ TEXT.knowledge.list.label }}</span>
          <el-button type="text" size="mini" @click="createOpen = true">
            <Icon icon="lucide:plus" class="tw-h-3.5 tw-w-3.5" />
          </el-button>
        </div>
        <div v-if="loading" class="tw-flex tw-flex-1 tw-flex-col tw-items-center tw-justify-center tw-py-8">
          <Spinner className="h-6 tw-w-6" />
          <p class="tw-mt-2 tw-text-xs tw-text-muted-foreground">加载中…</p>
        </div>
        <PanelEmpty
          v-else-if="knowledgeBases.length === 0"
          icon="lucide:files"
          :title="TEXT.knowledge.list.emptyTitle"
          :description="TEXT.knowledge.list.emptyDescription"
        >
          <el-button size="small" @click="createOpen = true">
            <Icon icon="lucide:plus" class="tw-mr-1 tw-h-3.5 tw-w-3.5" />
            {{ TEXT.knowledge.list.createButton }}
          </el-button>
        </PanelEmpty>
        <div v-else class="tw-space-y-1">
          <div
            v-for="kb in knowledgeBases"
            :key="kb.id"
            class="tw-group tw-flex tw-cursor-pointer tw-items-center tw-justify-between tw-rounded-md tw-px-2 tw-py-1.5 tw-text-sm tw-transition-colors hover:tw-bg-muted"
            :class="{ 'tw-bg-muted': selectedKbId === kb.id }"
            @click="selectKb(kb)"
          >
            <span class="tw-min-w-0 tw-flex-1 tw-truncate">{{ kb.name }}</span>
            <span v-if="!kb.editable" class="tw-ml-1 tw-shrink-0 tw-rounded tw-border tw-border-border tw-px-1 tw-text-10px">{{ COMMON.readOnly }}</span>
            <el-dropdown v-if="kb.editable" trigger="click" @command="handleCommand($event, kb)">
              <span class="tw-ml-1 tw-opacity-0 tw-transition-opacity tw-duration-150 group-hover:tw-opacity-100" @click.stop>
                <Icon icon="lucide:ellipsis" class="tw-h-3.5 tw-w-3.5" />
              </span>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="edit">
                  <Icon icon="lucide:pencil" class="tw-mr-1 tw-h-3.5 tw-w-3.5" />
                  {{ COMMON.edit }}
                </el-dropdown-item>
                <el-dropdown-item command="delete" divided>
                  <Icon icon="lucide:trash-2" class="tw-mr-1 tw-h-3.5 tw-w-3.5" />
                  {{ COMMON.delete }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </div>
        </div>
      </div>
    </aside>

    <main class="tw-shadow-panel tw-flex tw-min-h-0 tw-min-w-0 tw-flex-1 tw-flex-col tw-overflow-hidden tw-rounded-22px tw-bg-card">
      <DetailPanel v-if="selectedKb" :knowledge-base="selectedKb" @test="testOpen = true" />
      <div v-else class="tw-flex tw-h-full tw-items-center tw-justify-center">
        <div class="tw-flex tw-max-w-sm tw-flex-col tw-items-center tw-gap-2 tw-text-center">
          <div class="tw-text-sm tw-font-medium">{{ TEXT.knowledge.selectHint }}</div>
          <p class="tw-text-xs tw-text-muted-foreground">{{ TEXT.knowledge.selectHintDescription }}</p>
        </div>
      </div>
    </main>

    <CreateKnowledgeBaseDialog :visible.sync="createOpen" @created="handleCreated" />
    <CreateCredentialDialog :visible.sync="credentialOpen" :create-fn="credentialApi.create" @created="credentialTrigger++" />
    <EditKnowledgeBaseDialog :visible.sync="editOpen" :knowledge-base="editTarget" @updated="refetch" />
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
import { MessageBox } from 'element-ui';
import { Icon } from '@iconify/vue2';
import { useRoute, useRouter } from '@/composables/vue-router';
import CreateKnowledgeBaseDialog from '@/components/dialog/CreateKnowledgeBaseDialog.vue';
import CreateCredentialDialog from '@/components/dialog/CreateCredentialDialog.vue';
import EditKnowledgeBaseDialog from '@/components/dialog/EditKnowledgeBaseDialog.vue';
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
        askDelete(kb);
      }
    }

    function askDelete(kb) {
      if (!kb) return;
      MessageBox.confirm(
        TEXT.knowledge.dialogDelete.description(kb.name || ''),
        TEXT.knowledge.dialogDelete.title,
        {
          type: 'warning',
          confirmButtonText: '删除',
          cancelButtonText: '取消',
        },
      )
        .then(async () => {
          await remove(kb.id);
          if (selectedKbId.value === kb.id) {
            selectedKbId.value = null;
            router.replace('/knowledge');
          }
        })
        .catch(() => {});
    }

    async function handleCreated(kbId) {
      await refetch();
      selectedKbId.value = kbId;
      router.push(`/knowledge/${kbId}`);
      createOpen.value = false;
    }

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
      testOpen,
      selectKb,
      handleCommand,
      askDelete,
      handleCreated,
      refetch,
      credentialApi,
      COMMON,
      TEXT,
    };
  },
});
</script>
