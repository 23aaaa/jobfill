import {validateProfile,parseJson,LIMITS} from '../domain/model.js';
const ITERATIONS=310000;
const bytesTo64=bytes=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);};
const from64=s=>{if(typeof s!=='string'||s.length>LIMITS.fileBytes*1.4||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw new Error('加密文件编码无效。');return Uint8Array.from(atob(s),c=>c.charCodeAt(0));};
async function key(password,salt){
 if(typeof password!=='string'||password.length<12||password.length>1024)throw new Error('备份口令需要 12–1024 个字符。');
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function encryptProfile(profile,password){
 const p=validateProfile(profile),salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('ApplyDock-vault-1')},await key(password,salt),new TextEncoder().encode(JSON.stringify(p)));
 return JSON.stringify({format:'ApplyDock-vault',version:1,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,salt:bytesTo64(salt),iv:bytesTo64(iv),data:bytesTo64(new Uint8Array(encrypted))},null,2);
}
export async function decryptProfile(text,password){
 if(new TextEncoder().encode(text).length>LIMITS.fileBytes)throw new Error('加密备份超过大小限制。');
 let v;try{v=JSON.parse(text);}catch{throw new Error('加密备份格式损坏。');}
 if(v.format!=='ApplyDock-vault'||v.version!==1||v.kdf!=='PBKDF2-SHA256'||v.iterations!==ITERATIONS)throw new Error('不支持此加密备份格式。');
 const salt=from64(v.salt),iv=from64(v.iv),data=from64(v.data);if(salt.length!==16||iv.length!==12||data.length<16)throw new Error('加密备份参数不正确。');
 let plain;try{plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('ApplyDock-vault-1')},await key(password,salt),data);}catch{throw new Error('口令不正确或文件已被修改，未导入任何资料。');}
 return parseJson(new TextDecoder('utf-8',{fatal:true}).decode(plain));
}
