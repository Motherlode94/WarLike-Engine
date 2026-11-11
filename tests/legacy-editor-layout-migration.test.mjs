import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const code=readFileSync(new URL('../js/ui/docking.js',import.meta.url),'utf8');
const hub=readFileSync(new URL('../js/core/project-hub.js',import.meta.url),'utf8');
const fn=code.slice(code.indexOf('export function upgradeLegacyEditorLayout'),code.indexOf('upgradeLegacyEditorLayout();')).replace('export function','function');
const migrate=new Function('storage',fn+'; return upgradeLegacyEditorLayout(storage);');
function mockStorage(seed={}){const data=new Map(Object.entries(seed));return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),entries:()=>Object.fromEntries(data)}}
test('legacy UI layout is migrated without deleting old project data',()=>{
 const storage=mockStorage({
  'warlike.workspace.layout.v1':JSON.stringify({leftWidth:600,rightWidth:180,float:{}}),
  'warlike.projectHeight':'485',
  'warlike.hub.projects.v1':'[{"id":"legacy-a"}]',
  'warlike.hub.project.legacy-a':'{"version":5,"name":"Ancien projet"}'
 });
 assert.equal(migrate(storage),true);
 const values=storage.entries();
 assert.equal(values['warlike.workspace.layout.v1'],undefined);
 assert.equal(values['warlike.projectHeight'],undefined);
 assert.equal(values['warlike.hub.projects.v1'],'[{"id":"legacy-a"}]');
 assert.equal(values['warlike.hub.project.legacy-a'],'{"version":5,"name":"Ancien projet"}');
 const backup=JSON.parse(values['warlike.workspace.layout.before-scene-first.v2']);
 assert.equal(backup.projectHeight,'485');
 assert.equal(JSON.parse(backup.layout).leftWidth,600);
 assert.equal(migrate(storage),false);
});
test('fresh installs and existing custom snapshots remain safe',()=>{
 const storage=mockStorage({'warlike.workspace.layout.custom.v1':'{"leftWidth":490}'});
 assert.equal(migrate(storage),true);
 assert.equal(storage.entries()['warlike.workspace.layout.custom.v1'],'{"leftWidth":490}');
 assert.match(code,/const defaults=\{leftWidth:205,rightWidth:325/);
 assert.match(code,/default:\{leftWidth:205,rightWidth:325,projectHeight:205\}/);
 assert.match(hub,/const INDEX='warlike.hub.projects.v1',PREFIX='warlike.hub.project.'/);
});
