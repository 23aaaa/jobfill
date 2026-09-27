/** Isolated-world DOM adapter. No access to the profile repository; only one explicit value per call. */
export function createFillEngine(win,onTarget=()=>{}) {
 const doc=win.document;let current=null,lastUndo=null,disposed=false;
 // getRandomValues is available to isolated scripts even on HTTP pages, unlike randomUUID.
 const token=()=>Array.from(win.crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
 const forbidden=new Set(['password','file','hidden','checkbox','radio','button','submit','reset','image','range','color']);
 const richSelector='.ProseMirror,.ql-editor,.ck-editor__editable,[data-lexical-editor],[data-slate-editor]';
 const nativeValue=el=>el instanceof win.HTMLSelectElement?el.value:el.isContentEditable?el.innerText:el.value;
 const active=()=>{let a=doc.activeElement;while(a?.shadowRoot?.activeElement)a=a.shadowRoot.activeElement;return a;};
 const editable=el=>{
  if(!(el instanceof win.HTMLElement)||!el.isConnected||el.closest('[inert]')||!el.getClientRects().length)return false;
  if(win.getComputedStyle(el).visibility==='hidden'||el.matches(':disabled')||el.getAttribute('aria-readonly')==='true')return false;
  if(el instanceof win.HTMLInputElement)return !forbidden.has(el.type)&&!el.disabled&&!el.readOnly;
  if(el instanceof win.HTMLTextAreaElement)return !el.disabled&&!el.readOnly;
  if(el instanceof win.HTMLSelectElement)return !el.disabled&&!el.multiple;
  return el.isContentEditable&&!el.closest(richSelector)&&el.getAttribute('aria-readonly')!=='true';
 };
 const rootEditable=el=>{
  if(!(el instanceof win.HTMLElement))return null;
  if(el.isContentEditable){while(el.parentElement?.isContentEditable)el=el.parentElement;}return el;
 };
 const label=el=>{
  const labels=el.labels?Array.from(el.labels).map(l=>l.textContent||'').join(' '):'';
  const ids=(el.getAttribute('aria-labelledby')||'').split(/\s+/).filter(Boolean);
  const root=el.getRootNode();const described=ids.map(id=>root.getElementById?.(id)?.textContent||'').join(' ');
  return (labels||el.getAttribute('aria-label')||described||el.getAttribute('placeholder')||el.getAttribute('name')||'未命名输入框').trim().slice(0,120);
 };
 const notify=()=>onTarget(current?{token:current.token,label:label(current.el),kind:current.el.tagName.toLowerCase(),inputType:current.el.type||'text',origin:win.location.origin}:null);
 function select(el){el=rootEditable(el);if(editable(el)){current={el,token:token()};notify();}else{current=null;notify();}}
 function focus(event){select(event.composedPath()[0]);}
 function pointer(event){select(event.composedPath()[0]);}
 function blur(){queueMicrotask(()=>{if(doc.activeElement?.tagName==='IFRAME'){current=null;notify();}});}
 const dispatch=(el,inputType='insertReplacementText',data=null)=>{
  const event=new win.InputEvent('input',{bubbles:true,composed:true,inputType,data});el.dispatchEvent(event);el.dispatchEvent(new win.Event('change',{bubbles:true,composed:true}));
 };
 const assign=(el,value)=>{
  if(el.isContentEditable){el.innerText=value;return;}
  const proto=el instanceof win.HTMLTextAreaElement?win.HTMLTextAreaElement.prototype:el instanceof win.HTMLSelectElement?win.HTMLSelectElement.prototype:win.HTMLInputElement.prototype;
  const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;if(!setter)throw new Error('此控件不支持原生写入。');setter.call(el,value);
 };
 async function fill(token,value){
  if(disposed||!current||current.token!==token)throw new Error('目标已变化，请重新点选网页输入框。');
  const el=current.el;
  if(!editable(el)||rootEditable(active())!==el)throw new Error('原输入框已移除、隐藏或焦点已改变，请重新点选。');
  if(typeof value!=='string'||value.length>32767)throw new Error('内容无效或过长。');
  if(!value.length)throw new Error('空字段不会写入网页，避免清空已有内容。');
  if(el.maxLength>=0&&value.length>el.maxLength)throw new Error(`内容有 ${value.length} 字符，网页限制 ${el.maxLength} 字符。未截断、未填入。`);
  let actual=value;
  if(el instanceof win.HTMLSelectElement){const matches=Array.from(el.options).filter(o=>!o.disabled&&!o.hidden&&!o.parentElement?.disabled&&(o.value===value||o.textContent?.trim()===value));if(matches.length!==1)throw new Error('下拉选项不能唯一匹配，请在网页手动选择。');actual=matches[0].value;}
  else if(el instanceof win.HTMLTextAreaElement||el.isContentEditable){actual=value.replace(/\r\n?/g,'\n');}
  else if(el instanceof win.HTMLInputElement){const probe=doc.createElement('input');probe.type=el.type;probe.value=value;if(probe.value!==value)throw new Error('网页控件会改变这段内容的格式，已停止填写。请手动处理。');}
  if(!el.dispatchEvent(new win.InputEvent('beforeinput',{bubbles:true,composed:true,cancelable:true,inputType:'insertReplacementText',data:value})))throw new Error('网页拦截了这次填写，未修改内容。');
  const before=nativeValue(el),nodes=el.isContentEditable?Array.from(el.childNodes).map(n=>n.cloneNode(true)):null;
  const selection=typeof el.selectionStart==='number'?{start:el.selectionStart,end:el.selectionEnd}:null;
  assign(el,actual);dispatch(el,'insertReplacementText',value);
  await new Promise(resolve=>win.setTimeout(resolve,160));
  if(!el.isConnected||nativeValue(el)!==actual){lastUndo=null;throw new Error('网页未保留刚才的值，可能使用了定制编辑器。请核对页面并手动粘贴。');}
  lastUndo={el,before,nodes,selection,after:actual};
  return {label:label(el),characters:value.length,undoAvailable:true};
 }
 async function undo(){
  if(!lastUndo)throw new Error('当前页面没有可撤回的填写。');const u=lastUndo;
  if(!editable(u.el)||nativeValue(u.el)!==u.after)throw new Error('网页内容已改变，为避免覆盖你的修改，不能撤回。');
  if(u.nodes)u.el.replaceChildren(...u.nodes);else assign(u.el,u.before);
  dispatch(u.el,'historyUndo');
  if(u.selection)try{u.el.setSelectionRange(u.selection.start,u.selection.end);}catch{}
  lastUndo=null;return {label:label(u.el)};
 }
 doc.addEventListener('focusin',focus,true);doc.addEventListener('pointerdown',pointer,true);win.addEventListener('blur',blur,true);
 if(editable(rootEditable(active())))select(active());
 return {fill,undo,select,describe:()=>{notify();return current?{token:current.token,label:label(current.el)}:null;},dispose(){disposed=true;current=null;lastUndo=null;doc.removeEventListener('focusin',focus,true);doc.removeEventListener('pointerdown',pointer,true);win.removeEventListener('blur',blur,true);}};
}
