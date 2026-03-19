/**
 * 常用事项模板库
 * 包含各行业各岗位的500+种常用事项模板
 * 用于增强基础识别准确度
 */

const ITEM_TEMPLATES = {
    // ==================== 政府机关模板 ====================
    government: {
        // 会议类
        meetings: [
            { keywords: ['党组会', '党组会议'], type: 'meeting', title: '党组会议', priority: 'high' },
            { keywords: ['常务会', '常务会议'], type: 'meeting', title: '常务会议', priority: 'high' },
            { keywords: ['办公会', '办公会议'], type: 'meeting', title: '办公会议', priority: 'high' },
            { keywords: ['专题会', '专题会议'], type: 'meeting', title: '专题会议', priority: 'medium' },
            { keywords: ['协调会', '协调会议'], type: 'meeting', title: '协调会议', priority: 'medium' },
            { keywords: ['调度会', '调度会议'], type: 'meeting', title: '调度会议', priority: 'medium' },
            { keywords: ['现场会', '现场会议'], type: 'meeting', title: '现场会议', priority: 'medium' },
            { keywords: ['座谈会', '座谈会议'], type: 'meeting', title: '座谈会', priority: 'medium' },
            { keywords: ['研讨会', '研讨会议'], type: 'meeting', title: '研讨会', priority: 'medium' },
            { keywords: ['论证会', '论证会议'], type: 'meeting', title: '论证会', priority: 'medium' },
            { keywords: ['评审会', '评审会议'], type: 'meeting', title: '评审会', priority: 'medium' },
            { keywords: ['通气会', '通气会议'], type: 'meeting', title: '通气会', priority: 'low' },
            { keywords: ['汇报会', '汇报会议'], type: 'meeting', title: '汇报会', priority: 'medium' },
            { keywords: ['总结会', '总结会议'], type: 'meeting', title: '总结会', priority: 'medium' },
            { keywords: ['动员会', '动员会议'], type: 'meeting', title: '动员会', priority: 'high' },
            { keywords: ['部署会', '部署会议'], type: 'meeting', title: '部署会', priority: 'high' },
            { keywords: ['推进会', '推进会议'], type: 'meeting', title: '推进会', priority: 'medium' },
            { keywords: ['新闻发布会', '发布会'], type: 'meeting', title: '新闻发布会', priority: 'high' },
            { keywords: ['听证会', '听证会议'], type: 'meeting', title: '听证会', priority: 'high' },
            { keywords: ['民主生活会'], type: 'meeting', title: '民主生活会', priority: 'high' },
            { keywords: ['组织生活会'], type: 'meeting', title: '组织生活会', priority: 'high' },
            { keywords: ['中心组学习'], type: 'meeting', title: '中心组学习', priority: 'high' },
            { keywords: ['三会一课'], type: 'meeting', title: '三会一课', priority: 'medium' },
            { keywords: ['主题党日'], type: 'meeting', title: '主题党日活动', priority: 'medium' },
            { keywords: ['廉政会议', '廉政建设'], type: 'meeting', title: '廉政工作会议', priority: 'high' },
        ],
        // 待办类
        todos: [
            { keywords: ['起草文件', '拟定文件'], type: 'todo', title: '起草文件', priority: 'high' },
            { keywords: ['审核文件', '审核材料'], type: 'todo', title: '审核文件', priority: 'high' },
            { keywords: ['签批', '批示'], type: 'todo', title: '签批文件', priority: 'high' },
            { keywords: ['阅示', '审阅'], type: 'todo', title: '阅示文件', priority: 'high' },
            { keywords: ['拟办', '办理'], type: 'todo', title: '拟办文件', priority: 'medium' },
            { keywords: ['催办', '督办'], type: 'todo', title: '催办督办', priority: 'medium' },
            { keywords: ['调研', '调查研究'], type: 'todo', title: '开展调研', priority: 'high' },
            { keywords: ['督查', '督查检查'], type: 'todo', title: '督查检查', priority: 'high' },
            { keywords: ['巡察', '巡视'], type: 'todo', title: '巡察工作', priority: 'high' },
            { keywords: ['接访', '信访接待'], type: 'todo', title: '信访接访', priority: 'medium' },
            { keywords: ['值班', '值守'], type: 'todo', title: '值班值守', priority: 'medium' },
            { keywords: ['报送材料', '上报材料'], type: 'todo', title: '报送材料', priority: 'medium' },
            { keywords: ['汇总统计', '统计数据'], type: 'todo', title: '汇总统计', priority: 'medium' },
            { keywords: ['拟定方案', '制定方案'], type: 'todo', title: '拟定方案', priority: 'high' },
            { keywords: ['组织培训', '开展培训'], type: 'todo', title: '组织培训', priority: 'medium' },
            { keywords: ['考核评估', '绩效考评'], type: 'todo', title: '考核评估', priority: 'medium' },
            { keywords: ['整改落实', '整改'], type: 'todo', title: '整改落实', priority: 'high' },
            { keywords: ['会务准备', '会议筹备'], type: 'todo', title: '会务准备', priority: 'medium' },
            { keywords: ['撰写报告', '起草报告'], type: 'todo', title: '撰写报告', priority: 'high' },
            { keywords: ['报送信息', '信息报送'], type: 'todo', title: '报送信息', priority: 'medium' },
        ],
        // 办文类
        documents: [
            { keywords: ['请示', '请示件'], type: 'document', docType: '请示', progress: 'pending' },
            { keywords: ['批复', '批复件'], type: 'document', docType: '批复', progress: 'pending' },
            { keywords: ['报告', '报告件'], type: 'document', docType: '报告', progress: 'pending' },
            { keywords: ['通知', '通知件'], type: 'document', docType: '通知', progress: 'pending' },
            { keywords: ['函', '函件', '公函'], type: 'document', docType: '函', progress: 'pending' },
            { keywords: ['纪要', '会议纪要'], type: 'document', docType: '纪要', progress: 'pending' },
            { keywords: ['决定', '决定件'], type: 'document', docType: '决定', progress: 'pending' },
            { keywords: ['意见', '实施意见'], type: 'document', docType: '意见', progress: 'pending' },
            { keywords: ['办法', '实施办法'], type: 'document', docType: '办法', progress: 'pending' },
            { keywords: ['规定', '暂行规定'], type: 'document', docType: '规定', progress: 'pending' },
            { keywords: ['方案', '实施方案'], type: 'document', docType: '方案', progress: 'pending' },
            { keywords: ['规划', '发展规划'], type: 'document', docType: '规划', progress: 'pending' },
            { keywords: ['计划', '工作计划'], type: 'document', docType: '计划', progress: 'pending' },
            { keywords: ['总结', '工作总结'], type: 'document', docType: '总结', progress: 'pending' },
            { keywords: ['讲话', '讲话稿'], type: 'document', docType: '讲话稿', progress: 'pending' },
            { keywords: ['简报', '信息简报'], type: 'document', docType: '简报', progress: 'pending' },
            { keywords: ['批示件'], type: 'document', docType: '批示件', progress: 'pending' },
            { keywords: ['传阅件'], type: 'document', docType: '传阅件', progress: 'pending' },
            { keywords: ['交办件'], type: 'document', docType: '交办件', progress: 'pending' },
            { keywords: ['转办件'], type: 'document', docType: '转办件', progress: 'pending' },
        ]
    },

    // ==================== 企业通用模板 ====================
    enterprise: {
        meetings: [
            { keywords: ['董事会', '董事会会议'], type: 'meeting', title: '董事会会议', priority: 'high' },
            { keywords: ['监事会', '监事会会议'], type: 'meeting', title: '监事会会议', priority: 'high' },
            { keywords: ['股东会', '股东大会'], type: 'meeting', title: '股东大会', priority: 'high' },
            { keywords: ['管理层会议', '经营会'], type: 'meeting', title: '管理层会议', priority: 'high' },
            { keywords: ['部门例会', '周例会'], type: 'meeting', title: '部门例会', priority: 'medium' },
            { keywords: ['项目会', '项目会议'], type: 'meeting', title: '项目会议', priority: 'medium' },
            { keywords: ['启动会', '项目启动'], type: 'meeting', title: '项目启动会', priority: 'high' },
            { keywords: ['复盘会', '项目复盘'], type: 'meeting', title: '项目复盘会', priority: 'medium' },
            { keywords: ['评审会', '方案评审'], type: 'meeting', title: '评审会', priority: 'medium' },
            { keywords: ['验收会', '项目验收'], type: 'meeting', title: '验收会', priority: 'high' },
            { keywords: ['招投标会', '开标'], type: 'meeting', title: '招投标会议', priority: 'high' },
            { keywords: ['合同谈判', '商务谈判'], type: 'meeting', title: '商务谈判', priority: 'high' },
            { keywords: ['客户会议', '客户拜访'], type: 'meeting', title: '客户会议', priority: 'high' },
            { keywords: ['供应商会议'], type: 'meeting', title: '供应商会议', priority: 'medium' },
            { keywords: ['战略会', '战略研讨'], type: 'meeting', title: '战略研讨会', priority: 'high' },
            { keywords: ['预算会', '预算会议'], type: 'meeting', title: '预算会议', priority: 'high' },
            { keywords: ['绩效会', '绩效面谈'], type: 'meeting', title: '绩效面谈', priority: 'medium' },
            { keywords: ['入职培训', '新员工培训'], type: 'meeting', title: '入职培训', priority: 'medium' },
            { keywords: ['安全会议', '安全生产会'], type: 'meeting', title: '安全生产会议', priority: 'high' },
            { keywords: ['质量会议', '质量分析会'], type: 'meeting', title: '质量分析会', priority: 'medium' },
        ],
        todos: [
            { keywords: ['完成报告', '提交报告'], type: 'todo', title: '完成报告', priority: 'high' },
            { keywords: ['制定计划', '编写计划'], type: 'todo', title: '制定计划', priority: 'medium' },
            { keywords: ['跟进客户', '客户跟进'], type: 'todo', title: '跟进客户', priority: 'high' },
            { keywords: ['处理邮件', '回复邮件'], type: 'todo', title: '处理邮件', priority: 'medium' },
            { keywords: ['整理文档', '归档文件'], type: 'todo', title: '整理文档', priority: 'low' },
            { keywords: ['更新数据', '录入数据'], type: 'todo', title: '更新数据', priority: 'medium' },
            { keywords: ['审核合同', '合同审核'], type: 'todo', title: '审核合同', priority: 'high' },
            { keywords: ['准备材料', '准备方案'], type: 'todo', title: '准备材料', priority: 'medium' },
            { keywords: ['联系供应商', '供应商对接'], type: 'todo', title: '联系供应商', priority: 'medium' },
            { keywords: ['安排面试', '招聘面试'], type: 'todo', title: '安排面试', priority: 'medium' },
            { keywords: ['绩效考核', '考核评估'], type: 'todo', title: '绩效考核', priority: 'high' },
            { keywords: ['费用报销', '提交报销'], type: 'todo', title: '费用报销', priority: 'medium' },
            { keywords: ['设备维护', '设备检修'], type: 'todo', title: '设备维护', priority: 'medium' },
            { keywords: ['库存盘点', '盘点'], type: 'todo', title: '库存盘点', priority: 'medium' },
            { keywords: ['采购申请', '提交采购'], type: 'todo', title: '采购申请', priority: 'medium' },
            { keywords: ['项目申报', '申报项目'], type: 'todo', title: '项目申报', priority: 'high' },
            { keywords: ['合同签订', '签订合同'], type: 'todo', title: '签订合同', priority: 'high' },
            { keywords: ['发票处理', '开具发票'], type: 'todo', title: '发票处理', priority: 'medium' },
            { keywords: ['对账', '财务对账'], type: 'todo', title: '财务对账', priority: 'high' },
            { keywords: ['税务申报', '报税'], type: 'todo', title: '税务申报', priority: 'high' },
        ],
        documents: [
            { keywords: ['合同', '合同文本'], type: 'document', docType: '合同', progress: 'pending' },
            { keywords: ['协议', '协议书'], type: 'document', docType: '协议', progress: 'pending' },
            { keywords: ['标书', '投标文件'], type: 'document', docType: '标书', progress: 'pending' },
            { keywords: ['报价单', '报价'], type: 'document', docType: '报价单', progress: 'pending' },
            { keywords: ['发票', '票据'], type: 'document', docType: '发票', progress: 'pending' },
            { keywords: ['订单', '采购单'], type: 'document', docType: '订单', progress: 'pending' },
            { keywords: ['对账单'], type: 'document', docType: '对账单', progress: 'pending' },
            { keywords: ['授权书', '委托书'], type: 'document', docType: '授权书', progress: 'pending' },
            { keywords: ['证明', '证明材料'], type: 'document', docType: '证明', progress: 'pending' },
            { keywords: ['申请书', '申请材料'], type: 'document', docType: '申请书', progress: 'pending' },
        ]
    },

    // ==================== 教育行业模板 ====================
    education: {
        meetings: [
            { keywords: ['教务会', '教务会议'], type: 'meeting', title: '教务会议', priority: 'high' },
            { keywords: ['教研会', '教研活动'], type: 'meeting', title: '教研会', priority: 'medium' },
            { keywords: ['家长会', '家长座谈'], type: 'meeting', title: '家长会', priority: 'high' },
            { keywords: ['班会', '班务会'], type: 'meeting', title: '班会', priority: 'medium' },
            { keywords: ['校务会', '校务会议'], type: 'meeting', title: '校务会议', priority: 'high' },
            { keywords: ['教职工大会'], type: 'meeting', title: '教职工大会', priority: 'high' },
            { keywords: ['备课会', '集体备课'], type: 'meeting', title: '集体备课', priority: 'medium' },
            { keywords: ['公开课', '观摩课'], type: 'meeting', title: '公开课', priority: 'medium' },
            { keywords: ['毕业典礼'], type: 'meeting', title: '毕业典礼', priority: 'high' },
            { keywords: ['开学典礼'], type: 'meeting', title: '开学典礼', priority: 'high' },
            { keywords: ['运动会', '体育节'], type: 'meeting', title: '运动会', priority: 'medium' },
            { keywords: ['艺术节', '文艺汇演'], type: 'meeting', title: '艺术节', priority: 'medium' },
            { keywords: ['招生会', '招生工作'], type: 'meeting', title: '招生工作会议', priority: 'high' },
            { keywords: ['答辩会', '论文答辩'], type: 'meeting', title: '论文答辩会', priority: 'high' },
            { keywords: ['评审会', '项目评审'], type: 'meeting', title: '项目评审会', priority: 'high' },
        ],
        todos: [
            { keywords: ['备课', '准备教案'], type: 'todo', title: '备课', priority: 'high' },
            { keywords: ['批改作业', '批作业'], type: 'todo', title: '批改作业', priority: 'medium' },
            { keywords: ['阅卷', '考试阅卷'], type: 'todo', title: '阅卷', priority: 'high' },
            { keywords: ['出题', '命题'], type: 'todo', title: '出题', priority: 'high' },
            { keywords: ['监考', '考试监考'], type: 'todo', title: '监考', priority: 'high' },
            { keywords: ['辅导', '学生辅导'], type: 'todo', title: '学生辅导', priority: 'medium' },
            { keywords: ['家访', '入户家访'], type: 'todo', title: '家访', priority: 'medium' },
            { keywords: ['写教案', '编写教案'], type: 'todo', title: '写教案', priority: 'high' },
            { keywords: ['制作课件', 'PPT制作'], type: 'todo', title: '制作课件', priority: 'medium' },
            { keywords: ['教学反思', '撰写反思'], type: 'todo', title: '教学反思', priority: 'low' },
            { keywords: ['论文写作', '撰写论文'], type: 'todo', title: '论文写作', priority: 'high' },
            { keywords: ['课题研究', '课题申报'], type: 'todo', title: '课题研究', priority: 'high' },
            { keywords: ['培训学习', '参加培训'], type: 'todo', title: '培训学习', priority: 'medium' },
            { keywords: ['学生管理', '班级管理'], type: 'todo', title: '学生管理', priority: 'medium' },
            { keywords: ['成绩分析', '成绩统计'], type: 'todo', title: '成绩分析', priority: 'medium' },
        ],
        documents: [
            { keywords: ['教案', '教学设计'], type: 'document', docType: '教案', progress: 'pending' },
            { keywords: ['试卷', '试题'], type: 'document', docType: '试卷', progress: 'pending' },
            { keywords: ['成绩单', '成绩表'], type: 'document', docType: '成绩单', progress: 'pending' },
            { keywords: ['学籍档案', '学籍'], type: 'document', docType: '学籍档案', progress: 'pending' },
            { keywords: ['毕业证', '学历证明'], type: 'document', docType: '毕业证', progress: 'pending' },
            { keywords: ['录取通知书'], type: 'document', docType: '录取通知书', progress: 'pending' },
            { keywords: ['推荐信', '推荐材料'], type: 'document', docType: '推荐信', progress: 'pending' },
            { keywords: ['课题申报书'], type: 'document', docType: '课题申报书', progress: 'pending' },
            { keywords: ['教学大纲', '课程大纲'], type: 'document', docType: '教学大纲', progress: 'pending' },
            { keywords: ['培养方案', '培养计划'], type: 'document', docType: '培养方案', progress: 'pending' },
        ]
    },

    // ==================== 医疗卫生模板 ====================
    healthcare: {
        meetings: [
            { keywords: ['院务会', '院务会议'], type: 'meeting', title: '院务会议', priority: 'high' },
            { keywords: ['科室会', '科务会'], type: 'meeting', title: '科室会议', priority: 'medium' },
            { keywords: ['病例讨论', '疑难病例'], type: 'meeting', title: '病例讨论会', priority: 'high' },
            { keywords: ['死亡病例讨论'], type: 'meeting', title: '死亡病例讨论', priority: 'high' },
            { keywords: ['术前讨论'], type: 'meeting', title: '术前讨论', priority: 'high' },
            { keywords: ['晨交班', '晨会'], type: 'meeting', title: '晨交班', priority: 'medium' },
            { keywords: ['查房', '主任查房'], type: 'meeting', title: '查房', priority: 'high' },
            { keywords: ['学术会议', '学术交流'], type: 'meeting', title: '学术会议', priority: 'medium' },
            { keywords: ['业务学习', '业务培训'], type: 'meeting', title: '业务学习', priority: 'medium' },
            { keywords: ['质控会', '质量控制'], type: 'meeting', title: '质控会议', priority: 'medium' },
            { keywords: ['院感会', '院感防控'], type: 'meeting', title: '院感防控会议', priority: 'high' },
            { keywords: ['药事会', '药事管理'], type: 'meeting', title: '药事委员会', priority: 'high' },
            { keywords: ['伦理会', '伦理审查'], type: 'meeting', title: '伦理审查会', priority: 'high' },
            { keywords: ['急诊会诊'], type: 'meeting', title: '急诊会诊', priority: 'high' },
            { keywords: ['多学科会诊', 'MDT'], type: 'meeting', title: '多学科会诊', priority: 'high' },
        ],
        todos: [
            { keywords: ['写病历', '病历书写'], type: 'todo', title: '书写病历', priority: 'high' },
            { keywords: ['查房', '病房查房'], type: 'todo', title: '查房', priority: 'high' },
            { keywords: ['门诊', '门诊值班'], type: 'todo', title: '门诊', priority: 'high' },
            { keywords: ['手术', '手术安排'], type: 'todo', title: '手术', priority: 'high' },
            { keywords: ['值班', '值班值守'], type: 'todo', title: '值班', priority: 'medium' },
            { keywords: ['会诊', '会诊处理'], type: 'todo', title: '会诊', priority: 'high' },
            { keywords: ['开处方', '开药'], type: 'todo', title: '开具处方', priority: 'medium' },
            { keywords: ['检查报告', '出具报告'], type: 'todo', title: '出具检查报告', priority: 'high' },
            { keywords: ['换药', '伤口处理'], type: 'todo', title: '换药', priority: 'medium' },
            { keywords: ['穿刺', '穿刺操作'], type: 'todo', title: '穿刺', priority: 'high' },
            { keywords: ['抢救', '急救'], type: 'todo', title: '抢救', priority: 'high' },
            { keywords: ['患者沟通', '医患沟通'], type: 'todo', title: '患者沟通', priority: 'medium' },
            { keywords: ['随访', '病人随访'], type: 'todo', title: '随访', priority: 'medium' },
            { keywords: ['科研', '科研项目'], type: 'todo', title: '科研工作', priority: 'medium' },
            { keywords: ['带教', '教学查房'], type: 'todo', title: '带教', priority: 'medium' },
        ],
        documents: [
            { keywords: ['病历', '住院病历'], type: 'document', docType: '病历', progress: 'pending' },
            { keywords: ['处方', '处方笺'], type: 'document', docType: '处方', progress: 'pending' },
            { keywords: ['检查单', '检验单'], type: 'document', docType: '检查单', progress: 'pending' },
            { keywords: ['化验单', '化验报告'], type: 'document', docType: '化验单', progress: 'pending' },
            { keywords: ['出院小结', '出院记录'], type: 'document', docType: '出院小结', progress: 'pending' },
            { keywords: ['诊断证明'], type: 'document', docType: '诊断证明', progress: 'pending' },
            { keywords: ['病假条', '休假证明'], type: 'document', docType: '病假条', progress: 'pending' },
            { keywords: ['死亡证明'], type: 'document', docType: '死亡证明', progress: 'pending' },
            { keywords: ['知情同意书'], type: 'document', docType: '知情同意书', progress: 'pending' },
            { keywords: ['手术记录'], type: 'document', docType: '手术记录', progress: 'pending' },
        ]
    },

    // ==================== 金融银行模板 ====================
    finance: {
        meetings: [
            { keywords: ['信贷会', '信贷审批会'], type: 'meeting', title: '信贷审批会', priority: 'high' },
            { keywords: ['风控会', '风险管理会'], type: 'meeting', title: '风控委员会', priority: 'high' },
            { keywords: ['投委会', '投资决策会'], type: 'meeting', title: '投资决策会', priority: 'high' },
            { keywords: ['贷审会', '贷款审查'], type: 'meeting', title: '贷审会', priority: 'high' },
            { keywords: ['晨会', '晨会夕会'], type: 'meeting', title: '晨会', priority: 'medium' },
            { keywords: ['周会', '周例会'], type: 'meeting', title: '周例会', priority: 'medium' },
            { keywords: ['月度经营会'], type: 'meeting', title: '月度经营分析会', priority: 'high' },
            { keywords: ['季度总结会'], type: 'meeting', title: '季度总结会', priority: 'high' },
            { keywords: ['客户洽谈', '业务洽谈'], type: 'meeting', title: '客户洽谈', priority: 'high' },
            { keywords: ['产品发布会'], type: 'meeting', title: '产品发布会', priority: 'high' },
            { keywords: ['反洗钱会议'], type: 'meeting', title: '反洗钱工作会议', priority: 'high' },
            { keywords: ['合规会议'], type: 'meeting', title: '合规工作会议', priority: 'high' },
            { keywords: ['内审会议'], type: 'meeting', title: '内审工作会议', priority: 'high' },
            { keywords: ['培训会议', '业务培训'], type: 'meeting', title: '业务培训', priority: 'medium' },
            { keywords: ['理财产品说明会'], type: 'meeting', title: '理财产品说明会', priority: 'medium' },
        ],
        todos: [
            { keywords: ['放款', '贷款发放'], type: 'todo', title: '放款处理', priority: 'high' },
            { keywords: ['审批', '贷款审批'], type: 'todo', title: '贷款审批', priority: 'high' },
            { keywords: ['开户', '开立账户'], type: 'todo', title: '开户', priority: 'medium' },
            { keywords: ['结算', '资金结算'], type: 'todo', title: '资金结算', priority: 'high' },
            { keywords: ['对账', '账务核对'], type: 'todo', title: '对账', priority: 'high' },
            { keywords: ['报备', '业务报备'], type: 'todo', title: '业务报备', priority: 'medium' },
            { keywords: ['尽职调查', '尽调'], type: 'todo', title: '尽职调查', priority: 'high' },
            { keywords: ['授信调查'], type: 'todo', title: '授信调查', priority: 'high' },
            { keywords: ['贷后管理', '贷后检查'], type: 'todo', title: '贷后管理', priority: 'high' },
            { keywords: ['催收', '贷款催收'], type: 'todo', title: '贷款催收', priority: 'high' },
            { keywords: ['反洗钱审核'], type: 'todo', title: '反洗钱审核', priority: 'high' },
            { keywords: ['理财产品销售'], type: 'todo', title: '理财产品销售', priority: 'medium' },
            { keywords: ['客户回访'], type: 'todo', title: '客户回访', priority: 'medium' },
            { keywords: ['报表填报', '监管报表'], type: 'todo', title: '报表填报', priority: 'high' },
            { keywords: ['凭证整理', '凭证归档'], type: 'todo', title: '凭证整理', priority: 'low' },
        ],
        documents: [
            { keywords: ['借款合同', '贷款合同'], type: 'document', docType: '借款合同', progress: 'pending' },
            { keywords: ['担保合同'], type: 'document', docType: '担保合同', progress: 'pending' },
            { keywords: ['抵押合同'], type: 'document', docType: '抵押合同', progress: 'pending' },
            { keywords: ['授信申请书'], type: 'document', docType: '授信申请书', progress: 'pending' },
            { keywords: ['尽职调查报告'], type: 'document', docType: '尽调报告', progress: 'pending' },
            { keywords: ['审批表', '审批书'], type: 'document', docType: '审批表', progress: 'pending' },
            { keywords: ['对账单'], type: 'document', docType: '对账单', progress: 'pending' },
            { keywords: ['流水单', '交易流水'], type: 'document', docType: '流水单', progress: 'pending' },
            { keywords: ['理财产品说明书'], type: 'document', docType: '产品说明书', progress: 'pending' },
            { keywords: ['风险揭示书'], type: 'document', docType: '风险揭示书', progress: 'pending' },
        ]
    },

    // ==================== IT互联网模板 ====================
    it: {
        meetings: [
            { keywords: ['站会', '每日站会'], type: 'meeting', title: '每日站会', priority: 'medium' },
            { keywords: ['迭代会', '迭代规划'], type: 'meeting', title: '迭代规划会', priority: 'high' },
            { keywords: ['评审会', '需求评审'], type: 'meeting', title: '需求评审会', priority: 'high' },
            { keywords: ['回顾会', '迭代回顾'], type: 'meeting', title: '迭代回顾会', priority: 'medium' },
            { keywords: ['演示会', '产品演示'], type: 'meeting', title: '产品演示会', priority: 'medium' },
            { keywords: ['技术评审', '方案评审'], type: 'meeting', title: '技术评审会', priority: 'high' },
            { keywords: ['架构评审'], type: 'meeting', title: '架构评审会', priority: 'high' },
            { keywords: ['代码评审', 'Code Review'], type: 'meeting', title: '代码评审', priority: 'medium' },
            { keywords: ['上线会', '发布评审'], type: 'meeting', title: '上线评审会', priority: 'high' },
            { keywords: ['复盘会', '事故复盘'], type: 'meeting', title: '事故复盘会', priority: 'high' },
            { keywords: ['技术分享', '技术沙龙'], type: 'meeting', title: '技术分享会', priority: 'low' },
            { keywords: ['产品会', '产品评审'], type: 'meeting', title: '产品评审会', priority: 'high' },
            { keywords: ['设计评审', 'UI评审'], type: 'meeting', title: '设计评审会', priority: 'medium' },
            { keywords: ['测试评审', '用例评审'], type: 'meeting', title: '测试用例评审', priority: 'medium' },
            { keywords: ['周会', '周例会'], type: 'meeting', title: '周例会', priority: 'medium' },
        ],
        todos: [
            { keywords: ['写代码', '编码'], type: 'todo', title: '编码开发', priority: 'high' },
            { keywords: ['修BUG', '修复Bug', '改bug'], type: 'todo', title: '修复Bug', priority: 'high' },
            { keywords: ['写文档', '技术文档'], type: 'todo', title: '编写文档', priority: 'medium' },
            { keywords: ['写测试', '编写测试'], type: 'todo', title: '编写测试', priority: 'medium' },
            { keywords: ['代码重构', '重构'], type: 'todo', title: '代码重构', priority: 'medium' },
            { keywords: ['需求分析', '分析需求'], type: 'todo', title: '需求分析', priority: 'high' },
            { keywords: ['系统设计', '架构设计'], type: 'todo', title: '系统设计', priority: 'high' },
            { keywords: ['环境部署', '部署环境'], type: 'todo', title: '环境部署', priority: 'high' },
            { keywords: ['性能优化', '优化'], type: 'todo', title: '性能优化', priority: 'medium' },
            { keywords: ['代码提交', '提交代码'], type: 'todo', title: '代码提交', priority: 'medium' },
            { keywords: ['Code Review', '代码评审'], type: 'todo', title: '代码评审', priority: 'medium' },
            { keywords: ['上线发布', '发布'], type: 'todo', title: '上线发布', priority: 'high' },
            { keywords: ['值班', '运维值班'], type: 'todo', title: '值班', priority: 'medium' },
            { keywords: ['排查问题', '问题排查'], type: 'todo', title: '问题排查', priority: 'high' },
            { keywords: ['对接接口', '接口联调'], type: 'todo', title: '接口联调', priority: 'medium' },
        ],
        documents: [
            { keywords: ['需求文档', 'PRD'], type: 'document', docType: '需求文档', progress: 'pending' },
            { keywords: ['技术方案', '设计方案'], type: 'document', docType: '技术方案', progress: 'pending' },
            { keywords: ['接口文档', 'API文档'], type: 'document', docType: '接口文档', progress: 'pending' },
            { keywords: ['测试用例', '测试文档'], type: 'document', docType: '测试用例', progress: 'pending' },
            { keywords: ['部署文档', '运维文档'], type: 'document', docType: '部署文档', progress: 'pending' },
            { keywords: ['用户手册', '操作手册'], type: 'document', docType: '用户手册', progress: 'pending' },
            { keywords: ['产品规格书'], type: 'document', docType: '产品规格书', progress: 'pending' },
            { keywords: ['数据库设计'], type: 'document', docType: '数据库设计', progress: 'pending' },
            { keywords: ['变更申请'], type: 'document', docType: '变更申请', progress: 'pending' },
            { keywords: ['事故报告'], type: 'document', docType: '事故报告', progress: 'pending' },
        ]
    },

    // ==================== 法律法务模板 ====================
    legal: {
        meetings: [
            { keywords: ['案件讨论', '案情分析'], type: 'meeting', title: '案件讨论会', priority: 'high' },
            { keywords: ['庭审', '开庭'], type: 'meeting', title: '庭审', priority: 'high' },
            { keywords: ['调解', '调解会议'], type: 'meeting', title: '调解会议', priority: 'high' },
            { keywords: ['仲裁', '仲裁开庭'], type: 'meeting', title: '仲裁开庭', priority: 'high' },
            { keywords: ['合同谈判'], type: 'meeting', title: '合同谈判', priority: 'high' },
            { keywords: ['客户咨询', '法律咨询'], type: 'meeting', title: '法律咨询', priority: 'medium' },
            { keywords: ['案件汇报'], type: 'meeting', title: '案件汇报', priority: 'high' },
            { keywords: ['合议会', '案件合议'], type: 'meeting', title: '案件合议会', priority: 'high' },
            { keywords: ['论证会', '专家论证'], type: 'meeting', title: '专家论证会', priority: 'high' },
            { keywords: ['培训', '业务培训'], type: 'meeting', title: '业务培训', priority: 'medium' },
        ],
        todos: [
            { keywords: ['起草合同', '拟定合同'], type: 'todo', title: '起草合同', priority: 'high' },
            { keywords: ['审核合同', '合同审查'], type: 'todo', title: '审核合同', priority: 'high' },
            { keywords: ['写诉状', '起诉状'], type: 'todo', title: '撰写起诉状', priority: 'high' },
            { keywords: ['写答辩状', '答辩'], type: 'todo', title: '撰写答辩状', priority: 'high' },
            { keywords: ['取证', '调查取证'], type: 'todo', title: '调查取证', priority: 'high' },
            { keywords: ['会见当事人', '会见客户'], type: 'todo', title: '会见当事人', priority: 'high' },
            { keywords: ['阅卷', '案件阅卷'], type: 'todo', title: '阅卷', priority: 'high' },
            { keywords: ['立案', '案件立案'], type: 'todo', title: '立案', priority: 'high' },
            { keywords: ['执行申请'], type: 'todo', title: '执行申请', priority: 'high' },
            { keywords: ['法律意见', '出具意见'], type: 'todo', title: '出具法律意见', priority: 'high' },
            { keywords: ['公证', '办理公证'], type: 'todo', title: '办理公证', priority: 'medium' },
            { keywords: ['保全', '财产保全'], type: 'todo', title: '财产保全', priority: 'high' },
            { keywords: ['尽职调查'], type: 'todo', title: '尽职调查', priority: 'high' },
            { keywords: ['归档', '案件归档'], type: 'todo', title: '案件归档', priority: 'low' },
            { keywords: ['缴费', '诉讼缴费'], type: 'todo', title: '诉讼缴费', priority: 'medium' },
        ],
        documents: [
            { keywords: ['起诉状', '诉状'], type: 'document', docType: '起诉状', progress: 'pending' },
            { keywords: ['答辩状'], type: 'document', docType: '答辩状', progress: 'pending' },
            { keywords: ['判决书', '裁定书'], type: 'document', docType: '判决书', progress: 'pending' },
            { keywords: ['调解书'], type: 'document', docType: '调解书', progress: 'pending' },
            { keywords: ['合同', '协议'], type: 'document', docType: '合同', progress: 'pending' },
            { keywords: ['法律意见书'], type: 'document', docType: '法律意见书', progress: 'pending' },
            { keywords: ['律师函'], type: 'document', docType: '律师函', progress: 'pending' },
            { keywords: ['委托书', '授权委托'], type: 'document', docType: '委托书', progress: 'pending' },
            { keywords: ['证据材料', '证据清单'], type: 'document', docType: '证据材料', progress: 'pending' },
            { keywords: ['公证书'], type: 'document', docType: '公证书', progress: 'pending' },
        ]
    },

    // ==================== 人力资源模板 ====================
    hr: {
        meetings: [
            { keywords: ['招聘面试', '面试'], type: 'meeting', title: '招聘面试', priority: 'high' },
            { keywords: ['HR例会', '人事例会'], type: 'meeting', title: 'HR例会', priority: 'medium' },
            { keywords: ['绩效面谈', '绩效沟通'], type: 'meeting', title: '绩效面谈', priority: 'high' },
            { keywords: ['培训会', '员工培训'], type: 'meeting', title: '培训会', priority: 'medium' },
            { keywords: ['入职面谈', '新员工面谈'], type: 'meeting', title: '入职面谈', priority: 'medium' },
            { keywords: ['离职面谈'], type: 'meeting', title: '离职面谈', priority: 'medium' },
            { keywords: ['薪酬委员会'], type: 'meeting', title: '薪酬委员会', priority: 'high' },
            { keywords: ['晋升评审'], type: 'meeting', title: '晋升评审会', priority: 'high' },
            { keywords: ['团队建设', '团建'], type: 'meeting', title: '团队建设', priority: 'low' },
            { keywords: ['员工座谈'], type: 'meeting', title: '员工座谈会', priority: 'medium' },
        ],
        todos: [
            { keywords: ['招聘', '人员招聘'], type: 'todo', title: '招聘工作', priority: 'high' },
            { keywords: ['筛选简历', '简历筛选'], type: 'todo', title: '筛选简历', priority: 'medium' },
            { keywords: ['安排面试', '组织面试'], type: 'todo', title: '安排面试', priority: 'high' },
            { keywords: ['入职办理', '办理入职'], type: 'todo', title: '入职办理', priority: 'medium' },
            { keywords: ['离职办理', '办理离职'], type: 'todo', title: '离职办理', priority: 'medium' },
            { keywords: ['考勤统计', '考勤核算'], type: 'todo', title: '考勤统计', priority: 'medium' },
            { keywords: ['薪资核算', '工资核算'], type: 'todo', title: '薪资核算', priority: 'high' },
            { keywords: ['社保办理', '社保缴纳'], type: 'todo', title: '社保办理', priority: 'high' },
            { keywords: ['公积金办理'], type: 'todo', title: '公积金办理', priority: 'high' },
            { keywords: ['绩效考核', '考核评定'], type: 'todo', title: '绩效考核', priority: 'high' },
            { keywords: ['培训组织', '组织培训'], type: 'todo', title: '培训组织', priority: 'medium' },
            { keywords: ['员工档案', '档案管理'], type: 'todo', title: '员工档案管理', priority: 'low' },
            { keywords: ['劳动合同', '合同签订'], type: 'todo', title: '劳动合同签订', priority: 'high' },
            { keywords: ['员工关怀', '员工关系'], type: 'todo', title: '员工关怀', priority: 'low' },
            { keywords: ['人力报表', 'HR报表'], type: 'todo', title: '人力报表', priority: 'medium' },
        ],
        documents: [
            { keywords: ['劳动合同'], type: 'document', docType: '劳动合同', progress: 'pending' },
            { keywords: ['入职登记表'], type: 'document', docType: '入职登记表', progress: 'pending' },
            { keywords: ['离职申请', '离职表'], type: 'document', docType: '离职申请', progress: 'pending' },
            { keywords: ['绩效考核表'], type: 'document', docType: '绩效考核表', progress: 'pending' },
            { keywords: ['工资条', '薪资单'], type: 'document', docType: '工资条', progress: 'pending' },
            { keywords: ['培训记录'], type: 'document', docType: '培训记录', progress: 'pending' },
            { keywords: ['岗位职责', '岗位说明书'], type: 'document', docType: '岗位职责', progress: 'pending' },
            { keywords: ['招聘需求'], type: 'document', docType: '招聘需求', progress: 'pending' },
            { keywords: ['员工手册'], type: 'document', docType: '员工手册', progress: 'pending' },
            { keywords: ['证明材料', '在职证明'], type: 'document', docType: '证明材料', progress: 'pending' },
        ]
    },

    // ==================== 销售营销模板 ====================
    sales: {
        meetings: [
            { keywords: ['销售例会', '销售周会'], type: 'meeting', title: '销售例会', priority: 'medium' },
            { keywords: ['客户拜访', '拜访客户'], type: 'meeting', title: '客户拜访', priority: 'high' },
            { keywords: ['商务谈判', '合同谈判'], type: 'meeting', title: '商务谈判', priority: 'high' },
            { keywords: ['产品演示', '产品介绍'], type: 'meeting', title: '产品演示', priority: 'high' },
            { keywords: ['销售培训'], type: 'meeting', title: '销售培训', priority: 'medium' },
            { keywords: ['客户回访'], type: 'meeting', title: '客户回访', priority: 'medium' },
            { keywords: ['销售复盘', '业绩复盘'], type: 'meeting', title: '销售复盘会', priority: 'medium' },
            { keywords: ['竞标', '投标'], type: 'meeting', title: '投标会议', priority: 'high' },
            { keywords: ['渠道会议', '经销商会议'], type: 'meeting', title: '渠道会议', priority: 'high' },
            { keywords: ['市场活动', '推广活动'], type: 'meeting', title: '市场活动', priority: 'high' },
        ],
        todos: [
            { keywords: ['跟进客户', '客户跟进'], type: 'todo', title: '跟进客户', priority: 'high' },
            { keywords: ['开发客户', '拓客'], type: 'todo', title: '开发客户', priority: 'high' },
            { keywords: ['报价', '提供报价'], type: 'todo', title: '报价', priority: 'high' },
            { keywords: ['合同签订', '签合同'], type: 'todo', title: '签订合同', priority: 'high' },
            { keywords: ['回款', '催款'], type: 'todo', title: '催收回款', priority: 'high' },
            { keywords: ['销售报表', '业绩统计'], type: 'todo', title: '销售报表', priority: 'medium' },
            { keywords: ['客户维护', '客户管理'], type: 'todo', title: '客户维护', priority: 'medium' },
            { keywords: ['市场调研', '竞品分析'], type: 'todo', title: '市场调研', priority: 'medium' },
            { keywords: ['方案撰写', '方案准备'], type: 'todo', title: '方案撰写', priority: 'high' },
            { keywords: ['标书制作', '投标文件'], type: 'todo', title: '标书制作', priority: 'high' },
            { keywords: ['销售预测', '业绩预测'], type: 'todo', title: '销售预测', priority: 'medium' },
            { keywords: ['客户资料', '客户档案'], type: 'todo', title: '整理客户资料', priority: 'low' },
            { keywords: ['售后跟进'], type: 'todo', title: '售后跟进', priority: 'medium' },
            { keywords: ['投诉处理'], type: 'todo', title: '投诉处理', priority: 'high' },
            { keywords: ['样品寄送'], type: 'todo', title: '样品寄送', priority: 'medium' },
        ],
        documents: [
            { keywords: ['销售合同', '购销合同'], type: 'document', docType: '销售合同', progress: 'pending' },
            { keywords: ['报价单', '价格表'], type: 'document', docType: '报价单', progress: 'pending' },
            { keywords: ['订单', '销售订单'], type: 'document', docType: '订单', progress: 'pending' },
            { keywords: ['发票', '销售发票'], type: 'document', docType: '发票', progress: 'pending' },
            { keywords: ['客户资料', '客户档案'], type: 'document', docType: '客户资料', progress: 'pending' },
            { keywords: ['投标文件', '标书'], type: 'document', docType: '投标文件', progress: 'pending' },
            { keywords: ['产品手册', '产品说明'], type: 'document', docType: '产品手册', progress: 'pending' },
            { keywords: ['营销方案', '推广方案'], type: 'document', docType: '营销方案', progress: 'pending' },
            { keywords: ['合同变更'], type: 'document', docType: '合同变更', progress: 'pending' },
            { keywords: ['客户投诉', '投诉记录'], type: 'document', docType: '投诉记录', progress: 'pending' },
        ]
    },

    // ==================== 行政后勤模板 ====================
    admin: {
        meetings: [
            { keywords: ['行政例会', '行政周会'], type: 'meeting', title: '行政例会', priority: 'medium' },
            { keywords: ['部门例会', '部门周会'], type: 'meeting', title: '部门例会', priority: 'medium' },
            { keywords: ['年终总结', '年度总结'], type: 'meeting', title: '年终总结会', priority: 'high' },
            { keywords: ['新年晚会', '年会'], type: 'meeting', title: '年会', priority: 'high' },
            { keywords: ['员工大会', '全员大会'], type: 'meeting', title: '员工大会', priority: 'high' },
            { keywords: ['安全会议', '安全培训'], type: 'meeting', title: '安全会议', priority: 'high' },
            { keywords: ['消防演练'], type: 'meeting', title: '消防演练', priority: 'high' },
            { keywords: ['后勤会议'], type: 'meeting', title: '后勤工作会议', priority: 'medium' },
            { keywords: ['接待安排', '来访接待'], type: 'meeting', title: '来访接待', priority: 'high' },
            { keywords: ['物业会议'], type: 'meeting', title: '物业协调会', priority: 'medium' },
        ],
        todos: [
            { keywords: ['会议室预订', '预订会议'], type: 'todo', title: '预订会议室', priority: 'medium' },
            { keywords: ['采购物资', '办公用品'], type: 'todo', title: '采购物资', priority: 'medium' },
            { keywords: ['车辆安排', '用车'], type: 'todo', title: '车辆安排', priority: 'medium' },
            { keywords: ['接待准备', '接待'], type: 'todo', title: '接待准备', priority: 'high' },
            { keywords: ['费用报销', '报销'], type: 'todo', title: '费用报销', priority: 'medium' },
            { keywords: ['档案整理', '文件归档'], type: 'todo', title: '档案整理', priority: 'low' },
            { keywords: ['印章管理', '用印'], type: 'todo', title: '印章管理', priority: 'high' },
            { keywords: ['合同盖章'], type: 'todo', title: '合同盖章', priority: 'high' },
            { keywords: ['固定资产', '资产盘点'], type: 'todo', title: '资产盘点', priority: 'low' },
            { keywords: ['快递收发'], type: 'todo', title: '快递收发', priority: 'low' },
            { keywords: ['值班安排', '排班'], type: 'todo', title: '值班安排', priority: 'medium' },
            { keywords: ['会议纪要', '记录纪要'], type: 'todo', title: '会议纪要', priority: 'medium' },
            { keywords: ['通知发布', '发布通知'], type: 'todo', title: '发布通知', priority: 'medium' },
            { keywords: ['员工活动', '活动组织'], type: 'todo', title: '组织活动', priority: 'medium' },
            { keywords: ['环境维护', '卫生检查'], type: 'todo', title: '环境维护', priority: 'low' },
        ],
        documents: [
            { keywords: ['采购申请', '采购单'], type: 'document', docType: '采购申请', progress: 'pending' },
            { keywords: ['报销单', '费用报销'], type: 'document', docType: '报销单', progress: 'pending' },
            { keywords: ['用印申请', '印章使用'], type: 'document', docType: '用印申请', progress: 'pending' },
            { keywords: ['用车申请'], type: 'document', docType: '用车申请', progress: 'pending' },
            { keywords: ['会议室申请'], type: 'document', docType: '会议室申请', progress: 'pending' },
            { keywords: ['请假条', '请假申请'], type: 'document', docType: '请假条', progress: 'pending' },
            { keywords: ['出差申请'], type: 'document', docType: '出差申请', progress: 'pending' },
            { keywords: ['固定资产登记'], type: 'document', docType: '资产登记', progress: 'pending' },
            { keywords: ['合同审批表'], type: 'document', docType: '合同审批', progress: 'pending' },
            { keywords: ['通知公告'], type: 'document', docType: '通知公告', progress: 'pending' },
        ]
    },

    // ==================== 财务会计模板 ====================
    finance_accounting: {
        meetings: [
            { keywords: ['财务例会', '财务周会'], type: 'meeting', title: '财务例会', priority: 'medium' },
            { keywords: ['预算会议', '预算编制'], type: 'meeting', title: '预算会议', priority: 'high' },
            { keywords: ['审计会议', '审计工作'], type: 'meeting', title: '审计工作会议', priority: 'high' },
            { keywords: ['成本分析会'], type: 'meeting', title: '成本分析会', priority: 'high' },
            { keywords: ['税务会议', '税务筹划'], type: 'meeting', title: '税务工作会议', priority: 'high' },
            { keywords: ['资金会议', '资金调度'], type: 'meeting', title: '资金工作会议', priority: 'high' },
            { keywords: ['决算会议', '年终决算'], type: 'meeting', title: '决算会议', priority: 'high' },
            { keywords: ['内控会议'], type: 'meeting', title: '内控工作会议', priority: 'high' },
        ],
        todos: [
            { keywords: ['记账', '凭证录入'], type: 'todo', title: '记账', priority: 'high' },
            { keywords: ['对账', '账务核对'], type: 'todo', title: '对账', priority: 'high' },
            { keywords: ['结账', '月末结账'], type: 'todo', title: '结账', priority: 'high' },
            { keywords: ['报税', '税务申报'], type: 'todo', title: '报税', priority: 'high' },
            { keywords: ['开票', '开具发票'], type: 'todo', title: '开票', priority: 'high' },
            { keywords: ['收付款', '资金收付'], type: 'todo', title: '收付款', priority: 'high' },
            { keywords: ['银行对账'], type: 'todo', title: '银行对账', priority: 'high' },
            { keywords: ['编制报表', '财务报表'], type: 'todo', title: '编制报表', priority: 'high' },
            { keywords: ['成本核算'], type: 'todo', title: '成本核算', priority: 'high' },
            { keywords: ['预算编制', '预算'], type: 'todo', title: '预算编制', priority: 'high' },
            { keywords: ['审计配合', '审计工作'], type: 'todo', title: '配合审计', priority: 'high' },
            { keywords: ['费用审核', '报销审核'], type: 'todo', title: '费用审核', priority: 'medium' },
            { keywords: ['税务筹划'], type: 'todo', title: '税务筹划', priority: 'high' },
            { keywords: ['资产管理'], type: 'todo', title: '资产管理', priority: 'medium' },
            { keywords: ['档案归档'], type: 'todo', title: '档案归档', priority: 'low' },
        ],
        documents: [
            { keywords: ['记账凭证', '会计凭证'], type: 'document', docType: '记账凭证', progress: 'pending' },
            { keywords: ['财务报表', '会计报表'], type: 'document', docType: '财务报表', progress: 'pending' },
            { keywords: ['发票', '票据'], type: 'document', docType: '发票', progress: 'pending' },
            { keywords: ['银行对账单'], type: 'document', docType: '银行对账单', progress: 'pending' },
            { keywords: ['纳税申报表'], type: 'document', docType: '纳税申报表', progress: 'pending' },
            { keywords: ['预算表', '预算报告'], type: 'document', docType: '预算表', progress: 'pending' },
            { keywords: ['审计报告'], type: 'document', docType: '审计报告', progress: 'pending' },
            { keywords: ['成本分析表'], type: 'document', docType: '成本分析表', progress: 'pending' },
            { keywords: ['资金计划'], type: 'document', docType: '资金计划', progress: 'pending' },
            { keywords: ['报销单', '费用报销'], type: 'document', docType: '报销单', progress: 'pending' },
        ]
    },

    // ==================== 媒体传媒模板 ====================
    media: {
        meetings: [
            { keywords: ['选题会', '选题策划'], type: 'meeting', title: '选题会', priority: 'high' },
            { keywords: ['编前会', '编前会议'], type: 'meeting', title: '编前会', priority: 'high' },
            { keywords: ['审稿会', '稿件评审'], type: 'meeting', title: '审稿会', priority: 'high' },
            { keywords: ['新闻发布', '发布会'], type: 'meeting', title: '新闻发布会', priority: 'high' },
            { keywords: ['采访', '采访安排'], type: 'meeting', title: '采访', priority: 'high' },
            { keywords: ['编辑会', '编辑例会'], type: 'meeting', title: '编辑例会', priority: 'medium' },
            { keywords: ['策划会', '内容策划'], type: 'meeting', title: '内容策划会', priority: 'high' },
            { keywords: ['评审会', '作品评审'], type: 'meeting', title: '作品评审会', priority: 'medium' },
        ],
        todos: [
            { keywords: ['写稿', '撰写稿件'], type: 'todo', title: '写稿', priority: 'high' },
            { keywords: ['审稿', '审核稿件'], type: 'todo', title: '审稿', priority: 'high' },
            { keywords: ['编辑', '编辑稿件'], type: 'todo', title: '编辑', priority: 'medium' },
            { keywords: ['校对', '校对稿件'], type: 'todo', title: '校对', priority: 'high' },
            { keywords: ['采访', '外出采访'], type: 'todo', title: '采访', priority: 'high' },
            { keywords: ['拍摄', '摄影摄像'], type: 'todo', title: '拍摄', priority: 'high' },
            { keywords: ['剪辑', '视频剪辑'], type: 'todo', title: '剪辑', priority: 'medium' },
            { keywords: ['排版', '版面设计'], type: 'todo', title: '排版', priority: 'medium' },
            { keywords: ['发布', '内容发布'], type: 'todo', title: '发布内容', priority: 'high' },
            { keywords: ['选题', '选题策划'], type: 'todo', title: '选题策划', priority: 'high' },
            { keywords: ['数据统计', '流量分析'], type: 'todo', title: '数据统计', priority: 'medium' },
            { keywords: ['评论管理', '互动维护'], type: 'todo', title: '评论管理', priority: 'low' },
            { keywords: ['热点追踪'], type: 'todo', title: '热点追踪', priority: 'high' },
            { keywords: ['素材收集'], type: 'todo', title: '素材收集', priority: 'low' },
            { keywords: ['版权沟通'], type: 'todo', title: '版权沟通', priority: 'medium' },
        ],
        documents: [
            { keywords: ['稿件', '文章'], type: 'document', docType: '稿件', progress: 'pending' },
            { keywords: ['选题方案'], type: 'document', docType: '选题方案', progress: 'pending' },
            { keywords: ['采访提纲'], type: 'document', docType: '采访提纲', progress: 'pending' },
            { keywords: ['审稿意见'], type: 'document', docType: '审稿意见', progress: 'pending' },
            { keywords: ['发布计划'], type: 'document', docType: '发布计划', progress: 'pending' },
            { keywords: ['版权协议'], type: 'document', docType: '版权协议', progress: 'pending' },
            { keywords: ['广告合同'], type: 'document', docType: '广告合同', progress: 'pending' },
            { keywords: ['合作协议'], type: 'document', docType: '合作协议', progress: 'pending' },
            { keywords: ['数据报告', '传播报告'], type: 'document', docType: '数据报告', progress: 'pending' },
            { keywords: ['策划方案'], type: 'document', docType: '策划方案', progress: 'pending' },
        ]
    },

    // ==================== 通用日常模板 ====================
    daily: {
        meetings: [
            { keywords: ['周会', '周例会'], type: 'meeting', title: '周例会', priority: 'medium' },
            { keywords: ['月会', '月度会议'], type: 'meeting', title: '月度会议', priority: 'medium' },
            { keywords: ['季度会', '季度会议'], type: 'meeting', title: '季度会议', priority: 'high' },
            { keywords: ['年会', '年度会议'], type: 'meeting', title: '年度会议', priority: 'high' },
            { keywords: ['例会', '例行会议'], type: 'meeting', title: '例会', priority: 'medium' },
            { keywords: ['培训', '培训会议'], type: 'meeting', title: '培训', priority: 'medium' },
            { keywords: ['视频会议', '线上会议'], type: 'meeting', title: '视频会议', priority: 'medium' },
            { keywords: ['电话会议'], type: 'meeting', title: '电话会议', priority: 'medium' },
            { keywords: ['面试', '面试安排'], type: 'meeting', title: '面试', priority: 'high' },
            { keywords: ['洽谈', '商务洽谈'], type: 'meeting', title: '洽谈', priority: 'high' },
        ],
        todos: [
            { keywords: ['汇报', '工作汇报'], type: 'todo', title: '汇报工作', priority: 'medium' },
            { keywords: ['整理', '资料整理'], type: 'todo', title: '整理资料', priority: 'low' },
            { keywords: ['学习', '业务学习'], type: 'todo', title: '学习', priority: 'low' },
            { keywords: ['准备', '材料准备'], type: 'todo', title: '准备材料', priority: 'medium' },
            { keywords: ['提交', '材料提交'], type: 'todo', title: '提交材料', priority: 'medium' },
            { keywords: ['确认', '事项确认'], type: 'todo', title: '确认事项', priority: 'medium' },
            { keywords: ['回复', '信息回复'], type: 'todo', title: '回复信息', priority: 'medium' },
            { keywords: ['跟进', '事项跟进'], type: 'todo', title: '跟进事项', priority: 'medium' },
            { keywords: ['检查', '工作检查'], type: 'todo', title: '检查工作', priority: 'medium' },
            { keywords: ['总结', '工作总结'], type: 'todo', title: '工作总结', priority: 'low' },
        ],
        documents: [
            { keywords: ['报告', '工作报告'], type: 'document', docType: '报告', progress: 'pending' },
            { keywords: ['申请', '申请书'], type: 'document', docType: '申请', progress: 'pending' },
            { keywords: ['通知', '通知文件'], type: 'document', docType: '通知', progress: 'pending' },
            { keywords: ['证明', '证明材料'], type: 'document', docType: '证明', progress: 'pending' },
            { keywords: ['表单', '表格'], type: 'document', docType: '表单', progress: 'pending' },
        ]
    }
};

/**
 * 模板匹配器类
 */
class TemplateMatcher {
    constructor() {
        this.templates = ITEM_TEMPLATES;
        this.flatTemplates = this.flattenTemplates();
    }

    /**
     * 扁平化模板，便于快速匹配
     */
    flattenTemplates() {
        const flat = [];
        for (const [industry, categories] of Object.entries(this.templates)) {
            for (const [category, items] of Object.entries(categories)) {
                for (const item of items) {
                    flat.push({
                        ...item,
                        industry,
                        category
                    });
                }
            }
        }
        return flat;
    }

    /**
     * 匹配文本到模板
     * @param {string} text 输入文本
     * @returns {Object|null} 匹配到的模板或null
     */
    match(text) {
        if (!text || typeof text !== 'string') return null;

        const normalizedText = text.toLowerCase().trim();
        let bestMatch = null;
        let bestScore = 0;

        for (const template of this.flatTemplates) {
            for (const keyword of template.keywords) {
                const normalizedKeyword = keyword.toLowerCase();
                if (normalizedText.includes(normalizedKeyword)) {
                    // 计算匹配得分（关键词越长得分越高）
                    const score = keyword.length;
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = template;
                    }
                }
            }
        }

        return bestMatch;
    }

    /**
     * 从文本中提取事项信息
     * @param {string} text 输入文本
     * @returns {Object} 提取的事项信息
     */
    extractItem(text) {
        const template = this.match(text);
        const result = {
            type: 'todo',
            data: {
                title: text.substring(0, 50)
            }
        };

        if (template) {
            result.type = template.type;
            result.data.title = template.title || text.substring(0, 50);

            if (template.type === 'meeting') {
                result.data.priority = template.priority || 'medium';
            } else if (template.type === 'todo') {
                result.data.priority = template.priority || 'medium';
            } else if (template.type === 'document') {
                result.data.docType = template.docType || '文件';
                result.data.progress = template.progress || 'pending';
            }
        }

        return result;
    }

    /**
     * 获取所有行业的列表
     */
    getIndustries() {
        return Object.keys(this.templates);
    }

    /**
     * 获取指定行业的模板数量
     */
    getTemplateCount(industry = null) {
        if (industry) {
            const industryTemplates = this.templates[industry];
            if (!industryTemplates) return 0;
            return Object.values(industryTemplates).flat().length;
        }
        return this.flatTemplates.length;
    }
}

// 导出
window.TemplateMatcher = TemplateMatcher;
window.ITEM_TEMPLATES = ITEM_TEMPLATES;

console.log('事项模板库加载完成，共', new TemplateMatcher().getTemplateCount(), '个模板');