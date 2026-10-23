<script>
let api;
if (process.env.VUE_APP_USE_CDN !== 'true') {
  api = require('@iconify/vue2/offline');
  api.addCollection(require('@iconify-json/lucide/icons.json'));
} else {
  api = require('@iconify/vue2');
}

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
@{as-scope} button:disabled svg {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
