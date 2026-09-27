// Minimal bounded ZIP container. STORE on export; STORE/DEFLATE on import.
// No dependency or downloaded runtime code. ZIP64, encryption and multi-volume are deliberately unsupported.
const utf8 = new TextEncoder();
const decoder = new TextDecoder('utf-8', {fatal:true});
const crcTable = new Uint32Array(256);
for (let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0;}
export function crc32(bytes) {let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function concat(parts){const out=new Uint8Array(parts.reduce((n,a)=>n+a.length,0));let p=0;for(const part of parts){out.set(part,p);p+=part.length;}return out;}
export function packZip(files) {
 const bodies=[],central=[];let offset=0;
 const entries=Object.entries(files);if(entries.length>128)throw new Error('压缩包文件过多。');
 for(const [name,input] of entries){
  const n=utf8.encode(name),data=typeof input==='string'?utf8.encode(input):input,crc=crc32(data);
  const head=new Uint8Array(30),h=new DataView(head.buffer);h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint16(12,33,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,n.length,true);
  bodies.push(head,n,data);
  const ce=new Uint8Array(46),v=new DataView(ce.buffer);v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint16(14,33,true);v.setUint32(16,crc,true);v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);v.setUint16(28,n.length,true);v.setUint32(42,offset,true);central.push(ce,n);offset+=head.length+n.length+data.length;
 }
 const cd=concat(central),tail=new Uint8Array(22),v=new DataView(tail.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,cd.length,true);v.setUint32(16,offset,true);
 return concat([...bodies,cd,tail]);
}
async function inflateBounded(data,expected){
 let stream;try{stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));}catch{throw new Error('当前浏览器不支持解压 XLSX，请更新 Chrome。');}
 const reader=stream.getReader(),parts=[];let n=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;n+=value.length;if(n>expected||n>32*1024*1024){await reader.cancel();throw new Error('压缩内容超过声明大小，已拒绝导入。');}parts.push(value);}}
 catch(error){try{await reader.cancel();}catch{}throw error;}
 if(n!==expected)throw new Error('压缩文件长度校验失败。');return concat(parts);
}
export async function unpackZip(input) {
 const b=input instanceof Uint8Array?input:new Uint8Array(input);
 if(b.length>8*1024*1024)throw new Error('文件超过 8 MB。');
 const v=new DataView(b.buffer,b.byteOffset,b.byteLength);let end=-1;
 for(let p=b.length-22;p>=Math.max(0,b.length-65557);p--){if(v.getUint32(p,true)===0x06054b50&&p+22+v.getUint16(p+20,true)===b.length){end=p;break;}}
 if(end<0)throw new Error('不是有效的 XLSX / ZIP 文件。');
 if(v.getUint16(end+4,true)||v.getUint16(end+6,true))throw new Error('不支持分卷文件。');
 const count=v.getUint16(end+10,true),cdSize=v.getUint32(end+12,true),cdOff=v.getUint32(end+16,true);
 if(count>128||count!==v.getUint16(end+8,true)||cdOff+cdSize>end)throw new Error('压缩包目录无效或文件过多。');
 let p=cdOff,total=0;const records=[],names=new Set();
 for(let i=0;i<count;i++){
  if(p+46>end||v.getUint32(p,true)!==0x02014b50)throw new Error('压缩包目录损坏。');
  const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),crc=v.getUint32(p+16,true),compressed=v.getUint32(p+20,true),size=v.getUint32(p+24,true),nl=v.getUint16(p+28,true),el=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),off=v.getUint32(p+42,true);
  if(p+46+nl+el+cl>cdOff+cdSize)throw new Error('目录长度不正确。');
  const name=decoder.decode(b.subarray(p+46,p+46+nl));
  if(flags&1||![0,8].includes(method)||size===0xffffffff||off===0xffffffff)throw new Error('不支持加密、ZIP64 或这种压缩方式。');
  if(name.includes('..')||name.startsWith('/')||name.includes('\\')||name.includes('\0')||names.has(name))throw new Error('压缩包路径无效或重复。');names.add(name);
  total+=size;if(size>16*1024*1024||total>32*1024*1024)throw new Error('解压后的资料过大，已停止导入。');
  if(off+30>cdOff||v.getUint32(off,true)!==0x04034b50||v.getUint16(off+8,true)!==method||(v.getUint16(off+6,true)&1))throw new Error('文件头无效。');
  const start=off+30+v.getUint16(off+26,true)+v.getUint16(off+28,true);
  if(start+compressed>cdOff||start>cdOff)throw new Error('文件数据越界。');
  if(decoder.decode(b.subarray(off+30,off+30+v.getUint16(off+26,true)))!==name)throw new Error('文件名校验失败。');
  records.push({name,method,crc,size,data:b.subarray(start,start+compressed)});p+=46+nl+el+cl;
 }
 if(p!==cdOff+cdSize)throw new Error('压缩包目录大小不正确。');
 const result=new Map();for(const r of records){const data=r.method===0?r.data:await inflateBounded(r.data,r.size);if(data.length!==r.size||crc32(data)!==r.crc)throw new Error('文件内容校验失败，未导入。');result.set(r.name,data);}return result;
}
