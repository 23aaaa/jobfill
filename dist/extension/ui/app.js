import {clone,validateProfile,stats,makeModule,makeEntry,makeField,getEntry,getField,moveItem,duplicateEntry,searchable,mask,summary,TYPE_NAMES,TYPES,TIERS,LIMITS,parseJson,byteLength} from '../domain/model.js';
import {TEMPLATES,fromTemplate,starterProfile,fullTemplate,exampleProfile} from '../domain/templates.js';
import {createRepository,isExtension,message} from '../infra/repository.js';
import {exportXlsx,importXlsx} from '../infra/xlsx.js';
import {encryptProfile,decryptProfile} from '../infra/vault.js';
import {PALETTES} from '../shared/design-tokens.js';
import {readPreferences,writePreferences,applyPreferences} from './theme.js';
import {h,icon,button,inputLabel,saveFile,modal,confirmAction,askText} from './dom.js';

const APP_VERSION='1.1.0-rc.1';
let preferences=readPreferences();applyPreferences(preferences);
const panel=document.body.dataset.view==='panel',extension=isExtension(),repo=createRepository();
const root=document.getElementById('app'),toastRoot=document.getElementById('toast-region');
let profile=null,revision=0,epoch=0,selected='',query='',hideEmpty=preferences.hideEmpty,dirty=false,gen=0,saving=false,savePromise=null,saveTimer=null,saveError='',conflict=false,checkpoint='',undoSnapshot=null;
let targetStatus={target:null,origin:'',undoAvailable:false},targetRefreshing=false,fillBusy=false,operationBusy=false,toastTimer;
let nav,workspace,head,list,saveNode,errorNode,targetNode,countsNode,searchInput,searchClear,searchCount;
let searchTimer=null,searchComposing=false,searchLimit=200;
const entryOpen=new Map(),groupOpen=new Map();
const toast=(text,error=false)=>{clearTimeout(toastTimer);toastRoot.replaceChildren(h('div',{class:`toast${error?' error':''}`,text}));toastTimer=setTimeout(()=>toastRoot.replaceChildren(),error?9000:4500);};
const errorMessage=e=>e instanceof Error?e.message:String(e);
const currentModule=()=>profile.modules.find(m=>m.id===selected)||profile.modules[0];
function updateStatus(){
 if(!profile||!saveNode)return;
 const state=saveError?'未保存':saving?'保存中…':dirty?'待保存':'已保存';
 saveNode.replaceChildren(h('span',{class:'save-dot'}),h('span',{text:state}));saveNode.dataset.error=String(!!saveError);
 const s=stats(profile);countsNode.textContent=`${s.filled} 项已填`;saveNode.title='资料保存在当前浏览器，不会自动上传或同步';
 if(saveError){errorNode.hidden=false;errorNode.replaceChildren(h('span',{text:saveError}),button('导出当前草稿',exportDialog,{kind:'small quiet'}),button(conflict?'重新载入':'重试保存',conflict?reload:()=>flush(),{kind:'small'}));}
 else {errorNode.hidden=true;errorNode.replaceChildren();}
}
function markDirty(note=''){
 gen++;dirty=true;if(note)checkpoint=note;if(!conflict)saveError='';clearTimeout(saveTimer);if(!conflict)saveTimer=setTimeout(()=>flush(),550);updateStatus();
}
async function flush(){
 clearTimeout(saveTimer);if(saving){await savePromise;if(dirty&&!saveError)return flush();return !saveError;}
 if(!dirty)return true;if(conflict)return false;
 const snapshot=clone(profile),captured=gen,capturedEpoch=epoch,note=checkpoint;checkpoint='';saving=true;updateStatus();
 savePromise=(async()=>{
  try{
   const result=await repo.save(snapshot,revision,note,epoch);
   if(epoch!==capturedEpoch)return false;
   revision=result.profile.revision;profile.revision=revision;profile.updatedAt=result.profile.updatedAt;dirty=gen!==captured;saveError='';conflict=false;return true;
  }catch(error){if(epoch!==capturedEpoch)return false;saveError=errorMessage(error);conflict=error.code==='CONFLICT';if(note)checkpoint=note;return false;}
  finally{saving=false;updateStatus();if(dirty&&!saveError)saveTimer=setTimeout(()=>flush(),300);}
 })();return savePromise;
}
async function reload(){
 if(dirty&&!await confirmAction('重新载入最新资料','当前未保存的草稿会被丢弃。建议先导出草稿，以免丢失你的修改。','丢弃草稿并载入',{danger:true}))return;
 clearTimeout(saveTimer);if(saving)await savePromise;
 try{const result=await repo.load();profile=result.profile;revision=profile.revision;epoch=result.epoch;dirty=false;saveError='';conflict=false;checkpoint='';undoSnapshot=null;gen++;render();toast('已载入本机最新资料。');}catch(error){toast(errorMessage(error),true);}
}
function commit(mutator,note=''){
 const before=clone(profile);
 try{mutator(profile);profile=validateProfile(profile);}catch(error){profile=before;toast(errorMessage(error),true);return false;}
 if(note)undoSnapshot=before;markDirty(note);render();return true;
}
function updatePreference(patch){
 preferences={...preferences,...patch};applyPreferences(preferences);
 if(!writePreferences(preferences))toast('本次设置已生效，但浏览器没有保存偏好。',true);
}
function makeSearch(){
 searchInput=h('input',{type:'search',placeholder:'搜索全部资料',value:query,'aria-label':'搜索全部资料',autocomplete:'off'});
 const run=()=>{clearTimeout(searchTimer);query=searchInput.value.trim();searchClear.hidden=!searchInput.value;renderHead();renderRecords();list.scrollTop=0;};
 searchInput.addEventListener('compositionstart',()=>{searchComposing=true;clearTimeout(searchTimer);});
 searchInput.addEventListener('compositionend',()=>{searchComposing=false;run();});
 searchInput.addEventListener('input',()=>{searchClear.hidden=!searchInput.value;if(!searchComposing){clearTimeout(searchTimer);searchTimer=setTimeout(run,70);}});
 searchInput.addEventListener('keydown',e=>{if(e.key==='Escape'&&!searchComposing){e.preventDefault();clearSearch();}if(e.key==='Enter'&&!searchComposing)run();});
 searchClear=button('清空搜索',clearSearch,{kind:'icon-only quiet',symbol:'close'});searchClear.hidden=!query;
 return h('div',{class:'global-search',role:'search'},icon('search',16),searchInput,searchClear,h('kbd',{class:'search-shortcut',text:'Ctrl K'}));
}
function clearSearch(){clearTimeout(searchTimer);query='';if(searchInput)searchInput.value='';if(searchClear)searchClear.hidden=true;renderHead();renderRecords();renderNav();searchInput?.focus();}
function render(){
 if(!profile)return;const previousScroll=list?.scrollTop||0;
 if(!profile.modules.some(m=>m.id===selected))selected=profile.modules[0]?.id||'';
 root.replaceChildren();
 const toggle=button('展开或收起分类',()=>{updatePreference({collapsed:!preferences.collapsed});toggle.setAttribute('aria-expanded',String(!preferences.collapsed));},{symbol:'menu',kind:'icon-only quiet'});toggle.setAttribute('aria-expanded',String(!preferences.collapsed));toggle.setAttribute('aria-controls','module-sidebar');
 const brand=h('div',{class:'brand'},h('span',{class:'brandmark'},icon('logo',18)),h('span',{class:'brand-name',text:'小师弟求职'}));
 const actions=h('div',{class:'topbar-actions'});
 if(!panel)actions.append(button('导入',chooseImport,{symbol:'upload'}),button('导出',exportDialog,{symbol:'download'}));
 else actions.append(button('编辑资料',openManager,{symbol:'edit',kind:'quiet'}));
 actions.append(button('设置与帮助',moreDialog,{symbol:'settings',kind:'icon-only quiet'}));
 const top=h('header',{class:'topbar'},h('div',{class:'brand-area'},toggle,brand));
 if(!panel)top.append(makeSearch());top.append(actions);root.append(top);
 if(panel)root.append(h('div',{class:'panel-search-row'},makeSearch()));
 errorNode=h('div',{class:'global-error',role:'alert',hidden:true});root.append(errorNode);
 if(panel){targetNode=h('section',{class:'target-banner','aria-label':'网页填写目标'});root.append(targetNode);renderTarget();}
 const shell=h('div',{class:'shell'}),sidebar=h('aside',{class:'sidebar',id:'module-sidebar','aria-label':'资料分类'});
 nav=h('nav',{class:'module-nav','aria-label':'分类'});
 sidebar.append(nav,h('div',{class:'nav-bottom'},button('添加分类',moduleLibrary,{kind:'full quiet',symbol:'plus'})));
 workspace=h('main',{class:'workspace'});head=h('div',{class:'workspace-head'});list=h('div',{class:'record-list',id:'record-list'});
 workspace.append(head,list);shell.append(sidebar,workspace);root.append(shell);
 saveNode=h('span',{class:'save-state',role:'status'});countsNode=h('span',{class:'bottom-note'});
 root.append(h('footer',{class:'bottom-bar'},saveNode,countsNode,extension?null:h('span',{class:'local-mode',title:'独立页面与插件不共享资料，通过导入导出交换',text:'独立页面'})));
 renderNav();renderHead();renderRecords();list.scrollTop=previousScroll;updateStatus();
}
function renderNav(){
 nav.replaceChildren();
 for(const tier of TIERS){const modules=profile.modules.filter(m=>m.tier===tier);if(!modules.length)continue;
  if(tier!=='常用')nav.append(h('div',{class:'tier-label',text:tier==='少用'?'按需':'更多'}));
  for(const m of modules){const item=h('button',{type:'button',class:`nav-item${m.id===selected&&!query?' active':''}`,'aria-current':m.id===selected&&!query?'page':undefined,'aria-label':m.name,title:m.name,on:{click:()=>{clearTimeout(searchTimer);selected=m.id;query='';if(searchInput)searchInput.value='';searchClear.hidden=true;renderHead();renderRecords();renderNav();list.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}}},h('span',{class:'nav-glyph',text:m.name.slice(0,2),'aria-hidden':'true'}),h('span',{class:'nav-label',text:m.name}),m.entries.length>1?h('span',{class:'nav-count',text:String(m.entries.length)}):null);nav.append(item);}
 }
}
function renderHead(){
 head.replaceChildren();const m=currentModule();head.hidden=panel&&!query;
 head.append(h('h1',{class:'sr-only',text:query?'搜索结果':m?.name||'我的资料'}));
 if(query){searchCount=h('span',{class:'search-result-count',role:'status'});head.append(searchCount,button('退出搜索',()=>{clearSearch();renderNav();},{kind:'small quiet',symbol:'close'}));}
 else if(!panel){
  const filled=m?.entries.reduce((n,e)=>n+e.fields.filter(f=>f.value!=='').length,0)||0;
  head.append(h('span',{class:'section-meta',text:m?`${m.entries.length} 份记录 · ${filled} 项已填`:'我的资料'}));
  if(m)head.append(h('div',{class:'head-actions'},button('分类设置',()=>moduleSettings(m.id),{kind:'icon-only quiet',symbol:'settings'}),button('添加记录',()=>addEntry(m.id),{kind:'small quiet',symbol:'plus'})));
 }
}
function renderRecords(){
 list.replaceChildren();const modules=query?profile.modules:currentModule()?[currentModule()]:[];let rendered=0,matched=0,shown=0;
 for(const m of modules){
  for(let i=0;i<m.entries.length;i++){
   const e=m.entries[i];let fields=e.fields.filter(f=>(!panel||!hideEmpty||f.value!=='')&&(!query||searchable(f,e,m,query)));
   if(query){matched+=fields.length;fields=fields.slice(0,Math.max(0,searchLimit-shown));if(!fields.length)continue;shown+=fields.length;}
   if(panel&&hideEmpty&&!fields.length)continue;
   if(query)list.append(h('p',{class:'search-path',text:m.name+' / '+e.title}));
   list.append(renderEntry(m,e,i,fields));rendered++;
  }
 }
 if(!rendered){
  const msg=query?'试试字段名称或其他关键词。':panel?'先填写资料，再来这里取用。':'先添加记录，也可以导入已有资料。';
  list.append(h('div',{class:'empty-state'},h('div',{class:'empty-illustration'},icon('folder',28)),h('h2',{text:query?'没有找到相关资料':panel?'这部分还没有填写内容':'从你的第一段经历开始'}),h('p',{text:msg}),query?null:h('div',{class:'empty-actions'},button(panel?'编辑资料':'添加分类',panel?openManager:moduleLibrary,{kind:'primary',symbol:'plus'}),button('导入资料',chooseImport,{symbol:'upload'}))));
 }
 if(query&&searchCount){searchCount.textContent=`${matched} 项结果 · 全部资料`;renderNav();}
 if(query&&matched>shown)list.append(h('div',{class:'search-more'},h('span',{text:`已显示 ${shown} / ${matched} 项`}),button('显示更多结果',()=>{const y=list.scrollTop;searchLimit+=200;renderRecords();list.scrollTop=y;},{kind:'quiet',symbol:'plus'})));
}
function renderEntry(m,e,index,fields){
 const open=query?true:(entryOpen.get(e.id)??index===0);
 const bodyId='entry-body-'+e.id,record=h('article',{class:'record','data-open':String(open)});
 const toggle=h('button',{type:'button',class:'record-toggle','aria-expanded':String(open),'aria-controls':bodyId,on:{click:()=>{const next=record.dataset.open!=='true';record.dataset.open=String(next);entryOpen.set(e.id,next);toggle.setAttribute('aria-expanded',String(next));collapse.inert=!next;if(next)ensureContent();}}},h('span',{class:'record-index',text:String(index+1).padStart(2,'0')}),h('div',{class:'record-heading'},h('div',{class:'record-title',text:e.title}),h('p',{class:'record-subtitle',text:summary(e),title:summary(e)})),h('span',{class:'chevron'},icon('chevron',14)));
 const top=h('div',{class:'record-top'},toggle);if(!panel)top.append(button('记录操作：'+e.title,()=>entryMenu(m.id,e.id),{kind:'quiet icon-only',symbol:'more'}));
 const content=h('div',{class:'record-body'});let mounted=false;
 function ensureContent(){if(mounted)return;mounted=true;const groups=[...new Set(fields.map(f=>f.group))];
 groups.forEach((group,gi)=>{
  const groupFields=fields.filter(f=>f.group===group),key=e.id+'::'+group,show=query?true:(groupOpen.get(key)??(panel||gi===0));
  const inside=h('div',{class:'field-grid'},groupFields.map(f=>panel?renderPanelField(f,e,m):renderEditField(f)));
  const child=h('div',{class:'group-collapse','data-open':String(show)},h('div',{class:'group-inner'},inside));child.inert=!show;
  const btn=h('button',{type:'button',class:'group-toggle','aria-expanded':String(show),on:{click:()=>{const next=child.dataset.open!=='true';child.dataset.open=String(next);child.inert=!next;btn.setAttribute('aria-expanded',String(next));groupOpen.set(key,next);}}},h('span',{class:'chevron'},icon('chevron',12)),h('span',{text:group||'其他字段'}),h('span',{class:'group-count',text:String(groupFields.length)}));
  content.append(h('section',{class:'field-group'},btn,child));
 });
 if(!panel)content.append(h('div',{class:'record-bottom'},button('添加字段',()=>fieldDialog(e.id),{kind:'small quiet',symbol:'plus'}),null)); 
 }
 if(open)ensureContent();
 const collapse=h('div',{id:bodyId,class:'record-collapse'},h('div',{class:'record-inner'},content));collapse.inert=!open;
 record.append(top,collapse);return record;
}
function renderEditField(f){
 const id='f-'+f.id,control=f.type==='multiline'?h('textarea',{id,rows:3,value:f.value,'data-field-label':f.label}):h('input',{id,type:f.sensitive?'password':'text',value:f.value,'data-field-label':f.label,inputmode:f.type==='tel'?'tel':f.type==='number'?'decimal':'text',autocomplete:'off',spellcheck:'false'});
 control.placeholder=f.type==='date'?'YYYY-MM-DD':f.type==='month'?'YYYY-MM':'填写'+f.label;
 control.addEventListener('input',()=>{f.value=control.value;markDirty();});
 const line=h('div',{class:'field-label-line'},h('label',{class:'field-label',for:id,text:f.label}));
 if(f.sensitive){line.append(h('span',{class:'sensitive-mark',title:'敏感信息：本地明文保存，显示遮挡不等于加密'},icon('lock',12)));
  if(f.type!=='multiline')line.append(button('显示或隐藏：'+f.label,()=>{control.type=control.type==='password'?'text':'password';},{kind:'icon-only quiet',symbol:'eye'}));
 }
 line.append(button('设置字段：'+f.label,()=>fieldDialog(getField(profile,f.id)?.entry.id,f.id),{kind:'icon-only quiet',symbol:'edit'}));
 return h('div',{class:`edit-field${f.type==='multiline'?' wide-field':''}`},line,h('div',{class:'field-input-wrap'},control));
}
function renderPanelField(f,e,m){
 const long=f.type==='multiline'||f.value.length>60||f.value.includes('\n');
 const preview=f.sensitive?mask(f.value):f.value.length>300?f.value.slice(0,300)+'…':f.value||'未填写';
 const fill=button('',()=>fillField(clone(f)),{disabled:!f.value});fill.className='fill-btn';fill.setAttribute('aria-label','填入 '+f.label);fill.title='填入 '+f.label;
 fill.replaceChildren(h('span',{class:'fill-label',text:f.label},f.sensitive?icon('lock',12):null),h('span',{class:`fill-value${long?' long-value':''}`,text:preview}));
 const actions=h('div',{class:'panel-field-actions'},button('复制 '+f.label,()=>copyField(clone(f)),{kind:'icon-only quiet',symbol:'copy',disabled:!f.value}));
 if(f.value&&(long||f.sensitive))actions.append(button('查看 '+f.label,()=>viewField(clone(f),`${m.name} / ${e.title}`),{kind:'icon-only quiet',symbol:'eye'}));
 return h('div',{class:`panel-field${long?' multiline-row':''}`},fill,actions);
}
async function sensitiveConsent(f,action){return !f.sensitive||await confirmAction('确认使用敏感信息',`「${f.label}」被标记为敏感信息。${action}。请确认当前环境和接收对象可信。`, '确认继续');}
async function copyField(f){
 if(!f.value)return;if(!await sensitiveConsent(f,'复制后会进入系统剪贴板，其他应用或剪贴板同步工具可能读取它'))return;
 try{await navigator.clipboard.writeText(f.value);toast('已复制完整原文，请在网页中粘贴。');}catch{await viewField(f,'剪贴板不可用，请在下方手动选择并复制',true);}
}
async function viewField(f,path,consented=false){
 if(!consented&&!await sensitiveConsent(f,'接下来将在屏幕上显示完整内容'))return;
 await modal(f.label,({body,foot,finish})=>{body.append(h('p',{class:'read-only-origin',text:path}),h('pre',{class:'full-text',text:f.value}));foot.append(button('关闭',()=>finish(null),{kind:'quiet'}),button('复制全文',async()=>{try{await navigator.clipboard.writeText(f.value);toast('已复制完整原文。');}catch{toast('请在内容区手动选择并复制。',true);}},{symbol:'copy'}));},{wide:true});
}
async function fillField(f){
 if(fillBusy)return;if(!extension){toast('独立维护页不能填写其他网页，请安装扩展。',true);return;}
 const target=targetStatus.target;if(!target){toast('请先在招聘网页点击要填写的输入框；新网站需要再次点击扩展图标授权。',true);return;}
 if(!await sensitiveConsent(f,`即将写入 ${target.origin} 的「${target.label}」`))return;
 fillBusy=true;
 try{await message('FILL',{tabId:target.tabId,token:target.token,value:f.value});toast(`已写入「${target.label}」，请核对网页显示与保存结果。`);await refreshTarget();}
 catch(error){toast(errorMessage(error),true);await refreshTarget();}
 finally{fillBusy=false;}
}
async function refreshTarget(){
 if(!panel||!extension||targetRefreshing)return;targetRefreshing=true;
 try{targetStatus=await message('STATUS');renderTarget();}catch{targetStatus={target:null,origin:'',undoAvailable:false};renderTarget();}finally{targetRefreshing=false;}
}
function renderTarget(){
 if(!targetNode)return;const target=targetStatus.target;
 const signature=JSON.stringify([target?.token,target?.label,target?.origin,targetStatus.origin,targetStatus.undoAvailable]);
 if(targetNode.dataset.signature===signature)return;targetNode.dataset.signature=signature;
 targetNode.replaceChildren();targetNode.dataset.connected=String(!!target);
 const copy=h('div',{class:'target-copy'},h('p',{class:'target-title',text:target?`填入：${target.label}`:'先点网页输入框'}));
 if(target?.origin)copy.append(h('p',{class:'target-origin',text:target.origin,title:target.origin}));
 targetNode.append(icon(target?'arrow':'link',16),copy,
  button('重新连接',async()=>{try{await message('CONNECT');await refreshTarget();toast('已连接，选择网页输入框即可。');}catch(error){toast(errorMessage(error),true);}},{kind:'icon-only quiet',symbol:'link'}),
  button('撤回上次填写',async()=>{try{await message('UNDO_FILL');toast('已撤回上次填写。');await refreshTarget();}catch(error){toast(errorMessage(error),true);}},{kind:'icon-only quiet',symbol:'undo',disabled:!targetStatus.undoAvailable}));
}
async function openManager(){if(extension){await chrome.runtime.openOptionsPage();}else await helpDialog();}
async function moduleLibrary(){
 const result=await modal('添加资料分类',({body,foot,finish})=>{
  body.append(h('p',{class:'modal-description',text:'选择需要的分类，也可以自己命名。'}),button('新建自定义分类',()=>finish('custom'),{kind:'full',symbol:'plus'}));
  for(const tier of TIERS){body.append(h('h3',{class:'modal-section-title',text:tier==='少用'?'少数场景需要 · 请谨慎提供个人信息':tier+'分类'}));
   for(const t of TEMPLATES.filter(t=>t.tier===tier)){const added=profile.modules.some(m=>m.templateKey===t.key);body.append(h('button',{type:'button',class:'library-item',on:{click:()=>finish(t.key)}},h('span',{},h('span',{class:'library-title',text:t.name},added?h('span',{class:'library-tag',text:'已添加'}):null),h('span',{class:'library-description',text:t.description})),icon('plus',17)));}}
  foot.append(button('关闭',()=>finish(null),{kind:'quiet'}));
 },{wide:true});
 if(!result)return;
 let module;if(result==='custom'){const name=await askText('新建自定义分类','分类名称','','例如：开源贡献、创业经历、推荐信');if(!name)return;module=makeModule(name);}
 else module=fromTemplate(result);
 commit(p=>{p.modules.push(module);selected=module.id;},'添加分类前');entryOpen.set(module.entries[0]?.id,true);render();toast('已添加分类，可继续维护名称、记录和字段。');
}
async function moduleSettings(id){
 const m=profile.modules.find(m=>m.id===id);if(!m)return;
 const result=await modal('编辑分类',({body,foot,finish})=>{
  const name=h('input',{value:m.name,required:true,maxlength:120}),tier=h('select',{},TIERS.map(t=>h('option',{value:t,text:t})));tier.value=m.tier;
  body.append(inputLabel('分类名称',name),inputLabel('展示层级',tier,'常用优先展示；分层不会影响导入导出或数据内容。'));
  body.append(h('div',{class:'empty-actions'},button('上移分类',()=>finish({move:-1}),{symbol:'up'}),button('下移分类',()=>finish({move:1}),{symbol:'down'})));
  foot.append(button('删除分类',()=>finish({remove:true}),{kind:'danger'}),h('span',{class:'spacer'}),button('取消',()=>finish(null),{kind:'quiet'}),button('保存',()=>{if(name.reportValidity()&&name.value.trim())finish({name:name.value,tier:tier.value});},{kind:'primary'}));
 });
 if(!result)return;
 if(result.remove){if(!await confirmAction('删除整个分类',`将删除「${m.name}」及其中 ${m.entries.length} 个记录。删除前会保留一份本地历史版本。`,'删除分类',{danger:true}))return;commit(p=>{p.modules=p.modules.filter(x=>x.id!==id);},'删除分类前');}
 else if(result.move)commit(p=>moveItem(p.modules,id,result.move),'移动分类前');
 else commit(p=>{const mod=p.modules.find(x=>x.id===id);mod.name=result.name;mod.tier=result.tier;},'修改分类前');
}
async function addEntry(moduleId){
 const m=profile.modules.find(m=>m.id===moduleId);if(!m)return;
 const title=await askText('新增一段记录','记录标题',`${m.name} ${m.entries.length+1}`,'例如：示例公司 · 产品经理 / 本科 · 示例大学');if(!title)return;
 const fields=m.entries[0]?.fields|| (m.templateKey?fromTemplate(m.templateKey).entries[0].fields:[makeField('内容','','multiline')]);
 const e=makeEntry(title,fields.map(f=>({...f,value:''})));entryOpen.set(e.id,true);commit(p=>p.modules.find(x=>x.id===moduleId).entries.push(e),'新增记录前');
}
async function entryMenu(moduleId,entryId){
 const found=getEntry(profile,entryId);if(!found)return;const e=found.entry;
 const action=await modal('管理这段经历',({body,foot,finish})=>{body.append(h('p',{class:'modal-description',text:e.title}),h('div',{class:'dialog-actions'},[['rename','重命名','edit'],['duplicate','复制这段经历（含内容）','copy'],['up','上移','up'],['down','下移','down'],['delete','删除这段经历','trash']].map(([id,label,symbol])=>button(label,()=>finish(id),{symbol,kind:id==='delete'?'danger':'quiet'}))));foot.append(button('关闭',()=>finish(null),{kind:'quiet'}));});
 if(!action)return;
 if(action==='rename'){const title=await askText('重命名记录','记录标题',e.title);if(title)commit(p=>{getEntry(p,entryId).entry.title=title;},'重命名记录前');}
 else if(action==='duplicate'){const duplicated=duplicateEntry(e);entryOpen.set(duplicated.id,true);commit(p=>{const mod=p.modules.find(x=>x.id===moduleId);mod.entries.splice(mod.entries.findIndex(x=>x.id===entryId)+1,0,duplicated);},'复制记录前');}
 else if(action==='delete'){if(await confirmAction('删除记录',`将删除「${e.title}」及其全部字段。删除前会保留本地历史版本。`,'删除',{danger:true}))commit(p=>{const m=p.modules.find(x=>x.id===moduleId);m.entries=m.entries.filter(x=>x.id!==entryId);},'删除记录前');}
 else commit(p=>moveItem(p.modules.find(x=>x.id===moduleId).entries,entryId,action==='up'?-1:1),'调整记录顺序前');
}
async function fieldDialog(entryId,fieldId){
 const found=getEntry(profile,entryId);if(!found)return;const f=found.entry.fields.find(x=>x.id===fieldId);
 const result=await modal(f?'设置字段':'添加自定义字段',({body,foot,finish})=>{
  const label=h('input',{type:'text',value:f?.label||'',maxlength:120,required:true,placeholder:'例如：工作保留时间'}),group=h('input',{type:'text',value:f?.group||found.entry.fields[0]?.group||'补充信息',maxlength:120}),type=h('select',{},TYPES.map(t=>h('option',{value:t,text:TYPE_NAMES[t]}))),sensitive=h('input',{type:'checkbox',checked:f?.sensitive||false});type.value=f?.type||'text';
  body.append(inputLabel('字段名称',label),inputLabel('字段分组',group,'同名分组会自动归在一起；可留空。'),inputLabel('内容类型',type,'所有内容以文本存储，数字类型也不会丢失前导零。'),h('label',{class:'checkbox-control'},sensitive,'标记为敏感信息（侧栏遮挡、使用前确认）'));
  if(f)body.append(h('div',{class:'empty-actions'},button('上移字段',()=>finish({move:-1}),{symbol:'up'}),button('下移字段',()=>finish({move:1}),{symbol:'down'})));
  if(f)foot.append(button('删除字段',()=>finish({remove:true}),{kind:'danger'}));foot.append(h('span',{class:'spacer'}),button('取消',()=>finish(null),{kind:'quiet'}),button(f?'保存设置':'添加字段',()=>{if(label.reportValidity()&&label.value.trim())finish({label:label.value,group:group.value,type:type.value,sensitive:sensitive.checked});},{kind:'primary'}));
 });
 if(!result)return;
 if(result.remove){if(await confirmAction('删除字段',`「${f.label}」及其内容将被删除。`,'删除',{danger:true}))commit(p=>{const e=getEntry(p,entryId).entry;e.fields=e.fields.filter(x=>x.id!==fieldId);},'删除字段前');}
 else if(result.move)commit(p=>moveItem(getEntry(p,entryId).entry.fields,fieldId,result.move),'移动字段前');
 else {groupOpen.set(entryId+'::'+result.group,true);commit(p=>{const e=getEntry(p,entryId).entry;if(f)Object.assign(e.fields.find(x=>x.id===fieldId),result);else e.fields.push({...makeField(result.label,result.group,result.type,result.sensitive)});},f?'修改字段设置前':'添加字段前');}
}
async function passphraseDialog(confirmPassword=false){
 return modal(confirmPassword?'设置加密备份口令':'解密备份',({body,foot,finish})=>{
  const pass=h('input',{type:'password',minlength:12,maxlength:1024,required:true,autocomplete:confirmPassword?'new-password':'current-password'}),repeat=h('input',{type:'password',minlength:12,maxlength:1024,required:true,autocomplete:'new-password'}),error=h('p',{class:'modal-error',role:'alert'});
  body.append(h('p',{class:'modal-description',text:confirmPassword?'加密的是导出的备份文件，不是本机资料。口令仅在本次操作中使用；遗失后没有找回通道。':'文件只在本机解密，口令不会上传。'}),inputLabel('备份口令',pass,'至少 12 个字符，推荐使用随机口令或长短语。'));if(confirmPassword)body.append(inputLabel('再次输入口令',repeat));body.append(error);
  const submit=()=>{if(!pass.reportValidity())return;if(confirmPassword&&(!repeat.reportValidity()||pass.value!==repeat.value)){error.textContent='两次输入的口令不一致。';return;}finish(pass.value);};
  pass.addEventListener('keydown',e=>{if(e.key==='Enter'&&!confirmPassword){e.preventDefault();submit();}});
  foot.append(button('取消',()=>finish(null),{kind:'quiet'}),button(confirmPassword?'加密并导出':'解密',submit,{kind:'primary',symbol:'lock'}));
 });
}
async function exportDialog(){
 const action=await modal('导出资料',({body,foot,finish})=>{
  const s=stats(profile);body.append(h('p',{class:'modal-description',text:`当前资料：${s.modules} 个分类，${s.filled} 项已填写，其中 ${s.sensitive} 项为已填写的敏感字段。导出包含当前尚未保存的草稿。`}),h('div',{class:'dialog-actions'},button('Excel · 按分类整理',()=>finish('xlsx'),{symbol:'download'}),button('普通备份 · JSON',()=>finish('json'),{symbol:'download'}),button('加密备份',()=>finish('vault'),{symbol:'lock'}),button('下载完整空白 Excel 模板',()=>finish('template'),{symbol:'folder'})));
  body.append(h('p',{class:'hint',text:'Excel 与 JSON 是明文文件。显示遮挡并不保护导出内容。请妥善保管，不要公开分享。'}));foot.append(button('关闭',()=>finish(null),{kind:'quiet'}));
 });
 if(!action)return;
 try{
  if(action==='template'){saveFile('小师弟求职-完整空白模板.xlsx',exportXlsx(fullTemplate(),{theme:preferences.theme}),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');toast('已生成完整空白模板，不包含你的资料。');return;}
  const p=validateProfile(profile),date=new Date().toISOString().slice(0,10),base=`小师弟求职-资料-${date}`;
  if(action==='vault'){const password=await passphraseDialog(true);if(!password)return;const text=await encryptProfile(p,password);saveFile(base+'.applyvault',text,'application/json');toast('已生成加密备份。请单独妥善保存口令。');}
  else {if(!await confirmAction('导出明文资料','该文件会包含全部字段，包括被遮挡的敏感信息。请仅保存到可信设备，不要上传到公共位置。','确认导出'))return;
   if(action==='xlsx')saveFile(base+'.xlsx',exportXlsx(p,{theme:preferences.theme}),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');else saveFile(base+'.json',JSON.stringify(p,null,2),'application/json');toast('已生成完整资料文件。');}
 }catch(error){toast(errorMessage(error),true);}
}
function chooseImport(){
 if(operationBusy){toast('当前文件仍在处理中。');return;}
 const input=h('input',{type:'file',accept:'.xlsx,.json,.applyvault',hidden:true,'aria-label':'导入资料文件'});document.body.append(input);
 input.addEventListener('change',async()=>{const file=input.files?.[0];input.remove();if(file)await importFile(file);},{once:true});input.addEventListener('cancel',()=>input.remove(),{once:true});input.click();
}
async function importFile(file){
 if(operationBusy)return;operationBusy=true;
 try{
  if(file.size>LIMITS.fileBytes)throw new Error('文件超过 8 MB，请拆分或删除不需要的内容后导入。');
  let incoming;const name=file.name.toLowerCase();
  if(name.endsWith('.xlsx')){toast('正在校验工作簿结构与文本内容…');incoming=await importXlsx(new Uint8Array(await file.arrayBuffer()));}
  else if(name.endsWith('.applyvault')){const password=await passphraseDialog();if(!password)return;incoming=await decryptProfile(await file.text(),password);}
  else if(name.endsWith('.json'))incoming=parseJson(await file.text());else throw new Error('仅支持本产品格式的 .xlsx、.json 或 .applyvault 文件。');
  const s=stats(incoming),before=stats(profile);
  const ok=await modal('导入预览',({body,foot,finish})=>{
   body.append(h('p',{class:'modal-description',text:incoming.name}),h('div',{class:'import-stats'},[[s.modules,'分类'],[s.entries,'记录'],[s.filled,'已填写字段']].map(([n,label])=>h('div',{class:'stat-box'},h('span',{class:'stat-number',text:String(n)}),h('span',{class:'stat-name',text:label})))),h('div',{class:'preview-list'},incoming.modules.map(m=>h('div',{text:`${m.name} · ${m.entries.length} 个记录 · ${m.tier}`}))),h('p',{class:'modal-description',text:`确认后会替换当前 ${before.modules} 个分类、${before.filled} 项已填写内容，不会自动合并。导入前会保存一份本地历史版本；建议同时导出备份。`}));
   foot.append(button('取消，不导入',()=>finish(false),{kind:'quiet'}),button('确认替换资料',()=>finish(true),{kind:'primary'}));
  },{wide:true});
  if(!ok)return;if(!await flush())throw new Error('当前草稿尚未成功保存，请先处理保存提示。');
  const previous=clone(profile);profile={...incoming,revision};selected=profile.modules[0]?.id||'';query='';undoSnapshot=previous;markDirty('导入前的资料');render();if(await flush())toast('导入完成，资料已保存。');
 }catch(error){toast(errorMessage(error),true);}finally{operationBusy=false;}
}
async function historyDialog(){
 try{
  if(!await flush())throw new Error('请先处理当前未保存的草稿。');const snapshots=await repo.history();
  const chosen=await modal('本地历史版本',({body,foot,finish})=>{
   body.append(h('p',{class:'modal-description',text:'仅在导入、删除和结构调整前保留历史；最多 3 份，受本地容量限制。不是云备份，也不是每次输入的版本记录。'}));
   if(!snapshots.length)body.append(h('p',{class:'hint',text:'还没有历史版本。'}));
   snapshots.forEach((s,i)=>body.append(h('button',{type:'button',class:'library-item',on:{click:()=>finish(i)}},h('span',{},h('span',{class:'library-title',text:s.label}),h('span',{class:'library-description',text:new Date(s.at).toLocaleString()+' · '+stats(s.profile).filled+' 项已填写'})),icon('history',17))));
   foot.append(button('关闭',()=>finish(null),{kind:'quiet'}));
  });
  if(chosen===null)return;const snapshot=snapshots[chosen];if(!await confirmAction('恢复本地历史','当前资料将被这份历史版本替换。恢复前也会创建一个历史版本。','确认恢复'))return;
  undoSnapshot=clone(profile);profile={...clone(snapshot.profile),revision};markDirty('恢复历史前');render();if(await flush())toast('已恢复历史版本。');
 }catch(error){toast(errorMessage(error),true);}
}
async function eraseAll(){
 const response=await askText('永久清除本机资料','输入「删除」确认','','将清除这个存储空间内的资料和历史版本。不会清除已导出的文件、系统剪贴板或已经写入的招聘网站。');
 if(response!=='删除'){if(response)toast('确认文字不匹配，未清除资料。');return;}
 clearTimeout(saveTimer);if(saving)await savePromise;
 try{const result=await repo.erase();profile=result.profile;epoch=result.epoch;revision=profile.revision;dirty=false;saveError='';conflict=false;checkpoint='';undoSnapshot=null;gen++;render();toast('本机保存的资料与历史版本已清除。');}catch(error){toast(errorMessage(error),true);}
}
async function loadExample(){
 if(!await confirmAction('载入虚构演示资料','将用演示数据替换当前资料。所有姓名、公司和成绩均为虚构。当前资料会保留历史版本。','载入演示'))return;
 if(!await flush())return;undoSnapshot=clone(profile);profile={...exampleProfile(),revision};selected=profile.modules.find(m=>m.templateKey==='work').id;query='';markDirty('载入演示前');render();if(await flush())toast('已载入虚构演示资料，不代表真实履历。');
}
async function moreDialog(){
 const action=await modal('设置与帮助',({body,foot,finish})=>{
  body.append(h('h3',{class:'settings-label',text:'高亮色'}));
  const colors=h('div',{class:'theme-options',role:'group','aria-label':'高亮色'});
  PALETTES.forEach(p=>{const b=button(p.name,()=>{updatePreference({theme:p.id});for(const el of colors.children)el.setAttribute('aria-pressed',String(el.dataset.theme===p.id));},{kind:'theme-choice'});b.dataset.theme=p.id;b.setAttribute('aria-pressed',String(preferences.theme===p.id));const swatch=h('span',{class:'theme-swatch'});swatch.style.background=p.accent;b.prepend(swatch);colors.append(b);});
  body.append(colors);
  if(panel){const cb=h('input',{type:'checkbox',checked:!hideEmpty,on:{change:e=>{hideEmpty=!e.target.checked;updatePreference({hideEmpty});renderRecords();}}});body.append(h('label',{class:'setting-check'},cb,'显示尚未填写的项目'));}
  body.append(h('h3',{class:'settings-label',text:'资料管理'}));
  const items=[...(panel?[['import','导入资料','upload'],['export','导出资料','download']]:[]),['rename','资料名称','edit'],['history','历史记录','history'],['undo','撤销结构调整','undo']];
  body.append(h('div',{class:'settings-grid'},items.map(([id,label,symbol])=>button(label,()=>finish(id),{symbol,kind:'quiet',disabled:id==='undo'&&!undoSnapshot}))));
  body.append(h('h3',{class:'settings-label',text:'帮助'}),h('div',{class:'settings-grid'},button('使用与隐私',()=>finish('help'),{kind:'quiet',symbol:'info'}),button('体验示例资料',()=>finish('example'),{kind:'quiet',symbol:'folder'})));
  body.append(h('details',{class:'advanced-settings'},h('summary',{text:'其他操作'}),h('div',{class:'dialog-actions'},button('导出诊断信息',()=>finish('diagnostic'),{kind:'quiet',symbol:'info'}),button('清除本机全部资料',()=>finish('erase'),{kind:'danger',symbol:'trash'}))));
  foot.append(h('span',{class:'settings-version',text:'小师弟求职 '+APP_VERSION}),button('完成',()=>finish(null),{kind:'primary'}));
 });
 if(action==='rename'){const name=await askText('资料名称','名称',profile.name);if(name)commit(p=>{p.name=name;},'修改资料名称前');}
 if(action==='import')chooseImport();if(action==='export')await exportDialog();if(action==='history')await historyDialog();if(action==='example')await loadExample();if(action==='help')await helpDialog();if(action==='erase')await eraseAll();
 if(action==='undo'&&undoSnapshot){if(await confirmAction('撤销结构调整','这会恢复调整前的完整资料。之后填写的内容也会回退，请先确认。','确认撤销')){const previous=clone(profile);profile={...clone(undoSnapshot),revision};undoSnapshot=previous;markDirty('撤销结构调整前');render();}}
 if(action==='diagnostic'){const s=stats(profile);saveFile('小师弟求职-诊断信息.json',JSON.stringify({product:'小师弟求职',version:APP_VERSION,generatedAt:new Date().toISOString(),userAgent:navigator.userAgent,context:extension?'extension':'standalone',profileCounts:s,storageBytes:byteLength(profile),dirty,saveState:conflict?'conflict':saveError?'error':saving?'saving':'saved',note:'不包含字段值、页面URL、口令、证件号或浏览记录。'},null,2),'application/json');toast('诊断文件已生成，不含资料内容。');}
}
async function helpDialog(){
 await modal('使用与隐私说明',({body,foot,finish})=>{
  const sections=[
   ['怎么填写','编辑资料 → 打开招聘网页和插件 → 点击网页输入框 → 点击侧栏中的资料。每次只替换一项，不会自动提交。'],
   ['切换网站与侧栏宽度','新网站需要重新点击工具栏图标，或使用 Alt+Shift+Y。拖动浏览器原生侧栏边缘调整宽度；左右位置由浏览器设置决定。'],
   ['兼容范围','支持常规文本框、多行文本、原生单选下拉及简单 contenteditable。密码、上传、复选框、单选按钮、复杂富文本、跨域 iframe、封闭 Shadow DOM、浏览器内部页面与 PDF 不做直接填写承诺。不支持的控件请点击复制，然后手动处理。'],
   ['本地存储不等于加密','扩展资料使用 chrome.storage.local；独立维护页使用浏览器本地存储。两者互不共享，也不会上传或自动同步。本机资料本身不是加密保险箱；本机其他有权限的软件可能读取浏览器数据。敏感信息请仅在确有必要时填写。'],
   ['备份与删除','Excel / JSON 备份为明文；.applyvault 导出使用口令加密。遗失口令无法找回。导入、删除或结构变更前最多保留 3 份本地历史。清除本机资料会同时清除历史，但不影响已导出的文件和招聘网站中的内容。'],
   ['网页和剪贴板','目标网站会看到你写入它的内容；复制操作会写入系统剪贴板。侧栏不会把整份资料交给网页。你仍应自行核对接收网站、填写结果及提交内容。'],
   ['导入和搜索','只支持本产品导出的 Excel、JSON 和加密备份，也能读取旧版文件。独立 HTML 和插件之间需要导出再导入，不会自动同步。搜索覆盖所有分类、经历、字段名及非敏感内容；空格分隔的关键词需同时匹配。敏感字段的值不参与搜索。照片和附件只记录名称或链接，不自动上传。'],
   ['版本与支持',`小师弟求职 ${APP_VERSION} · 无账号、无广告、无云服务、无自动遥测。购买支持请联系向你提供本产品的销售方。`]
  ];
  for(const [title,text] of sections)body.append(h('h3',{class:'modal-section-title',text:title}),h('p',{class:'modal-description',text}));
  foot.append(button('我知道了',()=>finish(null),{kind:'primary'}));
 },{wide:true});
}
async function main(){
 try{
  window.addEventListener('storage',event=>{if(event.key==='xiaoshidi.ui.v1'){preferences=readPreferences();hideEmpty=preferences.hideEmpty;applyPreferences(preferences);if(profile)render();}});
  const result=await repo.load();profile=result.profile;revision=profile.revision;epoch=result.epoch;selected=profile.modules[0]?.id||'';render();
  repo.subscribe(state=>{
   if(!state?.profile)return;
   if((state.epoch||0)!==epoch){clearTimeout(saveTimer);epoch=state.epoch||0;profile=state.profile;revision=profile.revision;gen++;dirty=false;saveError='';conflict=false;checkpoint='';undoSnapshot=null;render();toast('本机资料空间已在另一窗口重置。');return;}
   if(!dirty&&!saving&&state.profile.revision!==revision){profile=state.profile;revision=profile.revision;render();}
  });
  window.addEventListener('beforeunload',event=>{if(dirty||saving){event.preventDefault();event.returnValue='';}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&dirty&&!conflict)flush();});
  document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='s'){event.preventDefault();flush().then(ok=>{if(ok)toast('资料已保存到本机。');});}if((event.ctrlKey||event.metaKey)&&event.key==='k'&&!document.querySelector('dialog[open]')){event.preventDefault();searchInput?.focus();}});
  if(panel&&extension){chrome.runtime.onMessage.addListener(request=>{if(request.type==='TARGET_UPDATED')refreshTarget();});await refreshTarget();setInterval(refreshTarget,1500);}
 }catch(error){
  root.replaceChildren(h('main',{class:'empty-state'},h('h1',{text:'本地资料暂时无法打开'}),h('p',{text:errorMessage(error)}),h('p',{text:'没有自动重置或覆盖旧资料。请先备份浏览器数据，再检查扩展状态。'}),button('重新加载页面',()=>location.reload(),{kind:'primary'})));
 }
}
main();
