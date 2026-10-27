import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('default 3D project has a playable actor',()=>{
 const hub=read('js/core/project-hub.js');
 assert.match(hub,/defaults3d=\(\)=>\[\{\.\.\.prefab3d\('character-hero',1,150,150\),name:'3D Player',playable3d:true\}\]/);
});
test('Hub project changes update both the canvas and 3D state before Play',()=>{
 const source=read('js/core/viewport-3d.js');
 assert.match(source,/const syncProjectView=\(\)=>/);
 assert.match(source,/const expected=workspace\.mode==='3d'/);
 assert.match(source,/view3d\.enabled=expected;focusScene\(\);sync\(\)/);
 assert.match(source,/addEventListener\('warlike:project',syncProjectView\)/);
 assert.match(source,/addEventListener\('warlike:change',syncProjectView\)/);
 assert.match(source,/syncProjectView\(\)/);
});
test('workspace switch and Hub loading cannot desynchronize 3D Play',()=>{
 const hub=read('js/core/project-hub.js'),ws=read('js/core/workspaces.js');
 assert.match(hub,/restoreWorkspaces\(data\)/);
 assert.match(hub,/new Event\('warlike:project'\)/);
 assert.match(ws,/workspace\.mode=mode/);
 assert.match(ws,/notify\(\)/);
});
