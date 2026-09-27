import {spawnSync} from 'node:child_process';import fs from 'node:fs/promises';import path from 'node:path';import {fingerprint,root} from './fingerprint.mjs';
const files=(await fs.readdir(path.join(root,'tests/unit'))).filter(n=>n.endsWith('.test.mjs')).map(n=>path.join(root,'tests/unit',n));
const result=spawnSync(process.execPath,['--test','--experimental-test-coverage',...files],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
const output=(result.stdout||'')+(result.stderr||'');process.stdout.write(output);await fs.mkdir(path.join(root,'reports'),{recursive:true});await fs.writeFile(path.join(root,'reports/unit-tests.tap'),output);
const count=name=>Number(output.match(new RegExp('^# '+name+' (\\d+)','m'))?.[1]||0);
const report={product:'小师弟求职',version:'1.1.0-rc.1',source_sha256:await fingerprint(),generated_at:new Date().toISOString(),node:process.version,counts:{total:count('tests'),passed:count('pass'),failed:count('fail'),skipped:count('skipped')},exit_code:result.status??1,scope:'Node domain/infrastructure tests; Chrome service-worker APIs mocked. Coverage is NOT whole-product or native browser coverage.'};
await fs.writeFile(path.join(root,'reports/unit-tests.json'),JSON.stringify(report,null,2));process.exit(report.exit_code);
