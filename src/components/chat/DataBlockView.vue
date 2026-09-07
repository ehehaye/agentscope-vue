<template>
  <div class="tw-flex tw-max-w-full tw-items-center tw-gap-3 tw-rounded-lg tw-border tw-border-border tw-bg-card tw-p-2">
    <div class="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-md tw-bg-muted">
      <img v-if="isImage && dataUrl" :src="dataUrl" class="tw-h-full tw-w-full tw-rounded-md tw-object-cover" />
      <Icon v-else-if="isVideo" icon="lucide:file-video-2" class="tw-h-5 tw-w-5" />
      <Icon v-else icon="lucide:file-text" class="tw-h-5 tw-w-5" />
    </div>
    <div class="tw-min-w-0 tw-flex-1">
      <div class="tw-truncate tw-text-sm tw-font-medium">{{ block.name || 'File' }}</div>
      <div class="tw-text-xs tw-text-muted-foreground">{{ extension }}</div>
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
