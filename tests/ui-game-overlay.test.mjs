import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gameUiSignal,gameUiElements} from '../js/core/ui-game-overlay.js';
import {defaultUiCanvas,defaultUiRect,defaultUiElement} from '../js/core/ui-canvas-layout.js';
const node=(id,parentId,kind,text,eventName='')=>({
 id,parentId,uiRect:{...defaultUiRect(),sizeDelta:[240,60]},
 uiElement:{...defaultUiElement(),kind,text,eventName}
});
test('Game UI layout includes only supported visible components inside real Canvas',()=>{
 const entities=[
  {id:1,uiCanvas:defaultUiCanvas()},
  node(2,1,'panel','Fond'),node(3,1,'text','Santé 100'),node(4,1,'button','Jouer','menu:play'),
  node(5,1,'image','Image non encore prise en charge'),
  node(6,999,'button','Hors Canvas')
 ];
 const items=gameUiElements(entities,1280,720);
 assert.deepEqual(items.map(x=>x.id),[2,3,4]);
 assert.ok(items.every(x=>x.rect.width>0&&x.rect.height>0));
});
test('Game UI button emits explicit safe WarNode signals with bounded fallback',()=>{
 assert.equal(gameUiSignal({id:4,element:{eventName:'menu:play'}}),'menu:play');
 assert.equal(gameUiSignal({id:4,element:{eventName:'   '}}),'ui:click:4');
 assert.equal(gameUiSignal({id:4,element:{eventName:'<script>alert(1)</script>'}}),'ui:click:4');
 assert.equal(gameUiSignal({id:4,element:{eventName:'a'.repeat(200)}}),'ui:click:4');
});
test('Engine browser mounts native game UI once, and uses signal-only interaction',()=>{
 const source=readFileSync(new URL('../js/editor.js',import.meta.url),'utf8');
 const renderer=readFileSync(new URL('../js/core/ui-game-overlay.js',import.meta.url),'utf8');
 assert.match(source,/createGameUiOverlay\(host/);
 assert.match(source,/gameUiOverlay\.update\(state\.entities/);
 assert.match(source,/emitSequenceSignal\(signal\)/);
 assert.match(renderer,/element\.textContent/);
 assert.doesNotMatch(renderer,/\.innerHTML\s*=/);
});
