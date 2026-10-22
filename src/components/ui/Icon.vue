<script>
/**
 * Iconify 统一入口：在「离线 / 在线」两套实现之间全局切换。
 *
 * 开关是下方的 __ICONIFY_OFFLINE__ 常量（默认 true），仅在本文件定义，
 * 没有 DefinePlugin 注入，也没有环境变量覆盖——切换在线模式直接改成 false。
 * 该常量是布尔字面量，不可达分支会被 webpack / Terser 剪除，
 * 只有一侧的依赖会进包。
 *
 * 离线（内网默认）
 *   使用 @iconify/vue2/offline：不含任何网络请求代码，未注册的图标直接不渲染；
 *   lucide 图标集打进包并在启动时注册，全程零外网请求。
 *
 * 在线（__ICONIFY_OFFLINE__ = false）
 *   使用 @iconify/vue2：未注册图标自动请求 https://api.iconify.design，
 *   图标集 JSON 不会被打进包。
 *
 * 注意：业务代码只允许从本模块导入 Icon，不要直接 import '@iconify/vue2'
 * 或 '@iconify/vue2/offline'——两个入口各自持有独立的图标存储实例，
 * 混用会导致注册的图标不生效。
 */
const __ICONIFY_OFFLINE__ = true;

let api;
if (__ICONIFY_OFFLINE__) {
  api = require('@iconify/vue2/offline');
  // 注册本地 lucide 图标集（在线模式走 API，图标数据不进包）
  api.addCollection(require('@iconify-json/lucide/icons.json'));
} else {
  api = require('@iconify/vue2');
}

// 包装原始 Icon 组件：icon / disabled 为受控 props；
// 其余 attributes、事件、插槽、class 通过 data 原样透传。
// 默认追加 tw-cursor-pointer，disabled 时改用 not-allowed 并降低亮度。
export default {
  name: 'Icon',
  functional: true,
  props: {
    icon: { type: [String, Object], required: true },
    disabled: { type: Boolean, default: false },
  },
  render(h, ctx) {
    // 模板里写死的 class="..." 在 Vue 2 会编译进 staticClass，
    // 而下游 api.Icon 只读 contextData.class——所以这里必须显式把
    // staticClass 也拼到 class 里。
    const { staticClass, class: dynClass } = ctx.data;
    const { icon, disabled } = ctx.props;
    return h(
      api.Icon,
      {
        ...ctx.data,
        // Iconify 的 Icon 只读 $attrs；icon 声明为 prop 后需显式放回 attrs
        attrs: { ...(ctx.data.attrs || {}), icon },
        class: [disabled ? 'tw-cursor-not-allowed tw-opacity-50' : 'tw-cursor-pointer', staticClass, dynClass],
      },
      ctx.children,
    );
  },
};
</script>

<style lang="less">
// Icon 包装层固定追加 tw-cursor-pointer；禁用控件内的图标统一改回不可点击光标并降低亮度。
// 用原生 button:disabled 而不是 .el-button.is-disabled，Element 按钮同样带 disabled，
// 原生 button 与 el-button 都能覆盖。
@{as-scope} button:disabled svg {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
