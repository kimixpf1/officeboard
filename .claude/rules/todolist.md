# Todolist

## 已跳过
- 暂不在本轮拆分 OCR、同步、表单弹窗等高耦合链路

---

## 进行中：app.js 拆分（v5.59 起）

**回退点：** `pre-split-baseline` tag → `git reset --hard pre-split-baseline` 一键恢复
**模式：** mixin（`Object.assign(OfficeDashboard.prototype, Module)`）
**铁律：** 每批拆完 → 语法检查 → 本地测试 → commit → push → 线上验证 → 下一批

### 第1批：倒数日面板 ✅
- [x] 新建 `js/panels/countdown.js`（22方法，760行）
- [x] app.js 删除对应方法（10470→9720）
- [x] index.html 加 script 标签（app.js 之前）
- [x] 语法检查 + 提交推送（`55c561d` v5.59）
- [x] 线上验证：刷新后确认倒数日面板正常、版本显示 v5.59

### 第2批：链接面板 ✅
- [x] 新建 `js/panels/links.js`（10方法，458行）
- [x] app.js 删除对应方法（9720→9270）
- [x] index.html 加 script 标签
- [x] 语法检查 + 提交推送（`1716114` v5.60）
- [x] 线上验证：刷新后确认链接面板正常、版本显示 v5.60

### 第3批：通讯录面板 ✅
- [x] 新建 `js/panels/contacts.js`（14方法，665行，含Excel导入+搜索高亮）
- [x] app.js 删除对应方法（9270→8613）
- [x] 语法检查 + 提交推送（`91c5c17` v5.61）
- [x] 线上验证：刷新后确认通讯录面板正常、版本显示 v5.61

### 第4批：工具+日程+备忘 ✅
- [x] 新建 `js/panels/tools.js`（11方法，389行）+ `js/panels/side-panels.js`（2方法，235行）
- [x] app.js 删除对应方法（8613→7552）
- [x] 语法检查 + 提交推送（`70771ae` v5.62）
- [x] 线上验证：工具面板展开/工具点击/计算器/倒计时正常；日程和备忘录面板展开/编辑/同步正常

### 第5批：天气模块 ✅
- [x] 新建 `js/weather.js`（6方法，449行——含和风+Open-Meteo双数据源+城市选择）
- [x] **修复**：第4批 sed 误删天气方法定义，本轮从 baseline 恢复并提取为独立模块
- [x] index.html 加 script 标签
- [x] 语法检查 + 提交推送（待提交）
- [ ] 线上验证：顶部天气+天气面板+城市切换正常

### 第6-8批：核心业务（后置，耦合紧）
- [ ] `js/core/recurring.js`（~500行）
- [ ] `js/core/cross-date.js`（~500行）
- [ ] `js/core/drag-drop.js` + `js/core/undo.js`（~550行）

### 第9批以后：AI + 右键 + 表单
- [ ] 最低优先级，耦合最紧

---

## 产品优化建议（待排期）
- 🔴 月视图日期点标记：彩色小圆点 + 点击弹出当天列表
- 🟡 跨日会议可视化：周/月视图横条展示跨天会议
- 🟡 会议提醒提前通知
- 🟡 loadItems 防抖合并
- 🟡 console.log 生产环境静默
- 🟢 周视图拖拽改会议时长
- 🟢 颜色标签自定义
- 🟢 定时器合并
- 🔵 周视图显示周数
- 🔵 app.js 按功能域拆分（当前进行中）

## 长期待执行
- 🔴 PDF 部门名称误判为地点
- 🔴 Supabase CDN 本地化
- 🔴 参会人关联准确性
