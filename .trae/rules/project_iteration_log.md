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

## 2026-04-26 P3-38

### 本次目标
- 修复电脑端首屏卡住、自动登录恢复不稳定的问题
- 修复跨设备实时同步不及时、偶发重复事项的问题
- 修复手机端底部版权 / 部署版本号缺失的问题
- 修复顶部天气必须手动点击才更新的问题
- 处理 GitHub Pages 缓存导致的入口资源混合版本问题
- 完成本地模拟验证、提交推送与线上强刷复测

### 当前状态
- ✅ 已确认 `app.js` 中部署版本已提升为 `2026-04-26 P3-38`，并同步声明 `style.css?v=50`、`sync.js?v=29`、`app.js?v=117`
- ✅ 已修复 `index.html` 入口资源引用未完全更新的问题，本地文件现已命中 `style.css?v=50`、`sync.js?v=29`、`app.js?v=117`
- ✅ 已完成 `node --check js/app.js`、`node --check js/sync.js` 与 `index.html` / `app.js` / `sync.js` diagnostics 0 错误
- ✅ 已完成本地桌面端静态服务验证：页面正常渲染，顶部天气自动加载，网络请求命中最新资源 query
- ✅ 已完成本地移动端 `390x844` 模拟验证：底部版权与部署版本可见，网络请求命中最新资源 query
- ✅ 已确认移动端控制台仅有一条 `JSON解析失败` 警告，来源于天气城市本地存储脏值，不影响当前页面渲染与主链路
- 🔄 待提交并推送到 `origin/main`
- 🔄 待对线上页面执行强刷复测，核对 GitHub Pages 是否已切换到 `P3-38`

### 本轮关键改动
- app.js：保留“先渲染主界面、后异步衔接同步初始化”的启动链路，恢复自动登录体验并避免首屏阻塞
- sync.js：补强 `getSession()`、`onAuthStateChange(...)`、1 分钟定时同步与 realtime 订阅重建逻辑，缩短跨设备同步延迟并减少重复同步风险
- style.css：移动端不再隐藏版权区，确保手机端也显示版权与部署版本号
- app.js：顶部天气在初始化时立即刷新，并增加定时自动刷新逻辑
- index.html：修正入口资源 query，统一加载 `style.css?v=50`、`sync.js?v=29`、`app.js?v=117`
- app.js：部署版本徽标提升为 `2026-04-26 P3-38`，并同步展示资源版本数组

### 验证结果
- `node --check js/app.js` 通过
- `node --check js/sync.js` 通过
- `index.html` / `app.js` / `sync.js` diagnostics 0 错误
- Chrome DevTools 本地桌面验证通过：
  - 页面标题、页脚版本、天气摘要均正常显示
  - 请求命中 `css/style.css?v=50`
  - 请求命中 `js/sync.js?v=29`
  - 请求命中 `js/app.js?v=117`
- Chrome DevTools 本地移动端验证通过：
  - 视口 `390x844` 下版权与部署版本可见
  - 请求命中 `css/style.css?v=50`
  - 请求命中 `js/sync.js?v=29`
  - 请求命中 `js/app.js?v=117`

### 遗留事项
- 待提交并推送 `P3-38` 到 `origin/main`
- 待线上强刷验证 `https://kimixpf1.github.io/officeboard/` 是否已加载 `P3-38`
- 待继续观察天气城市旧缓存值引发的 `JSON解析失败` 警告是否需要后续做静默兜底清洗

## 2026-04-24 P3-31 事故（已回退）

### 事故经过
- 实施了"周/月视图拖拽延伸时间"功能，修改了 `calendar.js`、`app.js`、`style.css`、`index.html`
- 推送上线后，用户反馈周期性办文消失、跨日期办文找不到了
- 立即 `git revert` 回退到 P3-30 并推送，线上恢复为 P3-30
- 但 IndexedDB 数据已丢失（仅剩 1 条），云端数据也为空，数据无法恢复

### 根因分析
- `calendar.js` 的 `createCalendarItem` 中对所有卡片设置了 `el.style.position = 'relative'`，不仅限于跨日期事项
- 修改了月视图 `month-cell` 的 `dataset.date` 赋值逻辑（从 `fullDateLabel` 改为 `dateStr`），可能影响了其他依赖该字段的功能
- click 事件中增加了 `e.target.closest('.calendar-item-extend-handle')` 拦截，虽然理论上不影响逻辑但增加了复杂度
- **上线前未用真实数据做全量回归验证**，只在空数据环境下检查了语法和基本渲染
- 数据丢失的具体触发点未能确定，可能不是本次改动直接导致，而是之前某次同步或渲染异常间接引发

### 教训沉淀（已写入 project_rules.md 数据安全铁律）
- 渲染层改动绝不碰数据字段（`dataset.date`、`dayStates`、`endDate` 等）
- 上线前必须用真实数据校验 IndexedDB 事项总数
- 新增功能必须与既有数据完全隔离，不得修改既有卡片的任何属性
- 推送后立即线上验证数据完整性，发现异常立即 revert
