import fs from 'node:fs/promises';import path from 'node:path';import {fingerprint,root} from './fingerprint.mjs';
const failures=[],source=await fingerprint();
async function read(file){try{return JSON.parse(await fs.readFile(path.join(root,file),'utf8'));}catch{failures.push('缺失或无效：'+file);return null;}}
for(const file of ['reports/unit-tests.json','reports/browser-tests.json','reports/refinement-tests.json']){const report=await read(file);if(!report)continue;if(report.source_sha256!==source)failures.push(file+' 与当前产品源码不一致，必须重新测试');if(!report.counts?.total||report.counts.failed||report.exit_code)failures.push(file+' 未全部通过');}
const checklist=await read('docs/validation/release-checklist.json');
const required=['native_chrome','native_focus_security','real_sites','excel_editors','usability','commercial','store_review'];
async function evidenceExists(relative){if(typeof relative!=='string'||!relative)return false;const full=path.resolve(root,relative);if(!full.startsWith(root+path.sep))return false;try{return (await fs.stat(full)).isFile()&&(await fs.readFile(full)).byteLength>40;}catch{return false;}}
for(const id of required){const item=checklist?.items?.find(x=>x.id===id);if(!item||item.status!=='passed'||!item.reviewer||!Number.isFinite(Date.parse(item.reviewed_at))||!await evidenceExists(item.evidence_path))failures.push('人工发布验收尚无有效证据：'+id);}
const merchant=await read('docs/store/merchant-config.json');
if(!merchant?.operator_name?.trim())failures.push('未确认运营主体');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(merchant?.support_email||''))failures.push('未提供真实支持邮箱');
try{const url=new URL(merchant?.privacy_policy_url);if(url.protocol!=='https:'||['example.com','localhost'].includes(url.hostname))throw new Error();}catch{failures.push('未提供可公开访问的正式 HTTPS 隐私政策地址');}
if(!merchant?.sales_channel?.trim())failures.push('未确认销售渠道');
for(const key of ['customer_license_evidence','refund_and_support_evidence'])if(!await evidenceExists(merchant?.[key]))failures.push('未提供运营证据：'+key);
const report={version:'1.1.0-rc.1',source_sha256:source,generated_at:new Date().toISOString(),decision:failures.length?'HOLD':'READY_FOR_OPERATOR_REVIEW',failures,notice:'此门禁检查证据文件与测试状态，不替代真人验收、安全审计、法律审查或商店审核。'};
await fs.writeFile(path.join(root,'reports/release-gate.json'),JSON.stringify(report,null,2));
if(failures.length){console.error('发布门禁：HOLD\n'+failures.map(x=>' - '+x).join('\n'));process.exit(1);}console.log('所有已配置证据齐备，请运营者最终复核。');
