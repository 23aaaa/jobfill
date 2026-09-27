import fs from 'node:fs/promises';import path from 'node:path';import {spawnSync} from 'node:child_process';
const base=path.resolve('extension'),files=[];
async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else files.push(p);}}await walk(base);
for(const file of files.filter(f=>f.endsWith('.js'))){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status){process.stderr.write(result.stderr);process.exit(1);}}
const manifest=JSON.parse(await fs.readFile(path.join(base,'manifest.json'),'utf8'));
if(manifest.manifest_version!==3||manifest.host_permissions||manifest.externally_connectable||manifest.web_accessible_resources||manifest.content_scripts)throw new Error('Unexpected permission or public resource surface.');
const allowed=['activeTab','clipboardWrite','scripting','sidePanel','storage'].sort();if(JSON.stringify([...manifest.permissions].sort())!==JSON.stringify(allowed))throw new Error('Permission list changed: review required.');
const rules=[[/\beval\s*\(/,'eval'],[/new\s+Function\s*\(/,'dynamic code'],[/\.innerHTML\s*=/,'innerHTML'],[/\.outerHTML\s*=/,'outerHTML'],[/document\.write\s*\(/,'document.write'],[/\bfetch\s*\(/,'network fetch'],[/XMLHttpRequest|sendBeacon|new\s+WebSocket/,'network API'],[/\.submit\s*\(/,'automatic submit']];
for(const file of files.filter(f=>f.endsWith('.js'))){const text=await fs.readFile(file,'utf8');for(const [rule,name]of rules)if(rule.test(text))throw new Error(`${name} found in ${file}`);}
console.log(`Syntax checked ${files.filter(f=>f.endsWith('.js')).length} JS modules. Manifest, CSP-sensitive sinks and network API scan passed.`);
