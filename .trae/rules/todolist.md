# Todolist

## 当前轮次目标
- 彻底修复同账号跨设备删除/新增后无法实时同步，刷新后旧事项回流的问题
- 收敛上传、下载、静默同步三条事项同步链路，统一按最终状态对齐本地与云端
- 完成本地校验、提交推送与线上强刷复测

## 当前待办
- 🔄 待验证同账号双设备场景：设备 1 删除/新增后，设备 2 是否可实时收敛且刷新后不回流
- 待完成本地语法检查、diagnostics、git 提交推送与线上强刷复测

## 已完成（本轮 v4.64）
- ✅ 已定位跨设备删除回流根因：`smartSync()`、`uploadToCloud()`、`downloadFromCloud()`、`silentSyncFromCloud()` 四条链路对“云端缺失项”与“本地缺失项”的处理策略不一致
- ✅ 已修复上传链路：`uploadToCloud()` 改为先读取云端当前事项，再用统一对账逻辑生成最终 items，避免设备 1 删除后被设备 2 旧数据重新拼回
- ✅ 已修复智能同步链路：`smartSync()` 不再按数量变化粗暴增删，改为基于统一对账结果刷新本地，并在存在本地修改时上传最终收敛结果
- ✅ 已修复下载/静默下载链路：`downloadFromCloud()` 与 `silentSyncFromCloud()` 改为统一使用 `syncLocalItemsToState()`，确保删除、修改、新增三种变化都按最终状态完整落地
- ✅ 已新增同步辅助方法：`getTimeMs()`、`getItemUpdatedTime()`、`findMatchingItem()`、`buildReconciledItems()`、`syncLocalItemsToState()`，统一按稳定键与更新时间对账
- ✅ 已将部署版本提升为 `2026-04-29 v4.64`，资源版本提升到 `sync.js?v=44`、`app.js?v=144`

## 已完成（本轮 P3-44）
- ❌ P3-31 "周/月视图拖拽延伸时间"功能导致周期性办文消失、跨日期办文丢失
- ✅ 已 git revert 回退到 P3-30 并推送，线上已恢复
- ❌ IndexedDB 和云端数据已丢失，无法恢复
- ✅ 已将数据安全铁律写入 project_rules.md

## 已完成（本轮 P3-44）
- ✅ 已定位和风 Key 跨设备恢复失败根因：仅同步了 `qweather_api_key_encrypted`，但未同步解密所需的 `crypto_master_key`
- ✅ 已在 `sync.js` 的 settings 打包、云端下载恢复、云端合并恢复链路中补齐 `crypto_master_key` 同步与本机恢复
- ✅ 已修复待办截止提醒未闪烁根因：`app.items` 未在事项加载后回填，导致提醒计算始终拿不到最新待办列表
- ✅ 已在 `app-date-view.js` 的 `loadItems()` 中回填 `this.app.items = items`，确保通知栏提醒与当前视图事项数据一致
- ✅ 已增强 Supabase 实时同步稳定性：补充前台恢复、`online/focus/pageshow/visibilitychange` 触发重连与静默同步，缩短定时同步间隔到 20 秒
- ✅ 已补充实时通道异常后的自动重连与静默拉取，改善手机 WiFi 场景下实时通道休眠后的恢复速度
- ✅ 已完成 `node --check js/app.js`、`node --check js/sync.js`
- ✅ 已完成 `app.js` / `sync.js` / `app-date-view.js` / `style.css` / `index.html` diagnostics 0 错误
- ✅ 已将部署版本提升为 `2026-04-28 P3-44`，并同步提升 `sync.js?v=32`、`app-date-view.js?v=10`、`app.js?v=123`

## 已完成（本轮 P3-43）
- ✅ 已补全和风天气 Key 的跨设备同步恢复链路，`buildSyncData()`、云端下载与云端合并恢复路径均已统一处理 `qweather_api_key_encrypted` 与 `qweather_api_key_set`
- ✅ 已为待办卡片补充截止时间展示，未完成待办会显示 `M/D HH:mm截止`
- ✅ 已为到期未完成待办接入顶部通知框提醒，支持红色闪烁、超时文案与多条到期待办轮播
- ✅ 已在待办点击“已完成”时同步写入 `completedAt`，并立即停止对应提醒
- ✅ 已让通知框优先显示待办到期提醒，无到期待办时自动回退到原倒数日提醒逻辑
- ✅ 已完成 `node --check js/app.js`、`node --check js/sync.js`
- ✅ 已完成 `app.js` / `sync.js` / `style.css` / `index.html` diagnostics 0 错误
- ✅ 已将部署版本提升为 `2026-04-28 P3-43`，并同步确认 `sync.js?v=31`、`app.js?v=122`、`crypto.js?v=16`

## 已完成（本轮 P3-42）
- ✅ 已将天气接口由 Open-Meteo 切换为和风天气 `weather/now` + `weather/3d`
- ✅ 已复用 `crypto.js` 扩展通用敏感信息加密存取能力，支持按 keyName 加密保存，不把和风天气 key 写进代码
- ✅ 已将天气预设城市收敛为统一 `weatherPresetCities`，避免多处坐标源分叉
- ✅ 已将和风天气加密 key 纳入同步设置结构，支持跨设备同步加密后的密钥密文与已设置状态
- ✅ 已将和风天气请求 Host 切换为用户提供的专属 Host `n55ctw84yb.re.qweatherapi.com`
- ✅ 已完成本地 weather 链路验证：和风天气 `weather/now` 与 `weather/3d` 均返回 200，顶部天气已正常显示苏州实时与三天天气
- ✅ 已完成 `node --check js/app.js`、`node --check js/sync.js`、`node --check js/crypto.js`
- ✅ 已完成 `app.js` / `sync.js` / `crypto.js` / `index.html` diagnostics 0 错误
- ✅ 已将部署版本提升为 `2026-04-28 P3-42`，并同步提升 `sync.js?v=30`、`app.js?v=121`、`crypto.js?v=16`

## 已完成（本轮 P3-41）
- ✅ 已将默认苏州天气坐标从通用市级点位调整为更贴近姑苏区三香路的 `31.292622, 120.599489`
- ✅ 已同步更新天气城市选择器中的苏州预设坐标，确保手动切换回苏州时仍使用新坐标
- ✅ 已将部署版本提升为 `2026-04-28 P3-41`，并同步提升 `app.js?v=120`
- ✅ 已完成 `node --check js/app.js` 与 `app.js` / `index.html` diagnostics 0 错误

## 已完成（本轮 P3-40）
- ✅ 已兼容 `office_weather_city` 旧字符串缓存，避免再触发天气城市 `JSON解析失败` 警告
- ✅ 已在退出登录时补充本地清理：待办 / 会议 / 办文、倒数日、日程、备忘、通讯录、快捷方式、工具缓存与天气城市缓存
- ✅ 已在登出后主动刷新链接、工具、通讯录、倒数日、天气与事项列表，避免旧数据继续显示
- ✅ 已将部署版本提升为 `2026-04-27 P3-40`，并同步提升 `app.js?v=119`
- ✅ 已完成 `node --check js/app.js` 与 `app.js` / `index.html` diagnostics 0 错误

## 已跳过
- 暂不在本轮继续拆分 OCR、同步、表单弹窗等高耦合链路
- 暂不在本轮引入数据库 schema 变更或同步协议大改
- 暂不在本轮引入服务端天气代理，先采用“静态站点 + 本机加密存储 + 浏览器请求带鉴权头”的方案

## 下一步
- 已完成提交推送与线上强刷命中验证；下一步重点转为真实登录/跨设备场景验证和风 Key 恢复、待办截止提醒闪烁与手机 WiFi 下自动同步链路
- 继续观察实时通道断开后的自动重连、前台恢复同步与待办提醒轮播是否稳定
