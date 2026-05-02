# Todolist

## 当前轮次目标
- 修复周视图"今天"按钮在移动端误命中隐藏表头的问题
- 完成本地校验、推送部署与线上验证

## 已完成（v5.12）
- ✅ 修复周视图今天按钮误命中 `.week-header.today` 的滚动目标问题
- ✅ 收敛周视图 today 滚动到 `.week-cell.today`
- ✅ 收敛月视图 today 滚动到 `.month-cell.today`
- ✅ 版本号提升到 v5.12
- ✅ node --check / diagnostics 全部 0 错误
- ✅ 本地移动端模拟测试通过
- ✅ 已提交推送 `d96239b` + 文档修正 `a81ecdf` 到 origin/main
- ✅ 通过 GitHub API 确认远程 calendar.js 包含 `.week-cell.today` 和 `.month-cell.today`
- ✅ 通过 GitHub API 确认远程 app.js 包含 `2026-05-01 v5.12`
- ✅ 通过 GitHub API 确认远程 index.html 引用 `calendar.js?v=38` 和 `app.js?v=160`

## 待用户线上验证
- 在浏览器强刷 `https://kimixpf1.github.io/officeboard/`（Ctrl+Shift+R）
- 确认页面右下角版本号显示 `2026-05-01 v5.12`
- 切到周视图，点击"今天"按钮，确认滚动到今天日期框
- 切到月视图，点击"今天"按钮，确认滚动到今天日期框
- 手机端（窄屏）重复上述周/月视图测试

## 后续优化计划（待执行）
- 第二阶段：数据安全加固（getStore 事务保护、restoreFromBackup 事务性、deletedItemsMap 容量保护）
- 第三阶段：运行时性能优化（ocr.js 批量写入、checkDuplicate Map 索引、getItemsByType 走索引）
- 第四阶段：体验细节打磨（删除文案、预览增量更新、内联 style 迁移）
- 第五阶段：代码健康度（sync.js 副数据同步去重、共享工具函数提取）

## 已跳过
- 暂不在本轮继续拆分 OCR、同步、表单弹窗等高耦合链路
