import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('repeat certification uses independent P6 browser launches and fails on any failed run',()=>{
 const code=readFileSync(new URL('../scripts/test-p6-repeat-stability.mjs',import.meta.url),'utf8');
 assert.match(code,/spawnSync\(process\.execPath/);
 assert.match(code,/scripts\/test-p6-fps-tps-export-browser\.mjs/);
 assert.match(code,/WARLIKE_P6_OUTPUT_DIR:dir/);
 assert.match(code,/results\.every\(r=>r\.passed\)/);
 assert.match(code,/if\(!success\)process\.exitCode=1/);
});
