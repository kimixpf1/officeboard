## 2026-05-06 v5.34

### 本次目标
- 修复电脑端 API Key 保存后刷新丢失的问题

### 根因分析
- `setKimiApiKey()` 调用 `secureStoreSecret` 后不检查返回值，直接 `SafeStorage.remove('kimiApiKey')` 删除明文备份
- 如果加密存储失败，Kimi Key 从两个存储位置同时丢失，刷新后恢复不了
- 和风天气 Key 加密失败直接 throw，阻断整个保存流程

### 当前状态
- ✅ setKimiApiKey 改为先检查加密返回值，成功才删 SafeStorage 明文
- ✅ 和风天气加密失败改为 warning 提示，不阻断整个保存流程
- ✅ 补齐和风天气 db.setSetting 记录
- ✅ 版本号提升到 v5.34，资源版本 ocr.js?v=44、app.js?v=179
- ✅ node --check 通过，diagnostics 0 错误
- 🔄 待提交推送

### 本轮关键改动
- js/ocr.js：setKimiApiKey 加密返回值检查，与 setApiKey 保持一致
- js/app.js：和风天气加密失败改 warning；版本 v5.34
- index.html：资源版本 ocr.js?v=44、app.js?v=179

### 遗留事项
- 待线上验证电脑端三个 Key 保存后刷新不丢失
- 待推送（v5.33 也未推送成功，网络超时）

## 2026-05-06 v5.33

### 本次目标
- 修复手机端菜单栏中间留白布局异常
- 修复编辑已有待办被错误新增的问题
- 修复 smartSync 删除墓碑未合并导致跨设备删除回弹

### 当前状态
- ✅ 手机端 header-notice 640px 断点：flex:0 0 auto + width:100% + justify-content:flex-start
- ✅ 手机端 countdown-notice[hidden] 改为 display:none（不再占位撑高 header）
- ✅ 平板端 1024px 断点补 flex:0 0 auto + max-width:100%
- ✅ saveItem 编辑失败不再偷偷 addItem，改为 throw 明确报错
- ✅ saveItem itemId 改 let 支持后续回填
- ✅ smartSync 情况3 补 deletedItemsMap 合并云端墓碑
- ✅ 版本号提升到 v5.33，资源版本 style.css?v=63、app.js?v=178、sync.js?v=62
- ✅ node --check 全部通过，diagnostics 0 错误
- ✅ 已提交 `a0033e4`，待推送到 origin/main

### 本轮关键改动
- css/style.css：平板端补 header-notice flex 覆盖；移动端 flex-start 对齐 + hidden 不占位
- js/app.js：saveItem 编辑失败兜底移除 addItem；itemId 改 let；版本 v5.33
- js/sync.js：smartSync 情况3 补 cloudData.deletedItems 合并到本地 deletedItemsMap
- index.html：资源版本 style.css?v=63、sync.js?v=62、app.js?v=178

### 同步排查结论
- 电脑端未登录时新增/删除只留在本地，不上云，这是预期行为
- 未登录电脑不影响其他已登录设备的同步
- 已登录设备间同步逻辑正常，删除墓碑链路已补齐

### 提交记录
- `a0033e4` fix: mobile header layout, edit-to-new bug, sync tombstone merge (v5.33)

### 遗留事项
- 待线上强刷确认版本号 `2026-05-06 v5.33`
- 待手机端验证菜单栏不再中间留白
- 待验证编辑已有待办不再误新增
- 待双设备验证删除墓碑不再回弹

## 2026-05-06 v5.31

### 本次目标
- 代码健康度快速优化：合并重复代码、消除空catch、全局错误捕获
- 不影响任何功能，纯重构

### 当前状态
- ✅ M5: 5个toggle函数合并为通用 toggleInputVisibility(inputId)
- ✅ M6: 删除重复的 updateApiKeyStatus 定义（保留L4901版本）
- ✅ M7: sync.js 两处空 catch 补充 console.warn 日志
- ✅ M9: 添加全局 unhandledrejection / error 捕获监听
- ✅ 版本号提升到 v5.31，资源版本 sync.js?v=61、app.js?v=176
- ✅ node --check 通过
- ✅ 已提交 `245b868`，待推送到 origin/main

### 本轮关键改动
- js/app.js：toggleInputVisibility通用方法、删除重复updateApiKeyStatus、全局错误捕获
- js/sync.js：两处空catch补充日志
- index.html：资源版本 sync.js?v=61、app.js?v=176

### 提交记录
- `245b868` refactor: merge toggles, delete duplicate, empty catch logging, global error capture (v5.31)

### 遗留事项
- 待线上强刷确认版本号 `2026-05-06 v5.31`
- 待验证全局错误捕获在控制台正常输出

## 2026-05-06 v5.30

### 本次目标
- 修复跨设备同步丢失会议记录：silentSyncFromCloud的lastCloudSyncTime未持久化
- 修复Realtime事件被isSyncing互斥丢弃导致同步中断
- 上传失败3次后通知用户（之前静默失败无感知）

### 当前状态
- ✅ 修复1: silentSyncFromCloud 成功后 SafeStorage.set('lastCloudSyncTime') 持久化
- ✅ 修复2: Realtime回调被isSyncing阻断时设 _pendingRealtimeSync=true，smartSync结束后补执行
- ✅ 修复3: immediateSyncToCloud 重试3次失败后 dispatchEvent('syncError') 通知UI
- ✅ 版本号提升到 v5.30，资源版本 sync.js?v=60、app.js?v=175
- ✅ node --check 通过，diagnostics 0 错误
- ✅ 已提交推送 `ad3ebd5` 到 origin/main

### 本轮关键改动
- js/sync.js：lastCloudSyncTime持久化、Realtime待处理标记+补执行、上传失败通知
- js/app.js：版本 v5.30、scriptVersions 更新
- index.html：资源版本 sync.js?v=60、app.js?v=175

### 提交记录
- `ad3ebd5` fix: sync reliability - persist lastSyncTime, realtime retry, upload failure alert (v5.30)

### 遗留事项
- 待用户双设备验证：手机端新增会议后电脑端能正确同步
- 待验证上传失败时UI是否显示提示
- 待验证Realtime补执行逻辑是否正常触发

## 2026-05-05 v5.29

### 本次目标
- 安全加固：innerHTML注入修复、移除atob密码明文回退、prompt改自定义模态框
- 性能优化：init()非首屏延迟初始化
- Bug修复：通讯录搜索后同步事件覆盖搜索状态

### 当前状态
- ✅ H1-A: 倒数日卡片 data-id 加 SecurityUtils.escapeHtml（3处）
- ✅ H1-B: showRecognitionLog innerHTML 改 textContent
- ✅ H2: 移除 atob 密码明文回退，解密失败取消记住勾选
- ✅ H3: 新增 showPasswordPrompt 方法，importData 中 prompt() 改自定义模态框
- ✅ H4: init() 中8个非首屏步骤用 requestIdleCallback 延迟执行
- ✅ Bug: contactsSynced 事件监听器增加搜索状态保持
- ✅ 版本号提升到 v5.29，资源版本 app.js?v=174
- ✅ node --check 通过，diagnostics 0 错误
- ✅ 已提交推送 `ecb1bd4` 到 origin/main
- ✅ 线上验证通过：版本号 v5.29、app.js?v=174

### 本轮关键改动
- js/app.js：安全修复4项 + init延迟初始化 + 通讯录搜索bug + 版本v5.29
- index.html：资源版本 app.js?v=174

### 提交记录
- `ecb1bd4` fix: security hardening + init lazy load + contacts search bug (v5.29)

### 遗留事项
- 待用户验证通讯录搜索不再跳回全部列表
- 待用户验证导入备份时自定义密码弹窗正常
- 待验证记住密码解密失败时不再明文回填
- H5 Supabase SDK 本地化待单独迭代

## 2026-05-05 v5.28

### 本次目标
- 修复待办提醒框宽度比倒数日提醒框窄的问题（max-width不固定导致）
- 修复提醒框出现/消失时菜单栏其他组件位置移动的问题（header-notice未固定宽度）

### 当前状态
- ✅ .countdown-notice 宽度从 max-width:320px 改为固定 width:280px + max-width:280px
- ✅ .countdown-notice[hidden] 从 display:none 改为 visibility:hidden + display:flex !important（保留空间占位）
- ✅ 新增 .countdown-notice.todo-reminder-active .countdown-notice-content padding-right:30px（防止绝对定位完成按钮遮挡文字）
- ✅ .header-notice 从 flex:0 0 auto 改为 flex:0 0 280px + width:280px（固定容器宽度防布局偏移）
- ✅ 版本号提升到 v5.28，资源版本 style.css?v=61、app.js?v=173
- ✅ 已提交推送 `1cc9853` 到 origin/main
- 🔄 待线上强刷验证版本号 `2026-05-05 v5.28`

### 本轮关键改动
- css/style.css：countdown-notice 固定280px、hidden保留空间、content padding-right、header-notice固定280px
- index.html：资源版本 style.css?v=61、app.js?v=173
- js/app.js：版本 v5.28、scriptVersions 更新

### 提交记录
- `1cc9853` fix: notice fixed width + hidden reserve space + content padding (v5.28)

### 遗留事项
- 待线上强刷确认版本号 `2026-05-05 v5.28`
- 待验证待办提醒框与倒数日提醒框宽度一致
- 待验证提醒框出现/消失时菜单栏不再偏移

## 2026-05-05 v5.27

### 本次目标
- 待办提醒框改为和倒数日提醒框一样大的两行布局
- 完成按钮从"✓ 完成"简化为只有"✓"
- 顶部菜单栏天气框间距缩小，避免碰到 AI 输入框

### 当前状态
- ✅ countdown-notice 高度从固定 36px 改为 min-height:36px + height:auto
- ✅ 待办提醒 desc 从 display:none 改为正常两行显示（ellipisis 截断）
- ✅ 待办提醒 title 去掉 marquee 滚动动画，改为 ellipsis 截断
- ✅ 完成按钮文字从"✓ 完成"改为"✓"，处理中从"处理中..."改为"..."
- ✅ 完成按钮 padding 从 2px 8px 缩小到 2px 6px，font-size 从 11px 增到 12px
- ✅ 天气框宽度从 290px 缩小到 260px
- ✅ 天气四个分区 padding 从 2px 4px 缩小到 2px 2px
- ✅ weather-tomorrow border-right 去掉省空间
- ✅ 版本号提升到 v5.27，资源版本更新
- ✅ node --check 通过，diagnostics 0 错误
- ✅ 已提交推送 `6f64b1c` 到 origin/main

### 本轮关键改动
- css/style.css：countdown-notice height 改 auto、待办提醒两行显示、完成按钮缩小、天气框 260px
- index.html：完成按钮文字改"✓"、资源版本 style.css?v=60、app.js?v=172
- js/app.js：完成按钮文字"✓"和"..."、版本 v5.27

### 提交记录
- `6f64b1c` fix: todo reminder two-line layout, compact complete btn, header spacing (v5.27)

### 遗留事项
- 待线上强刷确认版本号 `2026-05-05 v5.27`
- 待验证待办提醒框两行显示效果
- 待验证天气框间距是否不再碰到 AI 输入框

## 2026-05-05 v5.26

### 本次目标
- 倒数日类型增加"其他"自定义选项，支持用户填写自定义类型名称（如考试日、还房贷日等）

### 当前状态
- ✅ index.html 类型 select 新增"其他"选项 + 自定义类型名称输入框
- ✅ app.js 选"其他"时自动显示自定义输入框，切回其他类型时隐藏
- ✅ app.js `getCountdownEventLabel` 支持 other 类型显示自定义名称
- ✅ app.js `getCountdownTypeColors` 新增 other 默认颜色 `#06b6d4`（青色）
- ✅ app.js `handleAddCountdownEvent` 选"其他"时校验自定义名称非空，保存 `customEventType` 字段
- ✅ app.js `startEditCountdownEvent` 编辑时回填自定义类型名称和显示状态
- ✅ app.js `resetCountdownForm` 重置时清空并隐藏自定义输入框
- ✅ style.css 表单 grid 布局新增 customtype 区域（桌面端+移动端）
- ✅ node --check 通过，diagnostics 0 错误
- ✅ 本地浏览器测试通过：选"其他"→ 输入框显示 → 填写"考试日" → 添加成功 → 卡片显示自定义类型标签 → 编辑回填正确 → 空名称拦截正确
- ✅ 已提交推送 `ccca0f8` 到 origin/main
- ✅ GitHub API 确认远程 HEAD 已更新为 `ccca0f8`，三文件完整

### 本轮关键改动
- index.html：倒数日类型 select 新增 `<option value="other">其他</option>` + `<input id="countdownCustomType">` + 更新名称 placeholder 和分区标题文案
- app.js：initCountdownPanel 新增 `toggleCustomTypeInput` 函数，typeSelect change 事件联动
- app.js：`getCountdownEventLabel` other 类型读取 `item.customEventType`
- app.js：`getCountdownTypeColors` 新增 `other: '#06b6d4'`
- app.js：`handleAddCountdownEvent` 读取 customTypeInput，校验非空，payload 新增 `customEventType` 字段
- app.js：`startEditCountdownEvent` / `resetCountdownForm` 处理 customTypeInput 回填和重置
- css/style.css：桌面端和移动端 grid-template-areas 新增 `customtype` 行

### 提交记录
- `ccca0f8` feat: add custom 'other' type to countdown events (v5.26)

### 遗留事项
- 待线上强刷确认版本号 `2026-05-05 v5.26`

## 2026-05-05 v5.24

### 本次目标
- 修复微信轻量页面（wechat-upload.html）AI 识别图片功能失败
- 阻止微信环境下 fallback 到 Tesseract OCR（CDN 不通导致下载引擎+语言包失败）
- 增强微信页面 API Key 恢复检查，无 Key 时给明确提示

### 根因分析
1. 微信页面进入识别流程后，先尝试 Kimi API 调用
2. 如果 Kimi Key 未恢复或 Kimi API 调用失败，代码会 fallback 到 Tesseract OCR
3. Tesseract 需要从 `cdn.jsdelivr.net` 下载引擎（~3MB）+ 中文语言包（~12MB）
4. 微信内置浏览器对 jsdelivr CDN 访问受限，下载失败 → 直接报错
5. 用户看到"使用Kimi → 加载OCR → 下载语言包 → 失败"的快速闪烁

### 当前状态
- ✅ ocr.js：Kimi 失败 catch 块增加微信环境检测，直接抛出明确错误而非走 Tesseract
- ✅ ocr.js：无 Kimi Key 的 else 块增加微信环境检测，直接提示设置 API Key
- ✅ wechat-upload.js：init() 增加 API Key 恢复容错和 Key 存在性检查，无 Key 时禁用按钮并提示
- ✅ node --check 通过（ocr.js / wechat-upload.js）
- ✅ 已提交推送 `131ddfb` 到 origin/main
- ✅ 线上验证通过：微信 UA 强刷后已命中 `ocr.js?v=44`、`wechat-upload.js?v=10`，无 Key 时按钮禁用与提示生效，控制台无新报错
- 🔄 待用户在真实微信环境验证：已配置 Kimi Key 时图片识别是否正常（不再闪“下载语言包”）

### 本轮关键改动
- ocr.js：`analyzeDocument` 图片识别两个分支（Kimi 失败 catch + 无 Kimi Key else）增加微信环境判断，阻止 Tesseract fallback
- wechat-upload.js：`init()` 增加 `loadApiKeysFromDB()` 容错 + Key 存在性检查
- wechat-upload.html：资源版本更新为 `ocr.js?v=44`、`wechat-upload.js?v=10`

### 提交记录
- `131ddfb` fix: block WeChat OCR fallback in upload page

### 遗留事项
- 待用户微信端验证：有 Kimi Key 时识别是否正常（不再闪"下载语言包"）
- 如需进一步核验“有 Key 正常识别”链路，需在真实微信环境提供可用 Kimi Key 继续测试

## 2026-05-04 v5.21

### 本次目标
- Supabase 初始化从轮询改为事件驱动，消除 200ms×100 的 while 循环开销
- window.supabase 属性锁定防篡改（Object.defineProperty writable:false configurable:false）
- 修复 Object.freeze 与 esm.sh 模块不可配置属性冲突导致 freeze 失败的问题

### 当前状态
- ✅ sync.js：构造函数改为 `this.initPromise = this._waitForSupabaseLib().then(() => this._doInitSupabase())`
- ✅ sync.js：新增 `_waitForSupabaseLib()` 事件驱动等待（addEventListener supabase-loaded + 20s 超时）
- ✅ sync.js：旧 `initSupabase` 重命名为 `_doInitSupabase`，移除 while 轮询循环
- ✅ index.html：loadSupabase 函数增加 Object.defineProperty 冻结 window.supabase
- ✅ index.html：修复 Object.freeze(module) 报错 "Cannot redefine property: AuthAdminApi"，改为只冻结 window 属性
- ✅ app.js：版本提升到 v5.21
- ✅ node --check / diagnostics 0 错误
- ✅ 本地模拟测试 68 项全部通过
- ✅ 线上验证通过：版本号 v5.21、supabase writable:false configurable:false、createClient 可用、骨架屏正常移除、控制台无新错误
- ✅ 已提交推送 `d7776d4` 到 origin/main

### 本轮关键改动
- sync.js：事件驱动初始化替代轮询，20s 超时保护
- index.html：Object.defineProperty 锁定 window.supabase（不冻结模块内部属性）
- app.js：版本提升到 v5.21

### 事故记录（推送截断事故）
- 过程：尝试用 GitHub API `create_or_update_file` 推送 index.html 修复，content 参数被截断导致远程文件从 69KB 变为 2.4KB，线上白屏
- 恢复：用户在独立终端执行 `git push --force origin main` 恢复完整版本
- 教训：已写入 project_rules.md 推送安全铁律——禁止通过 GitHub API 推送超过 1KB 的文件

### 提交记录
- `95c89c4` perf: event-driven Supabase init + security hardening (v5.21)
- `d7776d4` fix: remove Object.freeze on supabase module (causes error with non-configurable props)

### 遗留事项
- 待用户手机端验证功能正常
- 待继续第 5 步：Supabase SDK 本地化（P0）

## 2026-05-04 v5.20

### 本次目标
- 代码健康度优化第三批：首屏加载体验、死代码清理、字体加载优化
- 修复周视图"今天"按钮电脑端滚动位置问题
- 不影响任何功能，纯性能优化和 bug 修复

### 当前状态
- ✅ 已删除 `js/templates.js`（53KB，792行完全未被引用的死代码）
- ✅ 已移除 Google Fonts 外链，改用系统字体栈（`-apple-system, PingFang SC, Microsoft YaHei` 等）
- ✅ CSP 收紧：去掉 `fonts.googleapis.com` 和 `fonts.gstatic.com`
- ✅ 已添加首屏骨架屏（紫色标题栏 + 三列灰色 shimmer 卡片），JS init 完成后自动移除
- ✅ 已修复周视图"今天"按钮电脑端滚动位置：`scrollIntoView({ block: 'center' })` 改为 `scrollTo({ top: 0 })` + `todayCell.scrollTop = 0`
- ✅ 版本号提升到 `2026-05-04 v5.20`
- ✅ node --check 全部通过
- ✅ diagnostics 全部 0 错误
- ✅ 已提交推送 `0006ee6` 到 origin/main
- ✅ 线上验证通过：版本号 v5.20、周视图今天按钮修复、骨架屏正常、零字体请求、控制台无新增错误

### 本轮关键改动
- index.html：删除 Google Fonts preconnect 和 stylesheet 链接；CSP 去掉字体域名；添加首屏骨架屏 HTML
- css/style.css：字体变量改为系统字体栈；追加骨架屏样式（shimmer 动画 + 暗色模式适配 + 移动端响应式）
- js/app.js：init() 中添加骨架屏移除逻辑；版本提升到 v5.20
- js/calendar.js：周视图 renderWeekView 末尾，today 滚动从 `scrollIntoView({ block: 'center' })` 改为统一 `scrollTo({ top: 0 })`
- js/templates.js：已删除（53KB 死代码）

### 周视图"今天"按钮修复根因
- v5.12 修复时用了 `scrollIntoView({ block: 'center' })`，移动端正常但电脑端会把 `.week-cell.today` 推到视口中心
- 导致上方的 `.week-title`（"2026年5月第X周"）被推出视口，需要往上滚才能看到
- 修复方案：统一改为"外层容器 scrollTo top 0 + today 格子内部 scrollTop 0"，和左右切换周行为一致
- 电脑端和手机端都兼容

### 提交记录
- `cd12ffb` chore: remove dead code templates.js (53KB unused)
- `0813511` perf: remove Google Fonts, use system font stack (v5.20)
- `0006ee6` perf: skeleton screen + fix week today scroll (v5.20)

### 遗留事项
- 待用户手机端验证周视图"今天"按钮
- 后续优化：Supabase CDN 本地化、轮询改事件驱动、app.js 拆分

## 2026-05-03 v5.18

### 本次目标
- 代码健康度优化：消除重复定义、统一配置、精简冗余逻辑、收敛共用方法
- 不影响任何功能，纯重构

### 当前状态
- ✅ app.js `escapeHtml` 4 处重复定义统一为 `SecurityUtils.escapeHtml`，删除 3 处冗余实现
- ✅ app.js 领导优先级顺序修正为标准：钱局→吴局→盛局→陈局/陈主任→房局
- ✅ app.js `getMeetingLevel` 去掉不必要的 `sortMeetingAttendeesForDisplay` 全排序，改为直接遍历取最小 rank
- ✅ sync.js 3 处 settings 恢复代码块（~120 行）抽取为 `_restoreSettingsFromCloud` 共用方法
- ✅ 版本号提升到 `2026-05-03 v5.18`
- ✅ node --check app.js / sync.js 全部通过
- ✅ 已提交推送 `02954ae` 到 origin/main（3 files, +43 -158, 净减 115 行）

### 本轮关键改动
- app.js：删除 3 处 `escapeHtml` 重复定义，4 处 `this.escapeHtml` 调用改为 `SecurityUtils.escapeHtml`
- app.js：`meetingLeaderPriorityGroups` 顺序从"房局→陈局"修正为"陈局→房局"
- app.js：`getMeetingLevel` 从 `sortMeetingAttendeesForDisplay` + `map/min` 改为直接遍历取最小 rank
- sync.js：新增 `_restoreSettingsFromCloud(settings)` 方法，3 处调用点统一
- index.html / app.js：版本提升到 `v5.18`，资源版本 `sync.js?v=56`、`app.js?v=166`

### 提交记录
- `02954ae` refactor: unify escapeHtml, leader priority, meeting sort, sync settings restore (v5.18)

### 遗留事项
- 待用户强刷确认版本号 `2026-05-03 v5.18`
- 待验证参会人员排序在 OCR 预览和面板显示中一致

## 2026-05-03 v5.17

### 本次目标
- 修复 CSP 阻断 pdf.js CDN 加载导致 PDF 解析失败
- 修复微信端上传图片后页面崩溃重启
- 同步更新 wechat-upload.html 资源版本

### 当前状态
- ✅ CSP `script-src` 添加 `https://cdnjs.cloudflare.com` 白名单
- ✅ `fileToBase64` 对大于 1MB 的图片自动 canvas 压缩后再 base64，降低内存峰值
- ✅ `compressImageIfNeeded` 微信环境用更激进的压缩参数（1MB/1600px/0.6质量）
- ✅ `wechat-upload.html` 资源版本同步更新到 `ocr.js?v=39`、`db.js?v=28`、`upload-flow.js?v=8`
- ✅ 版本号提升到 `2026-05-03 v5.17`
- ✅ node --check 全部通过
- ✅ diagnostics 全部 0 错误
- ✅ 已提交推送 `97fef3e` 到 origin/main

### 本轮关键改动
- index.html：CSP `script-src` 添加 `https://cdnjs.cloudflare.com`
- ocr.js：`fileToBase64` 对 >1MB 图片先 canvas 压缩到 1600px/0.7质量再 base64
- upload-flow.js：`compressImageIfNeeded` 微信环境用 1MB 阈值 / 1600px 最大尺寸 / 0.6 压缩质量
- wechat-upload.html：资源版本同步更新
- index.html / app.js：版本提升到 `v5.17`，资源版本更新

### 提交记录
- `97fef3e` fix: PDF CSP cdnjs whitelist, WeChat image crash prevention (v5.17)

### 遗留事项
- 待用户强刷确认版本号 `2026-05-03 v5.17`
- 待用户测试 PDF 上传识别是否正常
- 待用户在微信端测试图片上传识别是否不再崩溃

## 2026-05-03 v5.16

### 本次目标
- 第三批优化：运行时性能提升
- OCR 识别结果批量写入替代逐条串行写入
- 会议去重从全量遍历改为按类型 Map 分组
- getItemsByType 从全表扫描改为走 IndexedDB type 索引

### 当前状态
- ✅ ocr.js `applyRecognitionActionPlan` 改为 `batchAddItems`/`batchPutItems` 批量写入，失败自动回退逐条
- ✅ ocr.js `buildRecognitionActionPlan` 新增 `existingByType` Map 分组，`checkDuplicateItem` 只接收同类型项
- ✅ ocr.js `checkDuplicateItem` 移除冗余的 `existing.type !== newItem.type` 判断
- ✅ db.js `getItemsByType` 改为走 IndexedDB `type` 索引查询，有缓存时优先用缓存
- ✅ 版本号提升到 `2026-05-03 v5.16`
- ✅ node --check ocr.js / db.js / app.js 全部通过
- ✅ diagnostics 全部 0 错误
- ✅ 已提交推送 `f400b07` 到 origin/main
- ✅ 线上验证通过：版本号 v5.16、天气正常、控制台无新错误

### 本轮关键改动
- ocr.js：`applyRecognitionActionPlan` 合并更新用 `batchPutItems`、新增用 `batchAddItems`，失败回退逐条
- ocr.js：`buildRecognitionActionPlan` 入口按类型建 Map，传给 `checkDuplicateItem` 只同类型项
- ocr.js：`checkDuplicateItem` 移除 `type` 比较冗余行
- db.js：`getItemsByType` 使用 `store.index('type').getAll(type)` 替代 `getAllItems().filter()`
- index.html / app.js：版本提升到 `v5.16`，资源版本 `ocr.js?v=38`、`db.js?v=28`、`app.js?v=164`

### 提交记录
- `f400b07` perf: batch writes, Map dedup, type index query (batch 3 v5.16)

### 遗留事项
- 待用户在实际 OCR 识别场景下验证批量写入与去重是否正常
- 待确认 `getItemsByType` 索引查询在事项数量较多时性能提升明显

## 2026-05-03 v5.15

### 本次目标
- 修复 CSP 阻断免费天气回退导致天气不显示
- 修复 API Key 跨设备同步后不生效（同步恢复后未触发 ocrManager 重载）

### 当前状态
- ✅ CSP connect-src 已添加 `api.open-meteo.com`，免费天气服务不再被阻断
- ✅ sync.js 三个恢复点（downloadFromCloud、silentSyncFromCloud、mergeData）设置恢复后自动调用 `ocrManager.loadApiKeysFromDB()` 并刷新状态
- ✅ app.js 初始化 `checkApiKey()` 时主动调用 `loadApiKeysFromDB()`，确保首次加载也从加密存储恢复
- ✅ mergeData 恢复路径补充 `crypto_master_key` 写入
- ✅ 版本号提升到 `2026-05-03 v5.15`
- ✅ node --check 全部通过
- ✅ 已提交推送 `a4be34e` 到 origin/main

### 本轮关键改动
- index.html：CSP connect-src 添加 `https://api.open-meteo.com`
- sync.js：downloadFromCloud / silentSyncFromCloud / mergeData 三个恢复点添加 `ocrManager.loadApiKeysFromDB()` + `app.updateApiKeyStatus()` 调用
- sync.js：mergeData 补充 `crypto_master_key` 恢复
- app.js：`checkApiKey()` 主动调用 `loadApiKeysFromDB()` 从加密存储恢复 API Key

### 提交记录
- `a4be34e` fix: CSP add open-meteo, API Key cross-device sync recovery

### 遗留事项
- 待用户线上强刷确认天气正常显示（免费天气服务回退生效）
- 待用户双设备验证 API Key 跨设备同步后自动恢复到 ocrManager

## 2026-05-02 v5.14

### 本次目标
- 安全加固：API Key 加密存储、密码记住修复、CSP 策略、XSS 防护
- 不影响现有所有功能正常使用

### 当前状态
- ✅ DeepSeek/Kimi API Key 改用 cryptoManager.secureStoreSecret 加密存储
- ✅ 云端同步不再传输明文 API Key，改为传输加密密文
- ✅ 密码"记住密码"降级为加密可用时才记住，移除 btoa 不安全回退
- ✅ upload-flow.js innerHTML 改用 SecurityUtils.escapeHtml 防 XSS
- ✅ index.html 添加 CSP meta 标签限制资源加载
- ✅ 移除 index.html 重复的 crypto.js 引用
- ✅ node --check 全部通过，diagnostics 0 错误
- ✅ 已提交推送 `398302e` 到 origin/main
- ✅ GitHub API 确认远程 ocr.js / sync.js / index.html / app.js 均已更新

### 本轮关键改动
- ocr.js：setApiKey/setKimiApiKey 改用 cryptoManager.secureStoreSecret 加密存储，移除明文 localStorage
- ocr.js：新增 loadApiKeyAsync/loadKimiApiKeyAsync 异步加载方法
- ocr.js：loadApiKeysFromDB 优先读加密存储，遗留明文自动迁移并清除
- sync.js：buildSyncData 从 kimi_api_key/deepseek_api_key 改为 kimi_api_key_encrypted/deepseek_api_key_encrypted
- sync.js：4 处恢复路径改为恢复加密密文并清理遗留明文
- app.js：密码记住改为仅 cryptoManager 可用时加密记住，失败时跳过而非 btoa 降级
- app.js：部署版本提升到 `2026-05-02 v5.14`
- upload-flow.js：2 处 innerHTML 添加 SecurityUtils.escapeHtml 防 XSS
- index.html：添加 CSP meta 标签、移除重复 crypto.js 引用、资源版本提升

### 提交记录
- `398302e` security: encrypt API keys, fix password storage, add CSP, sanitize innerHTML

### 遗留事项
- 待用户线上强刷确认版本号显示 `2026-05-02 v5.14`
- 待验证 API Key 加密存储后 AI 识别功能仍正常
- 待验证跨设备同步后加密密钥可正确恢复

## 2026-05-02 v5.13

### 本次目标
- 数据安全加固第二阶段：getStore 事务保护、restoreFromBackup 事务性、deletedItemsMap 容量保护
- 不影响现有所有功能正常使用

### 当前状态
- ✅ getStore 已添加 transaction.onerror / onabort 监听
- ✅ restoreFromBackup 已改为单事务批量写入，中途失败不会丢数据
- ✅ deletedItemsMap 已添加 30 天过期清理 + 500 条容量上限
- ✅ node --check db.js / sync.js / app.js 全部通过
- ✅ diagnostics 全部 0 错误
- ✅ 本地模拟测试 11 项检查全部通过
- ✅ 已提交推送 `d0e251a` 到 origin/main

### 本轮关键改动
- db.js：getStore 添加事务错误/中止监听，防止静默失败
- sync.js：restoreFromBackup 从"清空+逐条 addItem"改为"单事务 clear+batch add"，中途失败事务回滚
- sync.js：新增 _cleanupDeletedItemsMap 方法，初始化时自动清理 30 天以上过期记录和超 500 条的冗余记录
- index.html / app.js：部署版本提升到 `2026-05-02 v5.13`，资源版本更新

### 提交记录
- `d0e251a` fix: phase2 data safety - transaction protection, restore atomicity, deletedItems cleanup

### 遗留事项
- 待用户线上强刷确认版本号显示 `2026-05-02 v5.13`
- 待验证恢复备份功能正常（单事务写入后事项列表刷新）

## 2026-05-01 v5.12

### 本次目标
- 修复周视图点击“今天”在移动端误命中隐藏表头的问题
- 让周视图和月视图的 today 滚动目标都精确落到日期单元格
- 完成本地模拟测试、推送部署与线上强刷验证

### 当前状态
- ✅ 已将周视图 today 滚动目标收敛到 `.week-cell.today`
- ✅ 已将月视图 today 滚动目标收敛到 `.month-cell.today`
- ✅ 已完成 `node --check js/calendar.js`、`node --check js/app.js`、`node --check js/app-date-view.js`
- ✅ 已完成本地移动端模拟测试，周/月视图 today 均可正确滚动，月视图天数完整
- ✅ 代码安全审查通过：纯 UI 滚动修改，无数据/安全风险
- ✅ 已提交推送 `d96239b` + 文档修正 `a81ecdf` 到 `origin/main`
- ✅ 通过 GitHub API 确认远程仓库 calendar.js / app.js / index.html 均已更新

### 验证结果
- `node --check js/calendar.js` 通过
- `node --check js/app.js` 通过
- `node --check js/app-date-view.js` 通过
- calendar.js / app.js / app-date-view.js diagnostics 0 错误
- 本地移动端模拟测试通过：周视图 `.week-cell.today`、月视图 `.month-cell.today`、月视图天数完整

### 本轮关键改动
- calendar.js：周视图 today 滚动从泛化 `.today` 改为精确 `.week-cell.today`
- calendar.js：月视图 today 滚动从选中项逻辑改为精确 `.month-cell.today`
- index.html / app.js：部署版本提升到 `2026-05-01 v5.12`，资源版本同步更新

### 提交记录
- `d96239b` fix: refine today scroll targets
- `a81ecdf` docs: update v5.12 iteration log

### 遗留事项
- 待用户线上强刷确认版本号显示 `2026-05-01 v5.12`
- 待用户线上复测周视图与月视图的今天按钮跳转是否稳定

## 2026-05-01 v5.1

### 本次目标
- 全面分析并优化项目性能卡顿点
- 同步链路 O(n²)→O(n)、IndexedDB 串行→批量事务、定时器频率调优
- 完成本地校验、提交推送与线上强刷复测

### 当前状态
- ✅ 已全面分析 31 个性能瓶颈，覆盖同步、DB、定时器、算法、网络等 8 个类别
- ✅ 已将 `buildReconciledItems` 和 `syncLocalItemsToState` 从 O(n²) 降为 O(n)，用 Map 索引替代线性查找
- ✅ 已在 `db.js` 新增 `batchPutItems`、`batchAddItems`、`batchDeleteItems` 批量事务方法
- ✅ 已将 `syncLocalItemsToState`、`mergeData`、`checkMeetingAutoComplete` 从逐条串行写入改为批量事务写入
- ✅ 已将 `smartSync` 中 `JSON.stringify` 全量比对改为基于更新时间的 Map 快速比对，避免大数组序列化
- ✅ 已将定时同步从 10s 调整为 30s，减少网络和计算开销
- ✅ 已将 `silentSyncFromCloud`、`syncFromCloud`、`syncToCloud` 中串行设置读写改为 `Promise.all` 并行
- ✅ 已将部署版本提升为 `2026-05-01 v5.1`，资源版本提升到 `sync.js?v=51`、`app.js?v=154`、`db.js?v=26`
- ✅ 已完成 `node --check js/db.js`、`node --check js/sync.js`、`node --check js/app.js`
- ✅ 已完成 `db.js` / `sync.js` / `app.js` diagnostics 0 错误
- ✅ 已提交推送 `37c0091` 到 `origin/main`
- 🔄 待线上强刷验证

### 本轮关键改动
- db.js：新增 `batchPutItems`、`batchAddItems`、`batchDeleteItems` 三个单事务批量操作方法
- sync.js：`buildReconciledItems` 和 `syncLocalItemsToState` 用 Map 索引替代 `findMatchingItem` 线性查找
- sync.js：`syncLocalItemsToState` 改为先收集待写入项，再调用批量方法一次性写入
- sync.js：`mergeData` 改为批量写入 + Map 索引查找替代串行 `putItem`/`addItem`
- sync.js：`smartSync` 中 `JSON.stringify` 比对改为基于 `getItemUpdatedTime` 的 Map 快速比对
- sync.js：`silentSyncFromCloud` 和 `syncFromCloud` 中串行 `setSetting` 改为 `Promise.all` 并行
- sync.js：`syncToCloud` 中串行 `getSetting` 改为 `Promise.all` 并行读取
- sync.js：定时同步从 10s 调整为 30s
- app.js：`checkMeetingAutoComplete` 改为批量 `batchPutItems` + 一次 `immediateSyncToCloud`
- index.html / app.js：版本提升到 `v5.1`

### 遗留事项
- 待线上强刷验证是否命中 `sync.js?v=51`、`app.js?v=154`、`db.js?v=26`
- 待在真实登录/跨设备场景下验证同步速度提升
- 待继续观察实时通道稳定性

## 2026-04-29 v4.65

### 本次目标
- 彻底修复同账号跨设备删除后，设备 2 本地旧事项重新上传导致“删除成功下一秒又回来”的问题
- 为事项同步补上删除墓碑机制，让删除结果可以跨设备稳定传播
- 完成本地校验、提交推送与线上强刷复测

### 当前状态
- ✅ 已定位更深层根因：当前同步结构只有 `items`，没有“删除记录”，所以设备 2 登录后会把本地仍存在的旧事项重新参与合并并回传云端
- ✅ 已在 `sync.js` 增加 `deletedItemsMap`，并通过 `deletedItems` 字段随同步数据一起上传/下载
- ✅ 已修复 `buildReconciledItems()`：合并时优先检查删除墓碑，已删除事项不会再参与赢家选择
- ✅ 已修复 `syncLocalItemsToState()`：本地收敛时会记录删除墓碑并删除残留旧项，避免再次被静默同步带回
- ✅ 已修复 `app.js` 删除链路：单条删除、批量删除、AI 删除、重做删除都会写入删除墓碑；撤回删除、重做新增会清理删除墓碑
- ✅ 已将部署版本提升到 `2026-04-29 v4.65`，资源版本提升为 `sync.js?v=45`、`app.js?v=145`
- 🔄 待执行本地语法检查、diagnostics、git 提交推送与线上强刷验证

### 本轮关键改动
- sync.js：新增 `deletedItemsKey` / `deletedItemsMap` / `markItemDeleted()` / `clearDeletedMarker()` / `shouldKeepDeleted()`
- sync.js：`buildSyncData()` 新增同步 `deletedItems`
- sync.js：`uploadToCloud()`、`downloadFromCloud()`、`silentSyncFromCloud()` 合并并保留云端删除墓碑
- sync.js：`buildReconciledItems()`、`syncLocalItemsToState()` 改为优先尊重删除墓碑
- app.js：删除、撤回、重做链路补齐删除墓碑写入和清理

### 遗留事项
- 待双设备实测“设备 1 删除 / 设备 2 实时消失 / 删除后不再自动复活”
- 待双设备补测设备 2 本地新建事项删除后不会因登录同步立即回流
- 待补测跨日期事项、周期性事项、批量删除与撤回删除链路

## 2026-04-29 v4.64

### 本次目标
- 彻底修复同账号跨设备删除/新增后无法实时同步，刷新后旧事项回流的问题
- 收敛上传、下载、静默同步三条事项同步链路，统一按最终状态对齐本地与云端
- 完成本地校验、提交推送与线上强刷复测

### 当前状态
- ✅ 已定位根因：`smartSync()`、`uploadToCloud()`、`downloadFromCloud()`、`silentSyncFromCloud()` 对缺失项的处理口径不一致，导致删除后的旧事项会在别的设备或刷新后被重新带回
- ✅ 已在 `sync.js` 新增统一对账辅助方法：`getTimeMs()`、`getItemUpdatedTime()`、`findMatchingItem()`、`buildReconciledItems()`、`syncLocalItemsToState()`
- ✅ 已修复 `uploadToCloud()`：上传前先读取云端当前 items，再按稳定键 + 更新时间生成最终 items，避免旧设备把已删除事项拼回云端
- ✅ 已修复 `smartSync()`：改为基于统一对账结果刷新本地，并在存在本地修改时上传最终收敛结果，不再按数量变化粗暴增删
- ✅ 已修复 `downloadFromCloud()` 与 `silentSyncFromCloud()`：统一使用 `syncLocalItemsToState()` 落地最终状态，确保删除、新增、修改都一致同步
- ✅ 已将部署版本提升到 `2026-04-29 v4.64`，资源版本提升为 `sync.js?v=44`、`app.js?v=144`
- 🔄 待执行本地语法检查、diagnostics、git 提交推送与线上强刷验证

### 本轮关键改动
- sync.js：新增统一事项对账与本地收敛方法，统一删除/新增/修改的判断口径
- sync.js：`uploadToCloud()` 改为合并云端当前 items 后再 upsert，避免回流
- sync.js：`smartSync()` 改为统一对账后决定本地刷新与回传云端
- sync.js：`downloadFromCloud()` / `silentSyncFromCloud()` 改为直接收敛到目标状态，而不是分散式 put/add/delete
- index.html / app.js：版本提升到 `v4.64`

### 遗留事项
- 待双设备实测“设备 1 删除 / 设备 2 实时消失 / 任一设备刷新后不回流”
- 待双设备补测新增、编辑、完成状态、跨日期事项与周期性事项的同步一致性

## 2026-04-29 P3-49

### 本次目标
- 实现每晚 8 点双轨备份：云端滚动 30 份 + 本地自动下载
- 修复新建待办修改截止时间不显示截止时间的问题
- 修复同步时删除本地新增事项的问题

### 当前状态
- ✅ 已实现云端每日备份：存储在 user_data.data.dailyBackups 字段，与正常同步数据隔离
- ✅ 已实现本地每日备份：8 点后自动下载 JSON 文件
- ✅ 已在 uploadToCloud 中保留云端 dailyBackups 不被覆盖
- ✅ 已修复 downloadFromCloud/silentSyncFromCloud 仅在云端数据量 ≥ 本地时才清理
- ✅ 已修复新建待办时记录初始 deadline 并对比标记 deadlineManuallySet
- ✅ 已提交推送 P3-49

## 2026-04-29 P3-46 数据丢失事故

### 事故经过
- 用户在正常使用中编辑/删除事项报"更新失败事项不存在"
- 刷新页面后可短暂编辑，但周期性办文自动复制（3→6→7）
- 用户删除多余项后刷新，所有数据全部消失
- 尝试从另一设备导入备份，导入后立即被同步覆盖再次清空

### 根因分析
1. **clearAllItems+addItem 模式**：sync.js 的 downloadFromCloud / mergeData / silentSyncFromCloud 使用"清空+重建"模式，每次同步后所有事项 IndexedDB 自增 ID 变化，导致编辑/删除时报"事项不存在"
2. **getItemKey 去重键含 item.id**：document 类型去重键使用 `doc:title:start:end:id`，同步后 ID 变化导致同一事项被当作新事项重复创建
3. **无数据丢失保护**：本地清空后 smartSync 把空数据上传覆盖云端
4. **导入未暂停同步**：importFromFile 导入后 smartSync 立即触发，空数据覆盖刚导入的数据

### 已实施的防数据丢失机制（P3-46 起）
- **putItem 替代 clearAllItems+addItem**：同步时保留已有 ID，避免编辑失败
- **deleteItemsByHashes 按需清理**：仅在云端数据量 ≥ 本地时才清理多余项
- **数据量比保护**：本地≥5条且云端不足30%时阻止下载覆盖
- **导入暂停同步**：importFromFile 期间设 isSyncing=true，导入后自动 uploadToCloud
- **自动备份提升到 20 份**：同步前 autoBackupBeforeSync 保留最近 20 份到 localStorage
- **云端每日备份（P3-49）**：每晚 8 点保存到云端 dailyBackups 字段，滚动 30 份
- **本地每日备份（P3-49）**：每晚 8 点自动下载 JSON 文件到本地
- **云端备份与同步数据隔离**：dailyBackups 存在独立字段，uploadToCloud 时合并保留

### 数据安全铁律（P3-46 事故追加）
- 同步链路绝对不能使用"清空+重建"模式，必须保留已有 ID
- 导入备份必须暂停同步并主动上传覆盖云端
- 同步时删除本地项必须检查数据量比，本地比云端多时（有本地新增）不删除
- 云端备份必须与同步数据隔离存放，不被正常同步覆盖

## 2026-04-29 P3-46

### 本次目标
- 修复同步导致数据丢失事故：消除 clearAllItems+addItem 模式，改用 putItem 保留 ID
- 修复周期性办文去重键不含 recurringGroupId 导致同步时重复复制
- 修复导入备份后被同步覆盖的问题：导入时暂停同步+自动上传云端
- 修复待办截止时间只有用户手动修改才显示（添加 deadlineManuallySet 标记）
- 修复跨日期会议更新报错 applyCrossDateMeetingScopedUpdate is not a function
- 增加数据丢失保护：本地数据量远大于云端时阻止覆盖

### 当前状态
- ✅ 已消除 sync.js 中所有 clearAllItems+addItem 替换模式，改用 putItem 保留 ID + deleteItemsByHashes 清理多余项
- ✅ 已修复 getItemKey 对周期性事项去重键不含 recurringGroupId 的问题
- ✅ 已修复 importFromFile 导入时暂停同步（isSyncing=true），导入后自动上传云端覆盖空数据
- ✅ 已修复待办截止时间显示：新增 deadlineManuallySet 标记，只有编辑时修改了 deadline 才标记为 true
- ✅ 已补齐 applyCrossDateMeetingScopedUpdate 和 getCrossDateMeetingUpdatePayload 方法
- ✅ 已增加数据丢失保护：downloadFromCloud / silentSyncFromCloud 在本地≥5条且云端不足30%时阻止覆盖
- ✅ 自动备份数量从 5 提升到 20
- ✅ 已完成 node --check 与 diagnostics 0 错误
- ✅ 已提交推送 `b155645` 到 origin/main
- 🔄 待线上强刷验证 P3-46

### 本轮关键改动
- db.js：新增 putItem（按主键 upsert）、deleteItemsByHashes（按 hash 集合清理多余项）
- sync.js：downloadFromCloud / mergeData / silentSyncFromCloud 全部改用 putItem 替代 clearAllItems+addItem
- sync.js：getItemKey 新增 todo:recurring 和 doc:recurring 键类型，document 键不再含 item.id
- sync.js：importFromFile 导入前设 isSyncing=true 阻止并发同步，导入后 recordLocalModify + uploadToCloud
- sync.js：smartSync 情况2增加云端空数据保护，downloadFromCloud/silentSyncFromCloud 增加数据量比保护
- sync.js：autoBackupBeforeSync 备份数量 MAX_BACKUPS 从 5 提升到 20
- app.js：saveItem 编辑待办时对比 deadline 变化，变化则标记 deadlineManuallySet=true
- app.js：待办卡片截止时间显示和通知栏提醒均增加 deadlineManuallySet 过滤条件
- app.js：新增 applyCrossDateMeetingScopedUpdate 和 getCrossDateMeetingUpdatePayload 方法
- index.html / app.js：版本提升到 P3-46，资源 query 提升

### 事故复盘（P3-46 事故级修复）
- 根因1：sync.js 中 downloadFromCloud / mergeData / silentSyncFromCloud 使用 clearAllItems() + addItem() 模式，每次同步后所有事项 ID 变化，导致编辑/删除报"事项不存在"
- 根因2：getItemKey 对 document 类型使用 item.id 作为键的一部分，同步后 ID 变化导致去重失效，周期性办文被重复创建
- 根因3：用户删除重复项后触发 smartSync，此时本地已清空 → downloadFromCloud → 云端也被清空
- 根因4：importFromFile 导入后未暂停同步，smartSync 立即触发并把空数据覆盖回去
- 教训：同步链路绝对不能使用"清空+重建"模式，必须保留已有 ID；导入备份必须暂停同步并主动上传覆盖云端

### 验证结果
- node --check js/app.js 通过
- node --check js/sync.js 通过
- app.js diagnostics 0 错误
- sync.js diagnostics 0 错误

### 遗留事项
- 待线上强刷验证 P3-46
- 待在导入备份后确认数据是否正确恢复并同步到云端
- 待确认跨日期会议单独更新某天状态是否正常
- 待确认待办截止时间显示是否只对手动修改的生效

## 2026-04-28 P3-44

### 本次目标
- 修复和风天气 Key 跨设备同步后在其他设备无法恢复使用的问题
- 修复待办事项达到截止时间后通知栏未闪烁提醒的问题
- 优化手机端在 WiFi 环境下相较蜂窝网络自动实时同步恢复较差的问题
- 完成本地校验、提交推送与线上强刷复测

### 当前状态
- ✅ 已定位和风 Key 跨设备恢复失败根因：密文 `qweather_api_key_encrypted` 虽已同步，但解密依赖的 `crypto_master_key` 未同步，导致换设备后无法解密
- ✅ 已在 `sync.js` 的 settings 打包、云端下载恢复、云端合并恢复路径中补齐 `crypto_master_key` 同步与本机恢复
- ✅ 已定位待办提醒未闪烁根因：提醒逻辑读取 `this.items`，但 `app-date-view.js` 的 `loadItems()` 未将最新事项列表回填给 `app`
- ✅ 已在 `app-date-view.js` 中补 `this.app.items = items`，到期待办现可正确驱动通知栏闪烁与轮播
- ✅ 已增强移动端实时同步恢复链路：补充 `visibilitychange`、`online`、`focus`、`pageshow` 触发的重连与智能同步
- ✅ 已为 Supabase 实时通道补充异常后自动重连、静默同步回补，并将定时同步周期缩短至 20 秒，改善手机 WiFi 下通道休眠后的恢复表现
- ✅ 已完成 `node --check js/app.js`、`node --check js/sync.js`
- ✅ 已完成 `app.js` / `sync.js` / `app-date-view.js` / `style.css` / `index.html` diagnostics 0 错误
- ✅ 已将部署版本提升为 `2026-04-28 P3-44`，并同步提升 `sync.js?v=32`、`app-date-view.js?v=10`、`app.js?v=123`
- ✅ 已提交并推送 `66dac0d fix: 修复同步恢复与待办提醒` 到 `origin/main`
- ✅ 已线上强刷确认 `https://kimixpf1.github.io/officeboard/` 命中 `P3-44`、`sync.js?v=32`、`app-date-view.js?v=10`、`app.js?v=123`
- 🔄 当前线上页面在未登录状态下会因本机未配置和风 Key 而回退到 Open-Meteo，尚需在真实登录/跨设备场景下继续验证和风 Key 恢复、待办截止提醒闪烁与手机 WiFi 自动同步

### 本轮关键改动
- sync.js：`buildSyncData()` 新增同步 `crypto_master_key`，确保换设备后可解密已同步的和风天气密钥密文
- sync.js：云端下载恢复、云端合并恢复时同步回写 `crypto_master_key`、`qweather_api_key_encrypted`、`qweather_api_key_set`
- sync.js：新增生命周期同步绑定、实时通道异常重连、静默回补与更高频定时同步
- app-date-view.js：`loadItems()` 新增 `this.app.items = items`，确保待办提醒逻辑拿到当前事项数据
- app.js：延续既有通知栏提醒逻辑，无需额外改结构，改由修正数据源恢复提醒生效
- index.html / app.js：部署版本更新到 `P3-44`，资源 query 提升到 `sync.js?v=32`、`app-date-view.js?v=10`、`app.js?v=123`

### 验证结果
- `node --check js/app.js` 通过
- `node --check js/sync.js` 通过
- `app.js` diagnostics 0 错误
- `sync.js` diagnostics 0 错误
- `app-date-view.js` diagnostics 0 错误
- `style.css` diagnostics 0 错误
- `index.html` diagnostics 0 错误

### 遗留事项
- 待在真实登录/跨设备场景下验证和风 Key 跨设备恢复是否稳定
- 待在存在已到期未完成待办的数据下验证通知栏闪烁、轮播与完成后停止提醒链路
- 待在真实手机 WiFi 前台恢复场景下继续观察自动同步链路是否稳定

## 2026-04-28 P3-43

### 本次目标
- 将和风天气 Key 的跨设备同步恢复补齐到所有关键链路
- 为待办事项补充截止时间显示、到期后顶部通知框闪烁提醒，以及完成后自动停止提醒
- 完成本地校验、提交推送与线上强刷复测

### 当前状态
- ✅ 已确认 `sync.js` 中打包 settings、云端下载恢复与云端合并恢复路径都已统一补上 `qweather_api_key_encrypted` 与 `qweather_api_key_set`
- ✅ 已确认待办 `deadline` 现有数据结构可直接复用，无需新增 schema
- ✅ 已在 `app.js` 为待办卡片渲染截止时间，并为到期未完成待办接入顶部通知框闪烁提醒
- ✅ 已支持多条到期待办在通知框轮播，且完成待办后立即停止对应提醒
- ✅ 已保持原有倒数日提醒链路，只有在存在到期待办时才切换为待办提醒
- ✅ 已完成 `node --check js/app.js`、`node --check js/sync.js`
- ✅ 已完成 `app.js` / `sync.js` / `style.css` / `index.html` diagnostics 0 错误
- ✅ 已确认部署版本显示为 `2026-04-28 P3-43`，资源版本命中 `sync.js?v=31`、`app.js?v=122`
- 🔄 待提交并推送到 `origin/main`
- 🔄 待线上强刷复测 `https://kimixpf1.github.io/officeboard/`

### 本轮关键改动
- sync.js：`buildSyncData()` 增补和风天气密钥密文与已设置标记的稳定打包
- sync.js：云端下载恢复与云端合并恢复时，统一回写 `qweather_api_key_encrypted` 与 `qweather_api_key_set`
- app.js：初始化后启动待办截止提醒轮询，确保通知框按秒刷新闪烁态与轮播内容
- app.js：`updateCountdownNotice()` 改为优先显示到期未完成待办提醒，无到期待办时回退原倒数日提醒
- app.js：待办卡片新增截止时间展示；待办完成时同步写入 `completedAt`
- css/style.css：新增通知框待办提醒态、闪烁态与待办截止时间强调样式

### 验证结果
- `node --check js/app.js` 通过
- `node --check js/sync.js` 通过
- `app.js` diagnostics 0 错误
- `sync.js` diagnostics 0 错误
- `style.css` diagnostics 0 错误
- `index.html` diagnostics 0 错误

### 遗留事项
- 待提交并推送 `P3-43` 到 `origin/main`
- 待线上强刷验证是否已命中 `app.js?v=122` 与 `sync.js?v=31`
- 待在线上验证和风 Key 跨设备恢复、待办截止提醒闪烁与完成后停止提醒链路是否稳定

## 2026-04-28 P3-42

### 本次目标
- 将当前天气服务从 Open-Meteo 切换为和风天气
- 使用用户提供的和风天气 API Key，并尽量保护密钥隐私，不把明文写入代码
- 保持现有顶部天气、天气面板、城市切换与自动刷新链路不变
- 完成本地校验、提交推送与线上强刷复测

### 当前状态
- ✅ 已确认当前项目仍是纯静态站点，无法做到服务端私有保管密钥，只能采用“本机加密存储 + 浏览器请求带鉴权头”的折中方案
- ✅ 已与用户确认先采用本机加密接入方案，不等待服务端代理
- ✅ 已在 `crypto.js` 扩展通用敏感信息加密存取能力，支持按 secretName 加密保存与读取
- ✅ 已在 `app.js` 将天气数据请求由 Open-Meteo 切换到和风天气 `weather/now` 与 `weather/3d`
- ✅ 已将天气图标与天气文案映射改为适配和风天气 icon code
- ✅ 已将天气预设城市统一收敛到 `weatherPresetCities`，避免多处坐标定义分叉
- ✅ 已在 `sync.js` 将和风天气加密密钥字段与已设置状态纳入 settings 同步结构
- ✅ 已将部署版本提升为 `2026-04-28 P3-42`，并同步提升 `sync.js?v=30`、`app.js?v=121`
- ✅ 已收到用户提供的专属 API Host：`n55ctw84yb.re.qweatherapi.com`
- ✅ 已切换天气请求 Host 到用户专属和风域名，并完成本地天气链路验证
- ✅ 已完成 `node --check js/app.js`、`node --check js/sync.js`、`node --check js/crypto.js`
- ✅ 已完成 `app.js` / `sync.js` / `crypto.js` / `index.html` diagnostics 0 错误
- 🔄 待提交并推送到 `origin/main`
- 🔄 待线上强刷复测 `https://kimixpf1.github.io/officeboard/`

### 本轮关键改动
- crypto.js：新增 `secureStoreSecret(secretName, secretValue)`、`secureGetSecret(secretName)`、`hasSecret(secretName)`、`clearSecret(secretName)` 通用加密接口
- crypto.js：原 Kimi 专用安全接口改为复用通用 secret 接口，避免重复逻辑
- app.js：`fetchWeather(...)` 改为调用和风天气 `weather/now` 与 `weather/3d`
- app.js：天气请求改为从 `cryptoManager.secureGetSecret('qweather_api_key')` 读取加密后的本机密钥，不在代码中硬编码明文 key
- app.js：天气请求 Host 已从公共域名切换为用户专属 Host `https://n55ctw84yb.re.qweatherapi.com`
- app.js：`getWeatherIcon()` 与 `getWeatherDesc()` 从 Open-Meteo code 映射切换为和风天气 code 映射
- app.js：新增统一 `weatherPresetCities` 成员供默认天气与城市切换共用
- sync.js：同步 settings 中新增 `qweather_api_key_encrypted` 与 `qweather_api_key_set`
- app.js / index.html：部署版本提升到 `P3-42`，资源 query 更新到 `sync.js?v=30`、`app.js?v=121`、`crypto.js?v=16`

### 隐私与安全说明
- 本轮没有把和风天气 API Key 写入代码文件
- 本轮方案会把 key 以加密后的密文形式存储到本机 IndexedDB settings 中
- 由于项目是纯静态站点，浏览器在请求和风天气接口时仍需携带鉴权信息，因此“网络请求中对当前浏览器可见”这一点无法彻底避免
- 若后续需要做到真正服务端私有密钥，必须新增服务端代理层

### 验证结果
- `node --check js/app.js` 通过
- `node --check js/sync.js` 通过
- `node --check js/crypto.js` 通过
- `app.js` diagnostics 0 错误
- `sync.js` diagnostics 0 错误
- `crypto.js` diagnostics 0 错误
- `index.html` diagnostics 0 错误
- 本地浏览器验证通过：
  - `js/crypto.js?v=16`、`js/sync.js?v=30`、`js/app.js?v=121` 命中最新资源
  - 和风天气 `weather/now` 与 `weather/3d` 请求均返回 200
  - 顶部天气正常显示：`苏州 🌧️ 15° 今天 11~16° 周三 6~12° 周四 9~18°`
  - 控制台无新的天气报错

### 遗留事项
- 待提交并推送 `P3-42` 到 `origin/main`
- 待线上强刷验证是否命中 `app.js?v=121` 与 `sync.js?v=30`
- 待确认和风天气实时与明后天天气是否更贴近用户体感

## 2026-04-28 P3-41

### 本次目标
- 将默认天气定位从苏州市级通用坐标调整为更贴近用户上班位置的姑苏区三香路附近坐标
- 保持现有 Open-Meteo 天气链路不变，优先通过更精确坐标缩小与手机天气的偏差
- 完成本地校验、提交推送与线上强刷复测

### 当前状态
- ✅ 已确认当前天气链路仍使用 Open-Meteo，默认苏州坐标与城市选择器中的苏州预设都指向同一组通用市级坐标
- ✅ 已将默认苏州天气坐标调整为更贴近姑苏区三香路的 `31.292622, 120.599489`
- ✅ 已同步更新天气城市选择器中的苏州预设坐标，确保手动切换回苏州时继续使用新坐标
- ✅ 已将部署版本提升为 `2026-04-28 P3-41`，并同步提升 `app.js?v=120`
- ✅ 已完成 `node --check js/app.js` 与 `app.js` / `index.html` diagnostics 0 错误
- 🔄 待提交并推送到 `origin/main`
- 🔄 待线上强刷复测 `https://kimixpf1.github.io/officeboard/`

### 本轮关键改动
- app.js：`loadWeather(...)` 的苏州默认回退坐标由 `31.2989, 120.5853` 调整为 `31.292622, 120.599489`
- app.js：天气坐标兜底分支同步切换到姑苏区三香路附近坐标，避免无效缓存回退到旧点位
- app.js：`showCitySelector()` 中的苏州预设坐标同步更新，手动切换城市时保持一致
- app.js：部署版本提升为 `2026-04-28 P3-41`，资源声明同步提升到 `app.js?v=120`
- index.html：入口脚本 query 提升为 `js/app.js?v=120`

### 验证结果
- `node --check js/app.js` 通过
- `app.js` diagnostics 0 错误
- `index.html` diagnostics 0 错误

### 遗留事项
- 待提交并推送 `P3-41` 到 `origin/main`
- 待线上强刷验证是否已命中 `app.js?v=120`
- 待继续观察姑苏区三香路附近默认坐标下的今天 / 明后天天气是否更贴近用户体感

## 2026-04-27 P3-40

### 本次目标
- 修复天气城市旧缓存触发的 `JSON解析失败` 警告
- 修复退出登录后本地仍残留倒数日、日程、备忘等数据的问题
- 继续保证待办事项完成时间显示生效，且不影响会议、办文与同步主链路
- 完成本地校验、提交推送与线上强刷复测

### 当前状态
- ✅ 已定位天气告警根因：`office_weather_city` 同时被当字符串与 JSON 结构读取，旧缓存值会触发解析警告
- ✅ 已兼容旧字符串天气城市缓存，并在读取后静默迁移为新结构，避免继续出现 `JSON解析失败`
- ✅ 已在退出登录时补充本地清理：待办 / 会议 / 办文、倒数日、日程、备忘、通讯录、快捷方式、工具缓存与天气城市缓存
- ✅ 已在登出后主动刷新链接、工具、通讯录、倒数日面板、天气摘要、日程、备忘与事项列表，避免旧账号界面残留
- ✅ 已将部署版本提升为 `2026-04-27 P3-40`，并同步提升 `app.js?v=119`
- ✅ 已完成 `node --check js/app.js` 与 `app.js` / `index.html` diagnostics 0 错误
- 🔄 待提交并推送到 `origin/main`
- 🔄 待线上强刷复测 `https://kimixpf1.github.io/officeboard/`

### 本轮关键改动
- app.js：`loadWeather(...)` 兼容 `office_weather_city` 的旧字符串缓存，优先映射到预设城市并静默写回 JSON 结构
- app.js：`handleLogout()` 增补本地清理范围，覆盖 `clearAllItems()` 与 memo / schedule / contacts / links / countdown / weather 等本地 key
- app.js：退出后立即刷新链接、工具、通讯录、倒数日面板、天气摘要、日程、备忘与事项列表，避免旧数据继续显示
- app.js：部署版本提升为 `2026-04-27 P3-40`，资源声明同步提升到 `app.js?v=119`
- index.html：入口脚本 query 提升为 `js/app.js?v=119`

### 验证结果
- `node --check js/app.js` 通过
- `app.js` diagnostics 0 错误
- `index.html` diagnostics 0 错误

### 遗留事项
- 待提交并推送 `v5.36` 到 `origin/main`
- 待线上强刷验证是否已命中 `app.js?v=181`

---

## v5.36（2026-05-06）

### 修复内容
1. **编辑待办不再误新增**：`editItem()` 写入 `modal.dataset.mode='edit'` + `modal.dataset.itemId` 双保险；`saveItem()` 兜底读取 dataset，即使隐藏字段 `#itemId` 被重置也能按原记录更新，不再悄悄走新增分支
2. **AI 识别 loading 不挤布局**：`parseNaturalLanguage()` 和文件上传流程中的长文案（"正在使用AI解析..."、"正在分析内容..."、"正在解析..."）统一替换为短图标 `🔄`，顶部 AI 输入框和菜单栏在识别过程中不再被挤压变形

### 修改文件
- `js/app.js`：editItem 加 dataset 双保险、saveItem 兜底读 dataset、AI loading 文案替换
- `index.html`：资源戳 app.js?v=181

### 验证清单
- [ ] 编辑已有待办事项，保存后原记录更新，不新增
- [ ] 新增待办事项仍正常新增
- [ ] 点击 AI 解析按钮，顶部输入框宽度不变，只显示旋转图标
- [ ] 上传图片/PDF 识别时，顶部布局不跳动
- [ ] 手机端和桌面端均正常
