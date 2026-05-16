/**
 * OCR内置测试模块
 * 包含100种测试组合及测试运行器
 * 通过 Object.assign(OCRManager.prototype, OCRTests) 混入
 */
const OCRTests = {

    /**
     * 内置100种测试组合
     */
    getTestCases() {
        return [
            // === 日期格式测试 (20种) ===
            { input: '今天下午3点开会', expected: { date: 'today', time: '15:00' } },
            { input: '明天上午9点30分会议', expected: { date: 'tomorrow', time: '09:30' } },
            { input: '后天晚上7点讨论会', expected: { date: 'dayAfter', time: '19:00' } },
            { input: '下周一上午10点例会', expected: { time: '10:00' } },
            { input: '下周二下午2点半培训', expected: { time: '14:30' } },
            { input: '下周三晚上8点视频会议', expected: { time: '20:00' } },
            { input: '下周四中午12点午餐会', expected: { time: '12:00' } },
            { input: '下周五上午9点周会', expected: { time: '09:00' } },
            { input: '3月16日上午8:50会议', expected: { date: '2026-03-16', time: '08:50' } },
            { input: '3月20日下午3点座谈会', expected: { date: '2026-03-20', time: '15:00' } },
            { input: '4月1日晚上7点研讨会', expected: { date: '2026-04-01', time: '19:00' } },
            { input: '4月15日中午12点工作餐', expected: { date: '2026-04-15', time: '12:00' } },
            { input: '5月1日上午9点庆祝会', expected: { date: '2026-05-01', time: '09:00' } },
            { input: '2026年6月1日下午2点活动', expected: { date: '2026-06-01', time: '14:00' } },
            { input: '2026-07-15上午10点会议', expected: { date: '2026-07-15', time: '10:00' } },
            { input: '本周五下午4点总结会', expected: { time: '16:00' } },
            { input: '今晚7点半视频会议', expected: { time: '19:30' } },
            { input: '今晚8点讨论', expected: { time: '20:00' } },
            { input: '周一上午9点例会', expected: { time: '09:00' } },
            { input: '周五下午5点周总结', expected: { time: '17:00' } },

            // === 地点格式测试 (20种) ===
            { input: '会议室A开会', expected: { location: '会议室A' } },
            { input: '会议室B讨论', expected: { location: '会议室B' } },
            { input: '第一会议室开会', expected: { location: '第一会议室' } },
            { input: '第二会议室讨论', expected: { location: '第二会议室' } },
            { input: '一号楼会议室开会', expected: { location: '一号楼会议室' } },
            { input: '二号楼会议室讨论', expected: { location: '二号楼会议室' } },
            { input: '三号楼1号会议室开会', expected: { location: '三号楼1号会议室' } },
            { input: '二号楼1号会议室专题会议', expected: { location: '二号楼1号会议室' } },
            { input: '五号楼大会议室培训', expected: { location: '五号楼大会议室' } },
            { input: '在会议室A开会', expected: { location: '会议室A' } },
            { input: '在第一会议室开会', expected: { location: '第一会议室' } },
            { input: '地点：会议室B', expected: { location: '会议室B' } },
            { input: '地点是三楼会议室', expected: { location: '三楼会议室' } },
            { input: '二楼会议室午餐会', expected: { location: '二楼会议室' } },
            { input: '培训室培训', expected: { location: null } },
            { input: '大会议室开会', expected: { location: '大会议室' } },
            { input: '小会议室讨论', expected: { location: '小会议室' } },
            { input: '视频会议室开会', expected: { location: '视频会议室' } },
            { input: 'A栋会议室开会', expected: { location: 'A栋会议室' } },
            { input: '行政楼会议室开会', expected: { location: '行政楼会议室' } },

            // === 参会人员测试 (20种) ===
            { input: '和王总开会', expected: { attendees: ['王总'] } },
            { input: '和李经理讨论', expected: { attendees: ['李经理'] } },
            { input: '和张主任开会', expected: { attendees: ['张主任'] } },
            { input: '和刘处长座谈', expected: { attendees: ['刘处长'] } },
            { input: '和陈科长开会', expected: { attendees: ['陈科长'] } },
            { input: '和王总、李经理开会', expected: { attendees: ['王总', '李经理'] } },
            { input: '和张三、李四、王五开会', expected: { attendees: ['王五'] } },
            { input: '和财务部开会', expected: { attendees: ['财务部'] } },
            { input: '和人事部讨论', expected: { attendees: ['人事部'] } },
            { input: '和技术部座谈', expected: { attendees: ['技术部'] } },
            { input: '与财务部、人事部开会', expected: { attendees: ['财务部', '人事部'] } },
            { input: '与市场部、销售部讨论', expected: { attendees: ['市场部', '销售部'] } },
            { input: '参会人员：张三、李四', expected: { attendees: ['张三', '李四'] } },
            { input: '出席人员：王总、李经理', expected: { attendees: ['王总', '李经理'] } },
            { input: '与会人员：张主任', expected: { attendees: ['张主任'] } },
            { input: '组织财务部开会', expected: { attendees: ['财务部'] } },
            { input: '召集各部门负责人开会', expected: { attendees: ['各部门负责人'] } },
            { input: '和王总在会议室A开会', expected: { attendees: ['王总'], location: '会议室A' } },
            { input: '和李经理在第一会议室讨论', expected: { attendees: ['李经理'], location: '第一会议室' } },
            { input: '全体员工大会', expected: { attendees: ['全体员工'] } },

            // === 会议类型测试 (20种) ===
            { input: '项目讨论会', expected: { type: 'meeting' } },
            { input: '预算协调会', expected: { type: 'meeting' } },
            { input: '工作例会', expected: { type: 'meeting' } },
            { input: '部门周会', expected: { type: 'meeting' } },
            { input: '月度总结会', expected: { type: 'meeting' } },
            { input: '季度分析会', expected: { type: 'meeting' } },
            { input: '年度总结会', expected: { type: 'meeting' } },
            { input: '专题座谈会', expected: { type: 'meeting' } },
            { input: '技术研讨会', expected: { type: 'meeting' } },
            { input: '项目汇报会', expected: { type: 'meeting' } },
            { input: '工作部署会', expected: { type: 'meeting' } },
            { input: '协调推进会', expected: { type: 'meeting' } },
            { input: '培训会议', expected: { type: 'meeting' } },
            { input: '学习交流会', expected: { type: 'meeting' } },
            { input: '安全工作会议', expected: { type: 'meeting' } },
            { input: '质量分析会', expected: { type: 'meeting' } },
            { input: '进度汇报会', expected: { type: 'meeting' } },
            { input: '视频会议', expected: { type: 'meeting' } },
            { input: '电话会议', expected: { type: 'meeting' } },
            { input: '临时会议', expected: { type: 'meeting' } },

            // === 待办事项测试 (100种) - 提交类 ===
            { input: '提交季度报告', expected: { type: 'todo' } },
            { input: '提交月度总结', expected: { type: 'todo' } },
            { input: '提交年度工作报告', expected: { type: 'todo' } },
            { input: '提交项目立项申请', expected: { type: 'todo' } },
            { input: '提交预算方案', expected: { type: 'todo' } },
            { input: '提交采购申请', expected: { type: 'todo' } },
            { input: '提交报销单据', expected: { type: 'todo' } },
            { input: '提交请假申请', expected: { type: 'todo' } },
            { input: '提交出差申请', expected: { type: 'todo' } },
            { input: '提交加班申请', expected: { type: 'todo' } },
            { input: '提交合同审批', expected: { type: 'todo' } },
            { input: '提交付款申请', expected: { type: 'todo' } },
            { input: '提交验收报告', expected: { type: 'todo' } },
            { input: '提交整改方案', expected: { type: 'todo' } },
            { input: '提交培训计划', expected: { type: 'todo' } },
            { input: '提交招聘需求', expected: { type: 'todo' } },
            { input: '提交绩效考核表', expected: { type: 'todo' } },
            { input: '提交会议纪要', expected: { type: 'todo' } },
            { input: '提交调研报告', expected: { type: 'todo' } },
            { input: '提交可行性分析', expected: { type: 'todo' } },

            // === 待办事项测试 - 完成类 ===
            { input: '完成月度总结', expected: { type: 'todo' } },
            { input: '完成项目验收', expected: { type: 'todo' } },
            { input: '完成合同签订', expected: { type: 'todo' } },
            { input: '完成系统测试', expected: { type: 'todo' } },
            { input: '完成数据整理', expected: { type: 'todo' } },
            { input: '完成文件归档', expected: { type: 'todo' } },
            { input: '完成资产盘点', expected: { type: 'todo' } },
            { input: '完成培训课程', expected: { type: 'todo' } },
            { input: '完成方案设计', expected: { type: 'todo' } },
            { input: '完成代码开发', expected: { type: 'todo' } },
            { input: '完成文档编写', expected: { type: 'todo' } },
            { input: '完成需求分析', expected: { type: 'todo' } },
            { input: '完成客户回访', expected: { type: 'todo' } },
            { input: '完成市场调研', expected: { type: 'todo' } },
            { input: '完成竞品分析', expected: { type: 'todo' } },
            { input: '完成财务报表', expected: { type: 'todo' } },
            { input: '完成审计配合', expected: { type: 'todo' } },
            { input: '完成安全检查', expected: { type: 'todo' } },
            { input: '完成设备维护', expected: { type: 'todo' } },
            { input: '完成年度总结', expected: { type: 'todo' } },

            // === 待办事项测试 - 汇报类 ===
            { input: '汇报项目进度', expected: { type: 'todo' } },
            { input: '汇报工作进展', expected: { type: 'todo' } },
            { input: '汇报预算执行情况', expected: { type: 'todo' } },
            { input: '汇报安全生产情况', expected: { type: 'todo' } },
            { input: '汇报客户反馈', expected: { type: 'todo' } },
            { input: '汇报市场动态', expected: { type: 'todo' } },
            { input: '汇报团队建设', expected: { type: 'todo' } },
            { input: '汇报培训效果', expected: { type: 'todo' } },
            { input: '汇报质量问题', expected: { type: 'todo' } },
            { input: '汇报风险预警', expected: { type: 'todo' } },
            { input: '汇报成本控制', expected: { type: 'todo' } },
            { input: '汇报人员变动', expected: { type: 'todo' } },
            { input: '汇报设备故障', expected: { type: 'todo' } },
            { input: '汇报突发事件', expected: { type: 'todo' } },
            { input: '汇报整改落实', expected: { type: 'todo' } },
            { input: '汇报绩效考核', expected: { type: 'todo' } },
            { input: '汇报合同执行', expected: { type: 'todo' } },
            { input: '汇报采购进度', expected: { type: 'todo' } },
            { input: '汇报验收结果', expected: { type: 'todo' } },
            { input: '汇报年度计划', expected: { type: 'todo' } },

            // === 待办事项测试 - 准备类 ===
            { input: '准备会议材料', expected: { type: 'todo' } },
            { input: '准备汇报PPT', expected: { type: 'todo' } },
            { input: '准备合同文本', expected: { type: 'todo' } },
            { input: '准备招标文件', expected: { type: 'todo' } },
            { input: '准备培训课件', expected: { type: 'todo' } },
            { input: '准备会议议程', expected: { type: 'todo' } },
            { input: '准备接待方案', expected: { type: 'todo' } },
            { input: '准备调研问卷', expected: { type: 'todo' } },
            { input: '准备测试数据', expected: { type: 'todo' } },
            { input: '准备验收清单', expected: { type: 'todo' } },
            { input: '准备付款材料', expected: { type: 'todo' } },
            { input: '准备报销凭证', expected: { type: 'todo' } },
            { input: '准备请假手续', expected: { type: 'todo' } },
            { input: '准备出差物品', expected: { type: 'todo' } },
            { input: '准备面试题目', expected: { type: 'todo' } },
            { input: '准备考核指标', expected: { type: 'todo' } },
            { input: '准备活动方案', expected: { type: 'todo' } },
            { input: '准备应急预案', expected: { type: 'todo' } },
            { input: '准备宣传材料', expected: { type: 'todo' } },
            { input: '准备年会议程', expected: { type: 'todo' } },

            // === 待办事项测试 - 其他类 ===
            { input: '撰写工作报告', expected: { type: 'todo' } },
            { input: '整理会议纪要', expected: { type: 'todo' } },
            { input: '处理审批事项', expected: { type: 'todo' } },
            { input: '审核合同文件', expected: { type: 'todo' } },
            { input: '修改方案文档', expected: { type: 'todo' } },
            { input: '回复重要邮件', expected: { type: 'todo' } },
            { input: '确认参会人员', expected: { type: 'todo' } },
            { input: '安排会议室', expected: { type: 'todo' } },
            { input: '通知相关人员', expected: { type: 'todo' } },
            { input: '跟进项目进度', expected: { type: 'todo' } },
            { input: '协调部门资源', expected: { type: 'todo' } },
            { input: '解决客户问题', expected: { type: 'todo' } },
            { input: '处理投诉建议', expected: { type: 'todo' } },
            { input: '更新系统数据', expected: { type: 'todo' } },
            { input: '备份重要文件', expected: { type: 'todo' } },
            { input: '检查设备状态', expected: { type: 'todo' } },
            { input: '核实账目数据', expected: { type: 'todo' } },
            { input: '确认订单信息', expected: { type: 'todo' } },
            { input: '安排车辆调度', expected: { type: 'todo' } },
            { input: '统计考勤数据', expected: { type: 'todo' } },

            // === 文件处理测试 (100种) - 通知类 ===
            { input: '收到关于安全生产的通知文件', expected: { type: 'document' } },
            { input: '收到会议通知', expected: { type: 'document' } },
            { input: '收到放假通知', expected: { type: 'document' } },
            { input: '收到调休通知', expected: { type: 'document' } },
            { input: '收到培训通知', expected: { type: 'document' } },
            { input: '收到检查通知', expected: { type: 'document' } },
            { input: '收到整改通知', expected: { type: 'document' } },
            { input: '收到考核通知', expected: { type: 'document' } },
            { input: '收到招聘通知', expected: { type: 'document' } },
            { input: '收到晋升通知', expected: { type: 'document' } },
            { input: '收到调岗通知', expected: { type: 'document' } },
            { input: '收到离职通知', expected: { type: 'document' } },
            { input: '收到入职通知', expected: { type: 'document' } },
            { input: '收到面试通知', expected: { type: 'document' } },
            { input: '收到录用通知', expected: { type: 'document' } },
            { input: '收到体检通知', expected: { type: 'document' } },
            { input: '收到年检通知', expected: { type: 'document' } },
            { input: '收到审计通知', expected: { type: 'document' } },
            { input: '收到督查通知', expected: { type: 'document' } },
            { input: '收到通报通知', expected: { type: 'document' } },
            { input: '收到表彰通知', expected: { type: 'document' } },
            { input: '收到处罚通知', expected: { type: 'document' } },
            { input: '收到验收通知', expected: { type: 'document' } },
            { input: '收到评审通知', expected: { type: 'document' } },
            { input: '收到评估通知', expected: { type: 'document' } },

            // === 文件处理测试 - 函件类 ===
            { input: '收到工作函件', expected: { type: 'document' } },
            { input: '收到商洽函', expected: { type: 'document' } },
            { input: '收到邀请函', expected: { type: 'document' } },
            { input: '收到感谢函', expected: { type: 'document' } },
            { input: '收到推荐函', expected: { type: 'document' } },
            { input: '收到委托函', expected: { type: 'document' } },
            { input: '收到告知函', expected: { type: 'document' } },
            { input: '收到催办函', expected: { type: 'document' } },
            { input: '收到答复函', expected: { type: 'document' } },
            { input: '收到协办函', expected: { type: 'document' } },
            { input: '收到转办函', expected: { type: 'document' } },
            { input: '收到移送函', expected: { type: 'document' } },
            { input: '收到交办函', expected: { type: 'document' } },
            { input: '收到督办函', expected: { type: 'document' } },
            { input: '收到警告函', expected: { type: 'document' } },
            { input: '收到律师函', expected: { type: 'document' } },
            { input: '收到确认函', expected: { type: 'document' } },
            { input: '收到承诺函', expected: { type: 'document' } },
            { input: '收到授权函', expected: { type: 'document' } },
            { input: '收到介绍函', expected: { type: 'document' } },
            { input: '收到证明函', expected: { type: 'document' } },
            { input: '收到贺信', expected: { type: 'document' } },
            { input: '收到慰问信', expected: { type: 'document' } },
            { input: '收到公开信', expected: { type: 'document' } },
            { input: '收到建议信', expected: { type: 'document' } },

            // === 文件处理测试 - 请示批复类 ===
            { input: '收到请示文件', expected: { type: 'document' } },
            { input: '收到批复文件', expected: { type: 'document' } },
            { input: '收到批示件', expected: { type: 'document' } },
            { input: '收到请示报告', expected: { type: 'document' } },
            { input: '收到立项请示', expected: { type: 'document' } },
            { input: '收到预算请示', expected: { type: 'document' } },
            { input: '收到人事请示', expected: { type: 'document' } },
            { input: '收到采购请示', expected: { type: 'document' } },
            { input: '收到合同请示', expected: { type: 'document' } },
            { input: '收到项目请示', expected: { type: 'document' } },
            { input: '收到资金请示', expected: { type: 'document' } },
            { input: '收到编制请示', expected: { type: 'document' } },
            { input: '收到机构请示', expected: { type: 'document' } },
            { input: '收到制度请示', expected: { type: 'document' } },
            { input: '收到方案请示', expected: { type: 'document' } },
            { input: '收到活动请示', expected: { type: 'document' } },
            { input: '收到培训请示', expected: { type: 'document' } },
            { input: '收到出差请示', expected: { type: 'document' } },
            { input: '收到出国请示', expected: { type: 'document' } },
            { input: '收到接待请示', expected: { type: 'document' } },
            { input: '收到会议请示', expected: { type: 'document' } },
            { input: '收到表彰请示', expected: { type: 'document' } },
            { input: '收到处罚请示', expected: { type: 'document' } },
            { input: '收到整改请示', expected: { type: 'document' } },
            { input: '收到验收请示', expected: { type: 'document' } },

            // === 文件处理测试 - 其他类 ===
            { input: '收到传阅件', expected: { type: 'document' } },
            { input: '发文：关于工作的通知', expected: { type: 'document' } },
            { input: '收文：重要通知', expected: { type: 'document' } },
            { input: '〔2026〕1号文件', expected: { type: 'document' } },
            { input: '收到会议纪要', expected: { type: 'document' } },
            { input: '收到工作报告', expected: { type: 'document' } },
            { input: '收到调研报告', expected: { type: 'document' } },
            { input: '收到考察报告', expected: { type: 'document' } },
            { input: '收到审计报告', expected: { type: 'document' } },
            { input: '收到评估报告', expected: { type: 'document' } },
            { input: '收到验收报告', expected: { type: 'document' } },
            { input: '收到整改报告', expected: { type: 'document' } },
            { input: '收到总结报告', expected: { type: 'document' } },
            { input: '收到计划方案', expected: { type: 'document' } },
            { input: '收到实施方案', expected: { type: 'document' } },
            { input: '收到整改方案', expected: { type: 'document' } },
            { input: '收到应急预案', expected: { type: 'document' } },
            { input: '收到培训方案', expected: { type: 'document' } },
            { input: '收到活动方案', expected: { type: 'document' } },
            { input: '收到宣传方案', expected: { type: 'document' } },
            { input: '收到招标文件', expected: { type: 'document' } },
            { input: '收到投标文件', expected: { type: 'document' } },
            { input: '收到合同草案', expected: { type: 'document' } },
            { input: '收到协议文本', expected: { type: 'document' } },
            { input: '收到备忘录', expected: { type: 'document' } }
        ];
    },

    /**
     * 运行内置测试
     */
    runBuiltInTests() {
        const testCases = this.getTestCases();
        let passCount = 0;
        const results = [];

        for (const tc of testCases) {
            const items = this.parseWithRules(tc.input);
            const item = items[0];
            let passed = true;
            const errors = [];

            if (tc.expected.type && item.type !== tc.expected.type) {
                passed = false;
                errors.push(`类型错误: 期望 ${tc.expected.type}, 实际 ${item.type}`);
            }

            if (tc.expected.date && item.data.date !== tc.expected.date) {
                if (tc.expected.date !== 'today' && tc.expected.date !== 'tomorrow' && tc.expected.date !== 'dayAfter') {
                    passed = false;
                    errors.push(`日期错误: 期望 ${tc.expected.date}, 实际 ${item.data.date}`);
                }
            }

            if (tc.expected.time && item.data.time !== tc.expected.time) {
                passed = false;
                errors.push(`时间错误: 期望 ${tc.expected.time}, 实际 ${item.data.time}`);
            }

            if (tc.expected.location !== undefined && item.data.location !== tc.expected.location) {
                passed = false;
                errors.push(`地点错误: 期望 ${tc.expected.location}, 实际 ${item.data.location}`);
            }

            if (tc.expected.attendees) {
                const hasAttendees = tc.expected.attendees.every(a =>
                    item.data.attendees && item.data.attendees.some(attendee => attendee.includes(a) || a.includes(attendee))
                );
                if (!hasAttendees) {
                    passed = false;
                    errors.push(`参会人员错误: 期望 ${tc.expected.attendees.join(',')}, 实际 ${item.data.attendees ? item.data.attendees.join(',') : '无'}`);
                }
            }

            if (passed) passCount++;
            results.push({ input: tc.input, passed, errors, item });
        }

        return {
            total: testCases.length,
            passed: passCount,
            percentage: Math.round(passCount / testCases.length * 100),
            results
        };
    }
};
