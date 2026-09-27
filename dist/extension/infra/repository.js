import {createStore,STORE_KEY} from './storage-core.js';
export const isExtension=()=>typeof chrome!=='undefined'&&!!chrome.runtime?.id;
export async function message(type,payload={}) {
 const response=await chrome.runtime.sendMessage({type,...payload});
 if(!response||!response.ok){const error=new Error(response?.error||'扩展未响应。请在扩展管理页重新加载。');error.code=response?.code;throw error;}return response.data;
}
export function createRepository(){
 if(isExtension())return {
  load:()=>message('LOAD'),save:(profile,rev,checkpoint,epoch)=>message('SAVE',{profile,rev,checkpoint,epoch}),history:()=>message('HISTORY'),erase:()=>message('ERASE'),
  subscribe(fn){const listener=(changes,area)=>{if(area==='local'&&changes[STORE_KEY]?.newValue)fn(changes[STORE_KEY].newValue);};chrome.storage.onChanged.addListener(listener);return ()=>chrome.storage.onChanged.removeListener(listener);}
 };
 const driver={async get(k){const text=localStorage.getItem(k);return text?JSON.parse(text):null;},async set(k,v){localStorage.setItem(k,JSON.stringify(v));}};
 const store=createStore(driver);
 const lock=callback=>navigator.locks?navigator.locks.request('applydock-write',callback):Promise.reject(new Error('此浏览器缺少安全保存能力。请使用新版 Chrome，或安装浏览器扩展。'));
 return {load:()=>lock(()=>store.load()),save:(p,r,c,e)=>lock(()=>store.save(p,r,c,e)),history:()=>lock(()=>store.history()),erase:()=>lock(()=>store.erase()),subscribe(fn){const listener=event=>{if(event.key===STORE_KEY&&event.newValue)try{fn(JSON.parse(event.newValue));}catch{}};window.addEventListener('storage',listener);return ()=>window.removeEventListener('storage',listener);}};
}
