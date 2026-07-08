# Todolist

## 已完成

### v5.2.137 文件识别新增条目默认设为会议
- [x] 根因：识别配 Key 走 LLM 仍出待办，或 fallback 正则默认 todo
- [x] 修复：showRecognitionPreviewModal 渲染前遍历新增条目统一 convertItemType(item,'meeting')
- [x] 复用 v5.2.136 convertItemType 做字段映射（todo/document→meeting 日期时间不丢）
- [x] 版本号 v5.2.137，upload-flow.js?v=11、app.js?v=260
- [x] Code review: APPROVE(0C/0H/0M/1L)
- [x] 语法检查通过
- [x] 已提交推送 `189f691`
- [ ] 大飞本地强刷验证：确认面板新增条目默认会议 + 登录 Failed to fetch 排查

### v5.2.136 识别确认面板支持修改事项类型——类型下拉选择器
- [x] 根因：确认面板类型是纯只读文本(upload-flow.js:402)，整个文件无修改入口
- [x] 修复：卡片头部加 select 下拉(待办/会议/办文)，change时 convertItemType 字段映射+重渲染
- [x] 新增 extractDateAndTime/convertItemType 辅助函数(todo/meeting/document 三类互转)
- [x] 微信端补漏：wechat-upload.html upload-flow.js?v=9→10(回归核查发现)
- [x] 版本号 v5.2.136，upload-flow.js?v=10、app.js?v=259
- [x] Code review: APPROVE(0C/0H/0M/2L)
- [x] 回归核查: 6项全过，补漏微信端
- [x] 语法检查通过(主+镜像upload-flow.js+app.js)
- [x] 已提交推送 `515b176`

### v5.2.135 CSP加jsdelivr白名单消除html2canvas加载warning
- [x] CSP script-src 加 https://cdn.jsdelivr.net（主+镜像index.html）
- [x] 线上验证：html2canvas加载OK + CSP错误0 + 全部console错误0
- [x] 已提交推送 `7ff42fd`

### v5.2.134 修复月报待办undefined + 年报图片0kb
- [x] bug1: report.js todo.text→todo.title（待办字段修正，月报不再undefined）
- [x] bug2: report.js 动态scale防canvas超限 + canvas校验（年报不再0kb）
- [x] 镜像report.js同步两处
- [x] 线上验证：月报待办显示正确标题 + 年报canvas 1600×1808非0kb
- [x] 已提交推送 `212e044`

### v5.2.133 根治window.app污染——div id=app改为appRoot
- [x] 排查：HTML2处定义+JS2处引用+CSS 0处
- [x] 修复：主+镜像 index.html id + app.js getElementById 共4处 app→appRoot
- [x] Code review: APPROVE(0漏改/0白屏风险)
- [x] 线上验证：appRoot显示不白屏 + window.app=undefined彻底根治 + 0错误
- [x] 已提交推送 `8e52893`

### v5.2.132 修复报告自定义类型 toggleCustomDateRange 报错
- [x] 根因定位：index.html onchange="app.xxx()" 中 app 被浏览器映射为 <div id="app"> 元素(index.html:155)
- [x] 修复：主+镜像 index.html 各5处 app.toggleCustomDateRange() → officeDashboard.toggleCustomDateRange()
- [x] Code review: APPROVE(0C/0H/0M/1L-note)
- [x] 语法检查通过 + 线上验证(customDateRangeGroup显示block + 0 pageerror)
- [x] 已提交推送 `ac1de1e`
- 附：CRUD精简验证全通过(13项右键菜单齐全+子菜单展开+0错误)

### v5.2.131 周/月视图截图显示每天完整事项——截图前临时解除高度折叠
- [x] 根因定位：.week-view height:calc(100vh-140px) + .week-cell/.month-cell max-height+overflow-y:auto 折叠，截图函数未展开直接截可见状态
- [x] context-menu.js: shareCalendarScreenshot 截图前调 _expandForScreenshot 加 screenshot-mode 类，finally 恢复；新增 _expandForScreenshot 方法
- [x] layout.css: 新增 .week-view/.month-view.screenshot-mode 规则(!important 解除 height/max-height/overflow)
- [x] 镜像副本 e2e/mirror 同步(layout.css + context-menu.js)
- [x] 缓存版本: context-menu.js?v=7, layout.css?v=9, app.js?v=254
- [x] Code review: APPROVE(0C/0H/1M-info/2L-note)
- [x] 语法检查 3/3 通过
- [x] 已提交推送 `6db33c1`，GitHub API 验证远程 HEAD 对齐、文件无截断(CRLF差异正常)

### v5.2.122 周/月视图排序先按类型分组再桶排序
- [x] sortItems() 重构：先按类型分组(待办→会议→办文)再各自桶排序
- [x] 会议组：四桶+手动排序+领导优先级合并
- [x] 待办/办文组：四桶+priority+order+时间
- [x] Code review: APPROVE(0C/0H/2M/1L)
- [x] 已提交推送 `bbe29c6`

### v5.2.121 Supabase数据库迁移——带宽超限二次触发
- [x] 新建Supabase项目 pfomqdegassaqxdyyweo
- [x] 执行建表SQL（user_data + RLS 4策略 + 触发器）
- [x] 更新 sync.js URL + anon key（3个文件）
- [x] 旧项目引用全清除
- [x] Code review: APPROVE
- [x] 已提交推送 `0519c7f`
- [ ] 用户重新注册验证

### v5.2.120 周/月视图排序与日视图不一致修复
- [x] calendar.js sortItems() 复刻日视图四桶排序：pinned(0)→normal(1)→sunk(2)→completed(3)
- [x] 会议：手动排序+领导优先级合并（同sortMeetingItems）
- [x] 非会议：pinned→priority权重→order→createdAt（同renderColumn）
- [x] 用getDashboardApp()+null保护替代裸app引用
- [x] Code review: 2 HIGH已修复（裸app引用+缺pinned子排序）
- [x] 已提交推送 `01d31b6`

### v5.2.119 无deadline待办周/月视图不显示+举一反三16处修复
- [x] calendar.js 3处：getItemDateSpan fallback + 拖拽 + 点击
- [x] context-menu.js 4处：移动到+复制+try块修复
- [x] app.js 3处：类型转换+拖拽移动+document→todo
- [x] sync.js 2处：哈希+去重
- [x] report.js 1处：getItemDate fallback
- [x] upload-flow.js 1处：设deadline同时设date
- [x] recurring.js 1处：周期任务设deadline同时设date
- [x] Code review: CRITICAL+HIGH已修复
- [x] 已提交推送 `c51f6d3`

### v5.2.116 闹钟删除后被sync回加+dismiss保护窗口
- [x] _mergeAlarms: 本地10秒内编辑过时不回加云端"新"闹钟
- [x] dismiss保护窗口: 3分钟→10分钟
- [x] dismiss不再短路所有闹钟检查，只跳过被关闭的那个
- [x] 版本号 v5.2.116
- [x] Code review: HIGH已修复（dismiss短路问题）
- [x] 已提交推送 `2696c4f`

### v5.2.115 备忘录/日程编辑时云端同步覆盖修复
- [x] sync.js _applySideData 增加 memo/schedule 焦点检测
- [x] 统一便签模式：localStorage始终写入，只跳过事件派发
- [x] side-panels.js 双层防护（focus+5s时间窗口）
- [x] 版本号 v5.2.115
- [x] Security review: APPROVE（0C/0H/3M/2L）
- [x] Code review: HIGH已修复
- [x] 已提交推送 `1f73bbd`

### v5.2.102 截止时间默认带入+便签卡片
- [x] datetime-local 修复为 YYYY-MM-DDTHH:MM 格式，日期正确预填
- [x] 新增便签卡片（boardDateLabel下方，170px，黄底横线便签样式）
- [x] contenteditable 自动保存（800ms防抖SafeStorage）+云端同步
- [x] sync.js 全部7个路径补 office_sticky_note（含syncFromCloud遗漏）
- [x] 暗色模式+响应式适配
- [x] Code review CRITICAL+HIGH+MEDIUM全部修复
- [x] 版本号 v5.2.102

### v5.2.101 PDF OCR人名识别Fix-E（另一会话）
- [x] extractPDFTableRows Fix E：短人名参会者识别+双向y距离查找
- [x] 缓存版本 ocr.js?v=52→v=53

### v5.2.100 修复无截止时间待办日视图不显示+日期锚定
- [x] matchItemDateRange 放宽条件：deadline → item.date → createdAt → true
- [x] saveItem 中 todo 设 item.date = newDeadline || selectedDate 锚定日期
- [x] 版本号 v5.2.100（v5.2.99 被另一会话用于 PDF 识别优化）

### v5.2.99 PDF识别管道优化——参会人员合并精度+跨天会议识别+延续行误判修复（另一会话）
- [x] Fix A-D：日期匹配放宽+AI prompt增强+二次合并+延续行检测
- [x] ocr.js?v=51→v=52

### v5.2.96 待办提醒系统重构——截止时间选填+无截止时间绝对提醒
- [x] 新建待办截止时间不再自动填入，选填
- [x] 有截止时间：相对提醒"截止前N分钟"（默认3分钟）
- [x] 无截止时间：绝对提醒"单次/每天 在 日期 时间"
- [x] 新增 reminderMode/reminderDate/reminderTimeAbs 字段
- [x] 通知栏区分绝对/相对提醒文案
- [x] 复制逻辑兼容无截止时间待办
- [x] 编辑无提醒旧事项不污染提醒配置（HIGH修复）
- [x] 新建未动表单不标记手动设置（MEDIUM修复）
- [x] reminderDate 空值存 null（MEDIUM修复）

### v5.2.95 复制事项提醒闹钟属性与原事项完全一致
- [x] 副本清除 `reminderDismissedAt`，不继承原日期关闭状态
- [x] 原事项无手动提醒/截止标记时副本显式设 false，无默认提醒

### v5.2.94 方形卡片居中+与待办列顶部平齐
- [x] 卡片在180px左gutter居中(170px卡片，左右各5px)
- [x] 卡片top对齐待办列header顶部(12px)
- [x] 三列padding-left:180px紧凑不挨

### v5.2.93 方形卡片170px+三列微右移+会议3行
- [x] 卡片170px，三列padding-left 185px微右移，不挨待办列
- [x] 下一场会议3行显示，完整展示长会议名

### v5.2.92 日期标签方形卡片扩大4倍(160px)+三列不平移
- [x] 卡片82px→160px宽，田字格四格全展开，字号翻倍
- [x] 三列保持原padding不右移

### v5.2.91 日期标签移至最左窄方形卡片+三列微右移
- [x] board-date-label 移至最左边82px窄方形卡片，不触任何列
- [x] boardView padding-left 115px，三列整体微右移避让
- [x] 浅色主题header配色+下一场会议双行（v5.2.90已修）

### v5.2.90 浅色主题header白字可读+日期标签居中卡片+下一场会议双行
- [x] 浅色主题header紫底白字：logo/时钟/天气/按钮统一白色，半透白底
- [x] board-date-label 居中卡片式，不再与待办列重叠
- [x] 下一场会议从 nowrap 截断改为双行显示（-webkit-line-clamp:2）

### v5.2.89 日视图今日概览+日历日期圆点+周视图今天色条
- [x] 日视图日期标签重设计：4行布局，📷融入"周三"同行
- [x] 今日概览统计：未完成事项自动统计（待办/会议/办文）
- [x] 下一场会议：1秒 tick 实时刷新
- [x] 周视图+月视图日期圆点（红/蓝/绿三色）
- [x] 周视图今天列顶部3px色条

### v5.2.88 闹钟通知栏✓按钮闪烁修复
- [x] `updateTodoReminderNotice()` alarm-active守卫防toggle移除class
- [x] `showAlarmNotice()` `_shownAlarmId` 去冗余DOM写入
- [x] `initAlarmSystem()` 显式初始化 `_shownAlarmId = null`（code-reviewer MEDIUM）

### v5.2.87 闹钟/待办提醒持久化+主题简化+mergeAlarms修复
- [x] 闹钟关闭持久化（SafeStorage）
- [x] 待办提醒关闭持久化（SafeStorage + DB双重恢复）
- [x] mergeAlarms 5秒本地保护 + createdAt时间戳
- [x] 主题简化：8→2种（浅色靛青+深色）

### v5.2.84 闹钟关闭交互修复+提醒时间手动标记
- [x] `.alarm-active` 补 `position: relative` 使✓按钮可见
- [x] `updateCountdownNotice()` alarm-active 守卫防闲时覆盖
- [x] 通知栏 click 关闭闹钟 / contextmenu 打开设置
- [x] `showAlarmNotice()` 清除倒计时定时器防文字闪烁
- [x] `reminderManuallySet` 标记：只改提醒时间也触发通知栏
- [x] `saveItem()` 重构合并重复 `db.getItem`

### v5.2.83 主题FOUC+白字可读性+闹钟关闭修复
- [x] 阻塞脚本预置data-theme消除主题加载闪烁
- [x] 浅色主题--bg-primary保持纯白，卡片/弹窗字色清晰
- [x] 闹钟关闭后记录dismissedId，不重复激活

### v5.2.82 主题配色重设计+切换被覆盖修复
- [x] 修复 setTheme 未同步云端导致切主题几秒后被旧值覆盖
- [x] loadTheme 启动时跳过云同步避免无效请求
- [x] 8套浅色主题重设计：独立底色/边框/卡片色，字色保持清晰
- [x] 深色模式未改动

### v5.2.81 通知栏颜色区分+待办自定义提前提醒
- [x] 通知栏颜色修复：待办提醒激活时移除 idle-mode/alarm-active
- [x] 待办新增 reminderAdvance（提前分钟）+ reminderTime（指定时刻）
- [x] 支持 3 分钟~3 天前提醒，≥1 天可指定时刻
- [x] 历史待办默认 3 分钟前，向后兼容

### v5.2.80 宠物物种差异化造型重设计
- [x] pet-renderer.js v3：SPECIES_PROFILES 定义6种物种独立造型参数
- [x] 狗(点点/旺财)：泰迪垂耳+摇尾巴+腮帮毛+蓬松体
- [x] 猫(小橘)：三角尖耳+卷尾巴+脸部胡须
- [x] 熊猫(滚滚)：圆耳+黑眼圈+胖身体+小圆尾
- [x] 狐狸(小灵)：大三角耳+超蓬松尾巴+尖吻部+胡须
- [x] 兔子(团团)：超长耳朵(22px)+棉花球尾巴
- [x] 企鹅(波波)：无耳+鸟喙+鳍状肢+白肚皮+橙足
- [x] idle-bar.js：petColorMap 新增 species 字段
- [x] 通知栏布局恢复原宽度（Canvas左置+按钮横排）
- [x] E2E 线上验证通过

### v5.2.79 Canvas宠物动画大幅增强
- [x] pet-renderer.js v2：120x100画布，动画幅度大幅增加
- [x] 道具可见：食物碗/水碗/骨头/牵引绳
- [x] bodySx undefined 渲染修复
- [x] _stopIdleRotation 不清除 _interactTimer
- [x] interactPet action 映射修复（feed→eat等）

### 历史已完成
- [x] v5.2.69 通知栏常驻+空闲态鸡汤宠物+自定义闹钟
- [x] v5.1.68 移动到功能两个bug修复

---

### v5.2.99 PDF识别管道优化——参会人员合并精度+跨天会议识别+延续行误判修复
- [x] Fix A: isSameMeetingForMerge日期匹配放宽（endDate不同但无双方显式endDate时不强制匹配）
- [x] Fix B: AI prompt核心规则9→10条，新增"严禁跨行混入参会人"+"同名会议各输出各的"
- [x] Fix C: 新增secondaryMergeRecognizedItems二次合并（半天vs跨天同一会议）
- [x] Fix D: extractPDFTableRows延续行判断增加hasStandaloneDateTime检测
- [x] 缓存版本v=51→v=52
- [x] 语法检查通过
- [x] Code review: HIGH#1已修复
- [x] 已提交推送 5ae1e85
- [ ] 用户上传【5.13】近期主要会议活动安排表.pdf进行线上验证

## 当前待办
- **[中优先]** 月视图日期点标记：彩色小圆点+点击弹出当天列表
- **[低优先]** 跨日会议可视化：周/月视图横条展示跨天会议
- **[低优先]** 会议提醒提前通知
- **[低优先]** loadItems 防抖合并
- **[低优先]** console.log 生产环境静默
- **[低优先]** 周视图拖拽改会议时长
- **[低优先]** 颜色标签自定义
- **[低优先]** 定时器合并
- **[低优先]** 周视图显示周数

## 长期待执行
- [ ] PDF 部门名称误判为地点
- [ ] Supabase CDN 本地化
- [ ] 参会人关联准确性
