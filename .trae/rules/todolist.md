# Todolist

## 当前轮次目标
- 继续修复并验证周视图“今天”按钮在移动端/线上页面的跳转问题
- 确认本地与线上版本号一致且缓存已更新
- 完成本地校验、线上强刷复测与结果记录

## 当前待办
- 待在线上强刷验证 `https://kimixpf1.github.io/officeboard/` 命中 `v5.12`
- 待确认周视图点击“今天”能滚动到 `.week-cell.today`
- 待确认月视图点击“今天”能滚动到 `.month-cell.today`

## 已完成（本轮 v5.12）
- ✅ 修复周视图今天按钮误命中 `.week-header.today` 的滚动目标问题
- ✅ 收敛周视图 today 滚动到 `.week-cell.today`
- ✅ 收敛月视图 today 滚动到 `.month-cell.today`
- ✅ 版本号提升到 v5.12

## 后续优化计划（待执行）
- 第二阶段：数据安全加固（getStore 事务保护、restoreFromBackup 事务性、deletedItemsMap 容量保护）
- 第三阶段：运行时性能优化（ocr.js 批量写入、checkDuplicate Map 索引、getItemsByType 走索引）
- 第四阶段：体验细节打磨（删除文案、预览增量更新、内联 style 迁移）
- 第五阶段：代码健康度（sync.js 副数据同步去重、共享工具函数提取）

## 已跳过
- 暂不在本轮继续拆分 OCR、同步、表单弹窗等高耦合链路
