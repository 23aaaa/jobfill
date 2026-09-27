import {emptyProfile,uid,makeEntry,makeField} from './model.js';
// A compact schema DSL: group, field list; [label,type,sensitive] overrides the defaults.
const f=(label,type='text',sensitive=false)=>[label,type,sensitive];
const definitions=[
 ['basic','基本信息','常用','从姓名和联系方式开始。证件及隐私信息按需填写。',[
 ['常用资料',['姓名','英文名','性别',f('手机号码','tel'),f('电子邮箱','email'),'当前所在城市',f('个人网站','url'),f('作品集链接','url')]],
 ['证件与个人状态',[f('出生日期','date',true),'国籍 / 地区','民族','政治面貌','籍贯','户籍所在地','生源地','证件类型',f('证件号码','text',true),f('婚姻状况','text',true)]],
 ['地址与其他',[f('通讯地址','multiline',true),'邮政编码','微信号',f('备用电话','tel'),'个人照片文件名（仅备注）','简历附件文件名（仅备注）']]]],
 ['intention','求职意向','常用','面向本次申请的岗位与时间安排。',[
 ['申请偏好',['目标岗位','目标职类','意向行业','意向公司','意向城市','求职类型（校招 / 社招 / 实习）','工作方式（现场 / 混合 / 远程）']],
 ['到岗安排',[f('最早到岗日期','date'),'每周可实习天数','可实习月数','预计毕业时间',f('期望薪资','text',true),'是否接受调剂','是否接受出差','工作许可 / 签证状态']]]],
 ['education','教育经历','常用','每所学校独立成段，支持高中、本科、硕士及博士。',[
 ['学历信息',['学校名称','学院','专业名称','学历','学位','培养方式','学习形式','学校所在城市',f('入学时间','month'),f('毕业时间','month')]],
 ['学业表现',['GPA','GPA 满分','平均成绩','专业排名','专业总人数','排名百分比','主修课程','研究方向','导师姓名','班级']],
 ['补充资料',[f('毕业论文 / 毕业设计','multiline'),f('学习经历说明','multiline'),'第二学位 / 辅修','学历认证状态']]]],
 ['work','工作经历','常用','公司、岗位与职责分层维护，多段经历分别折叠。',[
 ['任职信息',['公司名称','所属行业','公司性质','公司规模','部门名称','岗位名称','工作性质','工作城市',f('开始时间','month'),f('结束时间','month'),'是否至今']],
 ['工作内容',[f('岗位职责','multiline'),f('重点业绩 / 量化结果','multiline'),f('技术栈 / 方法工具','multiline')]],
 ['补充信息',['职级',f('离职原因','multiline',true),f('薪资信息','text',true),'汇报对象',f('证明人姓名','text',true),f('证明人电话','tel',true)]]]],
 ['internship','实习经历','常用','独立于全职经历，保留实习时长、职责与产出。',[
 ['实习信息',['公司名称','部门名称','岗位名称','工作城市','实习类型',f('开始时间','month'),f('结束时间','month'),'是否至今','每周出勤天数']],
 ['实习内容',[f('实习职责','multiline'),f('成果与贡献','multiline'),f('技术栈 / 使用工具','multiline')]],
 ['补充信息',['指导人',f('证明人电话','tel',true),'转正情况',f('离职原因','multiline',true)]]]],
 ['projects','项目经历','常用','按背景、角色、行动与结果组织，长文本原样保留。',[
 ['项目概况',['项目名称','项目类型','所属组织','担任角色',f('开始时间','month'),f('结束时间','month'),'是否至今','团队规模',f('项目链接','url'),f('代码仓库','url')]],
 ['项目内容',[f('项目背景 / 目标','multiline'),f('个人职责','multiline'),f('实施过程 / 难点','multiline'),f('项目成果 / 指标','multiline'),f('技术栈 / 工具','multiline')]]]],
 ['campus','校园与学生工作','扩展','学生组织、社团、班级及校园活动经历。',[
 ['组织信息',['组织 / 社团名称','担任职务','所属学校',f('开始时间','month'),f('结束时间','month'),'是否至今']],
 ['职责成果',[f('职责与工作内容','multiline'),f('成果与影响','multiline')]]]],
 ['awards','奖项与荣誉','常用','奖学金、竞赛、评优等可分别添加。',[
 ['奖项信息',['奖项名称','奖项类别','获奖等级','奖项级别','颁发单位',f('获奖时间','month'),'个人 / 团队','参赛人数 / 排名']],
 ['补充说明',[f('奖项描述','multiline'),f('证明链接','url')]]]],
 ['skills','专业技能','扩展','每种技能单独记录，便于按岗位选用。',[
 ['技能信息',['技能名称','技能类别','掌握程度','使用年限']],['能力证据',[f('应用场景 / 代表成果','multiline'),f('证明链接','url')]]]],
 ['languages','语言能力','扩展','支持不同语言及多种考试，不限定英语。',[
 ['语言与考试',['语言','听说读写水平','考试 / 等级名称','总分','听力成绩','阅读成绩','写作成绩','口语成绩',f('考试日期','date'),f('有效期至','date')]],['说明',[f('实际使用场景','multiline')]]]],
 ['certificates','证书与资质','扩展','职业资格、专业认证、驾驶资格等。',[
 ['证书信息',['证书名称','等级','颁发机构',f('证书编号','text',true),f('取得日期','date'),f('有效期至','date')]],['补充说明',[f('证书说明','multiline'),f('验证链接','url')]]]],
 ['research','科研经历','扩展','课题、实验、研究助理及研究成果。',[
 ['课题信息',['课题名称','研究机构','指导教师','研究角色',f('开始时间','month'),f('结束时间','month')]],['研究内容',[f('研究问题','multiline'),f('研究方法','multiline'),f('个人贡献','multiline'),f('成果与影响','multiline')]]]],
 ['publications','论文与专利','少用','按需启用；不同成果单独维护。',[
 ['成果信息',['成果名称','成果类型','作者 / 发明人排序','期刊 / 会议 / 专利机构','发表 / 授权状态',f('发表 / 授权日期','date'),'DOI / 专利号',f('公开链接','url')]],['成果介绍',[f('摘要 / 内容','multiline'),f('个人贡献','multiline')]]]],
 ['training','培训与进修','扩展','课程、交换项目和专业培训。',[
 ['培训信息',['课程 / 项目名称','培训机构','培训地点',f('开始时间','month'),f('结束时间','month')]],['培训内容',[f('学习内容','multiline'),f('考核与成果','multiline')]]]],
 ['volunteer','志愿与社会实践','扩展','志愿服务、社会调研及公益实践。',[
 ['实践信息',['活动名称','组织单位','担任角色','活动地点',f('开始时间','month'),f('结束时间','month'),'服务时长']],['实践内容',[f('职责与内容','multiline'),f('成果与影响','multiline')]]]],
 ['portfolio','作品与链接','扩展','按作品分别记录，上传文件由招聘网站完成。',[
 ['作品信息',['作品名称','作品类别','本人角色',f('作品链接','url'),'附件文件名（仅备注）']],['作品介绍',[f('作品概述','multiline'),f('个人贡献','multiline'),'访问密码（非账户密码）']]]],
 ['answers','自我介绍与问答','常用','不同版本的自我介绍、申请动机和开放题答案。',[
 ['常用回答',[f('自我介绍','multiline'),f('自我评价','multiline'),f('个人优势','multiline'),f('待提升之处','multiline'),f('申请动机','multiline'),f('职业规划','multiline'),f('兴趣爱好','multiline')]],
 ['行为问题',[f('最有成就感的一件事','multiline'),f('遇到的最大挑战','multiline'),f('团队协作案例','multiline'),f('冲突处理案例','multiline')]]]],
 ['references','推荐人与紧急联系人','少用','仅在确有必要且已获得对方同意时填写。',[
 ['联系人信息',[f('姓名','text',true),'关系','所在单位','职务',f('联系电话','tel',true),f('电子邮箱','email',true)]],['补充说明',[f('联系说明','multiline',true)]]]],
 ['family','家庭成员','少用','默认不启用；谨慎提供第三方个人信息。',[
 ['家庭成员',[f('姓名','text',true),f('与本人关系','text',true),f('工作单位','text',true),f('职务','text',true),f('联系电话','tel',true)]]]],
 ['other','网申补充与声明','少用','由本人核对后填入；不会自动勾选声明或代签。',[
 ['补充材料',[f('其他说明','multiline'),f('信息来源','text'),'内推码','是否曾在该企业任职',f('利益冲突 / 亲属任职说明','multiline',true),f('其他需要说明的情况','multiline',true)]]]]
];
export const TEMPLATES = definitions.map(([key,name,tier,description,groups])=>({key,name,tier,description,groups}));
export function fromTemplate(key) {
 const t=TEMPLATES.find(x=>x.key===key);if(!t)throw new Error('模板不存在。');
 const fields=t.groups.flatMap(([group,items])=>items.map(item=>typeof item==='string'?makeField(item,group):makeField(item[0],group,item[1],item[2])));
 return {id:uid(),name:t.name,tier:t.tier,templateKey:key,entries:[makeEntry(key==='basic'?'个人资料':key==='intention'?'本次求职':key==='answers'?'通用版本':`${t.name} 1`,fields)]};
}
export function starterProfile() {const p=emptyProfile();p.modules=['basic','intention','education','work','internship','projects','awards','answers'].map(fromTemplate);return p;}
export function fullTemplate() {const p=emptyProfile();p.name='完整求职资料模板';p.modules=TEMPLATES.map(t=>fromTemplate(t.key));return p;}
export function exampleProfile() {
 const p=starterProfile();p.name='演示资料 · 所有内容均为虚构';
 const data={basic:{'姓名':'林知夏','手机号码':'13800000000','电子邮箱':'demo@example.com','当前所在城市':'北京','英文名':'Zoe Lin'},intention:{'目标岗位':'AI 产品经理','意向城市':'北京 / 上海','工作方式（现场 / 混合 / 远程）':'混合办公'},education:{'学校名称':'示例大学','专业名称':'计算机科学与技术','学历':'本科','入学时间':'2022-09','毕业时间':'2026-06','GPA':'3.8 / 4.0'},work:{'公司名称':'示例科技有限公司','岗位名称':'产品经理','部门名称':'智能产品部','开始时间':'2025-07','是否至今':'是','岗位职责':'1、梳理用户反馈，建立需求优先级。\n2、与研发、设计协作，推进产品迭代。\n3、保留原始表达：• 项目 → 结果；不改写、不省略。','重点业绩 / 量化结果':'示例数据：完成 3 个版本的需求验证。'},projects:{'项目名称':'求职资料助手','担任角色':'独立产品 / 开发','项目背景 / 目标':'减少重复网申时查找、切换和粘贴资料的成本。','个人职责':'从真实申请场景出发，梳理资料结构与手动填表链路。','项目成果 / 指标':'此处为演示内容，不代表真实业务成果。'},answers:{'自我介绍':'你好，我是林知夏。这是一份虚构的演示资料，用于体验小师弟求职。\n我喜欢把复杂的信息整理成简单、可复用的工具。'}};
 for(const m of p.modules){const values=data[m.templateKey]||{};for(const field of m.entries[0].fields)field.value=values[field.label]||'';if(m.templateKey==='work')m.entries[0].title='示例科技 · 产品经理';if(m.templateKey==='projects')m.entries[0].title='求职资料助手';}
 return p;
}
