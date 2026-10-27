import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scanThreats,threatProfile,threatFactions,threatRelations} from '../js/core/threat-intelligence.js';
import {updateAi,attack3d,defaultStats} from '../js/core/gameplay-components.js';
import {createGenreScene} from '../js/core/genre-templates.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const player={id:1,x:0,y:0,w:40,h:40,stats:defaultStats()};
const npc=(id,x,relation='hostile')=>({id,name:'NPC '+id,type:'mesh3d',x,y:0,w:40,h:60,
 stats:defaultStats(),ai:{enabled:true,detection:400,attackRange:50,attackDamage:10,speed:0,
 attackCooldown:1,pathfinding:false,requireLineOfSight:false,patrolRadius:0},
 threatIntel:{faction:relation==='hostile'?'bandit':'civilian',relation,className:'Soldat',level:5,weakness:'Lenteur'}});
test('enemy scanner sorts genuine active AI threats by risk then distance',()=>{
 const hostile=npc(2,100),friendly=npc(3,30,'friendly');
 const result=scanThreats([player,friendly,hostile],player);
 assert.equal(result.length,2);
 assert.equal(result[0].id,2);
 assert.equal(result[0].faction,'bandit');
 assert.equal(result[0].weakness,'Lenteur');
 assert.equal(result[1].severity,0);
 assert.equal(scanThreats([player,hostile],player,{radius:10}).length,0);
 assert.equal(threatProfile(player,player),null);
 assert.ok(threatFactions.includes('undead'));
 assert.ok(threatRelations.includes('suspicious'));
});
test('friendly and neutral AI never attack player or become melee targets',()=>{
 const friendly=npc(2,10,'friendly'),neutral=npc(3,10,'neutral');
 updateAi([player,friendly,neutral],player,.5);
 assert.equal(player.stats.health,100);
 assert.equal(friendly.ai.state,'patrol');
 assert.equal(neutral.ai.state,'patrol');
 assert.equal(attack3d(player,[player,friendly,neutral],{range:150}),null);
});
test('hostile AI remains dangerous and exposes observed perception without fabrication',()=>{
 const enemy=npc(2,35);
 updateAi([player,enemy],player,.1);
 assert.equal(enemy.ai.state,'attack');
 assert.equal(enemy.ai.detected,true);
 assert.equal(enemy.ai.visible,true);
 assert.equal(enemy.ai.lastKnownX,player.x);
 assert.ok(threatProfile(enemy,player).severity>0);
});
test('Field Lab contains visible ally and hostile NPC identities',()=>{
 for(const mode of ['2d','3d']){
  const scene=createGenreScene('fieldlab',mode);
  const foe=scene.entities.find(e=>e.tags?.includes('fieldlab-enemy'));
  const ally=scene.entities.find(e=>e.tags?.includes('fieldlab-ally'));
  assert.equal(foe.threatIntel.relation,'hostile');
  assert.equal(ally.threatIntel.relation,'friendly');
  assert.ok(foe.ai.enabled);
 }
});
test('Inspector and scanner load for Web Play 2D and 3D',()=>{
 const inspector=read('js/ui/inspector.js'),hud=read('js/ui/genre-hud.js');
 const game=read('js/core/gameplay.js'),scanner=read('js/ui/threat-scanner.js');
 assert.ok(inspector.includes('Enemy Intelligence · identité / factions'));
 assert.ok(scanner.includes("event.key.toLowerCase()!=='t'"));
 assert.ok(hud.includes('updateThreatScanner(state)'));
 assert.ok(game.includes('updateThreatScanner(state)'));
 assert.ok(scanner.includes('scanThreats(state.entities,player'));
});
