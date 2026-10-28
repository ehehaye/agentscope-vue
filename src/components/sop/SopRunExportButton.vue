<template>
  <span
    class="tw-inline-flex"
    @click.stop
  >
    <ExportButton
      type="word"
      :loader="loadSections"
      :filename="filename"
    />
  </span>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import ExportButton from '@/components/exports/ExportButton.vue';
import { sessionApi, sopApi } from '@/api';
import { buildRunExportSections, collectRunSessions } from '@/utils/sop';

export default defineComponent({
  name: 'SopRunExportButton',
  components: { ExportButton },
  props: {
    run: { type: Object, default: null },
    title: { type: String, default: '' },
  },
  setup(props) {
    const filename = computed(() => `${props.run?.definition?.name || '运行'} - ${props.title}.docx`);

    // 列表接口可能不返回 sessions 映射，缺省时再取一次运行详情。
    async function resolveRun() {
      if (props.run?.sessions) return props.run;
      return sopApi.getRun(props.run.id);
    }

    // 点击时才拉取会话历史：列表页不需要为每一行预先加载消息。
    async function loadSections() {
      const run = await resolveRun();
      const entries = collectRunSessions(run).filter((entry) => entry.session_id);
      const lists = await Promise.all(
        entries.map(async (entry) => [
          entry.session_key,
          await sessionApi.messagesAll(entry.session_id, entry.agent_id),
        ]),
      );
      return buildRunExportSections(entries, Object.fromEntries(lists));
    }

    return { filename, loadSections };
  },
});
</script>
