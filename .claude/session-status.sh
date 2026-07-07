#!/usr/bin/env bash
# 由 SessionStart hook 在每个新 session 注入实时项目状态。
# 只读、快速；完整背景见 CLAUDE.md，路线图见 plan.md。
root="$(cd "$(dirname "$0")/.." && pwd)" || exit 0
cd "$root" || exit 0

echo "=== Price Pilot 状态（自动注入 · 背景见 CLAUDE.md · 路线图见 plan.md）==="
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
dirty="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
echo "分支 ${branch:-?} · 未提交 ${dirty} 个文件 · 最近提交："
git log --oneline -3 2>/dev/null | sed 's/^/  /'
grep -m1 '已交付里程碑' plan.md 2>/dev/null | sed 's/\*\*//g'
