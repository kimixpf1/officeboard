## 2026-05-13 v5.2.92 日期标签方形卡片扩大4倍(160px)+三列不平移

### 改动内容
1. **卡片田字格全展开**：用户反馈82px卡片仅为设想框的左上1/4，现扩大至160px（4倍面积），字号翻倍
2. **三列不平移**：boardView padding-left 恢复原始24px，三列位置不动

### 当前状态
- ✅ 语法检查全部通过
- ✅ 已提交推送 `f7c53a7`

### 提交记录
- `f7c53a7` fix: 日期标签方形卡片扩大4倍(160px)+三列不平移 (v5.2.92)
- `ce46342` fix: 日期标签移至最左窄方形卡片+三列微右移 (v5.2.91)
- `f76a4ee` fix: 浅色主题header白字可读+日期标签居中卡片+下一场会议双行 (v5.2.90)

---

## 2026-05-13 v5.2.91 日期标签移至最左窄方形卡片+三列微右移

### 改动内容
1. **日期标签位置修正**：v5.2.90 居中卡片挡住会议列，现移至最左边 82px 窄方形卡片（`left:6px`），boardView padding-left 改为 115px，三列整体微右移避让
2. **窄方形卡片设计**：82px 宽紧凑卡片，日期/周三📷/统计/下一场全堆叠，字号缩小（9-12px），留扩展空间供后续堆叠运动数据等卡片
3. **响应式适配**：1024px 和 640px 断点重置 padding-left 和 width

### 当前状态
- ✅ 语法检查全部通过
- ✅ 已提交推送 `ce46342`

### 提交记录
- `ce46342` fix: 日期标签移至最左窄方形卡片+三列微右移 (v5.2.91)
- `f76a4ee` fix: 浅色主题header白字可读+日期标签居中卡片+下一场会议双行 (v5.2.90)

### 验证清单
- [ ] 窄方形卡片在最左边，不与待办列重叠
- [ ] 三列均不被卡片遮挡
- [ ] 办文列不碰到右侧折叠面板
- [ ] 浅色主题 header 文字清晰
- [ ] 下一场会议长标题换行正常
- [ ] 移动端/平板适配正常

---

## 2026-05-13 v5.2.90 浅色主题header白字可读+日期标签居中卡片+下一场会议双行

### 改动内容
1. **浅色主题header配色**：紫底渐变header上logo/时钟/天气/按钮全部改为白色，时钟天气加半透白底，解决紫色文字在紫色背景上完全不可见的问题。深色模式不动。
2. **日期标签居中卡片**：board-date-label 从 `position:absolute; left:24px` 改为 `left:50%; transform:translateX(-50%)` 居中定位，加白色卡片背景/边框/阴影/圆角，不再与第一列待办事项重叠。
3. **下一场会议双行显示**：从 `white-space:nowrap; text-overflow:ellipsis` 改为 `-webkit-line-clamp:2`，长标题自动换行到第二行，不再截断。

### 当前状态
- ✅ 语法检查全部通过
- ✅ Code review APPROVED（0C / 0H / 2M已修复1个）
- ✅ 已提交推送 `f76a4ee`

### 提交记录
- `f76a4ee` fix: 浅色主题header白字可读+日期标签居中卡片+下一场会议双行显示 (v5.2.90)

### 验证清单
- [ ] 浅色主题下header文字全部清晰可见（logo/时钟/天气/按钮）
- [ ] 深色主题header不受影响
- [ ] 日视图日期标签为居中白色卡片，不与待办列重叠
- [ ] 下一场会议长标题换行到第二行显示
- [ ] 移动端640px下日期标签正常显示
- [ ] 控制台无 JS 错误

---

## 2026-05-13 v5.2.89 日视图今日概览+日历日期圆点+周视图今天色条

### 改动内容
1. **日视图日期标签重设计**：board-date-label 从 3 行改为 4 行（日期 / 周三📷 / 统计 / 下一场），📷 融入"周三"同行
2. **今日概览统计**：`updateBoardSummary()` 统计当天未完成事项数量（如"3待办 · 2会议 · 1办文"），无事项显示"今日暂无安排"
3. **下一场会议**：`_refreshNextMeeting()` 接入 1 秒 tick 实时更新，显示"⏰ 14:30 局长办公会"，会议过了自动消失
4. **日历日期圆点**：周视图+月视图每个格子日期标签旁加彩色圆点（红=待办/蓝=会议/绿=办文），一眼看出哪几天有事
5. **周视图今天列顶部色条**：`.week-cell.today` 加 `border-top: 3px solid var(--primary-color)`，7 列中瞬间定位今天

### 当前状态
- ✅ 语法检查全部通过（calendar.js / app-date-view.js / app.js / countdown.js）
- ✅ Code review 通过（0C / 0H / 1M已修复 / 2L）
- ✅ 已提交推送 `20b76de`

### 提交记录
- `20b76de` feat: 日视图今日概览+日历日期圆点+周视图今天色条 (v5.2.89)

### 验证清单
- [ ] 日视图：日期标签 4 行显示正常（日期/周三📷/统计/下一场）
- [ ] 日视图：切换日期后统计和下一场自动更新
- [ ] 日视图：无事项时显示"今日暂无安排"
- [ ] 日视图：📷 截图按钮正常可用
- [ ] 周视图：今天列顶部有 3px 色条
- [ ] 周视图+月视图：有事日期旁显示彩色圆点
- [ ] 移动端：日期标签换行适配正常
- [ ] 深色模式：所有新增元素清晰可见
- [ ] 控制台无 JS 错误

---

## 2026-05-12 v5.2.88 闹钟通知栏✓按钮闪烁修复

### 改动内容
1. **闹钟✓按钮闪烁根因**：每秒 tick 中 `showAlarmNotice()` 加 `todo-reminder-flashing` class → `updateTodoReminderNotice()` 因无待办将其 toggle 移除 → 闪烁动画每秒启停
2. **修复1**：`updateTodoReminderNotice()` 开头加 `alarm-active` 守卫，闹钟激活时直接返回 false，不碰任何 class
3. **修复2**：`showAlarmNotice()` 加 `_shownAlarmId` 跟踪，同闹钟重复 tick 只更新倒计时文字，跳过 classList/按钮/badge 的冗余 DOM 写入
4. **修复3**（code-reviewer MEDIUM）：`initAlarmSystem()` 显式初始化 `_shownAlarmId = null`

### 当前状态
- ✅ 语法检查全部通过
- ✅ Code review APPROVED（0C / 0H / 1M已修复 / 1L）
- ✅ 模拟测试 6/6 PASS
- ✅ 已提交推送 `869eb27`

### 提交记录
- `869eb27` fix: 闹钟通知栏✓按钮闪烁——updateTodoReminderNotice alarm-active守卫+showAlarmNotice去冗余写入 (v5.2.88)

### 验证清单
- [ ] 闹钟触发时✓按钮不再闪烁
- [ ] 闹钟激活时待办提醒不会覆盖闹钟状态
- [ ] 闹钟切换时正常更新显示
- [ ] 关闭闹钟后状态正确清理
- [ ] 控制台无 JS 错误

---

## 2026-05-12 v5.2.87 闹钟/待办提醒持久化+主题简化+mergeAlarms修复

### 改动内容
1. **闹钟关闭后复活**：`_alarmDismissedAt`/`_dismissedAlarmId` 从内存改为 SafeStorage 持久化，刷新后不再丢失；过期后自动清理
2. **待办提醒关闭复活**：`_dismissedTodoReminderIds` 从 SafeStorage + DB `reminderDismissedAt` 双重恢复，刷新后不复活；关闭时同步持久化
3. **编辑闹钟刷新变回旧值**：`_mergeAlarms` 同 ID 冲突时加 5 秒本地保护 + `createdAt` 时间戳比较，替代旧"云端无条件赢"逻辑；`saveAlarms` 设 `_alarmsChangedAt` 时间戳
4. **主题简化**：移除 7 套浅色主题（天际蓝/青瓷/翠竹/玫瑰/中国红/琥珀/幻影紫），只保留浅色(靛青)+深色两种；themes.css 精简 171 行；深色完全不动
5. **loadTheme 兼容**：旧主题名自动回退 'default'

### 当前状态
- ✅ 语法检查全部通过
- ✅ Code review 通过（0C / 0H / 3M，1个M已修复）
- ✅ 已提交推送 `2e9256d`

### 提交记录
- `2e9256d` fix: 闹钟/待办提醒持久化+主题简化为2种+mergeAlarms时间戳+v5.2.87

### 验证清单
- [ ] 闹钟关闭后刷新页面 → 不再复活闪烁
- [ ] 待办提醒✓关闭后刷新 → 不复活，"已提前提醒"标记保留
- [ ] 编辑闹钟后刷新 → 不自动变回旧值
- [ ] 深色模式所有样式不变
- [ ] 浅色模式下所有文字（标题/按钮/输入框/弹窗）清晰可读
- [ ] 旧用户如果之前存了非 default/dark 主题 → 自动回退 default
- [ ] 控制台无 JS 错误

---

## 2026-05-12 v5.2.86 浅色主题可读性+主题切换sync竞争+复制周期性残留修复

### 改动内容
1. **浅色主题字看不清**：base.css `:root` 新增 `--text-primary: var(--gray-800)` / `--text-secondary: var(--gray-500)`，修复全项目大量使用的这两个变量从未定义的问题（暗色主题通过 gray 重映射自动适配）
2. **切换主题跳回旧配色**：sync.js 提取 `_applyCloudTheme()` 统一 5 处主题恢复逻辑，加 5 秒本地修改保护；app.js `setTheme()` 设 `_themeChangedAt` 时间戳，防止 sync 在 upload 完成前拉回旧值覆盖
3. **复制/移动事项变周期**：`_contextCopyTo()` 补删 `isRecurring`/`recurringRule`/`recurringCount`/`dayStates`，防止复制品继承原事项的周期性标记
4. **`_showDatePicker` innerHTML 安全加固**（MEDIUM）：title/defaultDate 加 `SecurityUtils.escapeHtml()` 防 XSS
5. **`saveAlarms()` 补 immediateSyncToCloud**（alarm.js）：防编辑闹钟后被 sync 拉旧数据覆盖
6. **layout.css 清理**：移除不再需要的 workaround CSS 规则
7. **scriptVersions 数组补全**：新增遗漏的 context-menu.js/alarm.js/idle-bar.js/pet-renderer.js 版本记录

### 当前状态
- ✅ 语法检查全部通过
- ✅ Code review 通过（0 CRITICAL / 0 HIGH / 1 MEDIUM已修复）
- ✅ 已提交推送 `7a8ee7e`

### 提交记录
- `7a8ee7e` fix: CSS变量修复+主题sync竞争+复制周期性残留+v5.2.86

### 验证清单
- [ ] 各浅色主题下按钮/弹窗/输入框文字清晰可读
- [ ] 切换主题后不跳回旧配色（等 5 秒观察）
- [ ] 复制非周期性事项到新日期 → 不显示 🔄 徽章
- [ ] 移动事项到新日期 → 类型不变
- [ ] 闹钟编辑后不自动变回旧值
- [ ] 控制台无 JS 错误

---

## 2026-05-12 v5.2.84 闹钟关闭交互修复+提醒时间手动标记

### 改动内容
1. **闹钟✓按钮不可见**：`.alarm-active` 补 `position: relative`，使绝对定位的✓按钮正确定位在通知栏内
2. **闹钟与闲时交替闪烁**：`updateCountdownNotice()` 开头加 `alarm-active` 守卫，外部数据事件不再覆盖闹钟状态
3. **闹钟通知栏点击无效**：`showAlarmNotice()` 绑定 click（关闭闹钟）/contextmenu（打开设置）处理器，✓按钮加 `stopPropagation`
4. **倒计时定时器覆盖闹钟文字**（code-reviewer MEDIUM）：`showAlarmNotice()` 清除 `countdownNoticeTimer`，避免每3秒被倒数日文字覆盖
5. **只改提醒时间不提醒**：新增 `reminderManuallySet` 标记，只改提醒时间（不改截止时间）也触发通知栏提醒；`saveItem()` 重构合并两次 `db.getItem` 为一次

### 当前状态
- ✅ 语法检查通过
- ✅ Code review 通过（0 CRITICAL / 0 HIGH / MEDIUM已修复）
- ✅ 已提交推送 `6d20c3a` + `d912cca`

### 提交记录
- `6d20c3a` fix: 闹钟✓按钮可见+点击关闭+闲时不交替闪烁 (v5.2.84)
- `d912cca` fix: 闹钟激活时清除倒计时定时器+提醒时间手动改过也触发通知栏 (v5.2.84)

### 验证清单
- [ ] 闹钟闪烁时✓按钮可见可点击
- [ ] 点击通知栏任意处关闭闹钟
- [ ] 右键通知栏打开闹钟设置
- [ ] 闹钟激活时闲时蓝框不出现
- [ ] 只改提醒时间（不改截止时间）也触发通知栏提醒
- [ ] 新增事项默认截止时间+默认提醒不触发提醒

---

## 2026-05-12 v5.2.83 主题FOUC+白字可读性+闹钟关闭修复

### 改动内容
1. **主题加载闪烁**：index.html `<head>` 加阻塞脚本通过 localStorage 预置 `data-theme`，CSS 加载前就设好主题
2. **白底白字可读性**：浅色主题 `--bg-primary` 保持纯白 `#fff`，仅 `--bg-secondary/tertiary` 淡色
3. **闹钟关闭**：关闭后记录 `_dismissedAlarmId`，3 分钟窗口内不重新激活；窗口 120s → 180s
4. **版本号**：v5.2.82 → v5.2.83

### 当前状态
- ✅ 语法检查通过
- ✅ 已提交推送 `b598dd2`

### 提交记录
- `b598dd2` fix: 主题FOUC闪+白底白字+闹钟关闭+版本v5.2.83

---

## 2026-05-12 v5.2.82 主题配色重设计+切换被覆盖修复

### 改动内容
1. **主题切换修复**：`setTheme()` 新增云端同步，避免切主题几秒后被云端旧值覆盖；`loadTheme()` 传入 `{sync:false}` 避免启动时无效请求
2. **8套浅色主题重设计**：每套有独立 `--bg-primary/secondary/tertiary`（~2%饱和度淡色）+ `--border-color` + card/panel 白色底
3. index.html app.js 版本号 v=215→v=216 对齐
4. CSS 拆分为 5 模块：base / layout / themes / components / responsive

### 当前状态
- ✅ 语法检查通过
- ✅ Code review 通过
- ✅ 已提交推送 `ac7f869`

### 提交记录
- `ac7f869` fix: loadTheme跳过云同步+app.js版本号对齐
- `0232366` fix: 主题切换被云端覆盖+主题配色重设计（v5.2.82）

---

## 2026-05-12 v5.2.81 通知栏颜色区分+待办自定义提前提醒

### 改动内容
1. **通知栏颜色修复**：`updateTodoReminderNotice()` 激活时移除 `idle-mode` 和 `alarm-active` class，避免蓝色/橙色渗入红色
2. **待办自定义提前提醒**：
   - 新增 `reminderAdvance`（提前分钟数）和 `reminderTime`（指定时刻 HH:MM）字段
   - HTML 表单新增提前提醒下拉（3分钟~3天）+条件时间选择（≥1天时显示）
   - `getTodoReminderItems()` 重构：读取每项自定义窗口，支持"提前N天+指定时刻"
   - 历史待办默认 3 分钟前提醒，兼容不变
3. **版本号**：v5.2.80 → v5.2.81

### 当前状态
- ✅ 语法检查通过
- ✅ Code review 通过（无 CRITICAL/HIGH）
- ✅ 已提交推送 `46df42e`

### 提交记录
- `46df42e` feat: 通知栏颜色区分+待办自定义提前提醒（v5.2.81）

### 验证清单
- [ ] 新建待办选"1天前+09:00" → 提前1天09:00起提醒
- [ ] 空闲态蓝色时待办提醒触发 → 通知栏变红色，无蓝色残留
- [ ] 闹钟橙色时待办提醒触发 → 通知栏变红色
- [ ] 历史待办（无reminderAdvance）→ 仍3分钟前提醒

---

## 2026-05-11 v5.2.80 宠物物种差异化造型重设计

### 改动内容
1. **pet-renderer.js v3**：SPECIES_PROFILES 定义6种物种独立造型参数
   - dog(点点/旺财)：垂耳+摇尾巴+腮帮毛
   - cat(小橘)：三角尖耳+卷尾巴+脸部胡须
   - panda(滚滚)：圆耳+黑眼圈+胖身体+小圆尾
   - fox(小灵)：大三角耳+超蓬松尾巴+尖吻部+胡须
   - rabbit(团团)：超长耳朵(22px)+棉花球尾巴
   - penguin(波波)：无耳+鸟喙+鳍状肢+白肚皮+橙足
   - 各物种独立身体比例(bodyRx/Ry)、头大小(headR)、腿/鳍状肢
2. **idle-bar.js**：petColorMap 每个宠物新增 species 字段，解构传入 PetRenderer
3. **渲染逻辑**：耳朵/尾巴/眼睛/鼻子/嘴全部按物种参数绘制
4. **版本号**：v5.2.79 → v5.2.80

### 当前状态
- ✅ 语法检查全部通过
- ✅ 已提交推送 `d9f8315`
- ✅ E2E 验证用户确认通过

### 提交记录
- `d9f8315` feat: 宠物物种差异化造型——6种动物独立设计（v5.2.80）
- `2bff8fd` fix: 宠物通知栏布局——Canvas左置+按钮竖排，恢复原宽度
- `8a4b234` fix: interactPet action映射——feed/water/walk映射为eat/drink/leash动画
- `61378df` feat: Canvas宠物动画大幅增强——120x100画布+道具可见+大范围动作+翻转修复（v5.2.79）

### E2E 验证清单
- 🔄 🐶 点点/旺财：垂耳+摇尾巴+腮帮毛
- 🔄 🐱 小橘：三角尖耳+卷尾巴+胡须
- 🔄 🐼 滚滚：圆耳+黑眼圈+胖身体+小尾巴
- 🔄 🦊 小灵：大三角耳+蓬松大尾+尖脸
- 🔄 🐰 团团：超长耳朵+棉花球尾巴
- 🔄 🐧 波波：无耳+喙+鳍状肢+白肚皮
- 🔄 交互动作正常
- 🔄 控制台无JS错误

---

## 2026-05-11 v5.2.79 Canvas宠物动画大幅增强（120x100画布+道具可见+动作映射修复）

### 改动内容
1. **pet-renderer.js v2 重写**：120x100 画布，动画幅度大幅增加
   - walk: ±18px 左右走动，leash: ±24px 大范围走动，snack: 跳起6px
   - 道具可见：食物碗(含颗粒)、水碗(蓝色)、骨头(可旋转)、牵引绳(红色虚线)
   - tail/ears 摆动幅度增大，sleep 侧躺+Zzz气泡
   - **Bug修复**：`bodySx` 未声明导致 ctx.scale(undefined,...) 渲染异常
   - **Bug修复**：walk/leash 补充 `bodySx = this._petFlip` 翻转方向
2. **idle-bar.js**：Canvas 64x64→120x100（CSS 36px→96x80px）
   - **Bug修复**：`_stopIdleRotation` 不再清除 `_interactTimer`，新增 `_stopInteraction`
   - **Bug修复**：`interactPet` action 映射 feed→eat/water→drink/walk→leash（`8a4b234`）
   - `.with-pet` class 管理大Canvas通知栏
3. **style.css**：idle-mode min-height:56px，.with-pet min-height:100px
4. **版本号**：v5.2.78 → v5.2.79

### 当前状态
- ✅ 语法检查全部通过
- ✅ E2E 验证 14/14 PASS
- ✅ 已提交推送 `61378df` + `8a4b234`

### 提交记录
- `61378df` feat: Canvas宠物动画大幅增强——120x100画布+道具可见+大范围动作+翻转修复（v5.2.79）
- `8a4b234` fix: interactPet action映射——feed/water/walk映射为eat/drink/leash动画

### 遗留事项
- 可考虑进一步优化：宠物上下跳动范围、更丰富的道具动画、宠物拖拽互动

---

## 2026-05-11 v5.2.75 宠物交互按钮+自定义宠物/句子+XSS修复

### 改动内容
1. **宠物交互按钮**：通知栏显示宠物时，desc区渲染4个交互emoji按钮
   - 🍖喂食 🚰喝水 🦮遛弯 🍪零食，各4种随机反应
   - 点击→标题区显示宠物反应→3秒后自动恢复轮播
   - `_interactTimer` 与 `_idleTimer` 互斥，防止交互期间轮播打断
2. **自定义宠物**：选择面板底部"➕ 自定义宠物"按钮
   - 表情符号选择器（20种常用宠物emoji）
   - 宠物名输入+自动生成动作文案
   - 存储：SafeStorage → `office_custom_pets`
3. **自定义句子**：选择面板底部"➕ 自定义句子"按钮
   - 文本+作者+时段（早/午/晚/不限）
   - 存储：SafeStorage → `office_custom_quotes`
4. **XSS修复**（code-reviewer+security-reviewer发现2个CRITICAL）
   - `showIdlePicker()` 中 `p.name`/`p.emoji`/`q.text`/`q.author` 加 `SecurityUtils.escapeHtml()`
   - 通知栏主体渲染已正确使用 `textContent`（无风险）

### 当前状态
- ✅ 语法检查全部通过（idle-bar.js / app.js / index.html）
- ✅ 代码审查通过（2 HIGH → 已修复为0）
- ✅ 安全审查通过（2 CRITICAL → 已修复为0）
- ✅ 已提交推送 `48b552a` v5.2.75
- 🔄 待线上验证

### 提交记录
- `48b552a` feat: 宠物交互按钮+自定义宠物/句子，XSS修复（v5.2.75）

### 线上验证清单（Ctrl+Shift+R 强刷）
1. 版本号显示 `2026-05-11 v5.2.75`
2. 选宠物后通知栏显示4个交互按钮（🍖🚰🦮🍪）
3. 点击🍖喂食 → 宠物显示吃食反应 → 3秒后恢复自动轮播
4. 点击🚰/🦮/🍪都有不同反应
5. 选择面板底部有"自定义宠物"按钮 → 弹出表单 → 添加后可选
6. 选择面板底部有"自定义句子"按钮 → 弹出表单 → 添加后可选
7. 刷新后自定义内容保持
8. 右键通知栏可打开闹钟设置
9. 手机端交互按钮不溢出
10. 控制台无 JS 错误

---

## 2026-05-11 v5.2.69 通知栏常驻+空闲态鸡汤宠物+自定义闹钟提醒

### 改动内容
1. **新建 `js/core/idle-bar.js`**：空闲态通知栏模块（IdleBarManager）
   - 30 条鸡汤语录（按早/午/晚分类），6 种宠物（动作随时间段变化）
   - 15 秒自动轮换，点击手动切换，双击/长按打开闹钟设置
2. **新建 `js/core/alarm.js`**：闹钟管理模块（AlarmManager）
   - 支持每天/工作日/每周几 + 时间设置，提前 3 分钟闪烁提醒
   - 支持添加/删除/启用/禁用，闹钟数据存 localStorage（SafeStorage 封装）
3. **countdown.js**：无倒数日时不再隐藏通知栏，改为调用 `showIdleNotice()`
4. **app.js**：tick 中增加 `checkAlarms()` 调用，优先级：待办截止 > 闹钟 > 倒数日 > 空闲态
5. **sync.js**：闹钟数据纳入 sideData 同步 + 备份（buildSyncData + 6 处恢复路径全覆盖）
6. **style.css**：空闲态淡蓝紫渐变 + 闹钟橙黄渐变样式
7. **v5.1.68**：修复移动到功能两个 bug（日期选择器定位 + 待办类型支持）

### 当前状态
- ✅ 语法检查全部通过（idle-bar.js / alarm.js / countdown.js / app.js / sync.js）
- ✅ 已提交推送 `36f58ab` v5.2.70
- ✅ E2E 验证 7/7 PASS

### 提交记录
- `36f58ab` fix: 空闲态内容每秒闪烁——首次进入空闲态固定随机内容，后续tick不再重新随机（v5.2.70）
- `0765aa5` fix: 移除空闲态15秒自动轮换，改为仅点击切换，选定后固定不再闪烁
- `8763975` feat: 通知栏常驻+空闲态鸡汤宠物+自定义闹钟提醒（v5.2.69）
- `bea3276` fix: 移动到功能两个bug修复——日期选择器定位+待办类型支持（v5.1.68）

### 线上验证清单（Ctrl+Shift+R 强刷）
1. 版本号显示 `2026-05-11 v5.2.70`
2. 通知栏始终可见，空闲态显示鸡汤或宠物，内容固定不闪烁
3. 点击通知栏切换下一条，内容稳定不变
4. 双击通知栏弹出闹钟设置
5. 右键菜单正常（编辑/移动到/删除/复制等）
6. 移动到子菜单正常（本周/下周/自定义日期）
7. 控制台无 JS 错误

---

## 2026-05-11 v5.1.67 右键菜单增加"移动到"双模式子菜单 + 版本号三段式

### 改动内容
1. **新增 `_contextMoveTo` 方法**：右键菜单新增"移动到…"子菜单
   - 上半：本周7天快捷选择（周一~周日，标注日期，今天高亮）
   - 中间：下周7天快捷选择
   - 底部："选择其他日期…"走原有日期选择器
2. **所有事项类型支持**：会议改date、办文改docStartDate/docEndDate、待办改deadline（保留时间）
3. **版本号格式升级**：从 `v5.xx` 改为三段式 `v{月份}.{大版本}.{改动号}`
   - 大版本：app拆分、新功能模块、架构重构
   - 小版本：Bug修复、UI调整、小功能
4. **index.html**：新增 `data-action="move-to"` 菜单项

### 当前状态
- ✅ 语法检查通过
- ✅ 已提交 `bc8fefc`
- ✅ 已推送到 origin/main
- 🔄 待线上验证

### 提交记录
- `bc8fefc` feat: 右键菜单增加"移动到"双模式子菜单 + 版本号三段式 v5.1.67

### 遗留事项
- 待线上验证：版本号 v5.1.67、"移动到"子菜单全操作、既有右键功能回归

---

## 2026-05-11 v5.66 第8批拆分——上下文菜单+备份恢复（最终批次）

### 改动内容
1. **新建 `js/core/context-menu.js`**：14个方法，503行，`ContextMenuCore` 对象
   - 右键/长按菜单：initContextMenu/showContextMenu/hideContextMenu
   - 截图分享：shareCalendarScreenshot/_downloadCanvas
   - 菜单动作分发：executeContextAction
   - 优先级：_contextShowPriorityPicker/_contextSetPriority
   - 改日期：_contextMoveToDate/_showDatePicker
   - 复制：_contextCopyItem/_showCopyChoice
   - 周期性：_contextSetRecurring/_showRecurringDialog
2. **新建 `js/core/backup.js`**：7个方法，228行，`BackupCore` 对象
   - 导出导入：exportData/importData/handleExportBackupFile/handleRestoreBackup
   - 每日备份：startDailyBackupSchedule/saveDailyBackupToCloud/restoreCloudBackup
3. **Bug修复**：右键删除 `this.deleteItem(item.id)` → `this.showDeleteConfirm(item.id)`（executeContextAction 中）
4. **app.js**：6537→5858行（-679），新增 BackupCore + ContextMenuCore 两个 mixin 调用，版本 v5.66

### 当前状态
- ✅ 语法检查通过（backup.js + context-menu.js + app.js）
- ✅ 安全审查完成（2个HIGH为遗留问题，不阻塞）
- ✅ 已提交 `c92adfb`
- ✅ 已推送到 origin/main
- 🔄 待线上验证

### 提交记录
- `c92adfb` refactor: 第8批拆分——上下文菜单+备份恢复提取为独立模块（v5.66）

### 拆分总结
- app.js 从 10470→5858 行（减少 44.1%）
- 已提取 9 个独立模块，共 4719 行
- **不再继续拆分**：剩余核心 CRUD 耦合极高，拆分收益递减

### 遗留事项
- 待线上验证：右键菜单全操作 + 备份导出/导入/恢复 + 版本号 v5.66

---

## 2026-05-11 v5.65 第7批拆分——跨日期模块提取

### 改动内容
1. **新建 `js/core/cross-date.js`**：15个方法，354行，`CrossDateCore` 对象
2. **app.js 删除对应方法**：6925 → 6610 行（-315）
3. 提取方法：
   - 判断（2个）：`isCrossDateDocument`/`isCrossDateMeeting`
   - 选择框（2个）：`showCrossDateDocChoice`/`showCrossDateDocDeleteChoice`
   - payload构建（3个）：`getCrossDateDocumentUpdatePayload`/`getCrossDateMeetingUpdatePayload`/`getCrossDateDocumentDeletePayload`
   - 作用域更新（3个）：`applyCrossDateDocumentScopedUpdate`/`applyCrossDateMeetingScopedUpdate`/`applyCrossDateDocumentDelete`
   - 日期视图（3个）：`getDocumentItemForSelectedDate`/`getMeetingItemForSelectedDate`/`getEffectiveDocumentItemById`
   - 辅助（2个）：`clearDayStatesFields`/`_freezeBeforeAndClearFrom`

### 当前状态
- ✅ 语法检查通过（cross-date.js + app.js）
- ✅ 已提交 `694e9fe`
- 🔄 **推送重试中**（网络不稳定）

### 提交记录
- `694e9fe` refactor: 第7批拆分——跨日期办文/会议作用域更新提取为 js/core/cross-date.js（v5.65）

---

## 2026-05-10 v5.64 第6批拆分——周期性模块提取

### 改动内容
1. **新建 `js/core/recurring.js`**：14个方法，678行，`RecurringCore` 对象
2. **app.js 删除对应方法**：7553 → 6925 行（-628）
3. 提取方法：
   - 表单渲染（6个）：`initializeRecurringFieldOptions`/`getRecurringFieldConfig`/`createRecurringFormGroup`/`createRecurringInput`/`createRecurringSelect`/`createRecurringCheckboxGroup`
   - 模板渲染（2个）：`renderRecurringFieldTemplate`/`renderRecurringTypeSelect`
   - 分组管理（2个）：`updateRecurringGroup`/`updateRecurringGroupStatus`
   - 事项生成（4个）：`generateRecurringItems`/`createRecurringItem`/`getMonthlyDate`/`getDaysInMonth`

### 当前状态
- ✅ 语法检查通过
- ✅ 已提交 `bffbb12`
- 🔄 **待推送**（网络阻挡，明天继续）

### 提交记录
- `bffbb12` refactor: 第6批拆分——周期性表单+生成+分组更新提取为 js/core/recurring.js（v5.64）

---

## 2026-05-10 v5.63 第5批拆分——天气模块提取+紧急修复

### 改动内容
1. **新建 `js/weather.js`**：6个方法，449行（loadWeather/fetchWeather/renderWeatherStatus/showCitySelector/getWeatherIcon/getWeatherDesc），`WeatherPanel` 对象
2. **紧急修复**：第4批用 sed 删除工具代码时误删了天气方法定义（loadWeather等6个方法从 app.js 中消失），线上天气功能已损坏。本轮从 `pre-split-baseline` 恢复完整天气代码并提取为独立模块
3. **app.js**：新增 mixin 调用 `Object.assign(OfficeDashboard.prototype, WeatherPanel)`，版本升至 v5.63

### 当前状态
- ✅ 语法检查通过
- ✅ 已提交 `32a5ee1`
- ✅ 已推送到 origin/main
- 🔄 待线上验证

### 提交记录
- `32a5ee1` fix: 恢复天气模块并提取为 js/weather.js（v5.63）

---

## 2026-05-10 v5.62 第4批拆分——工具+日程+备忘

### 改动内容
1. **新建 `js/panels/tools.js`**：11个方法，389行（工具列表+计算器+倒计时），`ToolsPanel` 对象
2. **新建 `js/panels/side-panels.js`**：2个方法，235行（日程+备忘录+Escape快捷键），`SidePanels` 对象
3. **app.js 删除对应方法**：8613 → 7552 行（-1061）

### 当前状态
- ✅ 语法检查通过
- ✅ 已提交 `70771ae`
- ✅ 已推送到 origin/main
- 🔄 待线上验证

### 提交记录
- `70771ae` refactor: 第4批拆分——工具+日程+备忘提取为 tools.js 和 side-panels.js

---

## 2026-05-10 v5.61 第3批拆分——通讯录面板

### 改动内容
1. **新建 `js/panels/contacts.js`**：14个方法，665行，`ContactsPanel` 对象
2. **app.js 删除对应方法**：9270 → 8613 行（-657）
3. **index.html**：新增 `<script src="js/panels/contacts.js?v=1">`
4. **app.js init()**：新增 `Object.assign(OfficeDashboard.prototype, ContactsPanel)`

### 当前状态
- ✅ 语法检查通过
- ✅ 已提交 `91c5c17`
- ✅ 已推送到 origin/main
- 🔄 待线上验证

### 提交记录
- `91c5c17` refactor: 第3批拆分——通讯录面板提取到 js/panels/contacts.js

---

## 2026-05-10 v5.60 第2批拆分——链接面板

### 改动内容
1. **新建 `js/panels/links.js`**：10个方法，458行，`LinksPanel` 对象
2. **app.js 删除对应方法**：9720 → 9270 行（-450）
3. **index.html**：新增 `<script src="js/panels/links.js?v=1">`
4. **app.js init()**：新增 `Object.assign(OfficeDashboard.prototype, LinksPanel)`

### 当前状态
- ✅ 语法检查通过
- ✅ 已提交 `1716114`
- ✅ 已推送到 origin/main
- 🔄 待线上验证

### 提交记录
- `1716114` refactor: 第2批拆分——链接面板提取到 js/panels/links.js

---

## 2026-05-10 v5.59 第1批拆分——倒数日面板

### 改动内容
1. **新建 `js/panels/countdown.js`**：22个方法，760行，`CountdownPanel` 对象
2. **app.js 删除对应方法**：10470 → 9720 行（-750）
3. **index.html**：新增 `<script src="js/panels/countdown.js?v=1">` 在 app.js 之前
4. **app.js init()**：新增 `Object.assign(OfficeDashboard.prototype, CountdownPanel)` mixin 调用

### 当前状态
- ✅ 语法检查通过
- ✅ 已提交 `55c561d`
- ✅ 已推送到 origin/main
- 🔄 待线上验证

### 提交记录
- `55c561d` refactor: 第1批拆分——倒数日面板提取到 js/panels/countdown.js

---

## 2026-05-10 v5.58 周期性增强（每两周+截止日期）

### 改动内容
1. **每两周**：RECURRING_TYPES 新增 BIWEEKLY_DAY/BIWEEKLY_MULTI，生成逻辑用 14 天间隔
2. **截止日期**：右键周期性对话框新增日期输入，支持"生成到X月X日"，优先级高于数量
3. **修复 CRITICAL**：saveItem 未提取 BIWEEKLY 的 weekDay/weekDays 导致无限循环
4. **rule 映射修复**：_contextSetRecurring 正确将对话框字符串映射为 generateRecurringItems 兼容的 rule 对象

### 当前状态
- ✅ 语法检查通过
- ✅ code-reviewer 审查通过
- ✅ 已提交 `7f6ff3b`
- ✅ 已推送到 origin/main
- 🔄 待线上验证

### 本轮关键改动
- index.html：RECURRING_TYPES + OPTION_GROUPS 新增每两周
- js/app.js：generateRecurringItems 新增 BIWEEKLY_DAY/MULTI、saveItem 补全、对话框增强、rule 映射修复

### 提交记录
- `7f6ff3b` feat: 周期性增加每两周+截止日期——右键对话框+编辑弹窗+生成逻辑 (v5.58)

---

## 2026-05-10 v5.57 右键菜单增强（周期性对话框+子菜单保留母菜单）

### 修复内容
1. **编辑修复**：右键"编辑"改传 `this.editItem(item)` 而非 `this.editItem(item.id)`，editItem 需要完整对象
2. **周期性完整对话框**：`_showRecurringPicker`（简单3选项子菜单）替换为 `_showRecurringDialog`（完整表单：频率下拉+数量输入+确认取消），用户反馈"应该弹出周期性那个框才对"
3. **子菜单保留母菜单**：右键选"优先级/复制/周期性/改日期"时不立即隐藏母菜单，等子菜单操作完成/取消/关闭后再隐藏
4. **子菜单定位修复**：复制子菜单从 `_contextMenuEl?.getBoundingClientRect()` 改为 `_contextMenuPos`（避免菜单隐藏后 getBoundingClientRect 返回 0）

### 当前状态
- ✅ 语法检查通过
- ✅ 已提交 `b87c163`
- ✅ 已推送到 origin/main
- 🔄 待线上验证

### 本轮关键改动
- js/app.js：`_showRecurringPicker` → `_showRecurringDialog`（完整表单）；子菜单 cleanup 统一加 `this.hideContextMenu()`；menu.onclick 对 submenuActions 不立即隐藏
- index.html：版本 v5.57

### 提交记录
- `b87c163` fix: 周期性改为完整表单对话框 + 子菜单保留母菜单直到操作完成 (v5.57)

---

## 2026-05-10 v5.56 功能修复（右键菜单+长按+日视图截图）

### 修复内容
1. **右键菜单不弹出**：calendar.js `createCalendarItem` 用 `dataset.id`，但 `initContextMenu` 只检查 `dataset.itemId`/`data-item-id`，导致匹配失败直接 return。修复为同时检查三种来源
2. **长按仍触发拖拽**：app.js `touchmove` 对任何移动（含 1px）就清长按计时器，与日历 touchmove（10px 阈值）不一致。修复为同步 10px 距离阈值
3. **日视图无截图按钮**：boardDateLabel 旁新增 📷 按钮，点击截取 `#boardView` 为图片

### 当前状态
- ✅ 语法检查全部通过
- ✅ 本地提交 `b3ab03d`
- 🔄 推送被防火墙阻挡（443 端口 TCP 超时），已设置定时重试

### 本轮关键改动
- js/app.js：contextmenu 增加 `dataset.id` 回退匹配；touchmove 增加 10px 距离阈值；boardScreenshotBtn 事件绑定
- index.html：boardDateLabel 内新增截图按钮；资源版本 app.js?v=193

### 提交记录
- `b3ab03d` fix: 右键菜单dataset匹配 + 长按距离阈值 + 日视图截图按钮 (v5.56)（待推送）

---

## 2026-05-10 v5.53-v5.55 功能优化（Phase 1/2/3/5）

### 本次目标
- Phase 1: 自然语言解析走预览确认管道（防 AI 错误直接写入）
- Phase 2: 通用右键菜单组件（桌面右键 + 移动端长按 500ms）
- Phase 3: 日历拖拽 ghost 跟随 + 移动端触摸拖拽支持
- Phase 5: 日历视图截图分享（html2canvas + 系统分享 API）

### 当前状态
- ✅ Phase 1: `executeAIAddCommand` 完整改走 `validateAndCleanItem → buildRecognitionActionPlan → showRecognitionPreview → applyRecognitionActionPlan` 管道
- ✅ Phase 2: `initContextMenu` / `showContextMenu` / `hideContextMenu` / `executeContextAction` 完整上下文菜单
- ✅ Phase 3: 日历拖拽 ghost 元素 + 移动端 touch 拖拽（touchstart/touchmove/touchend）
- ✅ Phase 5: `shareCalendarScreenshot(container, title)` + `_downloadCanvas` + 周/月视图标题栏 📷 按钮
- ✅ v5.55 修复：触摸拖拽增加 10px 距离阈值，避免长按菜单时手指微动误触发拖拽
- ✅ 语法检查全部通过
- ✅ 已提交推送 `055b5d3` 到 origin/main

### 本轮关键改动
- js/app.js：`executeAIAddCommand` 完整重写走预览管道；新增 `initContextMenu`/`showContextMenu`/`hideContextMenu`/`executeContextAction`；新增 `shareCalendarScreenshot`/`_downloadCanvas`；版本 v5.55
- js/calendar.js：dragstart ghost 元素 `setDragImage`；移动端完整 touch 拖拽（含 10px 距离阈值防误触）；周/月视图标题栏新增 📷 截图按钮
- css/style.css：上下文菜单样式 ~50 行；截图按钮样式；触摸拖拽高亮 `.calendar-touch-over`
- index.html：contextMenu 骨架；资源版本 style.css?v=65、app.js?v=192、calendar.js?v=41

### 提交记录
- `b673552` feat: NLP预览管道 + 右键菜单 + 拖拽增强 + 截图分享 (v5.54)
- `055b5d3` fix: 触摸拖拽增加10px距离阈值，避免长按时微动误触发拖拽 (v5.55)

### 遗留事项
- 待用户真人测试验证各 Phase 功能
- Phase 4（桌面通知）和 Phase 6（会议-办文联动）未实施
- 部分部门名称（"办公室""机关党委"）在 PDF 识别中仍可能被误判为地点

---

## 2026-05-10 会话收尾（项目规则迁移+日志补齐）

### 本次目标
- 补齐 5/7-5/10 缺失的迭代日志
- 将项目规则从 `.trae/rules/` 迁移到 `.claude/rules/`
- 修复 DeepSeek 用量报告一直显示 0 的问题
- 启用项目级 `/unsafe` 模式
- 固化"会话结束必须写 todo + framework + 迭代日志"为永久记忆

### 当前状态
- ✅ 项目规则已迁移到 `.claude/rules/`（5 个文件）
- ✅ 迭代日志补齐：5/7 v5.42-v5.43、5/8 v5.44-v5.46、5/9 v5.47-v5.52
- ✅ 用量报告修复：不再 `rm usage_state.json` 重置基线，月基线设为 43.10 元
- ✅ `/unsafe` 模式启用：`permissionMode: "bypass"`
- ✅ 永久记忆 `session_end_workflow.md` 写入
- 🔄 待提交推送

### 本轮关键改动
- `.claude/rules/`：5 个规则文件迁移到位
- `.claude/settings.json`：`permissionMode: "bypass"`
- `C:/Users/42151/.claude/projects/.../memory/session_end_workflow.md`：新增永久记忆
- `C:/Users/42151/.claude/projects/.../memory/session_usage_reporting.md`：追加"严禁 rm state 文件"

---

## 2026-05-09 v5.52 PDF 识别地点修复（第三轮——最终修复）

### 本次目标
- 彻底修复"学习贯彻习近平法治思想强化行政执法能力建设专题培训班"地点识别为"6号楼1会场"而非"市司法局"

### 根因分析
- WPS 生成 PDF 使用 CID 字体，每个字符为独立 text item
- 长标题在合并单元格内自动换行，下半段与地点分布在不同 y 行
- v5.51 代码级合并延续行存在跨行串扰风险（可能合并到不同参会人的行）

### 当前状态
- ✅ 延续行输出策略从"代码级合并"改为 "续："标记独立输出，交由 AI 语义合并
- ✅ y-tolerance 从 0.30 放宽到 `Math.max(4, height * 0.55)`，避免同一视觉行被拆散
- ✅ `isLocationLikeCell` 新增排除：`^.[局委办]$` 且长度≤3 的短人名不判为地点
- ✅ `isLocationLikeCell` 正则 `局$` 改为 `.{2,}局$`（最少 3 字符才匹配）
- ✅ AI prompt 新增"续："条目语义合并规则
- ✅ 本地 v4-flash 测试通过：地点正确识别为"市司法局"
- ✅ 版本 `2026-05-09 v5.52`，资源 `ocr.js?v=51`、`app.js?v=188`
- ✅ 已提交推送 `9418994` 到 origin/main

### 提交记录
- `8853b38` fix: 延续行独立输出+AI语义合并——彻底解决行串扰导致地点错误
- `9418994` fix: 延续行输出策略改为独立输出+AI语义合并 (v5.52)

### 遗留事项
- 部分部门名称（"办公室""机关党委"）仍可能被误判为地点——待后续优化 `isLocationLikeCell`

---

## 2026-05-09 v5.50-v5.51 PDF 识别地点修复（前两轮）

### 本次目标
- 修复 PDF 会议地点识别错误（v5.50：AI prompt 修正；v5.51：代码级延续行合并）

### 当前状态
- ✅ v5.50: 修正 AI prompt 表格列结构——第4列"备注包含地点和着装"改为"备注/地点"
- ✅ v5.50: `correctMeetingLocationText` 移除着装要求剥离正则
- ✅ v5.51: 新增 `isLocationLikeCell` 辅助函数判断地点单元格
- ✅ v5.51: `extractPDFTableRows` 新增标题延续行合并逻辑
- ✅ 已提交推送 `3b1564c` `ecf0ac6` 到 origin/main

### 提交记录
- `3b1564c` fix: 修正AI prompt表格列结构——着装要求在会议名称列而非地点列
- `ecf0ac6` fix: WPS换行拆分导致地点识别错误——标题延续行合并逻辑

---

## 2026-05-09 v5.47-v5.49 DeepSeek 优化 + 自动备份

### 本次目标
- DeepSeek 切换到 v4-flash 降低费用，禁用 thinking mode 避免 OCR 性能浪费
- PDF 识别 AI prompt 优化
- 数据安全备份区域添加自动备份开关

### 当前状态
- ✅ v5.47: 自动备份开关（默认每晚 20:00 开启，可取消勾选）
- ✅ v5.48: deepseek-v4-flash thinking mode 禁用
- ✅ v5.49: PDF 识别 AI prompt 增加合并单元格说明 + 地点清理规则
- ✅ 已提交推送

### 提交记录
- `b7dd150` chore: 版本号升至 v5.47
- `dd37c3d` feat: 自动备份开关
- `9086709` fix: DeepSeek v4-flash thinking mode disabled (v5.48)
- `561c102` fix: PDF recognition AI prompt for merged cells + location cleanup (v5.49)

---

## 2026-05-08 v5.45-v5.46 倒数日修复 + DeepSeek 模型切换

### 本次目标
- 修复农历倒数日偏差 1 天
- 倒数日默认按剩余天数升序并支持手动拖拽排序
- 倒数日统一排序 + 同步反馈修复 + 删除墓碑双保险
- DeepSeek 从 deepseek-chat 切换到 deepseek-v4-flash

### 当前状态
- ✅ 农历倒数日日期修正
- ✅ 倒数日排序 + 手动拖拽排序
- ✅ 删除墓碑双重保护
- ✅ DeepSeek 模型切换完成
- ✅ 版本号升至 v5.46
- ✅ 已提交推送

### 提交记录
- `468476d` fix: 农历倒数日偏差1天 + 倒数日按剩余天数升序 + 手动拖拽排序
- `ecb946a` merge: 合并远端 origin/main
- `3dc3fae` fix: 倒数日统一排序+同步反馈修复+删除墓碑双保险
- `3afdd8c` chore: 版本号升至 v5.46
- `c16716a` fix: DeepSeek 模型切换为 deepseek-v4-flash

---

## 2026-05-07 v5.42-v5.43 数据保护与同步修复

### 本次目标
- 修复导入后云端覆盖导致数据丢失
- sideData 恢复、墓碑清理、导入保护、语法修复
- 修复编辑改标题后同步重复事项
- 补充 tools/weather/theme 云端同步

### 当前状态
- ✅ v5.42: 导入后云端覆盖修复 + sideData 恢复 + 墓碑清理 + 导入保护
- ✅ v5.43: 编辑改标题不再导致同步重复
- ✅ v5.43: tools/weather/theme 纳入云端 settings 同步
- ✅ v5.43: 备份恢复和导出 sideData 补齐
- ✅ 已提交推送

### 提交记录
- `4800d58` `0139652` `c44f0cd` v5.42: 导入云端覆盖修复 + sideData + 墓碑清理 + 导入保护 + 语法修复
- `fc08a39` `72a79c0` v5.42: 版本号更新
- `3a69dc0` `56b4574` `3ad72b3` v5.43: 编辑标题同步重复修复 + tools/weather/theme 云端同步
- `2b27e0e` v5.43: fix backup restore and export sideData

---

## 2026-05-06 v5.35

### 本次目标
- 修复同步误删与自动备份漏字段问题，避免空云端数据/异常缩容覆盖本地

### 根因分析
- syncLocalItemsToState 在目标列表为空时仍可能触发清库式对账
- deleteItemsByHashes 对空保留集合缺少保护，存在全删风险
- smartSync / silentSyncFromCloud / mergeData 对云端空数据或异常缩容缺少统一保护
- 自动备份/导出链路未稳定补齐 sideData，导致部分本地侧信息丢失

### 当前状态
- ✅ syncLocalItemsToState 空目标列表时保留本地，不再误删
- ✅ db.deleteItemsByHashes 空 keepHashes 时直接跳过删除
- ✅ smartSync、silentSyncFromCloud、mergeData 增加云端空数据/异常缩容保护
- ✅ 自动备份与导出备份补齐 sideData
- ✅ node --check js/sync.js / js/db.js 通过，diagnostics 0 错误
- 🔄 待提交推送

### 本轮关键改动
- js/sync.js：新增云端缩容保护函数，smartSync / silentSyncFromCloud / mergeData 前置拦截
- js/sync.js：autoBackupBeforeSync 已包含 sideData，exportBackupAsFile 在缺失时补回 sideData
- js/db.js：deleteItemsByHashes 增加空集合保护

---

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
- 待线上强刷验证是否已命中 `app.js?v=182`

---

## v5.37（2026-05-06）

### 修复内容
1. **跨设备删除同步修复**：`mergeData()` 合并循环增加 `shouldKeepDeleted` 墓碑过滤，已删除事项不再被复活。根因：mergeData 在合并云端和本地数据时完全不检查墓碑，导致设备 A 删除的事项在设备 B 首次同步或 mergeData 路径中被当作有效数据写入
2. **AI loading 改为按钮本身转圈**：打字识别时放大镜按钮 SVG 旋转，图片/PDF 识别时上传按钮 SVG 旋转。不再使用旁边的 `aiStatus` 文字标签，顶部布局完全不变
3. 新增 CSS `.btn-loading` 类：`pointer-events: none` + `opacity: 0.7` + SVG `animation: spin`

### 修改文件
- `js/sync.js`：mergeData 两处合并循环加 `shouldKeepDeleted` 过滤
- `js/app.js`：parseNaturalLanguage 的 showStatus/hideStatus 改为操作 parseBtn；handleFileUpload 的改为操作 uploadBtn
- `css/style.css`：新增 `.btn-loading` 和 `.btn-loading svg` 样式
- `index.html`：资源戳更新

### 验证清单
- [ ] 电脑端删除待办/会议后，手机端刷新后也消失
- [ ] 电脑端删除后刷新，删除的事项不会恢复
- [ ] 打字 AI 解析时，放大镜按钮图标旋转，顶部布局不动
- [ ] 图片/PDF 识别时，上传按钮图标旋转，顶部布局不动
- [ ] 手机端和电脑端均正常

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
