# 项目框架

## 根目录
- index.html：主页面入口，加载工作面板主体
- wechat-upload.html：微信专用上传识别入口
- css/style.css：全局样式
- supabase_setup.sql：Supabase 初始化脚本
- supabase_setup_safe.sql：更安全的 Supabase 初始化脚本

## js 模块
- js/app.js：主界面交互、视图切换、上传入口、识别预览确认
- js/ocr.js：OCR/AI 识别、会议去重、识别动作计划、确认写入
- js/upload-flow.js：共享的识别预览与确认逻辑（主页面与微信页共用）
- js/wechat-upload.js：微信上传页交互、预览确认、保存执行
- js/db.js：本地数据存储与事项增删改查
- js/sync.js：云端同步逻辑
- js/report.js：报告生成与导出（当前仅保留高清长图导出）
- js/calendar.js：日历相关逻辑
- js/templates.js：模板与渲染辅助
- js/crypto.js：加密相关工具（AES-GCM 256位加密，CryptoManager）
- js/kimi.js：Kimi 相关能力封装

## 核心流程
- 主页面上传：选择文件 → OCR 识别 → 预览确认 → 确认后写入面板
- 微信上传：进入轻量页 → 选择文件 → OCR 识别 → 预览确认 → 确认后写入面板
- 会议识别：标题清洗 → 时间地点归一化 → 已有会议比对 → 新增 / 合并 / 跳过
- 取消兜底：预览前先抓取事项快照，若点击取消则恢复快照，确保不发生误写入
- 会议排序：置顶/正常/沉底/已完成分桶 → 新增会议按领导优先+时间插入 → 手动排序仅约束拖动时的旧会议
- 领导优先顺序：钱局 → 吴局 → 盛局 → 陈局/陈主任 → 房局 → 处室

## 双入口架构
- 保留双入口：index.html 负责桌面完整工作台；wechat-upload.html 负责微信轻量上传
- 共用逻辑收敛到 js/upload-flow.js
- 微信上传成功后约1秒自动返回主页面

## 已完成的安全优化（第1批）
- 计算器：eval() → safeMathEval()，正则白名单过滤
- 密码存储：btoa() → cryptoManager AES-GCM 256位加密，带v2版本标记向后兼容
- API Key：Supabase anon key 添加安全性注释

## 已完成的导出优化
- Word/PDF 导出已移除，仅保留高清长图导出
- 导出模块脚本动态加载支持复用、超时清理、已加载标记
- 本地优先加载 vendor/ 资源，失败后回退 CDN

## 已完成的同步优化
- 同步模块日志从明细输出改为摘要输出，减少敏感信息暴露

## 已完成的 console 清理（2-2）
- 全项目 console.log 已清零（共约200处移除）
- 保留所有 console.error / console.warn 用于错误追踪
- 涉及文件：sync.js(79)、app.js(104)、db.js(10)、ocr.js(5)、templates.js(1)、upload-flow.js(1)

## 已完成的错误边界增强（2-3）
- 全项目123处 catch 块审查分类（app.js 58、sync.js 25、ocr.js 18、crypto.js 9、kimi.js 8、db.js 2、calendar.js 1、wechat-upload.js 2）
- app.js 10处静默吞错/空 catch 添加 console.warn（JSON.parse回退×7 + 空catch×3）
- 空 catch 块全项目清零

## 已完成的定时器清理（2-4）
- 全项目29处 setTimeout/setInterval 审查
- 1处 setInterval 未保存 ID 已修复（会议自动完成检查，保存到 this._meetingAutoCompleteTimer）
- 其余均为一次性定时器或已有清理机制，无泄漏风险

## 已完成的预览优化
- 主页面与微信页预览弹窗增加一次性关闭保护，防重复触发
- 预览中展示新增/合并/跳过判断依据和匹配到的已有会议摘要

## 已完成的排序优化
- 未拖动且未完成会议默认按领导优先级+时间排序
- 拖动排序仅影响当时已存在的会议，后续新增会议重新走默认规则
- OCR 二次校正层统一领导别名纠偏规则

## 已完成的 innerHTML 安全化（2-1）
- 全部高风险 innerHTML 已改为 DOM API（createElement/textContent/appendChild/replaceChildren）
- 仅保留 3 处安全/必要的 innerHTML：2 处 escapeHtml 工具函数 + 1 处类型兼容处理
- 涉及文件：app.js、upload-flow.js、wechat-upload.js、calendar.js
- calendar.js 新增 createCalendarItem 辅助函数（返回 DOM 元素），renderWeekView/renderMonthView 改为纯 DOM 构建
- wechat-upload.js setSummary 改为 replaceChildren() + 类型判断，全部 innerHTML 消除
- 所有内联 onclick 改为 addEventListener

## 已完成的 .onerror 统一处理（2-6）
- db.js 新增 _rejectWithLog 辅助方法（console.error + reject 一步完成）
- 22 处裸 reject(request.error) 统一替换为 _rejectWithLog，每处附带语义化上下文（如"addItem写入失败"、"getAllItems读取失败"）
- 3 处已有 console.error 的 .onerror 保持不变（数据库打开失败、sortItems 获取失败、排序事务失败）
- 1 处 transaction.onabort 添加语义化错误消息

## 已完成的事件监听优化（2-5）
- 全项目 147 处 addEventListener 审查完毕，0 处 removeEventListener
- createCard() 中 7 处直接按钮监听移除（expand/complete/pin/sink/delete/edit/title），统一到 bindBoardCardEvents() 容器级事件委托
- bindBoardCardEvents 覆盖范围从 TODO+MEETING 扩展为 TODO+MEETING+DOCUMENT
- 仅保留 dragstart/dragend 为直接绑定（拖拽事件不适合委托）
