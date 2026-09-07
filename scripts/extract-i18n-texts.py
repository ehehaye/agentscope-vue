#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从旧 i18n locales/zh.json 抽取去 i18n 后的中文字面量来源。

产出（Phase 0 去 i18n 文案抽取，见 migration/03 §8 Phase 0）：
  1. src/constants/text.js        — 高频共享文案常量（运行时 import）
  2. migration/04.TEXTS.md        — 按迁移页面组织的全部文案参考（迁移时抄写为字面量）

规则：
  - i18next 复数键 `_one`/`_other` 中文完全一致 → 折叠为单键
  - `{{name}}` 插值 → text.js 中输出为箭头函数；md 中注明参数
  - common.switchToZh / switchToEn 随语言切换入口删除，不进产物
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ZH = ROOT / "src/i18n/locales/zh.json"
TEXT_JS = ROOT / "src/constants/text.js"
TEXTS_MD = ROOT / "migration/04.TEXTS.md"

# 随去 i18n 删除的 key（语言切换入口）
DROP_KEYS = {("common", "switchToZh"), ("common", "switchToEn")}

# 进运行时常量 text.js 的顶层 section（项目自带的「共享」命名空间）
CONST_SECTIONS = ["common", "error"]

# md 文档的页面分组（按迁移阶段顺序）
PAGE_GROUPS = [
    ("骨架 / 初始设置", ["setup"]),
    ("智能体与会话（对话框）", [
        "dialog-agent-create", "agent-form", "dialog-agent-edit",
        "dialog-agent-delete", "dialog-session-delete", "dialog-session-rename",
        "session-menu", "agent-menu",
    ]),
    ("凭证页（含模型选择 / 参数 / 权限模式）", [
        "dialog-credential-create", "dialog-credential-edit", "credential",
        "llm-select", "model-parameters", "permission-mode",
    ]),
    ("知识库页", [
        "dialog-knowledge-base-create", "dialog-knowledge-base-edit",
        "dialog-knowledge-base-delete", "knowledge", "embedding-select",
        "chunker-select", "chunker-types", "dimension-select",
    ]),
    ("MCP 页", ["dialog-mcp-create", "dialog-mcp-delete", "mcp"]),
    ("技能页", ["skill"]),
    ("频道页", ["channel"]),
    ("日程页", ["schedule"]),
    ("聊天核心（Phase 4）", [
        "chat", "textInput", "confirmCard", "messageBubble", "tool",
        "task-panel", "panel", "workdir",
    ]),
    ("新手引导（Phase 5）", ["tour"]),
]

PLACEHOLDER = re.compile(r"\{\{\s*(\w+)\s*\}\}")


def flatten(d, prefix=()):
    """返回 [(key_path_tuple, value)]，折叠复数键。"""
    leaves = {}
    order = []

    def walk(node, path):
        for k, v in node.items():
            if isinstance(v, dict):
                walk(v, path + (k,))
            else:
                base = k
                if k.endswith("_one"):
                    base = k[:-4]
                elif k.endswith("_other"):
                    base = k[:-6]
                full = path + (base,)
                if full not in leaves:
                    order.append(full)
                # 复数键值已校验一致，后写覆盖同值
                leaves[full] = v

    walk(d, prefix)
    return [(k, leaves[k]) for k in order]


def js_quote(s):
    """单引号 JS 字符串；插值文本转模板字符串。"""
    return s.replace("\\", "\\\\").replace("'", "\\'")


def is_interp(s):
    return bool(PLACEHOLDER.search(s))


def func_params(s):
    seen = []
    for m in PLACEHOLDER.findall(s):
        if m not in seen:
            seen.append(m)
    return seen


def to_template(s):
    """'已显示 {{count}} 个' -> 模板字符串内容。"""
    out = []
    i = 0
    for m in PLACEHOLDER.finditer(s):
        out.append(s[i:m.start()].replace("`", "\\`").replace("${", "\\${"))
        out.append("${" + m.group(1) + "}")
        i = m.end()
    out.append(s[i:].replace("`", "\\`").replace("${", "\\${"))
    return "".join(out)


def gen_text_js(zh):
    lines = [
        "/**",
        " * 高频复用中文文案常量（去 i18n 后的唯一运行时文案层）。",
        " *",
        " * 来源：旧 src/i18n/locales/zh.json 的 common / error 命名空间",
        " * （生成脚本 scripts/extract-i18n-texts.py，勿手改）。",
        " * - 纯文案为字符串常量；带 {{占位符}} 的文案为函数，参数名与旧占位符一致。",
        " * - 页面/组件私有文案不进这里，直接在 .vue 中写字面量（见 migration/04.TEXTS.md）。",
        " */",
        "",
    ]
    count_total = 0
    for section in CONST_SECTIONS:
        if section not in zh:
            continue
        block = zh[section]
        title = {"common": "通用按钮 / 状态 / 名词", "error": "错误边界（RouteError）"}[section]
        lines.append(f"// ── {title}（{section}） ──")
        lines.append(f"export const {section.upper()} = {{")
        for keypath, value in flatten(block):
            if (section, keypath[0]) in DROP_KEYS:
                continue
            raw_name = keypath[-1]
            # 合法 JS 标识符保持原样（便于和旧 i18n key 对照），否则加引号
            name = raw_name if re.match(r"^[A-Za-z_$][A-Za-z0-9_$]*$", raw_name) else f"'{raw_name}'"
            if is_interp(value):
                params = func_params(value)
                lines.append(
                    f"\t{name}: ({', '.join(params)}) => `{to_template(value)}`,"
                )
            else:
                lines.append(f"\t{name}: '{js_quote(value)}',")
            count_total += 1
        lines.append("};")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n", count_total


def md_escape(s):
    """表格单元格转义：反斜杠 → 管道 → 换行/制表符（保留为可见字面量）。"""
    return (
        s.replace("\\", "\\\\")
        .replace("|", "\\|")
        .replace("\t", "\\t")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
    )


def gen_md(zh):
    out = []
    out.append("# 04. 去 i18n 中文字面量来源（迁移抄写参考）")
    out.append("")
    out.append("> 生成自 `src/i18n/locales/zh.json`（脚本 `scripts/extract-i18n-texts.py`）。")
    out.append("> Vue 迁移时**不引入 i18n 运行时**：页面私有文案直接抄写为组件内中文字面量；")
    out.append("> 高频共享文案（common/error）使用 [`src/constants/text.js`](../src/constants/text.js) 常量。")
    out.append(">")
    out.append("> 约定：")
    out.append("> - `{{name}}` 为插值占位符，迁移时写为模板字符串/拼接，括号内列出参数名。")
    out.append("> - i18next 复数键 `_one`/`_other` 中文一致，已折叠为单键。")
    out.append("> - `common.switchToZh`/`switchToEn` 随语言切换入口删除，不再列出。")
    out.append("")
    total = 0
    seen_sections = set()
    for group_title, sections in PAGE_GROUPS:
        out.append(f"## {group_title}")
        out.append("")
        for sec in sections:
            if sec not in zh:
                continue
            seen_sections.add(sec)
            out.append(f"### `{sec}`")
            out.append("")
            out.append("| key | 中文文案 | 插值参数 |")
            out.append("|---|---|---|")
            for keypath, value in flatten(zh[sec]):
                if (sec, keypath[0]) in DROP_KEYS:
                    continue
                key = ".".join(keypath)
                params = ", ".join(func_params(value)) if is_interp(value) else ""
                out.append(f"| `{key}` | {md_escape(value)} | {params} |")
                total += 1
            out.append("")
    # 未分组的 section 兜底
    leftover = [s for s in zh if s not in seen_sections and s not in CONST_SECTIONS]
    if leftover:
        out.append("## 其他")
        out.append("")
        for sec in leftover:
            out.append(f"### `{sec}`")
            out.append("")
            out.append("| key | 中文文案 | 插值参数 |")
            out.append("|---|---|---|")
            for keypath, value in flatten(zh[sec]):
                key = ".".join(keypath)
                params = ", ".join(func_params(value)) if is_interp(value) else ""
                out.append(f"| `{key}` | {md_escape(value)} | {params} |")
                total += 1
            out.append("")
    return "\n".join(out), total


def main():
    zh = json.loads(ZH.read_text(encoding="utf-8"))

    TEXT_JS.parent.mkdir(parents=True, exist_ok=True)
    js, js_count = gen_text_js(zh)
    TEXT_JS.write_text(js, encoding="utf-8")

    md, md_count = gen_md(zh)
    TEXTS_MD.write_text(md, encoding="utf-8")

    # 校验：折叠后叶子总数
    all_leaves = len(flatten(zh)) - len(DROP_KEYS)
    print(f"text.js 常量条目: {js_count}")
    print(f"04.TEXTS.md 条目: {md_count}")
    print(f"总叶子(折叠+去删除): {all_leaves}")
    assert js_count + md_count == all_leaves, "coverage mismatch!"
    print("coverage OK")


if __name__ == "__main__":
    main()
