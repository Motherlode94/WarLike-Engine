import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Project 3D must never render the 2D canvas beneath the 3D toolbar',()=>{
 const css=read('css/style.css');
 assert.match(css,/body\[data-workspace="3d"\]\s+#viewport>#canvas\{display:none!important\}/);
 assert.match(css,/body\[data-workspace="3d"\]\s+#viewport>#canvas3d\{display:block!important\}/);
});
test('WebGL errors display user-visible 3D failure instead of silently keeping 2D',()=>{
 const script=read('js/core/viewport-3d.js');
 assert.match(script,/const renderFailure=/);
 assert.match(script,/id='webglFailure'/);
 assert.match(script,/ERREUR MOTEUR 3D/);
});
test('GLB cards and preview load geometry-derived thumbnails',()=>{
 const ui=read('js/ui/workspace.js');
 assert.match(ui,/assignModelThumbnail\(img,a.id\)/);
 assert.match(ui,/assignModelThumbnail\(picture,asset.id\)/);
 const thumb=read('js/ui/real-model-thumbnail.js');
 assert.match(thumb,/getModelGeometry\(id\)/);
 assert.match(thumb,/canvas\.toDataURL/);
});
