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
