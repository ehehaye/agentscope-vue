/**
 * Markdown 自定义渲染注册
 */
import VChart from '@/components/echarts/VChart.vue';
import MdTable from '@/components/md-components/MdTable.vue';
import { registerCodeBlockComp, registerTagComp } from '@/components/md/registry';

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
  toDocx({ option }, ctx) {
    return ctx.renderEcharts(option);
  },
});

registerTagComp('table', {
  component: MdTable,
  resolve({ node }) {
    return { node };
  },
});
