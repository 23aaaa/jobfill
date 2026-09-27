/** @typedef {{id:string,label:string,group:string,type:string,value:string,sensitive:boolean}} Field */
/** @typedef {{id:string,title:string,fields:Field[]}} Entry */
/** @typedef {{id:string,name:string,tier:string,templateKey:string,entries:Entry[]}} Module */
/** @typedef {{version:number,id:string,name:string,revision:number,updatedAt:string,modules:Module[]}} Profile */
export const VERSION = 1;
export const TYPES = ['text','multiline','date','month','email','tel','url','number'];
export const TYPE_NAMES = {text:'短文本',multiline:'多行文本',date:'日期',month:'年月',email:'邮箱',tel:'电话',url:'链接',number:'数字文本'};
export const TIERS = ['常用','扩展','少用'];
export const LIMITS = Object.freeze({fileBytes:8*1024*1024, profileBytes:2*1024*1024, modules:60, entries:600, fields:6000, value:32767, label:120});
export function uid() { return crypto.randomUUID(); }
export function clone(value) { return structuredClone(value); }
export function makeField(label='自定义字段', group='基本信息', type='text', sensitive=false) { return {id:uid(),label,group,type,value:'',sensitive}; }
export function makeEntry(title='新记录', fields=[]) { return {id:uid(),title,fields:clone(fields).map(f=>({...f,id:uid()}))}; }
export function makeModule(name='自定义分类', tier='扩展') { return {id:uid(),name,tier,templateKey:'',entries:[makeEntry('记录 1',[makeField('内容','','multiline')])]}; }
export function emptyProfile() { return {version:VERSION,id:uid(),name:'我的求职资料',revision:0,updatedAt:new Date().toISOString(),modules:[]}; }
export function byteLength(value) { return new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value)).byteLength; }
export function validateProfile(raw) {
  const fail = message => { throw new Error(message); };
  if (!raw || typeof raw!=='object' || Array.isArray(raw)) fail('资料格式不正确：需要一个资料对象。');
  if (raw.version!==VERSION) fail(`不支持资料版本 ${String(raw.version)}。请使用匹配版本的小师弟求职。`);
  if (byteLength(raw)>LIMITS.profileBytes) fail('资料超过 2 MB。请缩短内容或拆分为多个备份。');
  const used = new Set();
  const id = (v,path) => { if(typeof v!=='string'||!v||v.length>80||!/^[-\w]+$/.test(v))fail(`${path}的 ID 无效。`); if(used.has(v))fail(`${path}的 ID 重复。`);used.add(v);return v; };
  const str = (v,path,max=120,required=false) => { if(typeof v!=='string'||v.length>max)fail(`${path}必须是长度不超过 ${max} 的文本。`); if(typeof v.isWellFormed==='function'&&!v.isWellFormed())fail(`${path}含无效 Unicode 字符。`); if(required&&!v.trim())fail(`${path}不能为空。`); if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/u.test(v))fail(`${path}含不支持的控制字符。`);return v; };
  if(!Array.isArray(raw.modules)||raw.modules.length>LIMITS.modules)fail('分类数量应不超过 60。');
  if(!Number.isSafeInteger(raw.revision)||raw.revision<0)fail('资料版本号无效。');
  if(typeof raw.updatedAt!=='string'||!Number.isFinite(Date.parse(raw.updatedAt)))fail('资料更新时间无效。');
  const result={version:VERSION,id:id(raw.id,'资料'),name:str(raw.name,'资料名称',120,true),revision:raw.revision,updatedAt:raw.updatedAt,modules:[]};
  let entries=0,fields=0;
  result.modules=raw.modules.map((m,mi)=>{
    if(!m||typeof m!=='object')fail(`分类 ${mi+1} 无效。`);
    if(!TIERS.includes(m.tier))fail(`分类 ${mi+1} 分层无效。`);
    if(!Array.isArray(m.entries))fail('记录必须为数组。');
    entries+=m.entries.length;if(entries>LIMITS.entries)fail('总记录数不能超过 600。');
    return {id:id(m.id,'分类'),name:str(m.name,'分类名称',120,true),tier:m.tier,templateKey:str(m.templateKey??'','模板标识',80),entries:m.entries.map(e=>{
      if(!e||!Array.isArray(e.fields))fail('记录字段无效。');
      fields+=e.fields.length;if(fields>LIMITS.fields)fail('总字段数不能超过 6000。');
      return {id:id(e.id,'记录'),title:str(e.title,'记录名称',120,true),fields:e.fields.map(f=>{
        if(!f||!TYPES.includes(f.type)||typeof f.sensitive!=='boolean')fail('字段类型或敏感标记无效。');
        return {id:id(f.id,'字段'),label:str(f.label,'字段名称',120,true),group:str(f.group,'字段分组',120),type:f.type,value:str(f.value,'字段内容',LIMITS.value),sensitive:f.sensitive};
      })};
    })};
  });
  return result;
}
export function stats(profile) {
  let entries=0,total=0,filled=0,sensitive=0;
  for(const m of profile.modules)for(const e of m.entries){entries++;for(const f of e.fields){total++;if(f.value!==''){filled++;if(f.sensitive)sensitive++;}}}
  return {modules:profile.modules.length,entries,total,filled,sensitive};
}
export function getField(profile,id) { for(const m of profile.modules)for(const e of m.entries){const field=e.fields.find(f=>f.id===id);if(field)return {module:m,entry:e,field};}return null; }
export function getEntry(profile,id) { for(const m of profile.modules){const entry=m.entries.find(e=>e.id===id);if(entry)return {module:m,entry};}return null; }
export function moveItem(array,id,delta) {const i=array.findIndex(x=>x.id===id);const j=i+delta;if(i<0||j<0||j>=array.length)return false;[array[i],array[j]]=[array[j],array[i]];return true;}
export function duplicateEntry(entry) {return makeEntry(`${entry.title.slice(0,112)} · 副本`,entry.fields);}
/** Search is a normalized index only; field values are never modified. */
export function searchable(field,entry,module,query) {
 const norm=s=>String(s).normalize('NFKC').toLocaleLowerCase();
 const terms=norm(query).trim().split(/\s+/u).filter(Boolean);
 const text=norm(`${module.name}\n${entry.title}\n${field.group}\n${field.label}\n${field.sensitive?'':field.value}`);
 return terms.every(term=>text.includes(term));
}
export function mask(value) {return value? '••••••••' : '未填写';}
export function parseJson(text) {let value;try{value=JSON.parse(text);}catch{throw new Error('JSON 不是有效文本，未导入任何数据。');}return validateProfile(value);}
export function summary(entry) {return entry.fields.filter(f=>f.value&&!f.sensitive&&f.type!=='multiline').slice(0,3).map(f=>f.value).join(' · ')||'填写后，这段经历就能随时取用';}
