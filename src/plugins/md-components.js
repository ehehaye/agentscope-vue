/**
 * Markdown 自定义渲染注册
 */
import { registerCodeBlockComp } from '@/components/md/registry';

registerCodeBlockComp('echarts', {
  component: () => import('@/components/echarts/VChart.vue'),
  resolve({ code }) {
    try {
      return { option: JSON.parse(code.trim()) };
    } catch (err) {
      // JSON 不合法，回退默认代码块渲染
      return null;
    }
  },
  toDocx({ option }, ctx) {
    return ctx.renderEcharts(option);
  },
});
