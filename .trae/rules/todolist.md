# Todolist

## 当前轮次目标
- 实施 P2-1：优化主面板当前日期加载链路，减少日视图无差别全量读取带来的不必要开销
- 保持现有 UI、数据结构、跨日期办文与同步链路不变，确保线上既有功能零回归

## 当前待办
- 暂无

## 已完成
- ✅ 已重新通读 `.trae/rules/` 五个规则文件并确认本轮仍按“验证通过后默认提交、推送、部署”执行
- ✅ 已定位主面板当前日期加载链路：`loadItems()` 在日视图下每次都走 `db.getAllItems()` 后再本地过滤
- ✅ 已完成 P2-1 第一轮收敛：日视图改为复用 `db.getItemsByDateRange(selectedDate, selectedDate)` 获取当天数据
- ✅ 已在 app.js 抽出 `getBoardItemsForSelectedDate`、`getVisibleBoardItems`、`groupItemsByType`，减少 `loadItems()` 中重复筛选/分组逻辑
- ✅ 已保留跨日期办文 `dayStates` 按日覆盖、`skipWeekend` 过滤与原有渲染排序逻辑
- ✅ 已完成 `node --check js/app.js`、app.js 诊断校验与页面级冒烟验证
- ✅ 已更新 index.html 中 app.js 资源版本号为 `v77`

## 已跳过
- 暂无

## 下一步
- 提交、推送、部署本轮 P2-1 第一轮优化
- 用户线上强制刷新后，重点复测日期切换、今日按钮、跨日期办文显示与周/月视图切换

