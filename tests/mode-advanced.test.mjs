import test from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../js/core/state.js';
import {modeDefaults,modeRuntime,resetGameMode,registerElimination,updateGameMode} from '../js/core/game-modes.js';
import {advanced,resetAdvanced,updateAdvanced,consumeAmmo,consumeMedkit} from '../js/core/mode-advanced.js';
const player=(kind)=>({id:1,name:'Hero',type:'character',x:100,y:100,w:50,h:72,team:1,hp:100,gameMode:{...modeDefaults(),kind}});
const boot=(kind)=>{const p=player(kind);state.entities=[p];state.playing=true;state.keys=new Set();resetGameMode();resetAdvanced();return {p,game:{life:60,over:false}}};
test('battle royale inventory: ammo, loot and healing',()=>{
 const {p,game}=boot('battleRoyale');assert.equal(advanced.inventory.ammo,35);assert.equal(consumeAmmo(),true);assert.equal(advanced.inventory.ammo,34);
 const loot=advanced.loot.find(x=>x.kind==='medkit');p.x=loot.x-25;p.y=loot.y-36;
 state.keys.add('e');updateAdvanced(.1,game);assert.equal(advanced.inventory.medkits,1);assert.equal(loot.picked,true);
 assert.equal(consumeMedkit(game),true);assert.equal(game.life,100);assert.equal(advanced.inventory.medkits,0);
 state.playing=false;
});
test('roleplay stations award salary per interaction and cooldown',()=>{
 const {p,game}=boot('roleplay');modeRuntime.role='Medic';
 p.x=430;p.y=360;state.entities.push({id:2,name:'Hospital',type:'prefab',assetId:'city-hospital',x:450,y:365,w:120,h:110});
 const initial=modeRuntime.money;state.keys.add('e');updateAdvanced(.1,game);
 assert.equal(modeRuntime.money,initial+30);assert.equal(game.life,80);assert.equal(advanced.tasks,1);
 state.keys.delete('e');updateAdvanced(.1,game);state.keys.add('e');updateAdvanced(.1,game);
 assert.equal(advanced.tasks,1);state.playing=false;
});
test('frontline three zones exist and bot movement targets objectives',()=>{
 const {p,game}=boot('frontline');p.x=650;p.y=300;
 assert.equal(advanced.points.length,3);
 const bot={id:2,name:'Bot',type:'prefab',assetId:'zombie',team:2,x:1000,y:700,w:48,h:70,hp:100,aiSpeed:50};
 state.entities.push(bot);resetGameMode();resetAdvanced();const x=bot.x;
 updateGameMode(.5,game);updateAdvanced(.5,game);assert.notEqual(bot.x,x);
 state.playing=false;
});
test('solo deathmatch bot can win leaderboard without player kill',()=>{
 const {p,game}=boot('deathmatch');p.gameMode.scoreLimit=1;
 const attacker={id:3,name:'Bot One',type:'prefab',assetId:'zombie',x:250,y:250,w:48,h:70,team:2,hp:100};
 const victim={id:4,name:'Bot Two',type:'prefab',assetId:'goblin',x:300,y:250,w:48,h:70,team:2,hp:100};
 state.entities.push(attacker,victim);resetGameMode();
 registerElimination(victim,attacker,game);
 assert.equal(modeRuntime.roundOver,true);assert.match(modeRuntime.winner,/Bot One/);state.playing=false;
});
