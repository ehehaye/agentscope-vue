<template>
  <div class="flex max-w-full items-center gap-3 rounded-lg border border-border bg-card p-2">
    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
      <img v-if="isImage && dataUrl" :src="dataUrl" class="h-full w-full rounded-md object-cover" />
      <Icon v-else-if="isVideo" icon="lucide:file-video-2" class="h-5 w-5" />
      <Icon v-else icon="lucide:file-text" class="h-5 w-5" />
    </div>
    <div class="min-w-0 flex-1">
      <div class="truncate text-sm font-medium">{{ block.name || 'File' }}</div>
      <div class="text-xs text-muted-foreground">{{ extension }}</div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import * as mime from 'mime-types';

export default defineComponent({
  name: 'DataBlockView',
  components: { Icon },
  props: {
    block: { type: Object, required: true },
  },
  setup(props) {
    const dataType = computed(() => props.block.source.media_type.split('/')[0]);
    const isImage = computed(() => dataType.value === 'image');
    const isVideo = computed(() => dataType.value === 'video');

    const dataUrl = computed(() => {
      const src = props.block.source;
      if (src.type === 'url') return src.url;
      if (src.type === 'base64' && src.data) {
        return `data:${src.media_type};base64,${src.data}`;
      }
      return '';
    });

    const extension = computed(() =>
      (mime.extension(props.block.source.media_type) || 'bin').toUpperCase(),
    );

    return { isImage, isVideo, dataUrl, extension };
  },
});
</script>
