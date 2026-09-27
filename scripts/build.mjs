import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {packZip} from '../extension/infra/zip.js';
import {exportXlsx} from '../extension/infra/xlsx.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),src=path.join(root,'extension'),dist=path.join(root,'dist');
export async function bundle(entry){
 const modules=new Map(),visiting=new Set();
 async function visit(file){
  file=path.resolve(file);if(modules.has(file))return;if(visiting.has(file))throw new Error('Circular module dependency: '+file);visiting.add(file);
  let source=await fs.readFile(file,'utf8');const matches=[...source.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];?/g)];
  for(const match of matches){if(!match[2].startsWith('.'))throw new Error('Only local modules may be bundled.');await visit(path.resolve(path.dirname(file),match[2]));}
  source=source.replace(/import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];?/g,(_,names,rel)=>`const {${names}}=__AD_modules[${JSON.stringify(path.relative(src,path.resolve(path.dirname(file),rel)).replaceAll('\\','/'))}];`);
  const exports=[...source.matchAll(/\bexport\s+(?:async\s+)?(?:function|class|const|let)\s+([A-Za-z_$][\w$]*)/g)].map(x=>x[1]);
  source=source.replace(/\bexport\s+(?=(?:async\s+)?(?:function|class|const|let)\b)/g,'');
  modules.set(file,{source,exports});visiting.delete(file);
 }
 await visit(entry);return `(function(){'use strict';const __AD_modules=Object.create(null);\n`+[...modules].map(([file,m])=>`__AD_modules[${JSON.stringify(path.relative(src,file).replaceAll('\\','/'))}]=(function(){\n${m.source}\nreturn {${m.exports.join(',')}};})();`).join('\n')+'\n})();';
}
async function filesIn(dir,prefix=''){const out={};for(const entry of await fs.readdir(dir,{withFileTypes:true})){const rel=prefix+entry.name,full=path.join(dir,entry.name);if(entry.isDirectory())Object.assign(out,await filesIn(full,rel+'/'));else out[rel]=new Uint8Array(await fs.readFile(full));}return out;}
await fs.rm(dist,{recursive:true,force:true});await fs.mkdir(dist,{recursive:true});await fs.cp(src,path.join(dist,'extension'),{recursive:true});
const content=await bundle(path.join(src,'bridge/content.js'));await fs.writeFile(path.join(dist,'extension/bridge/content.bundle.js'),content);
// Source ES modules are supplied for inspection; content.js itself is not injected.
const js=await bundle(path.join(src,'ui/app.js')),css=await fs.readFile(path.join(src,'ui/style.css'),'utf8'),logo=(await fs.readFile(path.join(src,'icons/32.png'))).toString('base64');
const notices=await fs.readFile(path.join(src,'third-party-notices.txt'),'utf8');
const html=`<!doctype html><!--${notices}--><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>小师弟求职 · 独立资料维护页</title><link rel="icon" href="data:image/png;base64,${logo}"><style>${css}</style></head><body data-view="manager"><div id="app"></div><div id="toast-region" class="toast-region" role="status" aria-live="polite"></div><noscript>请启用 JavaScript 后使用。</noscript><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
await fs.writeFile(path.join(dist,'小师弟求职-资料维护.html'),html);
await fs.rm(path.join(root,'release'),{recursive:true,force:true});await fs.mkdir(path.join(root,'release'),{recursive:true});
await fs.writeFile(path.join(root,'release/xiaoshidi-extension-1.1.0-rc.1.zip'),packZip(await filesIn(path.join(dist,'extension'))));
await fs.copyFile(path.join(dist,'小师弟求职-资料维护.html'),path.join(root,'release/小师弟求职-资料维护.html'));
await fs.writeFile(path.join(root,'release/小师弟求职-资料模板.xlsx'),exportXlsx(JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/full-template-profile.json'),'utf8'))));
console.log('Built unpacked extension, candidate ZIP, standalone editor and complete Excel template.');
