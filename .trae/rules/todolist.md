# Todolist

## 已完成（v5.20 第三/四批优化）
- ✅ 删除死代码 templates.js（53KB）
- ✅ 移除 Google Fonts 改用系统字体栈
- ✅ CSP 收紧去掉字体域名
- ✅ 首屏骨架屏（shimmer 动画）
- ✅ 修复周视图"今天"按钮电脑端滚动位置
- ✅ 版本提升到 v5.20
- ✅ node --check / diagnostics 0 错误
- ✅ 已提交推送 `0006ee6` 到 origin/main
- ✅ 线上验证通过

## 待执行
- 🔴P0 Supabase 初始化轮询改事件驱动（sync.js）
- 🔴P0 Supabase CDN 本地化（index.html + vendor/）
- 🟡P1 loadItems 防抖合并
- 🟡P1 console.log 生产环境静默
- 🟡P2 定时器合并
- 🟢P3 app.js 按功能域拆分

## 已跳过
- 暂不在本轮拆分 OCR、同步、表单弹窗等高耦合链路
