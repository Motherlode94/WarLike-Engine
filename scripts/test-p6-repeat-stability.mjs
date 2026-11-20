// Repeat the real exported FPS/TPS browser test in independent Chromium sessions.
// Does not alter or weaken assertions in the canonical P6 test.
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import path from 'node:path';

const count=Math.min(10,Math.max(1,Number.parseInt(process.env.WARLIKE_P6_REPEAT_COUNT||'5',10)||5));
const base=path.resolve(process.env.WARLIKE_P6_REPEAT_DIR||'.validation-tools/p6-repeat');
const results=[];
mkdirSync(base,{recursive:true});
for(let iteration=1;iteration<=count;iteration++){
 const dir=path.join(base,'run-'+String(iteration).padStart(2,'0'));
 mkdirSync(dir,{recursive:true});
 const startedAt=new Date().toISOString();
 const result=spawnSync(process.execPath,['scripts/test-p6-fps-tps-export-browser.mjs'],{
  cwd:process.cwd(),encoding:'utf8',maxBuffer:16*1024*1024,
  env:{...process.env,WARLIKE_P6_OUTPUT_DIR:dir}
 });
 const passed=result.status===0&&!result.error;
 const output=(result.stdout||'')+'\n'+(result.stderr||'');
 writeFileSync(path.join(dir,'runner.log'),output);
 results.push({iteration,passed,startedAt,exitCode:result.status,error:result.error?.message||null,dir});
 console.log('P6 iteration '+iteration+'/'+count+': '+(passed?'PASS':'FAIL')+' (exit '+result.status+')');
 if(!passed)console.error(output.slice(-3000));
}
const success=results.every(r=>r.passed);
const summary={test:'P6 native FPS/TPS portable exports',independentRuns:count,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results};
writeFileSync(path.join(base,'summary.json'),JSON.stringify(summary,null,2));
const markdown=['## P6 FPS/TPS repeated browser certification','',count+' independent runs — '+summary.passed+' passed, '+summary.failed+' failed.','','| Run | Result |','|---|---|',...results.map(r=>'| '+r.iteration+' | '+(r.passed?'PASS':'FAIL')+' |'),'','Criteria: all runs must pass. Reports/screenshots/logs retained for every run.'].join('\n');
writeFileSync(path.join(base,'summary.md'),markdown+'\n');
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdown+'\n');
if(!success)process.exitCode=1;
