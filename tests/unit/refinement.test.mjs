import test from 'node:test';
import assert from 'node:assert/strict';
import {fullTemplate,exampleProfile} from '../../extension/domain/templates.js';
import {clone,makeModule,makeEntry,makeField,emptyProfile,searchable,validateProfile} from '../../extension/domain/model.js';
import {workbookDescriptor,friendlyRowsToProfile,STRUCTURE_SHEET,FRIENDLY_FORMAT,safeSheetName,estimateRowHeight} from '../../extension/infra/workbook-v2.js';
import {normalizePreferences} from '../../extension/ui/theme.js';
import {PALETTES} from '../../extension/shared/design-tokens.js';
import {exportXlsx} from '../../extension/infra/xlsx.js';
import {unpackZip} from '../../extension/infra/zip.js';
const unpack=p=>workbookDescriptor(p);
const read=s=>friendlyRowsToProfile(s,s.find(x=>x.name===STRUCTURE_SHEET).rows);
const first=()=>{const p=emptyProfile();const m=makeModule('基本信息','常用');m.entries[0].title='我的资料';m.entries[0].fields=[makeField('姓名','常用'),makeField('说明','补充','multiline')];m.entries[0].fields[0].value='测试';p.modules.push(m);return p;};
const mutate=(fn)=>{const p=first(),s=unpack(p);fn(s,p);return {p,s,out:read(s)};};
test('friendly template exposes only group, label and value as visible data columns',()=>{const s=unpack(fullTemplate());assert.equal(s.filter(x=>x.kind==='data').length,20);assert.deepEqual(s[0].rows[0].slice(0,3),['分组','项目','填写内容']);assert.equal(s.at(-1).hidden,true);});
test('v2 round trip preserves full model and custom groups exactly',()=>{const p=fullTemplate();assert.deepEqual(read(unpack(p)),p);});
test('v2 exact Unicode, leading zeros, multiline, CRLF, formulas-as-text and original spaces',()=>{const p=first();p.modules[0].entries[0].fields[0].value=' 00123\r\n• ① 🚀 =1+1 _x000D_\t e\u0301 ';assert.deepEqual(read(unpack(p)),p);});
test('v2 empty profile is supported without manufacturing fields',()=>{const p=emptyProfile();assert.deepEqual(read(unpack(p)),p);});
test('v2 empty category and empty record survive round trip',()=>{const p=first();p.modules[0].entries[0].fields=[];p.modules.push({...makeModule('空分类'),entries:[]});assert.deepEqual(read(unpack(p)),p);});
test('edit visible content cell is authoritative, no stale hidden data copy',()=>{const {out}=mutate(s=>{s[0].rows[2][2]='只修改这一格';});assert.equal(out.modules[0].entries[0].fields[0].value,'只修改这一格');});
test('visible record title can be renamed without editing any ID',()=>{const {p,out}=mutate(s=>{s[0].rows[1][0]='新的公司与职位';});assert.equal(out.modules[0].entries[0].title,'新的公司与职位');assert.equal(out.modules[0].entries[0].id,p.modules[0].entries[0].id);});
test('renaming the worksheet tab renames category and keeps its identity',()=>{const {p,out}=mutate(s=>{s[0].name='个人信息';});assert.equal(out.modules[0].name,'个人信息');assert.equal(out.modules[0].id,p.modules[0].id);});
test('renamed field preserves ID, type and sensitive flag',()=>{const {p,out}=mutate(s=>{s[0].rows[2][1]='昵称';});assert.equal(out.modules[0].entries[0].fields[0].label,'昵称');assert.equal(out.modules[0].entries[0].fields[0].id,p.modules[0].entries[0].fields[0].id);});
test('new plain visible row becomes a custom field without hidden IDs',()=>{const {out}=mutate(s=>{s[0].rows.splice(3,0,['自定义','工作保留时间','三年']);});assert.equal(out.modules[0].entries[0].fields[1].label,'工作保留时间');assert.equal(out.modules[0].entries[0].fields[1].value,'三年');});
test('new row inherits preceding group only when no explicit group is supplied',()=>{const {out}=mutate(s=>{s[0].rows.splice(3,0,['','新项目','新内容']);});assert.equal(out.modules[0].entries[0].fields[1].group,'常用');});
test('an originally empty group stays empty on round trip',()=>{const p=first();p.modules[0].entries[0].fields[0].group='';assert.deepEqual(read(unpack(p)),p);});
test('copying an entire field row creates an independent new field',()=>{const {out}=mutate(s=>{s[0].rows.push([...s[0].rows[2]]);});const f=out.modules[0].entries[0].fields;assert.equal(f.length,3);assert.notEqual(f[0].id,f[2].id);assert.equal(f[0].value,f[2].value);});
test('copying an entire record block assigns independent record and field identities',()=>{const {out}=mutate(s=>{s[0].rows.push(...clone(s[0].rows.slice(1)));});const [a,b]=out.modules[0].entries;assert.notEqual(a.id,b.id);assert.notEqual(a.fields[0].id,b.fields[0].id);assert.deepEqual(a.fields.map(f=>f.value),b.fields.map(f=>f.value));});
test('duplicating a worksheet creates a new independent category',()=>{const {out}=mutate(s=>{const c=clone(s[0]);c.id='88';c.name='基本信息 (2)';s.splice(1,0,c);});assert.equal(out.modules.length,2);assert.notEqual(out.modules[0].id,out.modules[1].id);assert.notEqual(out.modules[0].entries[0].fields[0].id,out.modules[1].entries[0].fields[0].id);});
test('moving tabs preserves identity and follows user ordering',()=>{const p=fullTemplate(),s=unpack(p);[s[0],s[1]]=[s[1],s[0]];const out=read(s);assert.equal(out.modules[0].id,p.modules[1].id);});
test('deleting a whole worksheet actually removes that category',()=>{const p=fullTemplate(),s=unpack(p);const id=p.modules[0].id;s.shift();assert.equal(read(s).modules.some(m=>m.id===id),false);});
test('deleting only a value keeps the empty field',()=>{const {out}=mutate(s=>{s[0].rows[2][2]='';});assert.equal(out.modules[0].entries[0].fields.length,2);assert.equal(out.modules[0].entries[0].fields[0].value,'');});
test('deleting a field row removes the field',()=>{const {out}=mutate(s=>{s[0].rows.splice(2,1);});assert.equal(out.modules[0].entries[0].fields.length,1);});
test('new private identifier labels default to sensitive',()=>{const {out}=mutate(s=>s[0].rows.push(['补充','身份证号','001234567890123456']));assert.equal(out.modules[0].entries[0].fields.at(-1).sensitive,true);});
for(const [name,fn,regex] of [
 ['changed visible headers',s=>s[0].rows[0]=['程序字段','名称','值'],/表头/],
 ['unknown internal row kind',s=>s[0].rows[2][3]='script',/类型/],
 ['invalid field type',s=>s[0].rows[2][6]='function',/格式/],
 ['invalid sensitive flag',s=>s[0].rows[2][7]='maybe',/敏感/],
 ['missing field label',s=>s[0].rows[2][1]='',/项目/],
 ['foreign record identity',s=>s[0].rows[2][4]='foreign',/不属于/],
 ['value accidentally placed on an entry header',s=>s[0].rows[1][2]='do not discard',/标题/],
 ['unexpected extra data column',s=>s[0].rows[2].push('do not discard'),/内容列/],
 ['deleted record header with stranded identified fields',s=>s[0].rows.splice(1,1),/缺少经历/],
 ['duplicate worksheet name',s=>{const c=clone(s[0]);c.id='99';s.push(c);},/名称重复/],
 ['malicious sheet metadata version',s=>s.at(-1).rows[0][1]='unknown',/版本/],
 ['cross-record field IDs',s=>{const header=clone(s[0].rows[1]);header[4]='other-entry';s[0].rows.push(header,['','','','field','other-entry',s[0].rows[2][5],'text','否']);},/项目/]
])test('v2 rejects '+name,()=>{const s=unpack(first());fn(s);assert.throws(()=>read(s),regex);});
test('long or forbidden worksheet names do not destroy original category names',()=>{const p=first();p.modules[0].name='测试/[特殊]:?*'+('🌿'.repeat(40));assert.deepEqual(read(unpack(p)),p);});
test('Excel case-insensitive tab collisions are safely disambiguated',()=>{const p=first();p.modules[0].name='Hello';p.modules.push(makeModule('hello'));const s=unpack(p);assert.notEqual(s[0].name.toLowerCase(),s[1].name.toLowerCase());assert.deepEqual(read(s),p);});
test('reserved metadata and help names can be used as user category names',()=>{const p=first();p.modules[0].name=STRUCTURE_SHEET;p.modules.push(makeModule('填写帮助'));assert.deepEqual(read(unpack(p)),p);});
test('row heights are bounded for a 32767-character field',()=>{assert.equal(estimateRowHeight('x'.repeat(32767)),180);assert.equal(estimateRowHeight(''),30);});
test('export hides only structure columns and never the data value column',async()=>{const files=await unpackZip(exportXlsx(first()));const text=new TextDecoder().decode(files.get('xl/worksheets/sheet1.xml'));assert.match(text,/min="4" max="8"[^>]*hidden="1"/);assert.match(text,/min="3" max="3"[^>]*style="3"/);assert.match(text,/<pane ySplit="1"/);});
test('global search tokenizes spaces, folds case and full-width characters',()=>{const m={name:'工作经历'},e={title:'示例科技'},f={label:'岗位名称',group:'任职',value:'ＡＩ Product Manager',sensitive:false};assert.equal(searchable(f,e,m,' AI  科技 '),true);assert.equal(searchable(f,e,m,'AI 不存在'),false);});
test('global search treats regex / script punctuation literally',()=>{const m={name:'资料'},e={title:'示例'},f={label:'说明',group:'',value:'foo.*bar [a] <script>',sensitive:false};assert.equal(searchable(f,e,m,'foo.*bar'),true);assert.equal(searchable(f,e,m,'foo.+bar'),false);});
test('multi-term global search never indexes sensitive values',()=>{const m={name:'资料'},e={title:'示例'},f={label:'身份证',group:'',value:'SECRET00001',sensitive:true};assert.equal(searchable(f,e,m,'资料 身份证'),true);assert.equal(searchable(f,e,m,'资料 SECRET00001'),false);});
test('UI preferences validate untrusted storage and use safe defaults',()=>{assert.deepEqual(normalizePreferences({theme:'url(javascript:alert(1))',collapsed:'true',hideEmpty:null}),{theme:'blue',collapsed:false,hideEmpty:true});assert.deepEqual(normalizePreferences(null),{theme:'blue',collapsed:false,hideEmpty:true});});
const luminance=hex=>{const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
for(const p of PALETTES){test(`theme ${p.id}: white button labels >=4.5:1, selected text >=4.5:1, focus >=3:1`,()=>{assert.ok(contrast('#ffffff',p.accent)>=4.5);assert.ok(contrast(p.hover,p.soft)>=4.5);assert.ok(contrast('#ffffff',p.hover)>=4.5);assert.ok(contrast(p.accent,'#f9f9fb')>=3);});}

test('friendly Excel long labels contribute to row height even when values are empty',async()=>{
 const p=first();p.modules[0].entries[0].fields[0].label='自定义字段'.repeat(20);p.modules[0].entries[0].fields[0].value='';
 const files=await unpackZip(exportXlsx(p));const xml=new TextDecoder().decode(files.get('xl/worksheets/sheet1.xml'));
 const height=Number(xml.match(/<row r="3" ht="([\d.]+)"/)?.[1]);assert.ok(height>30&&height<=180);
});
