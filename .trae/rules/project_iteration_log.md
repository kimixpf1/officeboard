## 2026-04-21 P3-9

### 本次目标
- 修复顶部菜单栏宽度与顺序，恢复为“品牌 / 时间天气 / 中间工具 / 通知栏 / 右侧工具”稳定布局
- 修复倒数日跨设备同步问题
- 为倒数日补齐农历生日 / 农历纪念日、编辑、删除、排序与类型底色能力
- 完成本轮静态校验、提交推送与线上回归准备

### 当前状态
- ✅ 已重新读取 `.trae/rules/` 目录规则文件，并按“本地校验通过后默认提交推送部署”继续执行
- ✅ 已修复顶部 header 宽度异常问题，品牌区恢复紧凑布局，不再把通知栏塞进品牌区或中间工具区
- ✅ 已恢复顶部顺序为：大飞智能工作面板 / 时间 / 天气 / 原中间工具区 / 通知栏 / 原右侧工具区
- ✅ 已为倒数日补齐跨设备同步，云端上传与下载均纳入 `countdownEvents`、`countdownTypeColors`
- ✅ 已为倒数日新增农历生日 / 农历纪念日支持，提供农历月日识别与下一次公历日期换算
- ✅ 已为倒数日新增编辑、删除、上下移动、拖拽排序能力
- ✅ 已为生日 / 纪念日 / 节日补齐类型底色配置与颜色记忆能力
- ✅ 已增强默认节假日名称识别，补齐春节 / 端午 / 中秋等按农历识别的展示逻辑
- ✅ 已将部署版本提升为 `2026-04-21 P3-9`，并同步提升 `style.css v27 / sync.js v19 / app.js v90`
- ✅ 已完成 `node --check js/app.js`、`node --check js/sync.js`、`node --check js/utils.js` 与 diagnostics 0 错误
- 🔄 待完成提交、推送与线上强刷回归复测

### 本轮关键改动
- index.html：重排顶部 header 结构，将 `countdownNotice` 从品牌区移出并放入独立 `header-notice`
- index.html：保留原中间工具区与原右侧工具区位置，仅恢复正确横向顺序
- index.html：倒数日新增表单补充公历 / 农历、事件类型、颜色输入
- index.html：资源版本提升为 `style.css v27 / sync.js v19 / app.js v90`
- style.css：顶部 header 改为四列 grid，恢复品牌区紧凑宽度，避免中间工具区被挤偏
- style.css：新增 `header-notice` 区域，保证通知栏位于中间工具右侧且不侵占 center 区
- style.css：扩展倒数日新增表单样式，适配类型、颜色、农历选择
- style.css：补齐倒数日条目类型色条、按钮区、拖拽态与移动端兼容样式
- app.js：`initCountdownSystem()` 新增同步事件监听，云端同步后自动刷新倒数日面板与通知栏
- app.js：`getCustomCountdownEvents()` / `saveCustomCountdownEvents()` 改为走 `SafeStorage`，并在登录状态下触发云同步
- app.js：新增 `getCountdownTypeColors()` / `saveCountdownTypeColors()` 管理类型颜色
- app.js：新增 `getNextLunarOccurrence()`，支持农历事件计算下一次日期
- app.js：新增 `startEditCountdownEvent()`、`resetCountdownForm()`、`moveCountdownEvent()`、`reorderCountdownEvents()`
- app.js：`handleAddCountdownEvent()` 扩展为支持编辑态、公历 / 农历、类型与颜色
- app.js：`renderCountdownPanel()` 扩展为支持编辑、删除、上下移动、拖拽排序与类型底色展示
- app.js：`getHolidayDisplayName()` 增强节假日名称判断，支持按农历识别春节 / 端午 / 中秋
- app.js：部署版本徽标提升为 `2026-04-21 P3-9`
- sync.js：上传云端时补充 `countdownEvents`、`countdownTypeColors`
- sync.js：下载云端数据时回写倒数日相关存储，并派发 `countdownSynced`
- utils.js：新增 `LunarCalendarUtils`，提供农历月日解析与农历转下一次公历日期能力

### 验证结果
- `node --check js/app.js` 通过
- `node --check js/sync.js` 通过
- `node --check js/utils.js` 通过
- `app.js` / `sync.js` / `utils.js` / `index.html` / `style.css` diagnostics 0 错误
- 关键静态链路已核对：
  - 顶部顺序已恢复为品牌 / 时间天气 / 中间工具 / 通知栏 / 右侧工具
  - 通知栏已脱离品牌区，不再挤占中间工具布局
  - 倒数日已具备同步、农历、编辑、删除、排序、类型颜色能力
  - 版本徽标与静态资源 query 已提升到 `P3-9 / v27 / v19 / v90`

### 遗留事项
- 待提交、推送并完成线上强刷回归，重点核对版本徽标是否为 `P3-9`
- 待在线上验证顶部栏宽度、倒数日跨设备同步、农历日期、拖拽排序与类型颜色是否全部稳定
- 待继续观察 GitHub Pages 是否仍出现 HTML 已更新但 CSS / JS 命中旧缓存的情况
- 待继续排查“跨日期会议点击完成后未打勾划线沉底”的剩余问题

## 2026-04-21 P3-8

### 本次目标
- 修复倒数日折叠开关只能打开不能收起
- 修复倒数事项配色不适配深浅色主题
- 修复今年剩余节假日没有默认嵌入倒数日
- 恢复顶部既有模块位置，时间天气放"面板"右边，中间区域不动，右侧放倒数日通知框
- 修复 AI/PDF 识别预览编辑区白底白字问题

### 当前状态
- ✅ 已修复倒数日折叠按钮的 toggle 逻辑，改为 `isExpanded()` 判断后切换 `expanded` 类
- ✅ 已修复倒数事项配色，全部改为 `var(--gray-*)`、`var(--warning-color)`、`var(--bg-primary)` 等主题变量联动
- ✅ 已修复默认节假日嵌入逻辑，`getBuiltinHolidayCountdowns()` 改为按 `HolidayData.holidays[year]` 数组读取并映射名称
- ✅ 已恢复顶部布局：时间天气放左侧品牌区"面板"右边，中间区域保持原位不动
- ✅ 已将三天内倒数日通知框移到品牌区右侧（grid 第三列）
- ✅ 已修复 upload-flow.js 中识别预览编辑区的白底白字：输入框、卡片、文字全部改为明确主题变量
- ✅ 版本提升为 `2026-04-21 P3-8`，资源版本 `style.css v26 / ocr.js v35 / upload-flow.js v6 / app.js v89`
- ✅ 已完成 `node --check js/app.js`、`node --check js/upload-flow.js` 与 diagnostics 0 错误
- ✅ 已提交并推送到远端 `main` 分支

### 本轮关键改动
- app.js：`initCountdownPanel()` 改为 toggle 逻辑，支持点击同一按钮打开/收起
- app.js：`getBuiltinHolidayCountdowns()` 改为按数组读取并新增 `getHolidayDisplayName()` 映射节假日名称
- app.js：部署版本徽标提升为 `P3-8`
- style.css：倒数日全部配色改为 `color-mix()` 和主题变量联动
- style.css：顶部品牌区改为 grid 三列布局（logo / meta / notice）
- style.css：移动端倒数日和品牌区改为单列堆叠
- index.html：时间天气移入品牌区，通知框移入品牌区右侧
- index.html：资源版本提升为 `style.css v26 / ocr.js v35 / upload-flow.js v6 / app.js v89`
- upload-flow.js：所有 `color: inherit`、`var(--card-bg)`、`var(--input-bg)` 改为明确主题变量

### 验证结果
- `node --check js/app.js` 通过
- `node --check js/upload-flow.js` 通过
- `app.js` / `upload-flow.js` / `index.html` / `style.css` diagnostics 0 错误
- 已推送到 `origin/main`

### 遗留事项
- 待线上强刷验证 P3-8 全部修复点
- 待继续观察 GitHub Pages 资源缓存是否仍出现旧 CSS / JS 混用
- 待继续排查"跨日期会议点击完成后未打勾划线沉底"的剩余问题

## 2026-04-21 P3-7

### 本次目标
- 打通识别前预览逐条编辑 / 删除后的正式保存链路
- 增强 PDF 结构化提取，改善会议安排表类 PDF 的表格识别质量
- 完成本轮静态校验、版本提升、提交推送与线上回归准备

### 当前状态
- ✅ 已重新读取 `.trae/rules/` 目录规则文件，并按本轮要求继续同步更新
- ✅ 已确认上一轮线上页面仍停留在 `2026-04-20 P3-5`，需要本轮提升版本后重新部署验证
- ✅ 已在 `upload-flow.js` 中实现识别前预览逐条编辑 / 删除：待新增事项支持编辑标题、开始日期、结束日期、时间、地点、参会人员，并支持删除新增 / 合并 / 跳过项
- ✅ 已在 `app.js` 主入口接入新的预览返回结构：确认后使用编辑后的 `actionPlan` 写入，取消后恢复识别前快照
- ✅ 已在 `wechat-upload.js` 微信入口同步接入新的预览返回结构，保证双入口行为一致
- ✅ 已在 `ocr.js` 中将 PDF 提取增强为“原始行文本 + 结构化表格提取”双输出，新增按坐标归一、行分组、列切分、跨行继承与标题 / 地点清洗能力
- ✅ 已完成顶部品牌区与倒数日折叠框本轮 UI 收口：时间 / 天气靠右展示、倒数日上移到日程之上、暖橙色视觉与折叠交互统一
- ✅ 已修复倒数日数据逻辑：默认按节假日名称只保留今年剩余各节假日首日，自定义生日 / 纪念日按月日递推到下一次日期后参与展示
- ✅ 已完成 `node --check js/app.js`、`node --check js/app-date-view.js` 与 `app.js` / `index.html` / `style.css` diagnostics 0 错误
- ✅ 已将部署版本提升为 `2026-04-21 P3-7`，并同步提升 `style.css v25 / app.js v88`
- ✅ 已确认仓库当前没有 `.github/workflows`、没有 `gh-pages` 分支发布脚本、没有 `docs/` 目录发布源配置，Pages 只能直接吃 `main` 根目录
- 🔄 待完成提交、推送与线上强刷回归复测

### 本轮关键改动
- upload-flow.js：新增识别前预览逐条编辑 / 删除能力，并在确认时重建编辑后的 `actionPlan`
- app.js：上传识别链路改为接收 `{ confirmed, result }`，正式保存时使用编辑后的 `result.actionPlan`
- wechat-upload.js：微信轻量上传链路同步改为使用编辑后的 `actionPlan`
- ocr.js：`extractPDFText()` 改为调用 `buildStructuredPDFPageText()` 输出结构化表格文本
- ocr.js：新增 `normalizePDFTextItems()`、`groupPDFItemsIntoRows()`、`splitPDFRowIntoCells()`、`extractPDFTableRows()` 等辅助方法
- ocr.js：新增 PDF 表格标题识别、会议标题清洗、地点清洗与分组 / 参会人员跨行继承逻辑
- index.html：将倒数日折叠框上移到日程上方，并把 `style.css` / `app.js` 资源版本提升到 `v25 / v88`
- style.css：重构顶部品牌区布局，保证桌面端时间 / 天气紧贴标题右侧，移动端再按窄屏换行
- style.css：重构倒数日折叠框视觉，补齐暖橙色摘要卡、列表间距、删除按钮与临近日高亮
- app.js：倒数日内置节假日改为按节假日名称去重后只展示首日；自定义生日 / 纪念日改为按月日自动递推到下一次日期
- app.js：部署版本徽标提升为 `2026-04-21 P3-7`，并展示 `utils.js v4 / ocr.js v34 / upload-flow.js v5 / calendar.js v24 / app-date-view.js v4 / app.js v88 / style.css v25`

### 验证结果
- `node --check js/app.js` 通过
- `node --check js/app-date-view.js` 通过
- `app.js` / `index.html` / `style.css` diagnostics 0 错误
- Pages 配置侧排查结果：
  - 本地 `main` 与 `origin/main` 已对齐，推送目标正确
  - 仓库根目录不存在 `.github/workflows`，说明不是 Actions 自定义部署链路
  - 仓库没有 `docs/` 目录，也没有 `gh-pages` 分支发布脚本，说明 Pages 只能从 `main` 根目录发布
  - 远端 `main` 的 `index.html` 仍引用 `style.css?v=24`，而线上此前已出现 HTML 与静态资源体感不同步，根因更接近“主分支 HTML 已发布，但浏览器 / CDN 对旧版 CSS/JS 仍有缓存命中”，而不是 git 没推上去
- 关键静态链路已核对：
  - 顶部时间 / 天气布局已调整为桌面端靠右紧贴标题
  - 倒数日折叠框已位于日程上方
  - 倒数日列表会自动展示今年剩余节假日首日与用户新增生日 / 纪念日

### 遗留事项
- 待提交、推送并完成线上强刷回归，重点核对版本徽标是否为 `P3-7`
- 待继续观察 GitHub Pages 是否仍会出现“HTML 先更新、CSS / JS 仍命中旧缓存”的情况；若仍复现，需要去仓库 Pages 设置页核对发布源与最近部署记录
- 待继续用真实 PDF 样本回归识别质量，重点观察合并单元格、跨行参会人员与地点列识别稳定性
- 用户此前反馈的“跨日期会议点击完成后未打勾划线沉底”仍需在本轮部署稳定后继续排查

## 2026-04-20

### 本次目标
- 修复跨日期会议手动完成、周/月视图点击跳错日期、节假日跳过判断异常
- 修复 PDF 识别链路中的真实运行时错误，并基于用户提供的会议安排表 PDF 做样本验证
- 完成本轮补充修复的静态校验、提交、推送与线上回归准备

### 当前状态
- ✅ 已重新读取 `.trae/rules/` 目录规则文件，并按本轮要求继续同步更新
- ✅ 已确认线上页面仍停留在 `2026-04-20 P3-4`，本轮补充修复此前尚未推送部署
- ✅ 已修复跨日期会议手动标记完成链路，支持仅当天 / 今天及之后 / 全部日期
- ✅ 已修复周视图 / 月视图点击具体事项跳转到错误日视图的问题，日历项点击优先使用 `_viewDate`
- ✅ 已修复 `calendar.js` 工作日判断仍走旧硬编码的问题，统一改为复用 `HolidayData`
- ✅ 已修复办文卡片完成态展示与按钮状态不一致的问题，卡片 `completed` 类、按钮样式与 `dataset.completed` 统一按有效完成态计算
- ✅ 已修复 `ocr.js` 中 `parseWithOCRAndAI()` 结构损坏问题，并补上 PDF 长文本分段识别链路
- ✅ 已修复真实 PDF 识别链路运行时错误：`existTitle is not defined`
- ✅ 已使用用户提供的真实样本 `C:\Users\42151\Desktop\【4.20】近期主要会议活动安排表.pdf` 完成验证，当前可进入识别前预览确认
- ✅ 真实 PDF 样本验证结果：共识别 28 条记录，其中待新增 21、待合并 1、待跳过 6
- ✅ 已完成 `node --check js/app.js`、`node --check js/calendar.js`、`node --check js/ocr.js`、`node --check js/utils.js` 与 diagnostics 0 错误
- 🔄 待完成提交、推送与线上强刷回归复测

### 本轮关键改动
- app.js：为跨日期会议完成状态切换补齐 scoped update 处理
- app.js：修复卡片完成态展示、按钮样式与 `dataset.completed` 不一致问题
- app.js：部署版本徽标提升为 `2026-04-20 P3-5`，并展示 `utils.js v4 / ocr.js v33 / calendar.js v24 / app.js v86`
- calendar.js：`getItemForDate(item, dateStr)` 为日历项补齐 `_viewDate`
- calendar.js：日历项点击跳转优先使用 `_viewDate`，修复点击具体事项跳回周期第一天的问题
- calendar.js：`isWorkday(dateStr)` 统一改为复用 `HolidayData.isHoliday()` / `HolidayData.isMakeupDay()`
- utils.js：修正 2026 年节假日与补班数据，覆盖 5 月、6 月等此前错判日期
- ocr.js：`extractPDFText()` 改为按坐标排序并按行聚合文本，增强会议安排表类 PDF 的结构保真度
- ocr.js：新增长文本分段 AI 识别，降低单次识别漏行漏项风险
- ocr.js：修复批次去重时 `existTitle` 变量作用域错误
- index.html：资源版本提升为 `utils.js v4`、`ocr.js v33`、`calendar.js v24`、`app.js v86`

### 验证结果
- `node --check js/app.js` 通过
- `node --check js/calendar.js` 通过
- `node --check js/ocr.js` 通过
- `node --check js/utils.js` 通过
- `app.js` / `calendar.js` / `ocr.js` / `utils.js` diagnostics 0 错误
- 本地浏览器验证通过：
  - 页面版本仍为 `P3-4`，确认线上尚未包含本轮修复
  - 真实 PDF 上传后可进入识别前预览确认，不再报 `existTitle is not defined`
  - 识别结果已能产出新增 / 合并 / 跳过三类预览

### 遗留事项
- 待用户在线上页面强刷后完成最终回归，重点核对版本徽标是否为 `P3-5`
- 真实 PDF 识别质量虽已明显改善，但标题清洗与表格列归并仍可继续做一轮定向优化

# 项目迭代记录

## 2026-04-18

### 本次目标
- 完成 `app.js` 第二层低风险优化
- 补齐周视图 / 月视图中已完成事项区分展示与拖拽改日期能力
- 修复拖拽与视图定位的几个交互问题
- 增加部署版本可视化，解决线上版本难确认的长期痛点

### 当前状态
- ✅ 已重新读取 `.trae/rules/` 目录全部规则文件，继续按“验证通过后默认提交、推送、部署”执行
- ✅ 已确认本轮继续遵守“低风险、零迁移、零协议变更”边界，不修改数据库结构、不改同步协议
- ✅ 已沿用第一层拆分后的结构，继续围绕日历交互与日期主链做第二层低风险收口
- ✅ 已完成本地浏览器真人测试，并实际复现此前用户反馈的两个问题
- ✅ 已确认周 / 月视图完成态样式未生效的真实根因：桌面端缺少 `.calendar-item.completed` 全局样式，之前样式只落在移动端媒体查询中
- ✅ 已确认日视图跨栏拖拽后事项消失的真实根因：跨类型拖拽时只修改了 `type`，未同步迁移目标类型所需的日期/时间字段，导致刷新后被过滤
- ✅ 已修复日视图跨栏拖拽事项后直接消失的问题：`handleDragStart` / `handleDragEnd` 改为基于 `currentTarget` 记录与清理拖拽源元素
- ✅ 已修复日视图跨栏拖拽事项后刷新消失的问题：跨类型拖拽时同步迁移 `deadline / date / docDate / docStartDate / docEndDate / time / progress` 等字段
- ✅ 已修复日视图切到周视图 / 月视图时未定位到对应日期的问题：切视图时统一先将 `calendarView` 对齐到 `selectedDate`
- ✅ 已在 `calendar.js` 中新增已完成事项判断逻辑，并让周 / 月视图排序改为“未完成优先、已完成沉底”
- ✅ 已为周 / 月视图日历事项增加完成态样式类 `completed`，并补齐桌面端横线 / 透明度样式
- ✅ 已让周 / 月视图中的日历事项支持拖拽，并通过 `window.officeDashboard` 接入主面板现有拖拽链路
- ✅ 已修复周视图 / 月视图办文完成态不生效的问题：日历映射按日期展开时补齐 dayStates 解析，办文可按当日 progress 正确打勾并沉底
- ✅ 已为周视图单日格内事项增加拖拽排序并落库的能力
- ✅ 已在 `app.js` 中新增 `moveItemToDateFromCalendar(targetDate)`，统一处理拖拽到日历日期后的日期更新与刷新
- ✅ 已新增部署版本可视化徽标 `deployVersionBadge`，页面初始化后展示当前部署版本与关键脚本版本
- ✅ 已新增会议自动完成规则：有具体时间会议按开始后 30 分钟自动完成；无具体时间单日会议在当天 16:00 自动完成；无具体时间跨日期会议在最后一天 16:00 自动完成
- ✅ 已更新资源版本号：`calendar.js v23`、`app-date-view.js v4`、`app.js v85`
- ✅ 已完成 `node --check js/app-date-view.js`、`node --check js/calendar.js`、`node --check js/app.js` 与 diagnostics 0 错误
- ✅ 已完成本地浏览器真人验证：
  - 周视图已完成待办 / 办文卡片 `opacity=0.65` 且 `text-decoration=line-through`
  - 日视图待办拖到会议列后不会消失，目标卡片会正确出现在 `meetingList`
  - 日视图会议拖到待办列后不会消失，且 `deadline` 正确迁移
  - 无具体时间单日会议在模拟 16:10 时自动完成
  - 无具体时间跨日期会议在首日 16:10 不完成、最后一天 16:10 自动完成
- ✅ 已确认当前工作区除本轮相关 `css/style.css` / `index.html` / `app-date-view.js` / `app.js` / `calendar.js` 外，仅剩独立未纳入本轮的 `ocr.js` 改动
- 🔄 待完成提交、推送与线上强刷回归复测

### 本轮关键改动
- app-date-view.js：`switchView(view)` 改为切周 / 月视图时总是先用 `selectedDate` 对齐 `calendarView`
- calendar.js：新增 `isItemCompleted(item)`，统一待办 / 会议 / 办文完成态判断
- calendar.js：`sortItems(items)` 改为“未完成优先，已完成沉底`
- calendar.js：`createCalendarItem(item)` 为完成态追加 `completed` 类，并开启拖拽能力
- calendar.js：为周视图单日格内事项新增 `dragover` 排序能力
- calendar.js：`bindQuickAddEvents(cellDiv, dateStr)` 新增日历单元格的拖拽悬停、投放和同日排序保存处理
- app.js：`handleDragStart` / `handleDragEnd` 使用 `currentTarget` 修复拖拽源元素错位
- app.js：跨类型拖拽时同步迁移目标类型字段，修复刷新后事项丢失
- app.js：新增 `moveItemToDateFromCalendar(targetDate)`，承接周 / 月视图拖拽改日期
- app.js：新增 `saveCalendarItemOrder(orderedIds)`，承接周视图单日格内排序落库
- app.js：扩展 `checkMeetingAutoComplete()`，支持无时间单日会议与跨日期会议在 16:00 自动完成
- app.js：新增 `updateDeployVersionBadge()`，用于渲染部署版本徽标
- app.js：初始化完成后调用 `updateDeployVersionBadge()`
- app.js：启动时补充 `window.officeDashboard = window.dashboard`
- css/style.css：补齐桌面端日历完成态、拖拽态和日期格拖拽高亮样式
- index.html：新增 `deployVersionBadge` 节点，资源版本号提升为 `calendar.js v23`、`app-date-view.js v4`、`app.js v85`

### 验证结果
- `node --check js/app-date-view.js` 通过
- `node --check js/calendar.js` 通过
- `node --check js/app.js` 通过
- `app-date-view.js` / `calendar.js` / `app.js` / `index.html` / `style.css` diagnostics 0 错误
- 已完成本地浏览器真人验证：
  - 周 / 月视图已完成事项桌面端横线与透明度样式生效
  - 周 / 月视图已完成事项排序沉底生效
  - 日视图跨栏拖拽后事项不再消失
  - 周视图日格内事项支持拖拽排序并保持顺序
  - 有具体时间会议自动完成规则保持正常
  - 无具体时间单日会议和跨日期会议的 16:00 自动完成规则验证通过
- 未改动数据库结构、未改动同步协议、未改动 OCR / 同步主链

### 遗留事项
- 待完成本轮第二层优化与交互修复的提交、推送与线上强刷回归复测
- 若本轮稳定，可继续推进后续拆分（弹窗 / 表单链路或批量操作链路）

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
- ✅ 已完成提交、推送、页面级回归复测

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
