// Fail the build if a newly added runtime module is missing from the manifest.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('../runtime-files.json',import.meta.url),'utf8'));
const required=[
 'index.html','js/game-build-player.js','js/editor.js','js/core/chambre-07-scene.js',
 'js/core/scene.js','js/core/logic-sequences.js','js/core/viewport-3d.js',
 'js/ui/focus-menu.js','js/ui/unity-layout-refinement.js',
 'css/focus-menu.css','css/unity-layout-refinement.css',
 'js/ui/demo-browser.js'
];
const missing=required.filter(file=>!manifest.files?.includes(file));
assert.deepEqual(missing,[],'Manifest missing runtime modules: '+missing.join(', '));
for(const file of required)await readFile(new URL('../'+file,import.meta.url));
console.log('CHAMBRE 07 export manifest: '+required.length+' required files present.');
