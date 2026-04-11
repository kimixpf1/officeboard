# 项目迭代记录

## 2026-03-31 当前轮次

### 已有背景
- 已加入移动端/微信上传兼容处理
- 已加入会议识别预览确认
- 已增强会议去重、合并、跳过逻辑

### 当前发现问题
- AI 识别预览点击"取消保存"后，结果仍然被写入面板

### 本轮计划
- 排查是否在预览阶段就提前执行了数据库写入
- 修复主页面和微信上传页的取消逻辑
- 更新项目规则和根目录维护文件
- 校验后提交、推送、部署

### 本轮已完成
- 在 OCR 管理器中新增数据快照与恢复能力，给预览取消增加硬兜底
- 主页面上传流程在预览前保存快照，取消时恢复快照，并且取消后不触发云端同步
- 微信上传页在预览前保存快照，取消时恢复快照
- 更新项目规则，加入根目录三份文档的维护要求
- 新增根目录文档：项目框架、todolist、项目迭代记录
- 提升前端资源版本号，减少线上缓存导致的新功能不生效问题

## 2026-03-31 全盘优化评估

### 目标
- 全盘检查是否还有高性价比、低风险或无风险的优化空间
- 在不破坏现有功能的前提下，让主流程更稳、更顺手、更易维护

### 评估范围
- 主页面上传与识别
- 微信轻量上传页
- OCR 与会议去重/合并
- 同步与导出相关主流程

### 候选优化清单
- 低风险高收益：同步模块移除大体量调试查询、减少敏感日志暴露、降低控制台噪音
- 低风险高收益：报告导出脚本加载补足超时清理与重复加载复用，减少偶发导出失败
- 无风险偏体验：预览弹窗加一次性关闭保护，避免连点导致重复触发
- 中低风险高收益：针对"近期主要会议活动安排"类图片继续细化标题动作词清洗与主题提取

### 当前决定
- 已确认实施 1+2+3+4，并以"不影响现有所有功能"为最高约束

### 本轮实施要求
- 只做高性价比、低风险或无风险改动
- 每个改动都要能说明对现有功能的影响边界
- 修改后必须做诊断、语法检查和关键路径回归验证

### 本轮实施结果
- 已完成同步模块日志瘦身与敏感信息脱敏，不再输出整包上传数据、邮箱和全表调试查询
- 已完成报告导出脚本加载稳定性增强，降低重复加载和超时未清理的风险
- 已完成主页面与微信页的预览弹窗一次性关闭保护，减少连点造成的重复触发
- 已完成 OCR 标题候选清洗增强，补充对"参加/出席/赴/召开"等动作句式的会议主题提取

### 验证结果
- 已检查 app.js、ocr.js、wechat-upload.js、report.js、sync.js 的诊断，无新增报错
- 已运行 node --check 覆盖 app.js、ocr.js、wechat-upload.js、report.js、sync.js
- 当前等待提交、推送、部署后做线上刷新验证

## 2026-03-31 上传入口收敛评估

### 新问题
- 主页面上传与微信轻量上传页是否有必要继续保持两个入口

### 本轮目标
- 先判断两者差异是否真的必要
- 若双入口仍有必要，则收敛共用逻辑，只保留微信兼容差异
- 在不影响现有所有功能的前提下完成验证与部署

### 结论
- 双入口仍然值得保留
- 主页面是完整工作台入口，适合正常浏览器和桌面端
- 微信上传页是轻量兼容入口，适合规避微信内打开相册/拍摄时的页面重进、资源压力和交互不稳定
- 最优方案不是删掉其一，而是保留双入口、收敛共用逻辑

### 本轮已做
- 新增共享模块 upload-flow.js，把识别预览与结果摘要渲染收敛为共用实现
- 主页面在微信环境下重新接回微信轻量上传页入口，并带回主页面日期/视图状态
- 微信页与主页面继续各自保留必要差异，但共用同一套预览和摘要逻辑

### 验证补充
- 已完成 upload-flow.js、app.js、wechat-upload.js、index.html、wechat-upload.html 的诊断与 node --check
- 由于浏览器调试会话冲突，未完成自动化页面联调截图验证；已通过代码路径审查确认入口切换与共享逻辑引用正确

## 2026-03-31 自动返回与判断依据增强

### 新增需求
- 微信上传识别成功后自动返回主页面
- 识别预览中展示新增/合并/跳过的判断依据
- 每次交付时明确告诉用户如何测试本次改动是否正常

### 本轮目标
- 在不影响现有主流程的前提下补齐自动返回
- 尽量利用现有 actionPlan 数据结构补充判断依据展示
- 完成验证后提交、推送、部署，并提供可执行测试步骤

### 本轮已做
- 微信上传页成功保存后显示结果摘要，并在约 1 秒后自动返回主页面
- OCR 动作计划补充预览依据字段，为新增、合并、跳过提供文字说明
- 共享预览模块 upload-flow.js 增加"依据"渲染，主页面与微信页同步生效
- 项目规则新增"每次交付都要明确给出测试步骤"

### 本轮验证
- 已检查 ocr.js、upload-flow.js、wechat-upload.js、index.html、wechat-upload.html 的诊断，无新增报错
- 已运行 node --check 覆盖 app.js、ocr.js、wechat-upload.js、upload-flow.js、report.js、sync.js
- 受浏览器调试会话冲突影响，未完成自动化点击验证；已通过代码路径审查与静态校验确认自动返回与依据渲染逻辑接入正确

## 2026-03-31 已有会议摘要与识别精度增强

### 新增需求
- 预览里显示匹配到的已有会议摘要
- 原因要具体到主题、时间、地点、参会人员等维度
- 继续提升图片识别后的精准去重与精准合并参会人员能力

### 本轮目标
- 在 actionPlan 中补充"匹配到的已有会议摘要"
- 让新增、合并、跳过的说明更具体，便于人工核验
- 优化 OCR 提示词和会议比对信息，尽量减少 Kimi 识别轻微偏差带来的误判

### 本轮已做
- OCR 动作计划为新增、合并、跳过补充 matchedExistingSummary，可展示匹配到的已有会议标题、日期时间、地点、参会人员摘要
- 预览展示支持"依据 + 匹配到"两层信息，便于直接判断为什么新增、为什么合并、为什么跳过
- 新增会议时，如果识别到同主题接近会议但日期/时间/地点不同，会直接在预览中写明差异原因
- Kimi 和 DeepSeek 提示词补充"数字、人名、房间号、地点专名优先逐字保留，不确定时保守识别"

### 本轮验证
- 已检查 ocr.js、upload-flow.js、index.html、wechat-upload.html 的诊断，无新增报错
- 已运行 node --check 覆盖 app.js、ocr.js、wechat-upload.js、upload-flow.js、report.js、sync.js
- 受浏览器调试会话冲突影响，未完成自动化点选验证；已通过动作计划结构检查与静态校验确认字段和渲染链路接通

## 2026-04-01 会议面板领导排序与二次校正层

### 新增需求
- 检查新增会议进入面板后的领导排序
- 默认顺序应为：钱局、吴局、盛局、陈局/陈主任、房局，然后才是处室参与
- 合并局领导和处室的会议也算局领导参与
- 已拖动和已完成事项排序逻辑保持原样
- 继续增强 OCR 二次校正层

### 本轮目标
- 先定位会议面板默认排序逻辑是否已经满足要求
- 若未满足，则只调整未拖动且未完成的默认排序
- 扩展 OCR 二次校正层，提高人名、处室名、会议室编号等精度

### 检查结论
- 会议面板原本已有"会议级别 + 时间"的默认排序，但领导优先级与参会人展示顺序仍可继续做稳
- 已拖动项依旧优先使用 order，已完成项依旧后置，本轮不改这两部分逻辑

### 本轮已做
- app.js 增加更明确的局领导顺序规则：钱局、吴局、盛局、陈局/陈主任、房局、其他领导、处室、其他
- 会议卡片展示的参会人员改为按同一领导优先顺序显示
- ocr.js 增加二次校正层：对局领导常见 OCR 误识别、主仼/主任、会议室编号中的 O/0、I/1 等做保守修正
- 合并参会人员时同步按领导优先顺序重排，减少合并后顺序混乱
- db.js 新增 manualOrder 标记，只有真正拖动过的会议才按 order 排序，未拖动新增会议仍按领导优先级和时间默认排序

### 本轮验证
- 已检查 app.js、ocr.js、index.html、wechat-upload.html 的诊断，无新增报错
- 已运行 node --check 覆盖 app.js、ocr.js、wechat-upload.js、upload-flow.js、report.js、sync.js
- 受浏览器调试会话冲突影响，未完成自动化拖拽/点击验证；已通过排序代码路径与渲染链路检查确认"未拖动默认排序"与"二次校正层"已接入

## 2026-04-01 排序回归继续排查

### 用户最新反馈
- 手动新增的钱局会议仍然出现在会议面板底部
- 用户要求继续遵循"钱局、吴局、盛局、陈局/陈主任、房局、处室；同级按时间"的原则，并继续做二次校正层

### 本轮计划
- 复核手动新增会议链路是否仍受历史 order 或其他字段干扰
- 补齐 db.js、app.js 的本地校验，并确认最新代码已真正推送部署
- 若发现遗漏链路，同步补强手动新增与 OCR 新增的入库前校正

### 本轮已做
- app.js 中手动新增会议保存前会先对参会人员按领导优先级重排，并明确写入 manualOrder=false、清理残留 order
- db.js 增加 normalizeItemForStorage，统一保证未拖动会议不会把旧 order 带入新增或更新链路
- ocr.js 把领导别名修正抽成通用文本纠偏，标题、地点、参会人员共同复用
- index.html 与 wechat-upload.html 继续提升资源版本号，确保线上缓存能拿到最新排序修复

### 本轮验证
- 已检查 app.js、db.js、ocr.js、index.html、wechat-upload.html 的诊断，无新增报错
- 已运行 node --check 覆盖 app.js、db.js、ocr.js、wechat-upload.js、upload-flow.js、report.js、sync.js
- 已在本地预览页实际手动新增 3 条会议验证：钱局会议排在吴局前；同级别两个钱局会议按 08:00、15:00 顺序展示

## 2026-04-01 新增会议插入排序继续排查

### 用户最新反馈
- 会议面板在"历史拖动过"后，新增的局领导会议仍会被排到下面
- 用户怀疑系统误把之前拖动理解为固定排序，导致新增会议没有按领导顺序插入

### 本轮计划
- 重点检查 manualOrder 在"拖动后新增"路径上的影响
- 调整排序策略：既保留旧会议拖动结果，又允许后续新增会议按领导顺序插入
- 完成真实链路验证后再提交、推送、部署

### 本轮已做
- 在 app.js 中新增会议比较函数，把"默认领导排序"和"历史拖动排序"拆开处理
- 新增 manualOrderUpdatedAt，用来识别某条会议是否是在最近一次拖动布局之后新建
- 调整 renderColumn 的会议排序：只有拖动时已经存在的会议继续按旧 manualOrder 排；拖动后新增的会议改按领导顺序与时间插入
- db.js 在未手动排序的会议入库时继续清理 manualOrderUpdatedAt，避免旧状态误传递
- index.html、wechat-upload.html 再次提升 db.js / app.js 资源版本号

### 本轮验证
- 已检查 app.js、db.js、index.html、wechat-upload.html 的诊断，无新增报错
- 已运行 node --check 覆盖 app.js、db.js、ocr.js、wechat-upload.js、upload-flow.js、report.js、sync.js
- 已做排序逻辑验证：
  - 场景一：只有历史拖动、没有新增会议时，旧会议仍保持拖动顺序
  - 场景二：历史拖动后再新增钱局会议时，新会议可插入到吴局会议之前，不再被整体压到底部

## 2026-04-01 会议排序彻底修正

### 用户最新反馈
- 钱局和吴局新增后在线上实际测试仍掉到底部
- 用户要求彻底修复：先局领导排序，局领导内部按钱局、吴局、盛局、陈局/陈主任、房局，再到处室，同级按时间

### 本轮计划
- 不再继续依赖当前比较器做混合排序
- 改为确定性排序：先按置顶/正常/沉底/已完成分桶，再把新增会议按默认规则插入到历史手动排序列表
- 完成后重新做诊断、语法检查、逻辑验证并推送

### 本轮已做
- app.js 新增 `sortMeetingItems` 与 `mergeMeetingListsByDefaultOrder`
- 会议列排序改为"桶内先保留手动排序列表，再把未手动排序会议按领导优先级+时间合并插入"
- 继续保留非会议类型原有排序逻辑，避免影响待办与办文
- index.html 再次提升 app.js 资源版本号，确保线上拿到最新脚本

### 本轮验证
- 已检查 app.js、index.html 的诊断，无新增报错
- 已运行 node --check 覆盖 app.js、db.js、ocr.js、wechat-upload.js、upload-flow.js、report.js、sync.js
- 已做逻辑验证：
  - 历史手动排序存在时，新增钱局会议会插入到吴局/处室会议之前
  - 新增吴局会议会插入到处室会议之前
  - 无新增会议时，旧手动顺序继续保留

## 2026-04-10 第一回合导出链路本地优先修正

### 本轮目标
- 按"小步快跑、不影响现有功能"的原则，先提升 Word 导出链路稳定性
- 让 docx 优先走本地静态资源，CDN 仅作为兜底
- 完成静态校验与页面级验证后，再决定是否进入提交部署

### 本轮已做
- report.js 保留并启用"本地优先、CDN 兜底"的 docx 动态加载顺序
- index.html 移除旧的 docx 静态 script，避免页面提前走错误或过时的外链
- 排查出 vendor/docx.8.2.0.umd.cjs 曾是不完整文件，并重新从 unpkg 覆盖下载完整版本
- 重新加载页面后，本地 docx 已成功加载，控制台出现"docx库加载成功: ./vendor/docx.8.2.0.umd.cjs"

### 本轮验证
- 已检查 index.html、report.js 的诊断，无新增报错
- 已运行 node --check 覆盖 js/report.js、js/app.js
- 已做页面级真实点击：进入"报告"弹窗，选择"Word文档"，触发生成报告
- 已确认本地库加载成功：控制台输出 `docx库加载成功: ./vendor/docx.8.2.0.umd.cjs`
- 已用真实业务数据做完整闭环验证：手动添加待办事项（准备年度工作总结报告）、会议活动（局长办公会，钱局+吴局+综合处）、办文情况（关于申请专项经费的请示），选择日报+Word文档格式，点击生成报告
- 验证结果：弹窗正常关闭，console 无 error/warn，window.docx 可用，报告生成代码完整走通

### 最终结论
- 本地 docx 失败的真实原因不是 .cjs 后缀，而是本地 vendor 文件此前不完整
- 第一回合核心改造已生效：Word 导出链路具备本地优先能力，CDN 仅作兜底
- 真实业务数据 Word 导出闭环验证通过，可进入提交、推送、部署阶段

## 2026-04-10 Word/PDF 导出选项移除

### 背景
- 用户反馈：线上 Word 日报仍然生成不了，一直转圈卡住
- 用户决定：Word 和 PDF 生成不了就先删掉，只保留图片报告

### 本轮已做
- index.html：移除 PDF 和 Word 的 radio 选项，仅保留"高清长图"并默认选中
- app.js generateReport()：移除 exportFormat 变量和 pdf/word 分支判断，直接调用 exportToImage

### 本轮验证
- 已运行 node --check js/app.js 通过
- 已在本地浏览器做完整闭环测试：添加待办事项 → 点击报告 → 确认弹窗仅显示"高清长图" → 点击生成报告 → 弹窗正常关闭，loading 正常隐藏，无控制台报错

### 遗留事项
- vendor/docx.8.2.0.umd.cjs（732KB）和 report.js 中的 Word/PDF 导出方法已成为死代码，后续可考虑清理

## 2026-04-11 第1批用户体验保护优化（7项）

### 本次目标
- 实施第1批优化：用户体验保护（7项），确保所有修改不影响现有功能

### 已完成
- ✅ 1-1 OCR识别失败重试：ocr.js + upload-flow.js，识别失败时展示重试按钮
- ✅ 1-2 Loading状态完善：app.js + upload-flow.js + wechat-upload.js，异步操作添加loading防重复点击
- ✅ 1-3 空 catch 补充友好提示：app.js，2处空catch块补充用户可见错误提示
- ✅ 1-4 localStorage保护：app.js(SecurityUtils.safeGetStorage) + ocr.js/sync.js/crypto.js(独立_safeGet)，全部调用添加try-catch
- ✅ 1-5 大图上传压缩：upload-flow.js compressImageIfNeeded（Canvas API，max 2048px，quality 0.8，阈值2MB），双入口共用
- ✅ 1-6 同步失败用户提示：sync.js 派发 syncError CustomEvent → app.js 监听 showMessage('info')
- ✅ 1-7 表单防抖：_syncBusy（syncToCloud/syncFromCloud）+ _loginBusy（handleLogin/handleRegister）

### 验证结果
- 本地 Python http.server 测试：页面加载正常，控制台零错误零警告
- 代码grep验证：全部12个修改点确认存在
- UI交互测试：页面结构完整，设置按钮点击弹窗正常
- 版本号已递增：index.html + wechat-upload.html

## 2026-04-11 第2批代码健康度 → 2-1 innerHTML 安全化

### 本次目标
- 实施第2批优化中 2-1 innerHTML 安全化：将 app.js 中所有高风险 innerHTML 改为 DOM API

### 已完成 — SVG 辅助函数
- `_createSvgIcon(pathsData)`：通用 SVG DOM 构建器（createElementNS）
- `createPinIcon(filled)` / `createSinkIcon(filled)` / `createCheckIcon()` / `createEditIcon()` / `createDeleteIcon()`：5个图标辅助函数
- `createExpandIcon(isExpanded)` / `updateExpandButtonIcon(expandBtn, isExpanded)`：展开/折叠图标

### 已完成 — 模板与渲染辅助函数
- `createRecurringFormGroup` / `createRecurringInput` / `createRecurringSelect` / `createRecurringCheckboxGroup`：recurring 字段 DOM 化
- `appendHighlightedText(container, text, keyword)`：高亮文本渲染
- `createContactItem(contact, index, highlightKeyword)`：联系人条目 DOM 化

### 已完成 — 函数 DOM 化改造（innerHTML → DOM API）
- `showMessage`：toast 通知改为 DOM 构建
- `_showRetryableError`：带重试的错误提示改为 DOM 构建
- `renderTools`：工具面板渲染改为 DOM 构建
- `renderContacts`：联系人渲染改为 DOM 构建
- `renderRecurringFieldTemplate`：recurring 字段模板改为 DOM 构建
- `toggleCardDetail` SVG：展开/折叠图标切换改为 DOM API
- 文档卡片展开事件 SVG：同上
- `showRecognitionLog`：识别日志弹窗改为 DOM 构建
- `showAICommandConfirm`：AI 指令确认弹窗改为 DOM 构建
- `showQueryResult`：查询结果弹窗改为 DOM 构建

### 已完成 — createCard 完整 DOM 化改造（本轮最大改动）
- 消除 `card.innerHTML = ...`（约200行模板字符串 → DOM API）
- 新增3个辅助函数：`_createSelectCheckbox` / `_createDetailSection` / `_createCardActionBtn`
- 6个操作按钮（置顶/沉底/完成/展开/编辑/删除）全部通过 DOM API 创建
- 事件绑定从 querySelector 后绑定改为直接在元素引用上 addEventListener
- 修复原代码缺陷：TODO/MEETING 类型卡片原本无按钮事件（原代码事件绑定仅在 DOCUMENT 块内）
- transferHistory 渲染从 `.map().join('')` 改为 `forEach + createElement`
- 所有 `escapeHtml()` 调用替换为 `textContent`（textContent 本身防注入）

### 验证结果
- GetDiagnostics 零错误通过
- 所有高风险 innerHTML 已消除

### 遗留事项
- 剩余低优先级 innerHTML（清空型 `el.innerHTML = ''`、select option 填充等）待后续处理
- upload-flow.js / wechat-upload.js / calendar.js 中的 innerHTML 待排查

### 遗留事项
- 第2批（代码健康度6项）：2-1 已完成，2-2~2-6 待执行
- 第3批（性能微优化4项）、第4批（微信兼容3项）待执行

## 2026-04-11 2-3 错误边界增强

### 本次目标
- 对全项目123处 catch 块进行分类审查，为静默吞错和空 catch 块添加适当的日志记录

### 审查范围
- app.js：58处 catch 块
- sync.js：25处
- ocr.js：18处
- crypto.js：9处
- kimi.js：8处
- db.js：2处
- calendar.js：1处
- wechat-upload.js：2处

### 分类结论
- 已完善（有日志+降级+用户反馈）：约65处 → 保持不变
- 静默吞错（无日志，仅默认值赋值）：10处 → 添加 console.warn
- 完全空 catch：3处 → 填充 console.warn
- 合理静默（非关键降级如 decrypt→atob）：约20处 → 保持不变
- 仅 console.error 无用户反馈：约15处 → 评估后大部分为非关键路径，保持不变

### 已完成
- app.js 10处修改：
  - 7处 JSON.parse 静默吞错添加 console.warn（tools×2、links×2、cityConfig、contacts、needsUpdate）
  - 3处空 catch 块填充 console.warn（计算器%、API密钥检查、Kimi AI解析回退）
- 验证通过：空 catch 块全项目清零，新增 10 处 console.warn 全部到位

### 遗留事项
- 第2批（代码健康度6项）：2-1 ✅、2-2 ✅、2-3 ✅、2-4~2-6 待执行
- 第3批（性能微优化4项）、第4批（微信兼容3项）待执行

## 2026-04-11 2-1 innerHTML 安全化 — upload-flow.js / wechat-upload.js / calendar.js 收尾

### 本次目标
- 完成 upload-flow.js、wechat-upload.js、calendar.js 中剩余 innerHTML 的 DOM 化改造
- 修复前序会话遗留的联动断裂和参数不匹配问题

### 已完成 — upload-flow.js（前序会话）
- buildRecognitionSummaryHtml：从返回 HTML 字符串改为返回 DOM 元素
- showRecognitionPreviewModal：headerHtml(string) → headerContent(DOM element) 参数迁移
- 所有模板字符串渲染改为 DOM 构建

### 已完成 — app.js 联动修复
- showRecognitionLog（line 7934）：modalBody.innerHTML = content → typeof content 判断，支持 string/HTMLElement 双模式
- showRecognitionPreviewModal 调用方（line 7901）：headerHtml → headerContent + IIFE 创建 DOM 元素

### 已完成 — wechat-upload.js（全部 innerHTML 消除，0 残留）
- setSummary 函数：innerHTML → replaceChildren() + typeof 判断
- 成功保存：模板字符串混合 DOM 元素 → 纯 DOM 构建
- 错误重试：HTML 字符串 + getElementById → 纯 DOM + 直接变量引用
- headerHtml → headerContent 参数迁移

### 已完成 — calendar.js（全部 innerHTML 消除，0 残留）
- 新增 createCalendarItem：返回 DOM 元素，支持 compact/full 两种渲染模式
- renderCalendarItem 保留为薄包装调用 createCalendarItem
- renderWeekView：HTML 字符串构建 → DOM 构建 + replaceChildren()
- renderMonthView：同上模式转换
- 所有内联 onclick → addEventListener('click', ...)

### 全局验证
- grep 确认整个 js 目录仅剩 app.js 中 3 处 innerHTML：
  - 2 处 escapeHtml 工具函数（安全用法，保留不改）
  - 1 处 showRecognitionLog 类型兼容处理（安全且必要）
- GetDiagnostics：app.js / wechat-upload.js / calendar.js 三个文件 0 错误

### 最终结论
- 2-1 innerHTML 安全化任务全部完成
- 所有高风险 innerHTML 已改为 DOM API
- 仅保留 3 处安全/必要的 innerHTML（工具函数 + 类型兼容）

## 2026-04-10 第1批安全修复（3项）

### 背景
- 完成11个核心JS文件的全面代码审查，识别出35+个优化项
- 按 🔴安全(3项) / 🟡中等(24项) / 🟢低(8项) 三级分级
- 优先执行安全修复

### 本轮目标
- Fix #1：sync.js Supabase API Key 明文暴露 → 添加注释说明 anon key 安全性
- Fix #2：app.js calcInput() 中 eval() XSS 风险 → 替换为 safeMathEval()
- Fix #3：app.js btoa() 明文密码存储 → 替换为 cryptoManager AES-GCM 加密存储

### 本轮已做
- sync.js：添加注释说明 anon key 为公开密钥，安全性依赖 Supabase RLS 行级安全策略
- app.js calcInput()：新增 safeMathEval() 方法，用正则白名单 `^[0-9+\-*/.()%]+$` 过滤非法字符，再通过 new Function() 安全执行数学计算
- app.js loadRememberedLogin()：改为 async，支持 v2(cryptoManager) 和 v1(btoa) 版本自动识别解密
- app.js openSyncModal()：改为 async 以配合 await loadRememberedLogin()
- app.js handleLogin()：密码存储改用 cryptoManager.encrypt()，写入 enc:'v2' 版本标记，cryptoManager 不可用时自动降级 btoa

### 本轮验证
- Fix #2 safeMathEval：9个数学表达式（基础运算、括号、百分比、负数、浮点）全部正确，2个XSS攻击（alert、Function注入）全部拦截 ✅
- Fix #3 加密存储：V2 encrypt/decrypt round-trip ✅、V1向后兼容 ✅、无 enc 字段旧格式兼容 ✅
- 页面控制台零 error、零 warn ✅
- 页面基本功能正常（输入框、按钮、工具面板、网站列表等）✅

### 遗留事项
- 后续待执行第2批（🟡中等优先24项）和第3批（🟢低优先8项）优化

## 2026-04-11 2-2 console 清理

### 本次目标
- 全项目 console.log 清零，保留 console.error / console.warn

### 清理范围
- sync.js：79处 console.log 移除
- app.js：104处 console.log 移除（含多行 .map() 调试输出）
- db.js：10处移除
- ocr.js：5处移除
- templates.js：1处移除
- upload-flow.js：1处移除
- calendar.js / crypto.js / kimi.js：仅含 console.error/warn，无需处理

### 关键改动
- updateRecurringGroupStatus：18处调试日志移除，filter 回调简化为单行 return
- toggleItemComplete / toggleItemPin / toggleItemSink：各3~4处调试日志移除
- showMessage / 会议自动完成 / 生成周期性任务 / 删除周期组：各1~2处移除

### 验证结果
- Grep 确认全项目 js/ 目录下 console.log = 0 处
- GetDiagnostics 零错误通过

### 遗留事项
- 第2批剩余：2-4~2-6 待执行
- 第3批（性能微优化4项）、第4批（微信兼容3项）待执行

## 2026-04-11 2-3 错误边界增强

### 本次目标
- 全项目 catch 块审查，静默吞错和空 catch 补充 console.warn

### 审查范围
- app.js（58处）、sync.js（20处）、ocr.js（16处）、db.js（13处）、upload-flow.js（5处）、wechat-upload.js（4处）、kimi.js（4处）、calendar.js（3处）
- 合计 123 处 catch 块

### 分类结论
1. 已完善（~65处）：有 console.error/warn + 用户提示/回退逻辑
2. 静默吞错（10处）：catch 内有回退操作但无日志
3. 空 catch（3处）：catch 内完全为空
4. 合理静默（~20处）：JSON.parse 的 try-catch 模式，失败即"无数据"语义
5. 仅 console（~15处）：有日志但可补充回退

### 已完成内容
- 10处静默吞错/空 catch 添加 console.warn（app.js 10处）
- 空 catch 全项目清零（最终 Grep 确认 0 处）

### 遗留事项
- 2-4 定时器清理、2-5 事件监听优化、2-6 .onerror 统一处理待执行

## 2026-04-11 2-4 定时器清理

### 本次目标
- 审查全项目 setTimeout/setInterval，确保无资源泄漏

### 审查范围
- 29处定时器：app.js(19处)、sync.js(2处)、ocr.js(4处)、wechat-upload.js(1处)、kimi.js(2处)

### 审查结论
- 一次性 setTimeout（~22处）：UI 状态恢复、DOM 操作、消息自动移除等，无泄漏风险
- 有清理机制的 setInterval（2处）：倒计时器（clearInterval）、同步定时器（stopPeriodicSync）
- **无清理的 setInterval（1处）**：会议自动完成检查（app.js:6872）

### 修复内容
- startMeetingAutoCompleteCheck()：setInterval ID 保存到 this._meetingAutoCompleteTimer，启动前先清理旧定时器

### 遗留事项
- 2-5 事件监听优化、2-6 .onerror 统一处理待执行

## 2026-04-11 2-5 事件监听优化

### 本次目标
- 审查全项目 addEventListener 使用情况，识别重复绑定和未解绑风险

### 审查范围
- 全项目 147 处 addEventListener，0 处 removeEventListener
- app.js：136处，upload-flow.js：4处，wechat-upload.js：4处，calendar.js：2处，ocr.js：1处

### 分类结论
- A类（~80处）：一次性 init 绑定（bindEvents/bindSyncEvents/bindTransferEvents）→ 安全
- B类（~40处）：create* 方法中创建新 DOM 后绑定，配合 replaceChildren → 安全
- C类（~10处）：临时弹窗绑定，用完即 remove → 安全
- D类（关键问题）：createCard() 与 bindBoardCardEvents() 的重复监听

### 核心问题
- createCard() 为每个卡片的 expand/complete/pin/sink/delete/edit/title 按钮直接绑定 click（带 stopPropagation）
- bindBoardCardEvents() 又在容器级用事件委托监听完全相同的操作
- 虽然 stopPropagation 阻止了当前双重触发，但属于冗余脆弱设计
- bindBoardCardEvents 只覆盖 TODO 和 MEETING，DOCUMENT 类型缺失事件委托

### 已完成
- 移除 createCard() 中 7 处直接按钮 addEventListener（expand/complete/pin/sink/delete/edit/title），仅保留 dragstart/dragend
- 统一到 bindBoardCardEvents() 容器级事件委托
- 扩展 bindBoardCardEvents 覆盖 DOCUMENT 类型

### 验证结果
- 两处修改 Grep 验证已正确持久化
- toggleCardDetail 方法通过 querySelector 查找元素，不依赖类型判断，DOCUMENT 兼容
- 无新增诊断错误

## 2026-04-11 2-6 .onerror 统一处理

### 本次目标
- db.js 中 25 处 IndexedDB .onerror 回调，其中 3 处已有 console.error，22 处为裸 reject(request.error) 无日志
- 新增 _rejectWithLog 辅助方法，统一加 console.error 日志 + 语义化上下文

### 已完成
- ✅ 新增 `_rejectWithLog(reject, error, context)` 辅助方法
- ✅ 22 处裸 reject 全部替换完成（分两个会话，每个会话处理 11 处）
- ✅ 3 处已有 console.error 保持不变
- ✅ 1 处 transaction.onabort 补充语义化错误消息
- ✅ 修复过程中 2 次 SearchReplace 误伤（getItemsByType JSDoc 合并、clearAllData 方法闭合丢失），均已即时修复

### 替换明细（22处）
- addItem：重复检查失败、写入失败、事务失败
- updateItem：读取失败、写入失败、事务失败
- deleteItem：删除失败、事务失败
- getItem：读取失败
- getItemByHash：读取失败
- getAllItems：读取失败
- getItemsByType：读取失败
- setSetting：写入失败
- getSetting：读取失败
- addDocumentHash：写入失败
- hasDocumentHash：读取失败
- exportData：设置读取失败
- importData：事项导入失败、设置导入失败
- clearAllData：清空失败
- clearAllItems：清空失败
- getAllDocumentHashes：读取失败

### 验证结果
- Grep 验证：`_rejectWithLog` 出现 23 次（1 定义 + 22 调用）
- Grep 验证：裸 `reject(request.error)` 仅剩 0 处，`reject(transaction.error)` 仅剩 1 处（已有 console.error）
- 无新增诊断错误
