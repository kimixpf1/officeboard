# 项目框架

## 技术栈
- 前端：原生 HTML + CSS + JavaScript（无构建流程）
- 本地存储：IndexedDB + localStorage（通过 SafeStorage 做安全封装）
- 云端同步：Supabase
- AI / OCR：Kimi、DeepSeek，统一经 js/ocr.js / js/kimi.js 封装
- 部署方式：静态站点部署

## 根目录稳定结构
- index.html：桌面完整工作台入口，加载主面板、右侧折叠面板、报告与设置等能力
- wechat-upload.html：微信轻量上传入口，只保留上传识别与确认链路
- css/style.css：全局样式与响应式布局
- js/：核心业务脚本目录
- vendor/：本地优先静态依赖资源
- .claude/rules/：项目规则、框架、待办与迭代记录

## js 模块职责
- js/utils.js：通用工具（SafeStorage、fetchWithRetry、HolidayData、safeJsonParse）
- js/app.js：主界面控制器，负责视图切换、事项增删改查入口、排序、批量操作、弹窗、跨日期/周期性逻辑
- js/db.js：IndexedDB 数据读写、规范化与基础数据模型持久化
- js/sync.js：云端登录、上传、下载、合并、静默同步与回滚保护
- js/ocr.js：OCR / AI 识别、会议去重、动作计划、确认写入
- js/upload-flow.js：主页面与微信页共用的识别预览、摘要与确认流程
- js/wechat-upload.js：微信轻量页交互、能力检测、上传保存与自动返回
- js/report.js：报告生成与高清长图导出
- js/calendar.js：日历周/月视图渲染
- js/crypto.js：加密能力与密钥管理
- js/kimi.js：Kimi 请求封装与 AI 能力适配

## 核心稳定链路

### 1. 主页面上传识别链路
选择文件 → OCR / AI 识别 → 预览确认 → 用户确认后写入本地面板 → 视情况同步到云端

### 2. 微信上传链路
进入 wechat-upload.html → 选择文件 → OCR / AI 识别 → 预览确认 → 保存 → 约 1 秒后自动返回主页面

### 3. 会议识别链路
标题清洗 → 时间地点归一化 → 与已有会议比对 → 生成新增 / 合并 / 跳过动作计划 → 预览确认 → 写入

### 4. 跨日期办文链路
创建办文时可记录开始/结束日期与跳过周末规则 → 渲染时按 selectedDate 解析 dayStates 覆盖 → 编辑/完成/置顶/沉底/删除支持“仅当天 / 今天及之后 / 全部日期”三类作用范围

### 5. 同步保护链路
本地与云端比较 → 需要时上传、下载或合并 → 清空前先备份 → 异常时回滚恢复 → 成功后广播同步事件

## 当前稳定业务规则
- 双入口架构保留：index.html 负责完整工作台，wechat-upload.html 负责微信兼容上传
- 会议默认排序：置顶 / 正常 / 沉底 / 已完成分桶后，按领导优先级与时间排序；已拖动旧会议保留手动顺序
- 领导优先级：钱局 → 吴局 → 盛局 → 房局 → 陈局 / 陈主任 → 其他领导 → 处室 → 其他
- OCR 预览必须支持新增 / 合并 / 跳过依据说明与已有会议摘要展示
- 跨日期办文必须支持 dayStates 按日期覆盖，且历史日期与“今天及之后”范围修改互不串扰

## 当前规则维护约束
- project_framework.md 只记录稳定结构、稳定职责和稳定链路
- 单次修复过程、临时问题分析、提交明细放到 project_iteration_log.md
- 当前轮次的执行项和跳过项放到 todolist.md
