// Element theme-chalk 样式的条件入口。
// CDN 模式（.env.production，见 vue.config.js）下 theme-chalk 由 CDN 提供，
// development（.env.development）与 CDN 关闭时在此打包进本地。
// 必须作为独立模块被 import（而非在 styles.js 内联 require）：
// import 会被提升到模块体之前执行，内联 require 会让该样式落到
// element-overrides 之后加载，导致覆盖样式失效。
if (process.env.VUE_APP_USE_CDN !== 'true') {
  require('element-ui/lib/theme-chalk/index.css');
}
