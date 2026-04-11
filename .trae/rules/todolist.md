# Todolist

## 当前优化方案总览（4批20项）

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
| 2-3 | 错误边界增强 | 全部 JS | 100+ catch 块统一错误分类和恢复策略 | ⬜ 待做 |
| 2-4 | 定时器清理 | app.js, sync.js, report.js | 27处 setTimeout/setInterval 确保页面切换时清理 | ⬜ 待做 |
| 2-5 | 事件监听优化 | app.js | 133处 addEventListener 检查是否有重复绑定或未解绑 | ⬜ 待做 |
| 2-6 | .onerror 统一处理 | db.js | 28处 .onerror 统一为可追踪的错误处理 | ⬜ 待做 |

### 🟢 第3批：性能微优化（4项）
| # | 优化项 | 文件 | 说明 | 状态 |
|---|--------|------|------|------|
| 3-1 | DOM 操作批量处理 | app.js | 414处 querySelector/getElementById 中识别可合并的DOM操作 | ⬜ 待做 |
| 3-2 | 资源懒加载 | index.html | 非首屏JS文件延迟加载，加快首屏速度 | ⬜ 待做 |
| 3-3 | 缓存策略优化 | sync.js, db.js | IndexedDB 查询结果缓存，减少重复查询 | ⬜ 待做 |
| 3-4 | 脚本版本号自动化 | index.html | 当前手动维护 ?v=63，改为构建时自动更新 | ⬜ 待做 |

### 🔵 第4批：微信兼容（3项）
| # | 优化项 | 文件 | 说明 | 状态 |
|---|--------|------|------|------|
| 4-1 | 微信返回按钮处理 | wechat-upload.js | 微信内置浏览器返回行为适配 | ⬜ 待做 |
| 4-2 | 微信分享卡片 | index.html | 配置微信分享时的标题、描述和图标 | ⬜ 待做 |
| 4-3 | 微信环境检测增强 | app.js, wechat-upload.js | 更精确的微信环境检测和降级方案 | ⬜ 待做 |

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
