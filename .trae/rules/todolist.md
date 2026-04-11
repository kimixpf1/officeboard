# Todolist

## 当前优化方案总览（5批23项）

### 🔴 第1批：用户体验保护（7项） — ✅ 全部完成（2026-04-11）
| # | 优化项 | 文件 | 说明 | 状态 |
|---|--------|------|------|------|
| 1-1 | OCR 识别失败重试 | ocr.js, upload-flow.js | 识别失败时给用户"重试"按钮而非只显示错误 | ✅ 完成 |
| 1-2 | loading 状态完善 | app.js, upload-flow.js, wechat-upload.js | 所有异步操作添加 loading 提示，防止用户重复点击 | ✅ 完成 |
| 1-3 | 空 catch 补充友好提示 | app.js | 2处空 catch 块补充用户可见的错误提示 | ✅ 完成 |
| 1-4 | localStorage 保护 | app.js, ocr.js, sync.js, crypto.js | 全部 localStorage 调用添加 try-catch 和容量溢出处理 | ✅ 完成 |
| 1-5 | 大图上传压缩 | upload-flow.js, wechat-upload.js | 超过2MB图片自动压缩（Canvas API），双入口共用 | ✅ 完成 |
| 1-6 | 同步失败用户提示 | sync.js, app.js | sync.js 派发 syncError 事件 → app.js 监听 showMessage | ✅ 完成 |
| 1-7 | 表单防抖 | app.js | _syncBusy（同步）+ _loginBusy（登录/注册）防重复提交 | ✅ 完成 |

### 🟡 第2批：代码健康度（6项）
| # | 优化项 | 文件 | 说明 | 状态 |
|---|--------|------|------|------|
| 2-1 | innerHTML 安全化 | app.js, upload-flow.js, wechat-upload.js, calendar.js | 全部高风险innerHTML已DOM化；仅剩app.js中3处安全用法（2处escapeHtml工具函数+1处类型兼容处理）；calendar.js新增createCalendarItem+renderWeekView/renderMonthView纯DOM构建；wechat-upload.js全部消除 | ✅ 完成 |
| 2-2 | console 清理 | 全部 JS | 285处→全部console.log清零，保留console.error/warn | ✅ 完成 |
| 2-3 | 错误边界增强 | app.js | 123处catch块审查分类；10处静默吞错/空catch添加console.warn；空catch清零 | ✅ 完成 |
| 2-4 | 定时器清理 | app.js, sync.js | 29处审查；1处setInterval未保存ID已修复（会议自动完成）；其余均为一次性/已有清理 | ✅ 完成 |
| 2-5 | 事件监听优化 | app.js | 147处addEventListener审查；createCard 7处直接绑定移除，统一到 bindBoardCardEvents 事件委托；DOCUMENT类型纳入委托覆盖 | ✅ 完成 |
| 2-6 | .onerror 统一处理 | db.js | 22处裸reject统一为_rejectWithLog，加语义化上下文日志 | ✅ 完成 |

### 🟢 第3批：性能微优化（4项） — ⏭️ 跳过（收益有限）
| # | 优化项 | 文件 | 说明 | 状态 |
|---|--------|------|------|------|
| 3-1 | DOM 操作批量处理 | app.js | 事件驱动型应用，无批量渲染场景 | ⏭️ 跳过 |
| 3-2 | 资源懒加载 | index.html | defer方案用户选择跳过 | ⏭️ 跳过 |
| 3-3 | 缓存策略优化 | sync.js, db.js | 重复查询频率低，收益有限 | ⏭️ 跳过 |
| 3-4 | 脚本版本号自动化 | index.html | 纯静态项目无构建流程 | ⏭️ 跳过 |

### 🔵 第4批：微信兼容（3项）
| # | 优化项 | 文件 | 说明 | 状态 |
|---|--------|------|------|------|
| 4-1 | 微信返回按钮处理 | wechat-upload.js | location.replace替代location.href，防止返回死循环 | ✅ 完成 |
| 4-2 | 微信分享卡片 | index.html | 需要微信JS-SDK+后端签名，纯静态站无法实现 | ⏭️ 跳过 |
| 4-3 | 微信环境检测增强 | app.js, wechat-upload.js | IndexedDB/FileReader可用性检测+微信能力探测 | ✅ 完成 |

### 🟣 第5批：代码重构优化（3项） — ✅ 全部完成（2026-04-11）
| # | 优化项 | 文件 | 说明 | 状态 |
|---|--------|------|------|------|
| 5-1 | 公共工具提取 | utils.js(新), app.js, ocr.js, sync.js, crypto.js, kimi.js | SafeStorage + fetchWithRetry 消除4文件重复代码 | ✅ 完成 |
| 5-2 | 假期数据外置 | utils.js, app.js | HolidayData 集中管理2024-2026年假期+补班日，isWorkday/isHoliday统一委托 | ✅ 完成 |
| 5-3 | 加密密钥迁移 | crypto.js, db.js | 主密钥从 localStorage 迁移到 IndexedDB，自动迁移旧数据 | ✅ 完成 |

---

## 已完成（历史记录摘要）

### 安全优化第1批（已完成）
- ✅ eval() → safeMathEval()（正则白名单+new Function）
- ✅ btoa() → cryptoManager AES-GCM 256位加密（带v2版本标记向后兼容）
- ✅ Supabase anon key 安全性注释

### 架构优化（已完成）
- ✅ 根目录文件重组：中文文档 → .trae/rules/ 英文命名
- ✅ upload-flow.js 提取：共享识别预览与确认逻辑
- ✅ 导出链路本地优先：vendor/ 目录 → CDN 兜底
- ✅ 同步日志摘要化：减少敏感信息暴露
- ✅ 预览弹窗一次性关闭保护
- ✅ 预览中展示判断依据和匹配摘要
- ✅ 会议排序：领导优先+时间分桶，拖动仅约束旧会议

### 规则文件整理（2026-04-11 完成）
- ✅ project_rules.md 去重去冗余，只保留项目特有规则
- ✅ project_framework.md 清理迭代过程记录，只保留当前稳定状态
- ✅ universal_template.md 补充7条新通用原则（隐私安全/代码简洁/文件有序/防回退/部署告知/方案归档/规则不重不漏）
- ✅ 永久记忆同步更新（8条→15条通用原则）

## 长期目标
- 持续渐进优化，确保所有功能稳定运行
- 优化方案写入todolist.md并实时更新，避免遗忘
- 规则文件维护坚持不重不漏原则

## 已完成（2026-04-11 跨设备同步修复）
- ✅ smartSync首次同步走合并逻辑
- ✅ uploadToCloud空数据保护
- ✅ uploadToCloud读取云端实际updated_at
- ✅ downloadFromCloud/mergeData/silentSyncFromCloud/syncFromCloud全部加备份回滚
- ✅ clearAllItems全部加try-catch
