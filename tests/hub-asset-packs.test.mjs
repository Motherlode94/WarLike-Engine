import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Hub lets users choose assets when creating 3D projects',()=>{
 const html=read('index.html'),hub=read('js/core/project-hub.js');
 assert.match(html,/id="hubAssetPack"/);
 for(const pack of ['starter','kenney','community','both'])assert.ok(html.includes('option value="'+pack+'"'));
 assert.match(hub,/createProject\(name\.value,type\.value,assetPackSelect\.value,genreSelect\.value\)/);
});
test('Hub stores pack per project, allows changing existing packs and restores it',()=>{
 const hub=read('js/core/project-hub.js');
 assert.match(hub,/assetPack:hub\.assetPack/);
 assert.match(hub,/assetPack:sanitizeAssetPack\(data\.assetPack\|\|meta\.assetPack\)/);
 assert.match(hub,/export function chooseProjectAssets/);
 assert.match(hub,/packs\.onchange=/);
 assert.match(hub,/warlike:asset-pack-change/);
});
test('Workspace filters external catalog by active project and starts requested pack',()=>{
 const workspace=read('js/ui/workspace.js');
 assert.match(workspace,/const project3dAssets=/);
 assert.match(workspace,/pack==='kenney'\|\|pack==='both'/);
 assert.match(workspace,/pack==='community'\|\|pack==='both'/);
 assert.match(workspace,/kenneyButton\.click\(\)/);
 assert.match(workspace,/communityButton\.click\(\)/);
 assert.match(workspace,/addEventListener\('warlike:asset-pack-change'/);
});
