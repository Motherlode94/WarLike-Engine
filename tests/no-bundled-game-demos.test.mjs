import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('WarLike editor no longer offers bundled demonstration games',()=>{
 const html=read('index.html');
 for(const marker of [
  'id="rpgDemo"','id="logicDemo"','id="driveDemo"','id="loadDemo"',
  'id="hubOpenChambreNative"','id="fpsScene"','id="horror3dDemo"','id="horrorPursuitDemo"',
  'data-studio-action="threeDDemo"','data-studio-action="threeDNatureDemo"',
  'data-studio-action="threeDGarageDemo"','data-studio-action="gameModeDemo"',
  'data-studio-action="buildingDemo"','data-studio-action="ninjaZombieDemo"',
  'id="warlikeDemoTools"'
 ])assert.equal(html.includes(marker),false,'Removed demo UI still present: '+marker);
 assert.match(html,/<option value="sandbox">Projet vierge/);
 const menus=read('js/ui/studio-menu.js');
 assert.doesNotMatch(menus,/load3dBetaDemo|loadGameModeDemo|loadNinjaZombieDemo/);
 const editor=read('js/editor.js');
 assert.doesNotMatch(editor,/initDemoBrowser\(/);
 assert.doesNotMatch(editor,/\$\('#rpgDemo'\)|\$\('#loadDemo'\)/);
});
test('new projects cannot install demo games or default actors',()=>{
 const hub=read('js/core/project-hub.js');
 assert.match(hub,/const chosenGenre='sandbox'/);
 assert.match(hub,/slots\[mode\]=entry\(mode==='2d'\?defaults2d\(\):defaults3d\(\)\)/);
 assert.match(hub,/name:'Main Camera 2D'/);
 assert.doesNotMatch(hub,/slots\[mode\]=selected==='sandbox'/);
 assert.doesNotMatch(hub,/createGenreScene\(selected,mode\)/);
});
test('the native creative systems and the requested three-object 3D starter remain',()=>{
 const start=read('js/core/clean-starter-scene.js');
 assert.match(start,/name:'Main Camera'/);
 assert.match(start,/name:'Terrain'/);
 assert.match(start,/name:'Directional Light'/);
 assert.match(read('js/core/viewport-3d.js'),/realGlbBuffers/);
 assert.match(read('js/core/gaia-terrain-sculpt.js'),/terrainSurfaceMesh3d/);
});
