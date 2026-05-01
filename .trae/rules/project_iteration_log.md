## 2026-05-01 v5.2~v5.5

### 本次目标
- 修复周视图点击今天跳转闪烁问题
- 让 today() 走与切换周完全一致的渲染路径，不添加额外滚动

### 当前状态
- ✅ v5.2：新增 `_scrollToTodayAfterRender` 标志，renderWeekView 末尾根据标志决定滚动目标
- ✅ v5.3：将 `scrollIntoView` 的 `behavior` 从 `smooth` 改为 `instant`，减少动画过渡
- ✅ v5.4：today 场景下改为同步执行 scrollIntoView，不用 requestAnimationFrame
- ✅ v5.5：彻底去掉 `today()` 中多余的 `_scrollToTodayAfterRender` 和额外滚动逻辑，与切换周保持完全一致
- ✅ 已将部署版本提升为 `2026-05-01 v5.5`
- ✅ 已完成 node --check 与 diagnostics 0 错误
- 🔄 待线上强刷验证

### 本轮关键改动
- calendar.js：`today()` 简化为只设 `currentDate` + `render()`，不再添加任何额外滚动
- calendar.js：`renderWeekView` 和 `renderMonthView` 末尾去掉 `_scrollToTodayAfterRender` 分支，统一走原有滚动路径

### 遗留事项
- 待线上强刷验证周视图 today 与切换周行为一致

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
- 待提交并推送 `P3-40` 到 `origin/main`
- 待线上强刷验证是否已命中 `app.js?v=119`
- 待在线上继续观察退出登录清理链路与天气缓存兼容逻辑是否稳定
