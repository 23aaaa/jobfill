import {validateProfile,clone,byteLength,emptyProfile} from '../domain/model.js';
import {starterProfile} from '../domain/templates.js';
export const STORE_KEY='applydock.profile.v1';
/** The caller serializes writes (service worker queue / navigator.locks). */
export function createStore(driver) {
 async function state(){let s=await driver.get(STORE_KEY);if(!s){s={profile:starterProfile(),history:[],epoch:0};await driver.set(STORE_KEY,s);}return s;}
 return {
  async load(){const s=await state();return {profile:validateProfile(s.profile),epoch:s.epoch||0};},
  async save(raw,expectedRevision,checkpoint='',expectedEpoch=0){
   const s=await state();if(s.profile.revision!==expectedRevision||(s.epoch||0)!==expectedEpoch){const e=new Error('另一窗口已更新资料。当前草稿未被覆盖，请先导出草稿，或重新载入最新版本。');e.code='CONFLICT';throw e;}
   const profile=validateProfile(raw);profile.revision=s.profile.revision+1;profile.updatedAt=new Date().toISOString();
   let history=Array.isArray(s.history)?s.history:[];
   if(checkpoint)history=[{at:new Date().toISOString(),label:String(checkpoint).slice(0,80),profile:clone(s.profile)},...history].slice(0,3);
   while(history.length&&byteLength({profile,history})>3.5*1024*1024)history.pop();
   await driver.set(STORE_KEY,{profile,history,epoch:s.epoch||0});return {profile,epoch:s.epoch||0};
  },
  async history(){return (await state()).history||[];},
  async erase(){const s=await state();const profile=emptyProfile(),epoch=(s.epoch||0)+1;await driver.set(STORE_KEY,{profile,history:[],epoch});return {profile,epoch};}
 };
}
