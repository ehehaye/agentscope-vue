// CSS 引入顺序：
// 1. Tailwind v2 + index.css 主题变量（:root / .dark 单点）
// 2. Element 组件样式
// 3. element-overrides（把 Element 表面色映射到 CSS 变量，含深色兜底）
// 4. atomic（as- 前缀：抽离自 Tailwind 任意值 [xxx] 的原子类）
import '../styles/index.css';
import 'element-ui/lib/theme-chalk/index.css';
import '../styles/element-overrides.less';
import '../styles/atomic.css';
