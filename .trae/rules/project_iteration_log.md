# 项目迭代记录

## 2026-04-17

### 本次目标
- 继续推进 P2 更深一层的低风险优化
- 修复周视图 / 月视图新增事项后需要切换视图才显示的问题
- 在现有左键空白快速新增基础上，增加右键点击日期格也可快速新增

### 当前状态
- ✅ 已重新读取 `.trae/rules/` 目录全部规则文件，继续按“验证通过后默认提交、推送、部署”执行
- ✅ 已定位日历新增后不实时显示的根因：`app.js` 中 `loadItems()` 仅刷新主面板列数据，周 / 月视图未同步重绘 `calendarView`
- ✅ 已完成实时刷新修复：在当前视图不是日视图时，`loadItems()` 会在保存后同步重绘当前周 / 月日历页
- ✅ 已在 `calendar.js` 抽出 `bindQuickAddEvents`，统一封装日期格左键 / 右键快速新增入口
- ✅ 已实现周视图右键点击日期格快速新增，并保持已有事项点击仍跳转到对应日视图
- ✅ 已实现月视图右键点击当月日期格快速新增，保留 `.month-cell.other-month` 补位格不承载新增
- ✅ 已完成本地脚本校验、诊断校验与页面级真人模拟冒烟验证
- 🔄 待提交、推送、部署本轮改动

### 本轮关键改动
- app.js：`loadItems()` 在非日视图下补充 `window.calendarView.render()`，修复新增后周 / 月视图不实时显示的问题
- calendar.js：新增 `bindQuickAddEvents(cellDiv, dateStr)`，统一处理左键点击与右键点击日期格快速新增
- calendar.js：周视图日期格改为复用 `bindQuickAddEvents`
- calendar.js：月视图当月日期格改为复用 `bindQuickAddEvents`
- index.html：资源版本号提升为 `calendar.js v16`、`app.js v79`

### 验证结果
- `node --check js/app.js` 通过
- `node --check js/calendar.js` 通过
- app.js / calendar.js diagnostics 0 错误
- 页面级冒烟验证通过：
  - 周视图左键点击日期格 → 快速新增 → 保存后当前周直接实时显示新事项
  - 月视图可实时显示刚新增的事项
  - 月视图右键点击日期格可正常弹出快速新增选择框
- Chrome Console 0 error / 0 warn
- 未改动数据库结构、未改动同步协议、未改动跨日期办文链路

### 遗留事项
- 待提交、推送、部署本轮“日历实时刷新 + 右键快速新增”优化

## 2026-04-17

### 本次目标
- 完成 P2 剩余优化
- 实现周视图 / 月视图空白区域点击后直接新增待办 / 会议 / 办文

### 当前状态
- ✅ 已重新读取 `.trae/rules/` 目录全部规则文件，确认本轮仍按“验证通过后默认提交、推送、部署”执行
- ✅ 已保留 P2-1 第一轮的主面板按日期加载优化成果
- ✅ 已完成周视图 / 月视图空白区域点击快速新增事项能力
- ✅ 已扩展 `showAddModal(type, selectedDate)`，支持按点击日期预填
- ✅ 已补强 `_createChoiceModal`，防止快速新增选择框重复叠加
- ✅ 已完成本地脚本校验、诊断校验与页面级真人模拟冒烟验证
- 🔄 待提交、推送、部署本轮改动

### 本轮关键改动
- app.js：新增 `handleCalendarQuickAdd`、`showCalendarQuickAddTypeChoice`，承接日历快速新增类型选择
- app.js：`showAddModal` 支持第二参数 `selectedDate`，可按点击日期预填默认值
- app.js：`_createChoiceModal` 增加 `_activeChoiceModal` 管理，防止选择框叠加
- calendar.js：新增 `quickAddForDate` 并在周 / 月空白格接入快速新增事件
- calendar.js：已有事项点击继续保留“跳到该日期日视图”的原行为
- style.css：新增 `.calendar-empty-hint` 空白态提示样式
- index.html：资源版本号提升为 `calendar.js v15`、`app.js v78`

### 验证结果
- `node --check js/app.js` 通过
- `node --check js/calendar.js` 通过
- app.js / calendar.js diagnostics 0 错误
- 页面级冒烟验证通过：
  - 周视图空白格 → 快速新增 → 选“待办事项” → 打开“添加待办事项”，日期正确预填
  - 月视图当月空白格 → 快速新增 → 选“会议活动” → 打开“添加会议活动”，日期正确预填
  - 已有事项卡片点击仍保留跳转到日视图
- Chrome Console 0 error / 0 warn
- 未改动数据库结构、未改动同步协议、未改动跨日期办文链路

### 遗留事项
- 待提交、推送、部署本轮改动

## 2026-04-17

### 本次目标
- 实施 P2-1 第一轮优化：收敛主面板当前日期加载链路，减少日视图无差别全量读取
- 保持现有 UI、数据结构、跨日期办文与同步链路不变，确保线上既有功能零回归

### 当前状态
- ✅ 已重新读取 `.trae/rules/` 目录全部规则文件，确认本轮仍按“验证通过后默认提交、推送、部署”执行
- ✅ 已定位当前性能热点：`app.js` 中 `loadItems()` 在日视图下每次都先 `db.getAllItems()` 再本地过滤
- ✅ 已完成 P2-1 第一轮收敛：日视图改为复用 `db.getItemsByDateRange(this.selectedDate, this.selectedDate)` 获取当天相关事项
- ✅ 已在 `app.js` 抽出 `getBoardItemsForSelectedDate`、`getVisibleBoardItems`、`groupItemsByType`，让加载链路更清晰、可维护
- ✅ 已保留跨日期办文 `dayStates` 按日覆盖、`skipWeekend` 过滤、原有排序与列渲染逻辑
- ✅ 已完成本地脚本校验、诊断校验与页面级真人模拟冒烟验证
- 🔄 待提交、推送、部署本轮改动

### 本轮关键改动
- app.js：新增 `getBoardItemsForSelectedDate`，主面板日视图优先按选中日期读取当天相关事项，避免每次切日都扫描全部数据后再过滤
- app.js：新增 `getVisibleBoardItems`，继续统一承接跨日期办文的按日覆盖与 `_hidden` 过滤
- app.js：新增 `groupItemsByType`，把按类型分桶从 `loadItems()` 主流程中抽离，降低后续维护成本
- app.js：`loadItems()` 收敛为“按视图取数 → 按需应用按日覆盖 → 分桶 → 渲染”四步主链路
- index.html：app.js 资源版本号由 `v76` 提升到 `v77`

### 验证结果
- `node --check js/app.js` 通过
- app.js 诊断为 0 错误
- 页面级冒烟验证通过：`window.dashboard` 正常初始化，日期前进/回到今天后标题与计数刷新正常
- Chrome Console 0 error / 0 warn
- 未改动数据库结构、未改动同步协议、未改动跨日期办文作用范围逻辑

### 遗留事项
- 本轮只是 P2-1 第一轮收敛，尚未继续到更深层的 IndexedDB 索引优化
- 若用户继续推进 P2，可再评估第二轮：为高频日期查询增加更细粒度索引或缓存层

## 2026-04-17

### 本次目标
- 按跨项目 Rules 优化标准方案，继续收敛整理本项目剩余规则文件
- 完成跨日期办文 P1 收敛优化：统一读取层、统一作用范围更新层，避免后续新入口再次绕过按日解析

### 当前状态
- ✅ 已重新读取 `.trae/rules/` 目录全部规则文件，并补读桌面标准方案文件
- ✅ 已重写 project_framework.md，只保留稳定结构、模块职责和核心链路
- ✅ 已重写 todolist.md，使其只记录当前轮次目标、待办、已完成与下一步
- ✅ 已定位新 bug 根因：列表层应用了 dayStates 覆盖，但编辑入口仍直接 `db.getItem(itemId)` 读取原始全局字段
- ✅ 已在 app.js 新增按 selectedDate 解析跨日期办文的方法，并接入列表渲染与编辑入口
- ✅ 已补充项目规则：本地模拟真人测试通过后，默认执行提交、推送与部署，无需再次确认
- ✅ 已继续补齐流转入口，确保跨日期办文流转时也按 selectedDate 和作用范围写入 dayStates / 全局字段
- ✅ 已完成跨日期办文 P1 收敛：统一跨日期办文识别、统一按日读取、统一作用范围更新、统一删除作用范围处理
- 🔄 待做本地关键路径验证，确认本轮收敛未影响线上已有功能

### 本轮关键改动
- app.js：新增 `isCrossDateDocument`，统一跨日期办文识别条件，避免各入口重复拼条件
- app.js：新增 `getEffectiveDocumentItemById`，让编辑回填、办文保存复用同一套按 selectedDate 解析逻辑
- app.js：新增 `getCrossDateDocumentUpdatePayload` / `applyCrossDateDocumentScopedUpdate`，统一“仅当天 / 今天及之后 / 全部日期”三类更新
- app.js：新增 `getCrossDateDocumentDeletePayload` / `applyCrossDateDocumentDelete`，统一跨日期办文删除的作用范围处理
- app.js：列表渲染、点击卡片标题/编辑按钮、办文保存、完成、置顶、沉底、删除、流转入口均改为复用统一读取或统一作用范围更新逻辑
- project_framework.md：按标准方案收敛为“稳定结构 + 稳定职责 + 稳定链路”
- todolist.md：按标准方案收敛为“当前轮次操作面板”
- project_rules.md：新增“本地模拟真人测试通过后默认推送部署”的交付规则

### 验证结果
- `node --check js/app.js` 通过
- app.js 诊断为 0 错误
- index.html 已将 app.js 资源版本号提升到 `v76`
- 已通过 grep 复查高风险整对象更新调用，跨日期办文主链路改为复用统一读取层或统一作用范围更新层
- 待继续做本地关键路径验证，确认跨日期办文的编辑、完成、置顶、沉底、删除、流转在三类作用范围下均不影响线上既有功能

### 遗留事项
- 若用户复测后仍有“详情显示未来内容”的入口，需要继续把统一解析逻辑扩展到对应链路
- 本轮代码如继续改动，按新规则在本地模拟真人测试通过后默认直接提交、推送、部署

## 2026-04-17

### 本次目标
- 优化办文情况(DOCUMENT)周期性事项的操作弹窗，使其与待办/会议一致，支持"仅本项"和"本项及之后所有周期都"两个选项

### 问题根因
- 办文类型的周期性事项在完成/置顶/沉底/删除操作中，被 `type !== ITEM_TYPES.DOCUMENT` 条件跳过弹窗选择
- 导致办文周期性事项只能直接操作本项（无弹窗），没有"本项及之后所有周期都"的选项
- 涉及4处代码：toggleItemComplete、toggleItemPin、toggleItemSink、deleteItem

### 已完成
- ✅ 移除 toggleItemComplete 中 `type !== ITEM_TYPES.DOCUMENT` 判断，办文也弹出 showRecurringChoice
- ✅ 移除 toggleItemPin 中 `originalItem.type !== ITEM_TYPES.DOCUMENT` 判断
- ✅ 移除 toggleItemSink 中 `originalItem.type !== ITEM_TYPES.DOCUMENT` 判断
- ✅ 移除 deleteItem 中 `item.type === ITEM_TYPES.DOCUMENT` 的独立删除分支，统一走 showRecurringDeleteChoice
- ✅ showRecurringChoice 弹窗文案优化：从"所有后续周期都"改为"本项及之后所有周期都"，增加子标签说明
- ✅ showRecurringDeleteChoice 弹窗保持不变（已有"删除本项及后续所有周期"选项）
- ✅ 版本号更新：app.js v67→v68

### 修改明细
- app.js toggleItemComplete：移除 DOCUMENT 类型跳过逻辑，统一弹窗
- app.js toggleItemPin：同上
- app.js toggleItemSink：同上
- app.js deleteItem：移除 DOCUMENT 类型独立删除分支，统一走弹窗选择
- app.js showRecurringChoice：按钮增加 subLabel 说明 + maxWidth 450px
- index.html：app.js 版本号 v67→v68

### 验证结果
- node --check js/app.js 通过
- GetDiagnostics 零错误

### 测试步骤
1. 新建一个周期性办文事项（如"每日收文登记"，生成多个周期）
2. 点击某个周期的"完成"按钮 → 应弹出弹窗，显示"仅本项标记完成"和"本项及之后所有周期都标记完成"两个选项
3. 选择"仅本项标记完成" → 只有当前项被标记完成，其他周期不变
4. 再点击另一个周期的"完成"按钮 → 选择"本项及之后所有周期都标记完成" → 当前项及后续所有周期都被标记完成
5. 同样测试"置顶"和"沉底"按钮，确认弹窗选项一致
6. 测试删除：点击某个周期的删除按钮 → 应弹出弹窗，显示"仅删除本项"和"删除本项及后续所有周期"两个选项

### 遗留事项
- 无

## 2026-04-12

### 本次目标
- 完成 A 类代码质量优化（A1/A2/A4）
- 完成 B 类低风险优化评估与实施（B1-B5）

### 当前状态
- ✅ A1: db.js 事务模式审查通过（全部18+方法已正确使用 readonly/readwrite）
- ✅ A2: sync.js Supabase 查询合并（commit a655140）
- ✅ A4: ocr.js/kimi.js safeJsonParse 统一替换（commit 24de164）
- ✅ B1/B2/B4/B5: 评估后跳过（现有实现已够用或收益有限）
- ✅ B3: 离线检测实现（commit abbb3bd）

### 提交记录
- `a655140` A2: sync.js uploadToCloud 消除冗余查询
- `24de164` A4: ocr.js/kimi.js AI响应JSON解析统一为safeJsonParse
- `4c61bd6` 规则文件更新
- `abbb3bd` B3: 离线检测 - sync.js 8处离线拦截 + app.js online/offline事件提示

### 遗留事项
- 无

## 2026-04-12 日程折叠面板功能

### 本次目标
- 在右侧面板四个折叠按钮上方新增"日程"折叠按钮
- 与备忘录完全相同的模式：纯文字记录 + 自动保存 + 跨设备同步

### 已完成
- ✅ index.html：日程面板 HTML（textarea + panel-footer 模式）
- ✅ css/style.css：日程按钮样式 + 5按钮桌面/移动端布局 + 展开补偿 + 7主题色 + 移动端响应式
- ✅ js/app.js：initSchedulePanel() 方法 — 展开/收起切换 + 自动保存(500ms防抖) + 云端同步 + scheduleSynced 事件监听
- ✅ js/sync.js：7处同步路径全部添加 schedule 字段

### 验证结果
- `node --check js/app.js` 通过
- `node --check js/sync.js` 通过
- git push 成功（commit 61ba2cb）

### 遗留事项
- 无功能遗留

## 2026-04-12 A3 safeJsonParse 工具函数优化

### 本次目标
- 将 app.js 和 sync.js 中重复的 JSON.parse + try/catch 模式统一收敛到 utils.js 的 safeJsonParse 全局工具函数
- 删除 app.js 中已有的 SecurityUtils.safeJsonParse 内部方法，统一使用全局版本

### 已完成
- ✅ utils.js v3：新增 `safeJsonParse(str, defaultValue = null)` 全局函数
- ✅ app.js v67：5 处替换 + 删除 SecurityUtils.safeJsonParse 方法 + loadRememberedLogin 早返回重构
- ✅ sync.js v18：9 处 `JSON.parse(xxx || '[]')` → `safeJsonParse(xxx, [])`
- ✅ 版本号更新：index.html（utils.js v3, sync.js v18, app.js v67）+ wechat-upload.html（utils.js v3）

### 验证结果
- `node --check` 三个文件全部通过
- GetDiagnostics 三个文件零错误
- 本地 HTTP 服务器验证：4 个资源（index.html + 3 个 JS）全部正常加载
- git push 成功（commit 653b797）

### 遗留事项
- 无功能遗留

## 2026-04-12 可观测性增强：fetchWithRetry logPrefix 补齐

### 本次目标
- 给所有 fetchWithRetry 调用补充显式 logPrefix 参数，使线上日志能快速区分 OCR / Kimi / DeepSeek 请求来源

### 已完成
- ✅ ocr.js：DeepSeek / Kimi / DeepSeek 结构化调用补齐 logPrefix
- ✅ kimi.js：testConnection / request 方法补齐 logPrefix
- ✅ 版本号提升：ocr.js v31→v32、kimi.js v14→v15

### 验证结果
- `node --check js/ocr.js` 通过
- `node --check js/kimi.js` 通过
- GetDiagnostics 两个文件零错误
- git push 成功（commit 568553d）

### 遗留事项
- 无功能遗留

## 2026-04-11 第1批用户体验保护优化（7项）

### 本次目标
- 实施第1批优化：用户体验保护（7项），确保所有修改不影响现有功能

### 已完成
- ✅ OCR识别失败重试
- ✅ Loading状态完善
- ✅ 空 catch 补充友好提示
- ✅ localStorage保护
- ✅ 大图上传压缩
- ✅ 同步失败用户提示
- ✅ 表单防抖

### 验证结果
- 本地 Python http.server 测试：页面加载正常，控制台零错误零警告
- 代码grep验证：全部修改点确认存在
- UI交互测试：页面结构完整，设置按钮点击弹窗正常
- 版本号已递增：index.html + wechat-upload.html

## 2026-04-11 2-1 innerHTML 安全化

### 本次目标
- 实施第2批优化中 2-1 innerHTML 安全化：将 app.js 中所有高风险 innerHTML 改为 DOM API

### 已完成
- ✅ SVG 辅助函数、模板辅助函数、createCard 完整 DOM 化改造
- ✅ 高风险 innerHTML 消除

### 验证结果
- GetDiagnostics 零错误通过
- 所有高风险 innerHTML 已消除

### 遗留事项
- 剩余低优先级 innerHTML 待后续处理

## 2026-04-11 2-2 console 清理

### 本次目标
- 全项目 console.log 清零，保留 console.error / console.warn

### 清理范围
- sync.js：79处 console.log 移除
- app.js：104处 console.log 移除
- db.js：10处移除
- ocr.js：5处移除
- templates.js：1处移除
- upload-flow.js：1处移除

### 验证结果
- Grep 确认全项目 js/ 目录下 console.log = 0 处
- GetDiagnostics 零错误通过

## 2026-04-11 2-3 错误边界增强

### 本次目标
- 全项目 catch 块审查，静默吞错和空 catch 补充 console.warn

### 已完成内容
- 10处静默吞错/空 catch 添加 console.warn（app.js 10处）
- 空 catch 全项目清零

## 2026-04-11 2-4 定时器清理

### 本次目标
- 审查全项目 setTimeout/setInterval，确保无资源泄漏

### 审查结论
- 修复 1 处未保存 ID 的 setInterval：会议自动完成检查

## 2026-04-11 2-5 事件监听优化

### 本次目标
- 审查全项目 addEventListener 使用情况，识别重复绑定和未解绑风险

### 已完成
- 移除 createCard() 中 7 处直接按钮监听
- 统一到 bindBoardCardEvents() 容器级事件委托
- 扩展 bindBoardCardEvents 覆盖 DOCUMENT 类型

## 2026-04-11 跨设备同步数据丢失修复

### 问题描述
- 新设备 / 清缓存 / 空数据上传时可能导致云端数据被覆盖或同步失败后本地丢失

### 修复方案
- smartSync 首次同步走合并逻辑
- uploadToCloud 增加空数据保护
- upsert 后读取云端实际 updated_at
- clearAllItems 前统一加备份回滚
- 清空失败时中止操作

### 验证结果
- node -c sync.js 语法检查通过
- git push 成功（commit 027d7ef）

## 2026-04-11 2-6 .onerror 统一处理

### 本次目标
- 为 db.js 中裸 reject(request.error) 补齐语义化日志

### 已完成
- ✅ 新增 `_rejectWithLog` 辅助方法
- ✅ 22 处裸 reject 全部替换完成
- ✅ transaction.onabort 补充语义化错误消息

### 验证结果
- `_rejectWithLog` 调用链检查通过
- 无新增诊断错误

## 2026-04-11 第3批性能微优化

### 评估结论
- 3-1 ~ 3-4 整批评估后跳过，现阶段收益有限或成本过高

## 2026-04-11 第4批微信兼容 4-1 + 4-3

### 本次目标
- 修复微信内返回死循环，并增强微信能力检测

### 已完成
- ✅ wechat-upload.js 成功返回改用 location.replace()
- ✅ init 增加 IndexedDB/FileReader 检测与降级提示
- ✅ app.js 新增 checkWeChatCapabilities()
- ⏭️ 分享卡片能力跳过

### 验证结果
- node --check 两个文件均通过
- 无新增诊断错误

## 2026-04-11 第5批代码重构优化

### 本次目标
- 提取公共工具、假期数据外置、加密密钥迁移

### 已完成
- ✅ js/utils.js：新增 SafeStorage / fetchWithRetry / HolidayData
- ✅ sync.js / ocr.js / crypto.js / kimi.js / app.js 收敛到公共工具
- ✅ app.js isWorkday / isHoliday / getNthWorkDayOfMonth 委托 HolidayData
- ✅ crypto.js 主密钥迁移到 IndexedDB

### 遗留事项
- 无功能遗留

## 2026-04-10 第一回合导出链路本地优先修正

### 本轮目标
- 提升 Word 导出链路稳定性，让 docx 优先走本地静态资源，CDN 仅作兜底

### 本轮已做
- report.js 启用本地优先、CDN 兜底加载顺序
- index.html 移除旧的 docx 静态 script
- 修复 vendor/docx.8.2.0.umd.cjs 不完整文件问题

### 本轮验证
- index.html、report.js 无新增诊断
- node --check 通过
- 页面级真实点击验证通过

### 最终结论
- Word 导出链路具备本地优先能力，CDN 仅作兜底

## 2026-04-10 Word/PDF 导出选项移除

### 背景
- 用户反馈线上 Word 日报卡住，决定先删掉 Word/PDF，只保留图片报告

### 本轮已做
- index.html：移除 PDF 和 Word 选项，仅保留高清长图
- app.js generateReport()：直接调用 exportToImage

### 本轮验证
- node --check js/app.js 通过
- 本地浏览器闭环测试通过

## 2026-04-10 第1批安全修复（3项）

### 本轮目标
- 修复 API key 注释、eval 风险、密码明文存储

### 本轮已做
- sync.js：补充 Supabase anon key 安全说明
- app.js：eval 改为 safeMathEval
- app.js：remembered login 改为 cryptoManager AES-GCM 加密

### 本轮验证
- safeMathEval 测试通过
- 加密存储兼容旧数据通过
- 页面 console 零 error / warn

## 2026-04-01 会议排序彻底修正

### 用户最新反馈
- 钱局和吴局新增后在线上实际测试仍掉到底部

### 本轮已做
- 新增 sortMeetingItems 与 mergeMeetingListsByDefaultOrder
- 会议列排序改为“桶内保留手动排序列表 + 新增会议按领导优先级和时间插入”
- index.html 再次提升 app.js 资源版本号

### 本轮验证
- app.js、index.html 无新增报错
- node --check 通过
- 逻辑验证通过

## 2026-04-01 新增会议插入排序继续排查

### 本轮已做
- 引入 manualOrderUpdatedAt，区分拖动前旧会议与拖动后新增会议
- 调整 renderColumn 会议排序
- db.js 清理未手动排序会议的 manualOrderUpdatedAt

### 本轮验证
- 场景一、场景二逻辑验证通过

## 2026-04-01 排序回归继续排查

### 本轮已做
- 手动新增会议保存前重排参会人员，并清理残留 order
- db.js 新增 normalizeItemForStorage 统一清理旧 order
- ocr.js 抽出领导别名纠偏通用文本修正

### 本轮验证
- 本地新增 3 条会议验证通过

## 2026-04-01 会议面板领导排序与二次校正层

### 本轮已做
- app.js 增加领导优先级规则
- 会议卡片参会人按领导顺序显示
- ocr.js 增加人名、职位、会议室编号保守纠偏
- 合并参会人员时同步重排
- db.js 引入 manualOrder 标记

### 本轮验证
- node --check 通过
- 代码路径检查通过

## 2026-03-31 当前轮次

### 当前发现问题
- AI 识别预览点击“取消保存”后，结果仍然被写入面板

### 本轮已完成
- OCR 管理器新增数据快照与恢复能力
- 主页面上传流程在预览前保存快照，取消时恢复快照，并取消后不触发云端同步
- 微信上传页在预览前保存快照，取消时恢复快照
- 新增根目录文档：项目框架、todolist、项目迭代记录
- 提升前端资源版本号，减少线上缓存导致的新功能不生效问题

## 2026-03-31 全盘优化评估

### 目标
- 全盘检查高性价比、低风险或无风险优化空间

### 当前决定
- 已确认实施同步日志瘦身、导出脚本加载增强、预览弹窗一次性关闭保护、OCR 标题候选清洗增强

### 本轮实施结果
- 已完成同步模块日志瘦身与敏感信息脱敏
- 已完成报告导出脚本加载稳定性增强
- 已完成主页面与微信页预览弹窗一次性关闭保护
- 已完成 OCR 标题候选清洗增强

## 2026-03-31 上传入口收敛评估

### 结论
- 双入口仍值得保留，最优方案是保留双入口、收敛共用逻辑

### 本轮已做
- 新增共享模块 upload-flow.js
- 主页面在微信环境下重新接回微信轻量上传页入口
- 微信页与主页面共用同一套预览和摘要逻辑

## 2026-03-31 自动返回与判断依据增强

### 本轮已做
- 微信上传页成功保存后约 1 秒自动返回主页面
- OCR 动作计划补充预览依据字段
- upload-flow.js 增加“依据”渲染
- 项目规则新增“每次交付都要明确给出测试步骤"

## 2026-03-31 已有会议摘要与识别精度增强

### 本轮已做
- 动作计划增加 matchedExistingSummary
- 预览支持“依据 + 匹配到”两层信息
- 新增会议时补充差异原因说明
- Kimi / DeepSeek 提示词补充“数字、人名、房间号、地点专名优先逐字保留”
