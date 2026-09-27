export function h(tag,props={},...children){
 const node=document.createElement(tag);
 for(const [key,value] of Object.entries(props)){
  if(value===undefined||value===null)continue;
  if(key==='text')node.textContent=String(value);
  else if(key==='class')node.className=value;
  else if(key==='on')for(const [event,handler]of Object.entries(value))node.addEventListener(event,handler);
  else if(key==='checked'||key==='disabled'||key==='hidden'||key==='value')node[key]=value;
  else node.setAttribute(key,String(value));
 }
 const add=child=>{if(child===null||child===undefined||child===false)return;if(Array.isArray(child))child.forEach(add);else node.append(child instanceof Node?child:document.createTextNode(String(child)));};children.forEach(add);return node;
}
const paths={
 menu:'M3 5h18v14H3zM9 5v14',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
 logo:'M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm4 4h4M9 12h4M9 16h2M17 8h2v12',
 plus:'M12 5v14M5 12h14',search:'m21 21-4.4-4.4M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
 upload:'M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5',download:'M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5',
 chevron:'m9 5 7 7-7 7',down:'m6 9 6 6 6-6',edit:'m16 3 5 5-12 12-6 1 1-6L16 3ZM13 6l5 5',
 copy:'M9 8h12v13H9zM5 16H3V3h12v2',shield:'m12 3 9 4v5c0 5-9 10-9 10S3 17 3 12V7l9-4Zm-4 9 3 3 5-5',
 arrow:'M5 12h14m-6-6 6 6-6 6',more:'M5 12h.01M12 12h.01M19 12h.01',close:'m6 6 12 12M6 18 18 6',
 trash:'M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7M14 10v7',check:'m5 12 4 4L19 6',
 eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
 lock:'M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4',link:'m10 14 4-4M8 16l-2 2a4 4 0 0 1-6-6l6-6a4 4 0 0 1 6 0m0 2 2-2a4 4 0 0 1 6 6l-6 6a4 4 0 0 1-6 0',
 undo:'M9 5 3 11l6 6M3 11h11a6 6 0 0 1 6 6',history:'M3 3v6h6M3 9a9 9 0 1 1-1 7M12 7v5l3 2',
 folder:'M3 5h7l2 3h9v12H3V5Z',up:'m6 15 6-6 6 6',info:'M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'
};
export function icon(name,size=16){const s=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const [k,v]of Object.entries({viewBox:'0 0 24 24',width:size,height:size,fill:'none',stroke:'currentColor','stroke-width':1.65,'stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))s.setAttribute(k,String(v));const path=document.createElementNS(s.namespaceURI,'path');path.setAttribute('d',paths[name]||paths.folder);s.append(path);return s;}
export function button(label,handler,{kind='',symbol='',title='',disabled=false}={}){return h('button',{type:'button',class:`btn ${kind}`,title:title||label,'aria-label':label,disabled,on:{click:handler}},symbol?icon(symbol):null,kind.includes('icon-only')?null:h('span',{text:label}));}
let controlSequence=0;
export function inputLabel(label,input,hint=''){
 const id='ad-control-'+(++controlSequence);input.setAttribute('aria-labelledby',id+'-label');
 if(hint)input.setAttribute('aria-describedby',id+'-hint');
 return h('label',{class:'control'},h('span',{id:id+'-label',class:'control-label',text:label}),input,hint?h('span',{id:id+'-hint',class:'hint',text:hint}):null);
}
export function saveFile(name,content,type='application/octet-stream'){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=h('a',{href:url,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export function modal(title,build,{wide=false}={}){
 return new Promise(resolve=>{
  const previous=document.activeElement,dialog=h('dialog',{class:wide?'modal wide':'modal','aria-label':title});let settled=false;
  const finish=value=>{if(settled)return;settled=true;dialog.close();dialog.remove();if(previous?.isConnected)previous.focus();resolve(value);};
  const body=h('div',{class:'modal-body'}),foot=h('div',{class:'modal-foot'});
  dialog.append(h('header',{class:'modal-head'},h('h2',{text:title}),button('关闭',()=>finish(null),{kind:'icon-only quiet',symbol:'close'})),body,foot);
  dialog.addEventListener('cancel',e=>{e.preventDefault();finish(null);});
  build({body,foot,finish,dialog});document.body.append(dialog);dialog.showModal();
 });
}
export async function confirmAction(title,text,action='确认',{danger=false}={}){return modal(title,({body,foot,finish})=>{body.append(h('p',{class:'modal-description',text}));foot.append(button('取消',()=>finish(false),{kind:'quiet'}),button(action,()=>finish(true),{kind:danger?'danger':'primary'}));});}
export async function askText(title,label,value='',hint=''){return modal(title,({body,foot,finish})=>{const input=h('input',{type:'text',value,maxlength:120,required:true});body.append(inputLabel(label,input,hint));const submit=()=>{if(!input.reportValidity()||!input.value.trim())return;finish(input.value);};input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit();}});foot.append(button('取消',()=>finish(null),{kind:'quiet'}),button('保存',submit,{kind:'primary'}));});}
