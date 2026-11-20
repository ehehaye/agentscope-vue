/**
 * Markdown 自定义渲染注册
 */
import { registerCodeBlockComp } from '@/components/md/registry';
import { stringToFunction } from '@/utils/ast';

registerCodeBlockComp('echarts', {
  component: () => import('@/components/echarts/VChart.vue'),
  resolve({ code }) {
    try {
      return {
        option: JSON.parse(code?.trim(), (key, value) => {
          // 还原 formatter 等函数式配置
          if (typeof value === 'string' && (value.includes('function') || value.includes('=>'))) {
            return stringToFunction(value);
          }
          return value;
        }),
      };
    } catch (err) {
      // JSON 不合法，回退默认代码块渲染
      return null;
    }
  },
  toDocx({ option }, ctx) {
    return ctx.renderEcharts(option);
  },
});
