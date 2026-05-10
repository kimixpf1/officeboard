# 项目框架

## 技术栈
- 前端：原生 HTML + CSS + JavaScript（无构建流程）
- 本地存储：IndexedDB（`OfficeDashboardDB` v1）+ localStorage（SafeStorage 封装）
- 云端同步：Supabase（Auth + Realtime + user_data 表）
- AI / OCR：Kimi（moonshot-v1-8k）、DeepSeek（deepseek-v4-flash），统一经 js/ocr.js / js/kimi.js 封装
- 部署方式：GitHub Pages 静态站点

## 根目录稳定结构
- index.html：桌面完整工作台入口，加载主面板、右侧折叠面板、视图切换、弹窗等全部能力
- wechat-upload.html：微信轻量上传入口，只保留上传识别与确认链路（精简 6 个 JS 依赖）
- css/style.css：全局样式 5247 行，9 种主题 + 暗色模式 + 4 断点响应式
- js/：13 个核心业务脚本（详见下文）
- vendor/：本地优先静态依赖资源
- .claude/rules/：项目规则、框架、待办与迭代记录（规范目录，同步到 .trae/rules/）

---

## js 模块职责（完整）

### 1. js/utils.js — 全局共享工具
- `SafeStorage`：localStorage 安全封装（get/set/remove，try-catch 包裹防浏览器禁用时崩溃）
- `fetchWithRetry(url, options, maxRetries)`：带指数退避重试的 fetch（对 429/5xx 最多重试 3 次）
- `safeJsonParse(str, defaultValue)`：安全 JSON 解析，失败返回默认值
- `HolidayData`：中国法定节假日数据（2024-2026），提供 `isHoliday()`/`isMakeupDay()`
- `LunarCalendarUtils`：农历公历转换（`getLunarMonthDay`/`getNextSolarDateForLunar`/`parseChineseNumber`）
- 依赖：无外部依赖，被 crypto.js / kimi.js / sync.js 引用

### 2. js/db.js — IndexedDB 数据层
- 数据库 `OfficeDashboardDB` v1，三张表：items（主键 id 自增，索引 type/date/hash/createdAt）、settings（主键 key）、documentHashes（主键 hash）
- 核心方法：`addItem`/`putItem`/`updateItem`/`deleteItem`/`getItem`/`getAllItems`/`getItemsByType`/`getItemsByDateRange`
- 批量方法：`batchAddItems`/`batchPutItems`/`batchDeleteItems`/`deleteItemsByHashes`
- 缓存：`getAllItems()` 5 秒缓存，`resetItemsCache()` 手动重置
- 排序：`updateItemOrder(type, itemIds)` 批量更新
- 导入导出：`exportData()`/`importData(data)`/`clearAllData()`/`clearAllItems()`
- 去重：`generateHash(item)` 基于 title+type+date+time，`getItemByHash()`
- 依赖：无外部依赖，被 sync.js / app.js / ocr.js / crypto.js 使用

### 3. js/sync.js — 云端同步引擎
- `SyncManager` 类，管理 Supabase 登录、数据同步、Realtime 监听
- 同步链路：`smartSync()` → 比较时间戳 → `uploadToCloud()`/`downloadFromCloud()`/`mergeData()` 
- 对账：`buildReconciledItems()` O(n) Map 对账 + `syncLocalItemsToState()` 批量落地
- 静默同步：`silentSyncFromCloud()` 无 UI 提示 + `immediateSyncToCloud()` 立即上传（3 次重试）
- 保护机制：导入保护（`_shouldProtectImportedData`）、云端缩量保护（`_shouldProtectAgainstCloudShrink`）、删除墓碑（`deletedItemsMap` 30 天过期 500 条上限）、同步前自动备份（10 份 localStorage）
- Side data 同步：memo/schedule/links/contacts/countdown/tools/weather/theme 全部纳入
- 事件通信：通过 `document.dispatchEvent` 派发 `syncLoginStatusChanged`/`syncDataLoaded`/`syncError` 等事件（app.js 监听），不直接调用 app.js
- 依赖：db.js（核心）、SafeStorage、safeJsonParse、cryptoManager

### 4. js/ocr.js — OCR/AI 识别引擎
- `OCRManager` 类，统一管理 Kimi/DeepSeek/Tesseract 多识别管道
- PDF：pdfjs-dist 提取文本 → `groupPDFItemsIntoRows` 按 y 坐标分组 → `splitPDFRowIntoCells` 按 x 间隙分列 → `extractPDFTableRows` 提取表格行
- 辅助函数（v5.52）：`isLocationLikeCell` 判断地点单元格、`cleanPDFCellText` 清理文本、"续："标记延续行交给 AI 合并
- 图片：`recognizeImageWithKimi`(Kimi) / `recognizeImage`(Tesseract OCR + `parseWithOCRAndAI`)
- 识别管道：`analyzeDocument` → `buildRecognitionActionPlan`（去重+合并+跳过） → `showRecognitionPreview`（用户确认） → `applyRecognitionActionPlan`（批量写入）
- 去重：`checkDuplicateItem`（meeting 同天+标题匹配合并参会人，todo/document 标题匹配跳过）
- 自然语言：`parseWithGroq`/`parseWithAI` 解析自由文本为结构化 items
- AI prompt 表格结构：列1 分组标签/列2 姓名/列3 会议名称/列4 地点
- 依赖：kimiAPI、db、cryptoManager、fetchWithRetry

### 5. js/kimi.js — Kimi API 封装
- `KimiAPI` 类，baseUrl `api.moonshot.ai/v1`，model `moonshot-v1-8k`
- `parseNaturalLanguage(input)`：自然语言→结构化命令（add/delete/edit/query），自动识别 todo/meeting/document
- `extractFromDocument(text)`：文档内容→事项数组
- `generateReport(items, type, start, end)`：生成工作报告
- `testConnection(apiKey)`：API 连接测试
- 依赖：cryptoManager（获取加密 Key）、safeJsonParse、fetchWithRetry

### 6. js/crypto.js — 加密模块
- `CryptoManager` 类，AES-256-GCM 加密（12 字节 IV 随机数）
- 通用接口：`secureStoreSecret(name, value)`/`secureGetSecret(name)`/`hasSecret(name)`/`clearSecret(name)`
- 密钥管理：`getMasterKey()` 从 IndexedDB 加载或生成 AES 密钥
- 哈希：`calculateFileHash(file)` SHA-256 / `calculateTextHash(text)` SHA-256
- 依赖：db（读写 settings 表）

### 7. js/app.js — 主界面控制器（最大模块）
- 视图切换：日视图(board)/周视图(week)/月视图(month) — 通过代理 switchView 方法
- 事项 CRUD：`saveItem`/`editItem`/`deleteItem`/`toggleItemComplete`/`toggleItemPin`/`toggleItemSink`
- 周期性/跨日期：`applyCrossDateMeetingScopedUpdate`/`applyCrossDateDocumentScopedUpdate` — 支持"仅当天/今天及之后/全部"三种作用范围
- 看板拖拽：`initDragAndDrop` + `handleDragStart/DragOver/Drop/DragEnd` — 同列排序+跨列移动
- AI 交互：`parseNaturalLanguage`(文本)/`handleFileUpload`(图片/PDF)
- 通知提醒：`updateCountdownNotice`(倒数日+待办截止)、`startTodoReminderLoop`(1 秒轮询闪烁)
- 右侧面板：倒数日/日程/工具/链接/通讯录/备忘录 6 个折叠面板
- 排序：领导优先级（钱→吴→盛→房→陈→其他领导→处室→其他）+ 四桶分桶（置顶/正常/沉底/已完成）
- 天气：和风天气 API，9 个预设城市，当前+3 天预报
- 主题：9 种主题（靛青紫/天际蓝/青瓷色/翠竹绿/玫瑰红/中国红/琥珀橙/幻影紫/深色模式）
- 导入导出：JSON 备份导入导出（支持密码加密）、Excel 通讯录导入
- 版本号：`2026-05-09 v5.52`，scriptVersions 统一管理资源版本
- 全局错误捕获：`window.unhandledrejection` + `window.error`
- 依赖：db、syncManager、ocrManager、kimiAPI、cryptoManager、calendarView、reportGenerator

### 8. js/calendar.js — 日历视图渲染
- `CalendarView` 类，只负责 DOM 渲染，通过 `window.officeDashboard` 代理与 app.js 通信
- `renderWeekView(items, date)`：周一至周日 7 列网格，每列含事项卡片 + "新增"按钮
- `renderMonthView(items, date)`：月网格，前后月补齐，空单元格显示提示
- 拖拽：日历项 `draggable=true`，dragstart/dragend 委托给 app.js；单元格 drop 事件 → `moveItemToDateFromCalendar`
- 右键：空白单元格右键 → `quickAddForDate` → 弹出类型选择模态框
- 性能：`skippableRender` 优化（120ms 内相同签名跳过渲染）
- 依赖：无外部文件依赖，通过全局 `officeDashboard` 通信

### 9. js/app-date-view.js — 日视图数据层
- `DateView` 类，管理日视图的事项数据加载与排序
- `loadItems(date)`：按日期过滤事项，回填 `app.items` 确保提醒逻辑拿到最新数据
- 委托给 app.js 的 `renderColumn()` 渲染三列看板
- 依赖：app.js（通过 `this.app` 引用）

### 10. js/upload-flow.js — 识别预览确认流程
- 三列表格预览：新增/合并/跳过，可逐条删除编辑
- `showRecognitionPreviewModal(fileName, result)`：模态弹窗
- `renderEditablePreview`：可编辑字段（标题/日期/时间/地点/参会人）
- `buildRecognitionSummaryHtml`：只读摘要（detailed/compact 两种）
- `compressImageIfNeeded`：微信环境用更激进压缩参数（1MB/1600px/0.6）
- 依赖：app.js（通过全局 UploadFlowUtils）

### 11. js/report.js — 报告生成
- `ReportGenerator` 类
- `generateReportContent(items, reportType, startDate, endDate)`：按类型筛选+统计
- `exportToImage()`：html2canvas 渲染为 2x PNG，`<a download>` 触发下载
- 支持日报/周报/月报/年报/自定义日期范围
- 依赖：html2canvas（动态 CDN 加载）、db

### 12. js/wechat-upload.js — 微信轻量页
- 微信环境专用，不加载 app.js/sync.js/calendar.js
- 精简流程：选择文件→AI 识别→预览确认→保存→1 秒后自动返回
- 微信 UA 检测阻止 Tesseract OCR fallback（CDN 在微信内不通）
- 无 Key 时禁用上传按钮并显示提示
- 依赖：db、ocrManager、cryptoManager、UploadFlowUtils

### 13. 已删除的文件
- `js/templates.js`：v5.20 已删除（53KB 死代码，完全未被引用）

---

## 核心数据流

### 1. 主页面上传识别链路（图片/PDF）
```
选择文件 → compressImageIfNeeded → ocrManager.analyzeDocument(previewOnly)
  → buildRecognitionActionPlan（去重+合并+跳过）
  → showRecognitionPreviewModal（用户确认/编辑）
  → applyRecognitionActionPlan（batchAddItems/batchPutItems 批量写入）
  → loadItems() → immediateSyncToCloud()
```

### 2. 自然语言解析链路（文本输入）
```
输入文本 → kimiAPI.parseNaturalLanguage（优先）/ ocrManager.parseWithGroq（后备）
  → 返回 { action, type, data, confidence }
  → executeAIAddCommand / executeAIDeleteCommand / executeAIEditCommand / executeAIQueryCommand
  → 直接 db.addItem() 写入（⚠️ 无预览确认、无去重、无撤销保护——与文件上传链路不对称）
```

### 3. 会议识别链路
```
OCR 文本 → parseWithOCRAndAI → extractMeetingFromText
  → 标题清洗 → 时间地点归一化 → validateAndCleanItem（attendees 数组化、displayTitle 生成）
  → buildRecognitionActionPlan（与已有一对一比对）
  → checkDuplicateItem（同天+标题匹配→合并参会人；标题匹配跳过）
  → 生成 createItems / mergeUpdates / skippedItems 三类动作
```

### 4. 跨日期链路
- 办文：`docStartDate`/`docEndDate` + `dayStates` 按日期覆盖（仅当天/今天及之后/全部三种作用域）
- 会议：`date`/`endDate` + `applyCrossDateMeetingScopedUpdate`
- 周期性：`recurringGroupId` + `occurrenceIndex`，`updateRecurringGroupStatus` 批量更新

### 5. 同步保护链路
```
smartSync()
  ├─ 情况1: 云端无数据 → uploadToCloud()
  ├─ 情况2: 本地无事项 + 无 side data → downloadFromCloud()
  ├─ 情况3: 两边都有 → buildReconciledItems()（O(n) Map 对账 + 删除墓碑过滤）
  │                           → syncLocalItemsToState()（batchPutItems 批量落地）
  │                           → uploadToCloud() 上传收敛结果
  ├─ 导入保护：importFromFile 期间 isSyncing=true → 导入后 uploadToCloud
  ├─ 云端缩量保护：本地≥5 条且云端不足 30% 时阻止覆盖
  └─ 删除墓碑：deletedItemsMap 30 天过期，mergeData 中 shouldKeepDeleted 过滤
```

---

## 关键数据结构

### item schema（数据库 items 表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 自增主键 |
| type | 'todo'\|'meeting'\|'document' | 事项类型 |
| title | string | 标题 |
| hash | string | 去重哈希（自动生成） |
| createdAt/updatedAt | string | ISO 时间戳 |
| date/endDate | string | 会议日期/结束日期 |
| time/endTime | string | 会议时间 |
| location | string | 地点 |
| attendees | string[] | 参会人数组 |
| displayTitle | string | 带参会人前缀的格式化标题 |
| deadline | string | 待办截止时间 |
| priority | 'high'\|'medium'\|'low' | 待办优先级 |
| completed | boolean | 完成状态 |
| docNumber | string | 文号 |
| source | string | 来文单位 |
| docStartDate/docEndDate | string | 办文日期范围 |
| recurringGroupId | string | 周期性任务组 ID |
| occurrenceIndex | number | 周期性任务序号 |
| pinned/sunk | boolean | 置顶/沉底 |
| manualOrder | boolean | 手动拖拽过 |

### 同步数据包（buildSyncData 产出）
```
{ sync_time, items[], deletedItems{}, settings{}, memo, schedule, links, contacts,
  countdownEvents, countdownTypeColors, countdownSortOrder, tools, weatherCity, theme,
  device_info }
```

### 事件系统（sync.js → app.js）
- `syncLoginStatusChanged` — 登录状态变化
- `syncDataLoaded` — 同步数据加载完毕（触发 UI 刷新）
- `syncError` — 同步错误
- `syncRemoteDataChanged` — 远程数据变化
- `memoSynced`/`scheduleSynced`/`linksSynced`/`contactsSynced`/`countdownSynced`/`toolsSynced` — 各类 side data 同步事件

---

## UI 层概览

### DOM 结构要点
- 双入口：index.html（完整） + wechat-upload.html（微信精简）
- 8 个弹窗：apiKeyModal / itemModal / reportModal / transferModal / confirmModal / syncModal / calculatorModal / weatherModal / timerModal
- 6 个右侧折叠面板：倒数日 / 日程 / 工具 / 链接 / 通讯录 / 备忘录（z-index 999-1004，垂直错落排列）
- 3 视图：日视图(#boardView 三列看板) / 周视图 / 月视图（calendar.js 动态渲染）
- 顶部通知框：`#countdownNotice` 固定 280px，待办闪烁+倒数日轮播
- 9 种主题 + 暗色模式（`data-theme` 属性选择器）
- 4 响应式断点：1024px(平板) / 768px / 640px(手机)

### CSS 变量体系
`:root` 定义 35+ 变量：主题色/功能色/优先级色/10 级灰度/背景色/边框/阴影/字体/间距
暗色模式通过 `[data-theme="dark"]` 重新映射全部变量

---

## 同步防数据丢失机制（长期遵守）
- **putItem 替代 clearAllItems+addItem**：同步时保留已有 ID
- **deleteItemsByHashes 按需清理**：仅在云端数据量 ≥ 本地时清理
- **数据量比保护**：本地≥5 条且云端不足 30% 时阻止覆盖
- **导入暂停同步**：importFromFile 设 isSyncing=true，导入后 uploadToCloud
- **同步前自动备份**：autoBackupBeforeSync 保留 10 份到 localStorage
- **云端每日备份**：每晚 8 点保存到 dailyBackups 字段，滚动 30 份
- **删除墓碑**：30 天过期，500 条上限，防止删除回弹

## 推送安全铁律
- **禁止**通过 GitHub API 推送超过 1KB 的文件
- **禁止**在 git push 失败时用 API 绕过
- 推送后必须用 GitHub API 验证远程文件完整性
- git push --force 在 PowerShell 下可能静默失败，需 API 确认 HEAD 已更新

---

## 当前稳定业务规则
- 领导优先级：钱局 → 吴局 → 盛局 → 房局 → 陈局/陈主任 → 其他领导 → 处室 → 其他
- 会议排序：置顶/正常/沉底/已完成分桶后按领导优先级+时间排序；已拖动保留手动顺序
- OCR 预览必须支持新增/合并/跳过依据说明
- 跨日期办文必须支持 dayStates 按日期覆盖，三类作用范围互不串扰
- 微信环境阻止 Tesseract fallback
- 版本号格式：`v{月份}.{序号}` 例如 v5.52

## 规则维护约束
- framework 只记录稳定结构、职责和链路
- 单次修复过程、临时问题放到 project_iteration_log.md
- 当前轮次的执行项放到 todolist.md
- **`.claude/rules/` 为规范目录**，修改后自动同步到 `.trae/rules/`
- **全局规则和记忆为最高级别**，项目规则仅为辅助
