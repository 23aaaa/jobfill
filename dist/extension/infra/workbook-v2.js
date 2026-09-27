/** Human-facing workbook format v2.
 * One category per sheet; A group, B label, C value. D:H are hidden identity/type columns.
 * Visible cells are the only source of field values. No stale hidden copy of user data.
 * Old workbook format is handled separately by xlsx.js.
 */
import {packZip} from './zip.js';
import {validateProfile,emptyProfile,uid,TYPES,TIERS} from '../domain/model.js';
import {PALETTES} from '../shared/design-tokens.js';
export const FRIENDLY_FORMAT='Xiaoshidi workbook 2';
export const STRUCTURE_SHEET='_小师弟结构';
export const FRIENDLY_HEADERS=['分组','项目','填写内容','__kind','__entry','__field','__type','__sensitive'];
const HELP_NAME='填写帮助';
export function safeSheetName(name,used){
 let base=name.replace(/[\\/\[\]*?:]/g,' ').replace(/^'+|'+$/g,'').trim().slice(0,31)||'资料';
 // UTF-16 truncation must not leave an unpaired surrogate in OOXML.
 if(/[\uD800-\uDBFF]$/.test(base))base=base.slice(0,-1);
 let result=base,n=2;while(used.has(result.toLocaleLowerCase())){const suffix=` (${n++})`;let cut=base.slice(0,31-suffix.length);if(/[\uD800-\uDBFF]$/.test(cut))cut=cut.slice(0,-1);result=cut+suffix;}
 used.add(result.toLocaleLowerCase());return result;
}
export function workbookDescriptor(profile){
 const p=validateProfile(profile),used=new Set([HELP_NAME.toLocaleLowerCase(),STRUCTURE_SHEET.toLocaleLowerCase()]);
 const meta=[['格式',FRIENDLY_FORMAT],['资料ID',p.id],['资料名称',p.name],['版本',String(p.version)],['修订',String(p.revision)],['更新时间',p.updatedAt]];
 const sheets=p.modules.map((m,index)=>{
  const name=safeSheetName(m.name,used),id=String(index+1),rows=[FRIENDLY_HEADERS],merges=[];
  meta.push(['分类',id,name,m.id,m.name,m.tier,m.templateKey]);
  for(const e of m.entries){rows.push([e.title,'','','entry',e.id,'','','']);merges.push(`A${rows.length}:C${rows.length}`);
   for(const f of e.fields)rows.push([f.group,f.label,f.value,'field',e.id,f.id,f.type,f.sensitive?'是':'否']);
  }
  return {id,name,rows,merges,kind:'data',tier:m.tier};
 });
 const help=[
  ['小师弟求职','填写与导回'],
  ['填写资料','底部每个工作表是一类资料。在「填写内容」列写自己的信息，保存 .xlsx 后导回小师弟求职。'],
  ['多段经历','同一个工作表内，一条标题栏就是一段经历。复制整段（包括标题栏）可新增一段，再改标题和内容。'],
  ['增加项目','在经历内部插入一整行，填写「项目」和「填写内容」。复制现有项目行也可以，随后修改名称和内容。'],
  ['分类名称','修改底部工作表名称即可改名；复制整个工作表可添加分类。复杂调整也可以在页面中完成。'],
  ['长文本与证件号','换行、编号、前导零原样保留。内容列已设为文本。长内容可在编辑栏完整查看；不要改成数值或公式。'],
  ['导入前确认','导入会先预览，再替换当前资料。删除项目行、整段或工作表也会删除对应资料，建议先备份。'],
  ['隐私','Excel 是明文，包含所有敏感字段。只在可信设备保存，不要公开分享。'],
  ['无需处理隐藏列','隐藏列只负责记住记录身份，不必编辑。请不要只排序某几列；移动或复制时选择整行或整段。']
 ];
 sheets.push({id:String(sheets.length+1),name:HELP_NAME,rows:help,kind:'help',merges:[]});
 sheets.push({id:String(sheets.length+1),name:STRUCTURE_SHEET,rows:meta,kind:'meta',hidden:true,merges:[]});
 return sheets;
}
const xml=s=>String(s).replace(/_x([0-9a-fA-F]{4})_/g,'_x005F_x$1_').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\r/g,'&#13;');
const col=i=>String.fromCharCode(65+i);
export function estimateRowHeight(text,capacity=58){
 const lines=String(text).split(/\r\n|\r|\n/).reduce((n,line)=>n+Math.max(1,Math.ceil([...line].reduce((v,ch)=>v+(ch.charCodeAt(0)>255?2:1),0)/capacity)),0);
 return Math.min(180,Math.max(30,lines*16+12));
}
function worksheet(sheet,color){
 const data=sheet.kind==='data',help=sheet.kind==='help';
 const columns=data?'<col min="1" max="1" width="15" customWidth="1"/><col min="2" max="2" width="25" customWidth="1"/><col min="3" max="3" width="66" style="3" customWidth="1"/><col min="4" max="8" width="16" hidden="1" customWidth="1"/>':'<col min="1" max="1" width="23" customWidth="1"/><col min="2" max="2" width="84" customWidth="1"/>';
 const rows=sheet.rows.map((r,i)=>{const entry=data&&r[3]==='entry',ht=i===0?32:entry?Math.max(34,estimateRowHeight(r[0],100)):help?Math.max(46,estimateRowHeight(r[1]||'',78)):Math.max(estimateRowHeight(r[0]||'',13),estimateRowHeight(r[1]||'',23),estimateRowHeight(r[2]||''));return `<row r="${i+1}" ht="${ht}" customHeight="1">`+r.map((v,j)=>`<c r="${col(j)}${i+1}" t="inlineStr" s="${i===0?1:entry&&j<3?2:data&&j===2?3:data&&j===0?4:5}"><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join('')+'</row>';}).join('');
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+(data?`<sheetPr><tabColor rgb="FF${color}"/></sheetPr>`:'')+`<dimension ref="A1:${data?'H':'G'}${Math.max(sheet.rows.length,1)}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="30"/><cols>${columns}</cols><sheetData>${rows}</sheetData>`+(sheet.merges.length?`<mergeCells count="${sheet.merges.length}">`+sheet.merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')+'</mergeCells>':'')+'<pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup orientation="portrait" paperSize="9" fitToWidth="1" fitToHeight="0"/></worksheet>';
}
function styles(p){
 const c=p.accent.slice(1).toUpperCase(),soft=p.soft.slice(1).toUpperCase();
 return `<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="11"/><color rgb="FF1C2024"/><name val="Microsoft YaHei"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Microsoft YaHei"/></font><font><b/><sz val="11"/><color rgb="FF1C2024"/><name val="Microsoft YaHei"/></font><font><sz val="10"/><color rgb="FF60646C"/><name val="Microsoft YaHei"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF${c}"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF${soft}"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF9F9FB"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><bottom style="hair"><color rgb="FFE0E1E6"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6">`+
 [[0,0,0],[1,2,0],[2,4,1],[0,3,1],[3,0,1],[0,0,1]].map(([font,fill,border])=>`<xf numFmtId="49" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1" indent="1"/></xf>`).join('')+'</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
}
export function exportFriendlyXlsx(profile,{theme='blue'}={}){
 const sheets=workbookDescriptor(profile),palette=PALETTES.find(p=>p.id===theme)||PALETTES[0],color=palette.accent.slice(1).toUpperCase();
 const files={
 '[Content_Types].xml':'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map(s=>`<Override PartName="/xl/worksheets/sheet${s.id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>',
 '_rels/.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
 'xl/workbook.xml':'<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>'+sheets.map(s=>`<sheet name="${xml(s.name)}" sheetId="${s.id}"${s.hidden?' state="hidden"':''} r:id="rId${s.id}"/>`).join('')+'</sheets></workbook>',
 'xl/_rels/workbook.xml.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map(s=>`<Relationship Id="rId${s.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${s.id}.xml"/>`).join('')+`<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
 'xl/styles.xml':styles(palette)
 };
 for(const sheet of sheets)files[`xl/worksheets/sheet${sheet.id}.xml`]=worksheet(sheet,color);
 return packZip(files);
}
/** Parsed rows -> domain model. Changes are validated before callers replace any data. */
export function friendlyRowsToProfile(sheets,metadata){
 const meta=new Map(metadata.filter(r=>r[0]!=='分类').map(r=>[r[0],r[1]]));
 if(meta.get('格式')!==FRIENDLY_FORMAT)throw new Error('这个工作簿版本暂不支持，请使用小师弟求职导出的模板。');
 const p=emptyProfile();p.id=meta.get('资料ID')||p.id;p.name=meta.get('资料名称')||p.name;p.version=Number(meta.get('版本'));p.revision=Number(meta.get('修订'));p.updatedAt=meta.get('更新时间');
 const descriptors=new Map();for(const row of metadata.filter(r=>r[0]==='分类')){if(descriptors.has(row[1]))throw new Error('分类信息重复，未导入。');descriptors.set(row[1],row);}
 const globalIds=new Set([p.id]);const keepId=(candidate,fresh=false)=>{if(!candidate||fresh)return uid();if(globalIds.has(candidate))throw new Error('记录标识重复，未导入。');globalIds.add(candidate);return candidate;};
 const names=new Set();
 for(const sheet of sheets){
  if(names.has(sheet.name.toLocaleLowerCase()))throw new Error('工作表名称重复。');names.add(sheet.name.toLocaleLowerCase());
  if(sheet.name===STRUCTURE_SHEET||sheet.name===HELP_NAME)continue;
  const rows=sheet.rows;
  if(!rows.length||FRIENDLY_HEADERS.slice(0,3).some((v,i)=>rows[0][i]!==v))throw new Error(`「${sheet.name}」缺少「分组、项目、填写内容」表头。请使用导出的资料表。`);
  const d=descriptors.get(String(sheet.id)),fresh=!d;
  const m={id:keepId(d?.[3],fresh),name:d&&sheet.name===d[2]?d[4]:sheet.name,tier:d?.[5]||'扩展',templateKey:d?.[6]||'',entries:[]};
  if(!TIERS.includes(m.tier))throw new Error(`「${sheet.name}」分类信息损坏。`);
  p.modules.push(m);let current=null,sourceEntry='',copiedEntry=false,lastGroup='';const entrySources=new Set(),fieldSources=new Set();
  rows.slice(1).forEach((raw,index)=>{
   const r=Array.from({length:8},(_,i)=>raw[i]??'');if(r.every(v=>v===''))return;
   const [group,label,value,kind,eid,fid,type,sensitive]=r;
   const fail=text=>{throw new Error(`「${sheet.name}」第 ${index+2} 行：${text}`);};
   if(raw.slice(8).some(v=>v!==undefined&&v!==''))fail('多出了内容列，请在「项目」下新增一行。');
   if(kind&&!['entry','field'].includes(kind))fail('隐藏的记录类型损坏。');
   if(kind==='entry'||(!kind&&group&&!label&&!value)){
    if(!group.trim())fail('请填写这段记录的标题。');if(label||value)fail('经历标题行只能填写标题，请把资料放在下方项目行。');
    copiedEntry=!!eid&&entrySources.has(eid);sourceEntry=eid;entrySources.add(eid);lastGroup='';
    current={id:keepId(eid,fresh||copiedEntry),title:group,fields:[]};m.entries.push(current);return;
   }
   if(!label.trim())fail('请填写「项目」名称，或删除整行。');
   if(!current){if(eid)fail('缺少经历标题，请将整段记录一起导回。');current={id:uid(),title:'资料',fields:[]};m.entries.push(current);}
   if(eid&&sourceEntry&&eid!==sourceEntry)fail('这一行不属于上方经历，请移动整行或整段，勿只排序部分列。');
   const fieldType=type||(value.includes('\n')?'multiline':'text');if(!TYPES.includes(fieldType))fail('字段格式损坏，请在页面中重新设置该项目。');
   if(sensitive&&!['是','否'].includes(sensitive))fail('敏感信息标记只能为「是」或「否」。');
   const copiedField=!!fid&&fieldSources.has(fid);fieldSources.add(fid);
   const actualGroup=!kind&&!group?lastGroup:group;lastGroup=actualGroup;
   current.fields.push({id:keepId(fid,fresh||copiedEntry||copiedField),group:actualGroup,label,value,type:fieldType,sensitive:sensitive?sensitive==='是':/身份证|证件|护照|银行卡|银行账号/.test(label)});
  });
 }
 return validateProfile(p);
}
