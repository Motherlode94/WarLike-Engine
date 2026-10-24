import test from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../js/core/state.js';
import {modeDefaults,currentMode,resetGameMode,registerElimination,updateGameMode,modeRuntime} from '../js/core/game-modes.js';

function setup(kind){
 const player={id:1,name:'Player',type:'character',x:100,y:100,w:40,h:64,team:1,hp:100,gameMode:{...modeDefaults(),kind}};
 const enemy={id:2,name:'Enemy',type:'prefab',assetId:'zombie',x:125,y:120,w:48,h:70,team:2,hp:100};
 state.entities=[player,enemy];state.playing=true;state.nextId=3;resetGameMode();
 return {player,enemy,game:{life:100,over:false}};
}
test('deathmatch: player kill increments score, bots respawn',()=>{
 const {player,enemy,game}=setup('deathmatch');
 assert.equal(currentMode().kind,'deathmatch');
 assert.equal(registerElimination(enemy,player,game),true);
 assert.equal(modeRuntime.kills,1);
 assert.equal(enemy._modeEliminated,true);
 updateGameMode(5,game);
 assert.equal(enemy._modeEliminated,false);
 state.playing=false;
});
test('team deathmatch: enemy team scores a player elimination',()=>{
 const {player,enemy,game}=setup('teamDeathmatch');
 registerElimination(player,enemy,game);
 assert.equal(modeRuntime.teamScores[2],1);
 assert.equal(modeRuntime.playerOut,true);
 updateGameMode(5,game);
 assert.equal(modeRuntime.playerOut,false);
 assert.equal(game.life,100);
 state.playing=false;
});
test('battle royale: zone shrink causes environmental elimination',()=>{
 const {player,enemy,game}=setup('battleRoyale');
 player.x=2000;enemy.x=2100;
 player.gameMode.zoneRadius=100;player.gameMode.zoneMinRadius=50;player.gameMode.zoneDamage=1000;
 updateGameMode(1,game);
 assert.equal(modeRuntime.playerOut,true);
 assert.equal(modeRuntime.roundOver,true);
 state.playing=false;
});
test('roleplay: salary accrues and role is initialized',()=>{
 const {player,game}=setup('roleplay');
 player.gameMode.role='Medic';player.gameMode.rolePayInterval=5;player.gameMode.roleSalary=20;
 resetGameMode();
 updateGameMode(5,game);
 assert.equal(modeRuntime.role,'Medic');
 assert.equal(modeRuntime.money,220);
 state.playing=false;
});
test('frontline: uncontested zone accumulates control and points',()=>{
 const {player,enemy,game}=setup('frontline');
 player.gameMode.captureX=120;player.gameMode.captureY=130;player.gameMode.captureRadius=100;player.gameMode.captureSeconds=3;player.gameMode.scoreLimit=99;
 enemy.x=900;enemy.y=900;
 updateGameMode(4,game);
 assert.equal(modeRuntime.captureOwner,1);
 updateGameMode(5,game);
 assert.ok(modeRuntime.teamScores[1]>0);
 state.playing=false;
});
