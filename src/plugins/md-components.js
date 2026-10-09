/**
 * Markdown 标签覆盖注册
 */
import VChart from '@/components/echarts/VChart.vue';
import { registerCodeBlockComp } from '@/components/md/registry';

registerCodeBlockComp('echarts', {
  component: VChart,
  resolve({ code }) {
    try {
      return { option: JSON.parse(code.trim()) };
    } catch (err) {
      // JSON 不合法，回退默认代码块渲染
      return null;
    }
  },
});
