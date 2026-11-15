import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Blueprint does not steal the Graph tab after an asynchronously detected breakpoint',()=>{
 const ui=readFileSync(new URL('../js/ui/blueprint-workspace.js',import.meta.url),'utf8');
 const start=ui.indexOf("let lastPauseRevision=0;setInterval(");
 assert.ok(start>=0);
 const end=ui.indexOf("document.addEventListener('warlike:open-blueprint-defaults'",start);
 const tick=ui.slice(start,end);
 assert.match(tick,/lastPauseRevision=d\.revision;if\(dialog\.hidden\)\{ui\.tab='debug';show\(\)\}/);
 assert.ok(!tick.includes("lastPauseRevision=d.revision;ui.tab='debug';show()"),'open debugger only when not already visible');
});
