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
- ✅ 已在登出后主动刷新链接、工具、通讯录、倒数日、天气与事项列表，避免旧账号界面残留
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
