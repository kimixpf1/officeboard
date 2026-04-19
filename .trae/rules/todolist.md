# Todolist

## 当前轮次目标
- 完成 `app.js` 第一层小拆分：先抽离“日期 / 视图 / 刷新”主链，降低后续继续拆分的耦合度
- 保持低风险、可回退，不改数据库结构、不改同步协议、不触碰 OCR / 同步等高风险链路
- 在功能保持不变前提下，为后续继续拆分 `app.js` 建立稳定边界

## 当前待办
- 已完成本轮代码拆分与静态校验，待提交、推送后做页面级回归复测

## 已完成
- ✅ 已重新核对 `app.js` 当前实现，确认本轮只处理日期选择、视图切换、日期导航、日历跳转与列表刷新主链
- ✅ 已创建可回退锚点：`rollback/app-split-p3-l1-pre-20260418-1`
- ✅ 已新增 `js/app-date-view.js`，抽出 `OfficeDateViewController`
- ✅ 已将以下逻辑集中到 `OfficeDateViewController`：
  - `initDatePicker()`
  - `onDatePickerChange()`
  - `applySelectedDate()`
  - `switchView()`
  - `goToDateView()`
  - `navigateDate()`
  - `goToToday()`
  - `updateDateDisplay()`
  - `getBoardItemsForSelectedDate()`
  - `getVisibleBoardItems()`
  - `groupItemsByType()`
  - `loadItems()`
- ✅ 已在 `app.js` 中保留同名薄封装入口，避免现有调用点大面积改动
- ✅ 已在构造函数中接入 `this.dateViewController = new OfficeDateViewController(this)`
- ✅ 已将视图按钮、上一页 / 下一页 / 今天、日期选择器等事件改为经由 `dateViewController` 转发
- ✅ 已让 `index.html` 加载 `js/app-date-view.js?v=1`，并将 `app.js` 资源版本提升到 `v=82`
- ✅ 已补齐 `goToDateView()` 的委托收口，避免同一职责在 `app.js` 与新模块中重复维护
- ✅ 已完成 `node --check js/app-date-view.js`
- ✅ 已完成 `node --check js/app.js`
- ✅ 已完成 `app-date-view.js` / `app.js` / `index.html` diagnostics 0 错误
- ✅ 已确认当前工作区仅保留本轮相关变更：`js/app.js`、`js/app-date-view.js`，以及独立未纳入本轮的 `js/ocr.js`

## 已跳过
- 暂不在本轮继续拆分 OCR、同步、批量操作、表单弹窗等高风险或高耦合链路
- 暂不在本轮继续做 `app.js` 第二层大拆分，先把第一层可回退版本稳定落地

## 下一步
- 提交并推送本轮 `app.js` 第一层拆分
- 页面级重点回归：
  - 日视图日期选择器切换是否正常
  - 今天 / 上一页 / 下一页是否正常
  - 周 / 月视图切换是否正常
  - 从日历左键进入日视图是否正常
  - 日历右键快速新增、顶部“+ 新增”是否仍正常
  - 新增 / 编辑 / 同步完成后列表与日历刷新是否正常
- 若本轮稳定，再继续做 `app.js` 第二层拆分（弹窗/表单或批量操作链路）
