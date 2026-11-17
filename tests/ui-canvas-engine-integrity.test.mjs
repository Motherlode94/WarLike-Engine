import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {componentChoices,addObjectComponent,removeObjectComponent} from '../js/core/component-definitions.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('native uGUI data components are available in 2D and 3D Engine projects',()=>{
 for(const mode of ['2d','3d']){
  const choices=componentChoices(mode);
  for(const id of ['uiCanvas','uiRect','uiElement'])assert.ok(choices.some(o=>o.id===id),mode+' '+id);
  const entity={id:1,type:'object'};
  for(const id of ['uiCanvas','uiRect','uiElement'])assert.equal(addObjectComponent(entity,id,mode),true);
  assert.deepEqual(entity.uiRect.anchorMin,[.5,.5]);
  assert.equal(entity.uiElement.kind,'panel');
  assert.equal(removeObjectComponent(entity,'uiElement'),true);
 }
});
test('UI component Inspector stores the authoring values but does not promise working game controls',()=>{
 const inspector=read('js/ui/ui-components-inspector.js');
 for(const word of ['UI Canvas · Overlay','UI RectTransform','UI Element','referenceResolution','anchorMin','anchorMax','anchoredPosition','sizeDelta'])assert.ok(inspector.includes(word),word);
 assert.match(inspector,/futur runtime/);
 assert.match(read('js/ui/inspector.js'),/renderUiComponentsInspector\(root,o\)/);
});
test('Engine scene serialization and portable manifest contain native UI modules',()=>{
 assert.match(read('js/core/scene.js'),/'cameraRig','uiCanvas','uiRect','uiElement'/);
 const files=JSON.parse(read('runtime-files.json')).files;
 for(const path of ['js/core/ui-canvas-layout.js','js/ui/ui-components-inspector.js'])assert.ok(files.includes(path),path);
});
