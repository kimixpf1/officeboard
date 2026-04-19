# 项目迭代记录

## 2026-04-18

### 本次目标
- 完成 `app.js` 第一层小拆分
- 优先抽离“日期 / 视图 / 刷新”主链，降低后续继续拆分的耦合度
- 在低风险、可回退前提下，为后续 P3 拆分建立稳定边界

### 当前状态
- ✅ 已重新读取 `.trae/rules/` 目录全部规则文件，继续按“验证通过后默认提交、推送、部署”执行
- ✅ 已确认本轮继续遵守“低风险、零迁移、零协议变更”边界，不修改数据库结构、不改同步协议
- ✅ 已确认本轮只处理 `app.js` 中日期选择、视图切换、日期导航、日历跳转与事项刷新主链，不触碰 OCR / 同步 / 表单等高耦合链路
- ✅ 已创建可回退锚点：`rollback/app-split-p3-l1-pre-20260418-1`
- ✅ 已新增 `app-date-view.js`，抽出 `OfficeDateViewController`
- ✅ 已将 `initDatePicker`、`onDatePickerChange`、`applySelectedDate`、`switchView`、`goToDateView`、`navigateDate`、`goToToday`、`updateDateDisplay`、`getBoardItemsForSelectedDate`、`getVisibleBoardItems`、`groupItemsByType`、`loadItems` 收口到新模块
- ✅ 已在 `app.js` 中保留同名薄封装入口，降低现有调用点改动面
- ✅ 已在事件绑定中把视图切换、日期导航、日期选择器操作改为经由 `dateViewController` 转发
- ✅ 已补齐 `goToDateView()` 的委托收口，避免旧逻辑残留在 `app.js`
- ✅ 已在 `index.html` 中新增 `js/app-date-view.js?v=1`，并将 `app.js` 资源版本提升到 `v=82`
- ✅ 已完成 `node --check js/app-date-view.js`、`node --check js/app.js` 与 diagnostics 0 错误
- ✅ 已确认当前工作区除本轮相关 `app.js` / `app-date-view.js` 外，仅剩独立未纳入本轮的 `ocr.js` 改动
- 🔄 待完成提交、推送、页面级回归复测

### 本轮关键改动
- app-date-view.js：新增 `OfficeDateViewController`，集中管理日期 / 视图 / 刷新主链
- app.js：构造函数接入 `this.dateViewController = new OfficeDateViewController(this)`
- app.js：`initDatePicker` / `onDatePickerChange` / `applySelectedDate` 改为薄封装委托
- app.js：`switchView` / `navigateDate` / `goToToday` / `updateDateDisplay` 改为薄封装委托
- app.js：`goToDateView` 改为薄封装委托，清除旧内联实现
- app.js：`getBoardItemsForSelectedDate` / `getVisibleBoardItems` / `groupItemsByType` / `loadItems` 改为薄封装委托
- app.js：视图按钮、上一页 / 下一页 / 今天、日期选择器事件改为调用 `dateViewController`
- index.html：新增 `app-date-view.js v1`，`app.js` 版本提升到 `v82`

### 验证结果
- `node --check js/app-date-view.js` 通过
- `node --check js/app.js` 通过
- `app-date-view.js` / `app.js` / `index.html` diagnostics 0 错误
- 关键静态链路已核对：
  - 视图按钮事件已转发到 `dateViewController.switchView`
  - 上一页 / 下一页 / 今天按钮事件已转发到 `dateViewController.navigateDate` / `goToToday`
  - 日期选择器事件已转发到 `dateViewController.onDatePickerChange`
  - `goToDateView()` 已完成委托收口
  - `loadItems()` 已由 `dateViewController` 统一承接
- 未改动数据库结构、未改动同步协议、未改动 OCR / 同步主链

### 遗留事项
- 待完成本轮 `app.js` 第一层拆分的提交、推送与页面级回归复测
- 若本轮稳定，可继续推进第二层拆分（弹窗/表单或批量操作链路）

## 2026-04-18

### 本次目标
- 完成 P3 第 1 层交互修复
- 修复周视图 / 月视图左键空白区域无法进入当天日视图的回归问题
- 将日历新增入口调整为“顶部按钮 + 右键空白区域”双入口，降低误触

### 当前状态
- ✅ 已重新读取 `.trae/rules/` 目录全部规则文件，继续按“验证通过后默认提交、推送、部署”执行
- ✅ 已确认本轮继续遵守“低风险、零迁移、零协议变更”边界，不修改数据库结构、不改同步协议
- ✅ 已定位回归根因：`calendar.js` 中 `bindQuickAddEvents()` 把左键空白点击绑定到 `quickAddForDate()`，覆盖了原本“进入当天日视图”的直觉操作
- ✅ 已将周 / 月视图日期格左键普通空白区域改为触发 `goToDate(dateStr)`，恢复切到当天日视图
- ✅ 已保留右键空白区域快速新增能力
- ✅ 已新增日期格顶部栏与“+ 新增”按钮，让左键快速新增有明确入口
- ✅ 已新增空白态提示文案“左键查看，右键新增”，降低使用歧义
- ✅ 已完成 `node --check js/calendar.js` 与 diagnostics 0 错误
- ✅ 已完成页面级真人模拟冒烟验证，确认周 / 月视图左键跳日、顶部新增按钮、快速新增弹层均正常，控制台无报错
- ✅ 已完成提交、推送、部署本轮改动

### 本轮关键改动
- calendar.js：`bindQuickAddEvents(cellDiv, dateStr)` 改为“左键空白跳日视图、右键空白快速新增”
- calendar.js：新增 `createCellAddButton(dateStr)`，为每个日期格提供明确的顶部“+ 新增”按钮
- calendar.js：新增 `createCellTopBar(dateStr, labelText)`，统一周 / 月视图日期格顶部操作区
- calendar.js：新增 `createEmptyHint()`，为空白日期格补充“左键查看，右键新增”提示
- calendar.js：`renderWeekView()` 接入顶部操作区与新交互模式
- calendar.js：`renderMonthView()` 接入顶部操作区与新交互模式
- index.html：资源版本号提升为 `calendar.js v20`

### 验证结果
- `node --check js/calendar.js` 通过
- calendar.js diagnostics 0 错误
- 页面级冒烟验证通过：
  - 周视图左键点击空白区域可进入对应日期日视图
  - 周视图点击顶部“+ 新增”可弹出快速新增选择框
  - 月视图左键点击空白区域可进入对应日期日视图
  - 月视图点击顶部“+ 新增”可弹出快速新增选择框
  - Console 0 error / 0 warn
- 未改动数据库结构、未改动同步协议、未改动跨日期办文作用范围链路

### 遗留事项
- 待用户线上强制刷新后完成回归复测
