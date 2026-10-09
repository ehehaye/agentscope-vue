import { onMounted, onBeforeUnmount } from '@/composables/vue';

export function usePrintEvents({ beforePrint = () => {}, afterPrint = () => {} }) {
  onMounted(() => {
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('beforeprint', beforePrint);
    window.removeEventListener('afterprint', afterPrint);
  });
}
