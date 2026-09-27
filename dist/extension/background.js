import {createStore,STORE_KEY} from './infra/storage-core.js';
const storageReady=chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
const store=createStore({async get(key){await storageReady;return (await chrome.storage.local.get(key))[key];},async set(key,value){await storageReady;await chrome.storage.local.set({[key]:value});}});
let writes=Promise.resolve();
const serialize=fn=>{const next=writes.then(fn);writes=next.catch(()=>{});return next;};
const targets=new Map(),undos=new Map();
const internalPages=new Set(['manager.html','sidepanel.html']);
const trusted=sender=>{if(sender.id!==chrome.runtime.id||!sender.url)return false;try{const u=new URL(sender.url);return sender.url.startsWith(chrome.runtime.getURL(''))&&internalPages.has(u.pathname.slice(1));}catch{return false;}};
const publish=()=>chrome.runtime.sendMessage({type:'TARGET_UPDATED'}).catch(()=>{});
async function activeTab(){const tabs=await chrome.tabs.query({active:true,lastFocusedWindow:true});const tab=tabs[0];if(!tab?.id)throw new Error('没有可用的网页标签。');return tab;}
async function connect(tabId){
 const tab=tabId?await chrome.tabs.get(tabId):await activeTab();
 if(!tab.id||!/^https?:\/\//.test(tab.url||''))throw new Error('请在普通招聘网页点击浏览器工具栏上的小师弟求职图标。浏览器内部页、商店及 PDF 页面不支持直接填表。');
 try{await chrome.scripting.executeScript({target:{tabId:tab.id},files:['bridge/content.bundle.js']});}
 catch{throw new Error('尚未获得当前页面权限。请在此网页再次点击浏览器工具栏的小师弟求职图标（Alt+Shift+Y）。');}
 // Main frame success must not be rolled back because an inaccessible cross-origin iframe exists.
 chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:true},files:['bridge/content.bundle.js']}).catch(()=>{});
 return {tabId:tab.id,origin:new URL(tab.url).origin,target:targets.get(tab.id)||null};
}
chrome.action.onClicked.addListener(tab=>{
 if(!tab.id)return;
 // Preserve the browser's user gesture: open before any await.
 chrome.sidePanel.open({windowId:tab.windowId}).catch(()=>{});
 connect(tab.id).catch(()=>{});
});
chrome.runtime.onInstalled.addListener(()=>{storageReady.catch(()=>{});});
chrome.tabs.onRemoved.addListener(id=>{targets.delete(id);undos.delete(id);});
chrome.tabs.onUpdated.addListener((id,info)=>{if(info.status==='loading'){targets.delete(id);undos.delete(id);publish();}});
chrome.tabs.onActivated.addListener(()=>publish());
chrome.runtime.onMessage.addListener((request,sender,respond)=>{
 if(!request||typeof request.type!=='string')return false;
 if(request.type==='FOCUS'){
  if(sender.id!==chrome.runtime.id||!sender.tab?.id||!sender.documentId||!/^https?:\/\//.test(sender.url||''))return false;
  const id=sender.tab.id,t=request.target;
  if(t&&typeof t.token==='string'&&t.token.length<=80&&typeof t.label==='string'&&t.label.length<=120){
   targets.set(id,{tabId:id,frameId:sender.frameId||0,documentId:sender.documentId,token:t.token,label:t.label,kind:String(t.kind||'').slice(0,20),inputType:String(t.inputType||'').slice(0,20),origin:new URL(sender.url).origin});
  }else if(targets.get(id)?.documentId===sender.documentId){targets.delete(id);}
  publish();respond({ok:true});return false;
 }
 if(!trusted(sender)){if(request.type!=='TARGET_UPDATED')respond({ok:false,error:'不允许此来源访问资料。',code:'FORBIDDEN'});return false;}
 const run=async()=>{
  switch(request.type){
   case 'LOAD': return serialize(()=>store.load());
   case 'SAVE': return serialize(()=>store.save(request.profile,request.rev,request.checkpoint,request.epoch));
   case 'HISTORY': return serialize(()=>store.history());
   case 'ERASE': return serialize(()=>store.erase());
   case 'CONNECT':return connect();
   case 'STATUS': {const tab=await activeTab();return {tabId:tab.id,origin:/^https?:\/\//.test(tab.url||'')?new URL(tab.url).origin:'',target:targets.get(tab.id)||null,undoAvailable:undos.has(tab.id)};}
   case 'FILL': {
    const tab=await activeTab(),target=targets.get(tab.id);
    if(!target||request.tabId!==tab.id||request.token!==target.token)throw new Error('当前页面或输入框已变化，请重新点选后填写。');
    if(typeof request.value!=='string'||!request.value||request.value.length>32767)throw new Error('待填内容无效。');
    const result=await chrome.tabs.sendMessage(tab.id,{type:'WRITE_FIELD',token:target.token,value:request.value},{documentId:target.documentId});
    if(!result?.ok)throw new Error(result?.error||'网页没有响应，请重新点选输入框。');
    undos.set(tab.id,{documentId:target.documentId});return result.data;
   }
   case 'UNDO_FILL': {
    const tab=await activeTab(),undo=undos.get(tab.id);if(!undo)throw new Error('当前页面没有可撤回的填写。');
    const result=await chrome.tabs.sendMessage(tab.id,{type:'UNDO_FIELD'},{documentId:undo.documentId});if(!result?.ok)throw new Error(result?.error||'不能撤回，请核对网页。');undos.delete(tab.id);return result.data;
   }
   default:throw new Error('不支持此操作。');
  }
 };
 run().then(data=>respond({ok:true,data}),error=>respond({ok:false,error:error.message||'操作失败。',code:error.code||'ERROR'}));return true;
});
