import test from 'node:test';
import assert from 'node:assert/strict';
import {compatibleGenres,genreCompatible,genreLabel,genreStage,resolveGameGenre} from '../js/core/game-genres.js';
import {createGenreScene} from '../js/core/genre-templates.js';
import {freshGameProject,gameProject,restoreGameProject} from '../js/core/game-project.js';
import {prepareGameDefinition,gameBuildHtml} from '../js/core/game-build.js';
import {walkPlatformer2d} from '../js/core/physics-2d.js';
test('game types have real mode compatibility and honest capability descriptions',()=>{
 assert.ok(compatibleGenres('2d').some(([id])=>id==='platformer'));assert.equal(compatibleGenres('3d').some(([id])=>id==='platformer'),false);assert.deepEqual(compatibleGenres('invalid'),[]);assert.equal(genreCompatible('__proto__','2d'),false);assert.equal(genreLabel('tactical','2d'),'Action · Vue du dessus');assert.match(genreLabel('tactical','3d'),/FPS/);assert.equal(genreStage('survival'),'Scène jouable');assert.equal(genreStage('fourx'),'Base à compléter');
});
test('platformer template uses real solid floors, gravity and jumping, and rejects 3D',()=>{
 assert.throws(()=>createGenreScene('platformer','3d'),/incompatible/);const scene=createGenreScene('platformer','2d'),p=scene.entities.find(o=>o.controller2d);for(let i=0;i<120;i++)walkPlatformer2d(p,1/60,new Set(),scene.entities);assert.equal(p.grounded2d,true);const floorY=p.y;walkPlatformer2d(p,1/60,new Set([' ']),scene.entities);assert.ok(p.y<floorY);assert.ok(p.rigidbody2d.vy<0);
});
test('legacy genre inference uses strong scene evidence and respects explicit choices',()=>{
 assert.equal(resolveGameGenre(undefined,[{survival:{}}]),'survival');assert.equal(resolveGameGenre(undefined,[{superhero:{}}]),'superhero');assert.equal(resolveGameGenre(undefined,[{controller2d:{mode:'platformer'}}]),'platformer');assert.equal(resolveGameGenre(undefined,[{csharpComponents:[{kind:'RpgProgression'}]}]),'rpg');assert.equal(resolveGameGenre('sandbox',[{survival:{}}]),'sandbox');assert.equal(resolveGameGenre(undefined,[null,{tags:2,csharpComponents:'bad'}]),'sandbox');assert.equal(resolveGameGenre(undefined,'bad'),'sandbox');
});
test('project restore and exports carry genre independently of the Hub',()=>{
 const scene=createGenreScene('rpg','3d'),project={...freshGameProject(),genre:'rpg',title:'Aventure'};const data=prepareGameDefinition({...scene,mode:'3d',project});assert.equal(data.project.genre,'rpg');const html=gameBuildHtml('<html><head><title>X</title></head><body><script type="module" src="./js/editor.js"></script></body></html>',data);assert.match(html,/"genre":"rpg"/);restoreGameProject(data.project);assert.equal(gameProject.genre,'rpg');restoreGameProject({...data.project,genre:'survival'});assert.equal(gameProject.genre,'survival');
});
test('old exports infer genre from their active scene and incompatible exports fail clearly',()=>{
 const scene=createGenreScene('rpg','3d'),project={...freshGameProject()};delete project.genre;const data=prepareGameDefinition({...scene,mode:'3d',project});assert.equal(data.project.genre,'rpg');const platformer=createGenreScene('platformer','2d');assert.throws(()=>prepareGameDefinition({...platformer,mode:'3d',project:{...freshGameProject(),genre:'platformer'}}),/incompatible/);assert.throws(()=>prepareGameDefinition({...scene,mode:'bad'}),/Type de projet invalide/);
});

test('platformer jump keeps a brief key press received between simulation frames',()=>{
 const scene=createGenreScene('platformer','2d'),p=scene.entities.find(o=>o.controller2d);for(let i=0;i<120;i++)walkPlatformer2d(p,1/60,new Set(),scene.entities);const y=p.y;walkPlatformer2d(p,1/60,new Set(),scene.entities,{pressedKeys:new Set([' '])});assert.ok(p.rigidbody2d.vy<0);assert.ok(p.y<y);
});
