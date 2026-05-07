# Todolist

## 已完成（v5.35 同步误删保护）
- ✅ syncLocalItemsToState 在 targetList 为空且本地有数据时保留本地，不再清空覆盖
- ✅ db.deleteItemsByHashes 在 keepHashes 为空时跳过删除，避免全删
- ✅ smartSync / silentSyncFromCloud / mergeData 对云端空数据、异常缩容加保护
- ✅ 自动备份与导出备份补齐 sideData
- ✅ node --check js/sync.js / js/db.js 通过
- 🔄 待提交推送

## 已完成（v5.24 微信识别修复）
- ✅ 排查微信页面 AI 识别失败根因（Tesseract CDN 不通）
- ✅ ocr.js 阻止微信环境 Tesseract fallback
- ✅ wechat-upload.js 增加 API Key 恢复检查和提示
- ✅ 线上验证：微信 UA 已命中 `ocr.js?v=44`、`wechat-upload.js?v=10`，无 Key 时按钮禁用和提示生效
- ✅ node --check 通过（ocr.js / wechat-upload.js）
- ✅ 已提交推送 `131ddfb` 到 origin/main
- 🔄 待用户微信端验证有 Key 的真实识别链路

## 已完成（v5.21 性能优化）
- ✅ Supabase 初始化轮询改事件驱动
- ✅ window.supabase 属性锁定防篡改
- ✅ 已提交推送 `d7776d4` 到 origin/main

## 已完成（v5.20 第三/四批优化）
- ✅ 删除死代码 templates.js（53KB）
- ✅ 移除 Google Fonts 改用系统字体栈
- ✅ CSP 收紧去掉字体域名
- ✅ 首屏骨架屏（shimmer 动画）
- ✅ 修复周视图"今天"按钮电脑端滚动位置

## 待执行
- 🔴P0 Supabase CDN 本地化（index.html + vendor/）
- 🟡P1 loadItems 防抖合并
- 🟡P1 console.log 生产环境静默
- 🟡P2 定时器合并
- 🟢P3 app.js 按功能域拆分

## 已跳过
- 暂不在本轮拆分 OCR、同步、表单弹窗等高耦合链路
