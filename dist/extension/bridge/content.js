import {createFillEngine} from './fill-engine.js';
(() => {
 if(globalThis.__APPLYDOCK_V1__){globalThis.__APPLYDOCK_V1__.describe();return;}
 const engine=createFillEngine(window,target=>{chrome.runtime.sendMessage({type:'FOCUS',target}).catch(()=>{});});
 globalThis.__APPLYDOCK_V1__=engine;
 chrome.runtime.onMessage.addListener((request,sender,respond)=>{
  if(sender.id!==chrome.runtime.id||sender.tab)return false;
  if(request.type==='PING'){engine.describe();respond({ok:true});return false;}
  if(!['WRITE_FIELD','UNDO_FIELD'].includes(request.type))return false;
  (async()=>{try{const data=request.type==='WRITE_FIELD'?await engine.fill(request.token,request.value):await engine.undo();respond({ok:true,data});}catch(error){respond({ok:false,error:error.message});}})();return true;
 });
})();
