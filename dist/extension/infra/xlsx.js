import {exportFriendlyXlsx,friendlyRowsToProfile,STRUCTURE_SHEET} from './workbook-v2.js';
import {packZip,unpackZip} from './zip.js';
import {validateProfile,emptyProfile,uid,LIMITS,TIERS,TYPES} from '../domain/model.js';
export const HEADERS=['模块ID','模块名称','展示层级','条目ID','条目名称','字段ID','字段分组','字段名称','字段类型','敏感信息','填写内容','模板标识'];
export const FORMAT='ApplyDock workbook 1';
export function profileRows(profile) {
 const p=validateProfile(profile),rows=[HEADERS];
 for(const m of p.modules){
  if(!m.entries.length){rows.push([m.id,m.name,m.tier,'','','','','','','','',m.templateKey]);continue;}
  for(const e of m.entries){
   if(!e.fields.length){rows.push([m.id,m.name,m.tier,e.id,e.title,'','','','','','',m.templateKey]);continue;}
   for(const f of e.fields)rows.push([m.id,m.name,m.tier,e.id,e.title,f.id,f.group,f.label,f.type,f.sensitive?'是':'否',f.value,m.templateKey]);
  }
 }
 return rows;
}
export function metadataRows(profile){return [['格式',FORMAT],['资料ID',profile.id],['资料名称',profile.name],['版本',String(profile.version)],['修订',String(profile.revision)],['更新时间',profile.updatedAt]];}
export const INSTRUCTIONS=[
 ['小师弟求职 · 旧版资料表','本表仅在本地处理，不包含云同步。'],
 ['开始填写','切换到「资料表」。可按模块名称、条目名称、字段分组筛选；在「填写内容」列维护资料。'],
 ['保存与导回','保持 .xlsx 格式，在小师弟求职点击「导入」。先预览统计并核对，再确认替换。'],
 ['新增字段','复制同条目的某一行；清空「字段ID」，修改字段名称、字段类型和内容。'],
 ['新增经历','复制一整段经历的行；清空所复制行的「条目ID」和「字段ID」；将条目名称统一改为一个新的名称。'],
 ['新增模块','复制相关行；清空模块ID、条目ID、字段ID；填写新的模块名称、条目名称。复杂修改建议在维护页完成。'],
 ['结构标识','A / D / F 列为ID，L列为模板标识，默认隐藏。修改结构时可取消隐藏。不新增时请保留原 ID。'],
 ['名称与层级','同一模块或条目在不同行出现的名称必须一致；展示层级仅允许「常用」「扩展」「少用」。'],
 ['字段类型','text 短文本 / multiline 多行 / date 日期 / month 年月 / email 邮箱 / tel 电话 / url 链接 / number 数字文本。'],
 ['纯文本保存','日期、证件号、手机号均以文本保存。日期建议 YYYY-MM-DD；年月建议 YYYY-MM。不执行或接受公式。'],
 ['原文保留','换行、空格、编号、特殊符号按原文保存。不润色、不纠错、不推断缺失信息。'],
 ['隐私提醒','Excel 为明文，可能包含你或第三方的个人信息；不要发送至公共群聊。更安全的备份请使用加密备份。'],
 ['格式范围','只支持本产品资料表格式；不是任意简历或任意 Excel 的智能识别器。'],
 ['空模块与条目','仅删除内容会保留字段；删除整行表示删除该字段。要保留空模块 / 条目，请保留对应空行。'],
 ['显示不等于丢失','长文本行高有限，可在编辑栏查看完整值；同一单元格最多 32767 个 UTF-16 代码单元。']
];
const escapeXml=s=>String(s).replace(/_x([0-9a-fA-F]{4})_/g,'_x005F_x$1_').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\r/g,'&#13;');
const colName=i=>{let s='';for(i++;i>0;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
function worksheet(rows,kind){
 const cols=kind==='data'?'<cols>'+[14,18,12,14,24,14,20,26,14,12,68,18].map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"${[0,3,5,11].includes(i)?' hidden="1"':''}/>`).join('')+'</cols>':'<cols><col min="1" max="1" width="24" customWidth="1"/><col min="2" max="2" width="95" customWidth="1"/></cols>';
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'+cols+'<sheetData>'+rows.map((row,r)=>`<row r="${r+1}" ht="${r===0?28:kind==='help'?42:32}" customHeight="1">`+row.map((value,c)=>`<c r="${colName(c)}${r+1}" t="inlineStr" s="${r===0?1:2}"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`).join('')+'</row>').join('')+'</sheetData>'+(kind==='data'?`<autoFilter ref="A1:L${Math.max(rows.length,1)}"/>`:'')+'</worksheet>';
}
export function exportLegacyXlsx(profile){
 const p=validateProfile(profile);
 const files={
 '[Content_Types].xml':'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+[1,2,3].map(n=>`<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>',
 '_rels/.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
 'xl/workbook.xml':'<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="使用说明" sheetId="1" r:id="rId1"/><sheet name="资料表" sheetId="2" r:id="rId2"/><sheet name="_投递舱" sheetId="3" state="hidden" r:id="rId3"/></sheets></workbook>',
 'xl/_rels/workbook.xml.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+[1,2,3].map(n=>`<Relationship Id="rId${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${n}.xml"/>`).join('')+'<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
 'xl/styles.xml':'<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1D5C52"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
 'xl/worksheets/sheet1.xml':worksheet(INSTRUCTIONS,'help'),
 'xl/worksheets/sheet2.xml':worksheet(profileRows(p),'data'),
 'xl/worksheets/sheet3.xml':worksheet(metadataRows(p),'meta')
 };
 return packZip(files);
}
function parseXml(bytes,path){
 if(!bytes)throw new Error(`缺少工作簿组件：${path}`);
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('不支持带外部实体的 XML。');
 const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw new Error(`XML 内容损坏：${path}`);return doc;
}
const els=(parent,name)=>Array.from(parent.getElementsByTagNameNS('*',name));
const decodeExcelEscapes=s=>s.replace(/_x([0-9a-fA-F]{4})_/g,(_,h)=>String.fromCharCode(parseInt(h,16)));
function readRows(xml,shared){
 const result=[];let cells=0;
 for(const row of els(xml,'row')){
  const out=[];for(const c of Array.from(row.children).filter(x=>x.localName==='c')){
   if(++cells>90000)throw new Error('工作表单元格过多。');
   if(els(c,'f').length)throw new Error('资料表含公式。请将公式转为文本值后导入。');
   const match=/^([A-Z]{1,3})([1-9]\d*)$/.exec(c.getAttribute('r')||'');if(!match)throw new Error('单元格坐标无效。');
   let col=0;for(const ch of match[1])col=col*26+ch.charCodeAt(0)-64;col--;
   if(col>31)throw new Error('资料表列数超出范围。');if(out[col]!==undefined)throw new Error('单元格坐标重复。');
   const type=c.getAttribute('t'),value=els(c,'v')[0]?.textContent??'';
   if(type==='inlineStr')out[col]=decodeExcelEscapes(els(c,'t').filter(x=>x.parentElement?.localName!=='rPh').map(t=>t.textContent||'').join(''));
   else if(type==='s'){const index=Number(value);if(!Number.isSafeInteger(index)||index<0||index>=shared.length)throw new Error('共享字符串索引无效。');out[col]=shared[index];}
   else if(type==='e')throw new Error('工作表含错误单元格，请先修复。');
   else {if(type!=='str'&&value!=='')throw new Error(`单元格 ${c.getAttribute('r')} 不是文本。为保护日期、证件号和前导零，请改为文本格式并重新输入原始内容，避免证件号、日期或前导零已被 Excel 改变。`);out[col]=decodeExcelEscapes(value);}
   if(out[col].length>LIMITS.value)throw new Error('某个单元格内容超过 32767 字符。');
  }
  result.push(out);
  if(result.length>LIMITS.fields+LIMITS.entries+LIMITS.modules+2)throw new Error('工作表行数过多。');
 }
 return result;
}
export function rowsToProfile(rows,meta){
 if(!rows.length||HEADERS.some((h,i)=>rows[0][i]!==h))throw new Error('表头与旧版模板不一致。请使用原文件，或从小师弟求职重新导出。');
 if(meta.get('格式')!==FORMAT)throw new Error('不是受支持的旧版资料表。');
 const p=emptyProfile();p.id=meta.get('资料ID')||p.id;p.name=meta.get('资料名称')||p.name;p.version=Number(meta.get('版本'));p.revision=Number(meta.get('修订')||0);p.updatedAt=meta.get('更新时间')||p.updatedAt;
 const modules=new Map(),moduleByName=new Map(),entries=new Map(),entryByName=new Map(),ids=new Set();
 rows.slice(1).forEach((row,index)=>{
  if(row.every(x=>x===undefined||x===''))return;
  const r=Array.from({length:12},(_,i)=>row[i]??'');
  let [mid,mname,tier,eid,etitle,fid,group,label,type,sensitive,value,key]=r;
  const err=s=>{throw new Error(`资料表第 ${index+2} 行：${s}`);};
  if(row.slice(12).some(x=>x!==undefined&&x!==''))err('存在多余的内容列，请使用字段行扩展。');
  if(!mname.trim()||!TIERS.includes(tier))err('模块名称或展示层级无效。');
  if(!mid){const named=moduleByName.get(mname);if(named&&named.length>1)err('模块同名且 ID 为空，无法确定归属。');mid=named?.[0]||uid();}
  let m=modules.get(mid);
  if(!m){m={id:mid,name:mname,tier,templateKey:key,entries:[]};modules.set(mid,m);p.modules.push(m);moduleByName.set(mname,[...(moduleByName.get(mname)||[]),mid]);}
  else if(m.name!==mname||m.tier!==tier||m.templateKey!==key)err('同一个模块 ID 的名称、分层或模板标识不一致。');
  if(!eid&&!etitle&&!fid&&!label&&!value)return;
  if(!etitle.trim())err('条目名称不能为空。');
  const naturalKey=JSON.stringify([mid,etitle]);
  if(!eid){const named=entryByName.get(naturalKey);if(named&&named.length>1)err('条目同名且 ID 为空，无法确定归属。');eid=named?.[0]||uid();}
  let existing=entries.get(eid),e=existing?.entry;
  if(!e){e={id:eid,title:etitle,fields:[]};m.entries.push(e);entries.set(eid,{moduleId:mid,entry:e});entryByName.set(naturalKey,[...(entryByName.get(naturalKey)||[]),eid]);}
  else if(existing.moduleId!==mid||e.title!==etitle)err('同一个条目 ID 的归属或名称不一致。');
  if(!fid&&!label&&!value)return;
  if(!label.trim()||!TYPES.includes(type)||!['是','否'].includes(sensitive))err('字段名称、类型或敏感标记不正确。');
  fid=fid||uid();if(ids.has(fid))err('字段 ID 重复。新增字段请清空 ID。');ids.add(fid);
  e.fields.push({id:fid,label,group,type,value,sensitive:sensitive==='是'});
 });
 return validateProfile(p);
}
export function exportXlsx(profile,options={}){return exportFriendlyXlsx(profile,options);}
export async function importXlsx(bytes){
 const files=await unpackZip(bytes);
 if(!files.has('[Content_Types].xml')||[...files.keys()].some(n=>/vbaProject|externalLinks|\.bin$/i.test(n)))throw new Error('仅支持无宏、无外部链接的标准 XLSX。');
 const wb=parseXml(files.get('xl/workbook.xml'),'workbook'),rels=parseXml(files.get('xl/_rels/workbook.xml.rels'),'rels'),links=new Map();
 for(const r of els(rels,'Relationship')){if(r.getAttribute('TargetMode')==='External')throw new Error('不接受外部链接。');let target=r.getAttribute('Target')||'';if(target.includes('..')||target.includes('\\'))throw new Error('工作表引用路径不安全。');target=target.startsWith('/')?target.slice(1):'xl/'+target;links.set(r.getAttribute('Id'),target);}
 const sheets=new Map();for(const s of els(wb,'sheet')){const rel=s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');sheets.set(s.getAttribute('name'),links.get(rel));}
 let shared=[];if(files.has('xl/sharedStrings.xml')){const doc=parseXml(files.get('xl/sharedStrings.xml'),'sharedStrings');shared=els(doc,'si').map(si=>decodeExcelEscapes(els(si,'t').filter(t=>t.parentElement?.localName!=='rPh').map(t=>t.textContent||'').join('')));}
 if(sheets.has(STRUCTURE_SHEET)){
  const metaPath=sheets.get(STRUCTURE_SHEET),metadata=readRows(parseXml(files.get(metaPath),metaPath),shared);
  const entries=els(wb,'sheet').map(s=>{const name=s.getAttribute('name'),path=sheets.get(name);try{return {id:s.getAttribute('sheetId'),name,rows:readRows(parseXml(files.get(path),path),shared)};}catch(error){throw new Error(`「${name}」：${error.message}`);}});
  return friendlyRowsToProfile(entries,metadata);
 }
 if(!sheets.has('资料表')||!sheets.has('_投递舱'))throw new Error('找不到资料格式信息，请使用小师弟求职导出的 Excel。');
 const dataPath=sheets.get('资料表'),metaPath=sheets.get('_投递舱');
 const rows=readRows(parseXml(files.get(dataPath),dataPath),shared),metarows=readRows(parseXml(files.get(metaPath),metaPath),shared);
 return rowsToProfile(rows,new Map(metarows.map(r=>[r[0],r[1]])));
}
