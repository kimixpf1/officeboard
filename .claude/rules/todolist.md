# Todolist

## 已完成

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
