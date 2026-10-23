import * as echarts from 'echarts';

/**
 * 用离屏容器把 echarts option 渲染成 PNG dataURL。
 *
 * - 关闭动画，保证返回时已是最终帧；
 * - 强制白色背景，避免深色主题的图表落在白纸/Word 上不可读；
 * - 图表不可见、option 非法等场景返回 null，由调用方降级。
 */
export function renderEchartsDataUrl(option, { width = 800, height = 400, backgroundColor = '#fff' } = {}) {
  if (!option || typeof option !== 'object') return null;
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;left:-9999px;top:0;width:${width}px;height:${height}px;`;
  document.body.appendChild(el);
  let chart = null;
  try {
    chart = echarts.init(el, null, { renderer: 'canvas', width, height });
    chart.setOption({ ...option, animation: false, backgroundColor });
    return chart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor,
      excludeComponents: ['toolbox'],
    });
  } catch (err) {
    console.warn('[renderEchartsDataUrl] 渲染失败', err);
    return null;
  } finally {
    if (chart) chart.dispose();
    el.remove();
  }
}
