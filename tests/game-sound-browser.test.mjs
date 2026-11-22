import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {gameSoundCatalog,filterGameSounds,assignGameSound,PROCEDURAL_GAME_SOUNDS} from '../js/core/game-sound-catalog.js';
import {freeAudioAssets} from '../js/assets/free-game-assets.js';

test('Project / Assets / Sons de jeu uses shipped CC0 recordings and working synth voices',()=>{
 const sounds=gameSoundCatalog();
 assert.equal(PROCEDURAL_GAME_SOUNDS.length,16);
 assert.equal(sounds.length,freeAudioAssets.length+16);
 assert.equal(new Set(sounds.map(s=>s.id)).size,sounds.length);
 assert.ok(freeAudioAssets.length>=20,'Expected shipped Kenney recordings, not empty placeholders');
 for(const sound of sounds.filter(s=>s.source==='ogg')){
  assert.equal(sound.license,'CC0-1.0');
  assert.ok(sound.url.endsWith('.ogg'),sound.id);
  assert.ok(existsSync(sound.url.replace(/^\.\//,'')),'Missing shipped OGG '+sound.id);
 }
 const groups=new Set(sounds.map(s=>s.category));
 for(const name of ['Interface','Armes et combat','Environnement','Personnages','Interactions','Véhicules'])assert.ok(groups.has(name));
});
test('search is accent insensitive and filters source and category without duplicates',()=>{
 const sounds=gameSoundCatalog();
 assert.ok(filterGameSounds(sounds,{query:'éxplosion'}).some(s=>s.id==='explosion'));
 assert.ok(filterGameSounds(sounds,{query:'footstep',source:'ogg'}).length>=3);
 assert.ok(filterGameSounds(sounds,{category:'Véhicules',source:'synth'}).length>=2);
 assert.ok(filterGameSounds(sounds,{query:'does-not-exist'}).length===0);
});
test('assigning SFX only changes an Audio Source clip flags, preserving 2D and 3D settings',()=>{
 const e={id:8,type:'object',audioEnabled:true,audioClip:'vehicle',audioGain:.35,audioRange:35,audioSpatial:true,x:18,y:19};
 const previous={...e},sound=gameSoundCatalog().find(s=>s.id.includes('doorOpen'));
 assignGameSound(e,sound);assert.equal(e.audioClip,sound.id);assert.equal(e.audioLoop,false);
 for(const key of ['id','type','audioGain','audioRange','audioSpatial','x','y'])assert.equal(e[key],previous[key]);
 assert.throws(()=>assignGameSound(null,sound),/Audio Source/);
});
test('browser integration mounts in existing Project toolbar and not Studio plugin rack',()=>{
 const html=readFileSync('index.html','utf8'),editor=readFileSync('js/editor.js','utf8');
 assert.match(html,/id="openGameSounds"/);
 assert.match(html,/id="gameSoundsDialog"/);
 assert.match(editor,/installGameSoundsBrowser\(\{record,addAudioEmitter\}\)/);
 assert.ok(!html.includes('data-template-master'), 'Must not attach Studio templates to Engine');
});
