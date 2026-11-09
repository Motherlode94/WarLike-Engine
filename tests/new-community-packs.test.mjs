import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {communityCatalog,loadCatalogEntry} from '../js/core/community-catalog.js';
import {loadCommunityPacks,installCommunityPack,applyCommunityRecipe} from '../js/core/community-plugins.js';
import {resetSequences,updateSequences,sequenceRuntime} from '../js/core/logic-sequences.js';
import {restoreGameProject} from '../js/core/game-project.js';
import {gameSession} from '../js/core/game-session.js';
const ids=['warlike-cuisine-commerce','warlike-quete-livraison','warlike-acces-securise','warlike-objectifs-arcade'];
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}};
const fetcher=async url=>({ok:true,headers:{get:()=>null},text:async()=>readFileSync(new URL('../'+url.replace(/^\.\//,''),import.meta.url),'utf8')});
async function setup(id,mode){
 restoreGameProject({id:'extension-test',genre:'sandbox'});resetSequences();loadCommunityPacks(storage());
 const pack=await loadCatalogEntry(id,{fetcher});installCommunityPack(pack,storage());
 const player={id:1,type:'object',x:0,y:0,w:20,h:20,depth3d:20,stats:{health:100,maxHealth:100},inventory:{items:[],capacity:16}};
 const entities=[player];let next=2;
 function object(recipe){const o={id:next++,type:'object',x:1000,y:1000,w:20,h:20,depth3d:20,collision3d:true,collider2d:{enabled:true}};assert.ok(applyCommunityRecipe(o,'community:'+id+':'+recipe,mode));entities.push(o);return o}
 function tick(keys=[]){updateSequences(.1,{playing:true,mode,player,entities,keys:new Set(keys)})}
 function interact(o){o.x=40;o.y=0;tick(['e']);tick();o.x=1000;o.y=1000;tick()}
 return {player,entities,object,tick,interact};
}
test('new packs are discoverable, validated, installable and filtered for both modes',async()=>{
 for(const id of ids){assert.ok(communityCatalog.some(x=>x.id===id));for(const mode of ['2d','3d']){const f=await setup(id,mode);const pack=await loadCatalogEntry(id,{fetcher});for(const recipe of pack.recipes)f.object(recipe.id)}}
});
for(const mode of ['2d','3d']){
 test(mode+' cuisine recipes enforce costs and exchange resources',async()=>{
  const f=await setup(ids[0],mode),supply=f.object('recolte'),prep=f.object('preparation'),sell=f.object('vente'),buy=f.object('approvisionnement');
  f.interact(prep);f.interact(sell);assert.equal(sequenceRuntime.globals.cuisineRepas,undefined);
  f.interact(supply);f.interact(prep);f.interact(sell);f.interact(buy);
  assert.equal(sequenceRuntime.globals.cuisineIngredients,4);assert.equal(sequenceRuntime.globals.cuisineCredits,0);assert.equal(sequenceRuntime.globals.cuisineRepas,0);assert.deepEqual(sequenceRuntime.errors,[]);
 });
 test(mode+' delivery cannot win before the parcel is collected',async()=>{
  const f=await setup(ids[1],mode),accept=f.object('accepter'),parcel=f.object('colis'),destination=f.object('destination');
  f.interact(destination);f.interact(parcel);assert.equal(gameSession.phase,'playing');
  f.interact(accept);f.interact(parcel);f.interact(destination);assert.equal(gameSession.phase,'won');assert.deepEqual(sequenceRuntime.errors,[]);
 });
 test(mode+' switch opens a signalled door and disables its collider',async()=>{
  const f=await setup(ids[2],mode),sw=f.object('interrupteur'),door=f.object('porte'),console=f.object('console');
  f.interact(console);assert.notEqual(door.visible,false);
  f.interact(sw);f.tick();assert.equal(door.visible,false);assert.equal(door.collision3d,false);assert.equal(door.collider2d.enabled,false);assert.deepEqual(sequenceRuntime.errors,[]);
 });
 test(mode+' arcade requires three separate collectibles before victory',async()=>{
  const f=await setup(ids[3],mode),exit=f.object('sortie'),coins=[f.object('piece'),f.object('piece'),f.object('piece')];
  f.interact(exit);assert.equal(gameSession.phase,'playing');
  for(const coin of coins){coin.x=40;coin.y=0;f.tick();f.tick();coin.x=1000;coin.y=1000;f.tick()}
  assert.equal(sequenceRuntime.globals.arcadePieces,3);f.interact(exit);assert.equal(gameSession.phase,'won');assert.deepEqual(sequenceRuntime.errors,[]);
 });
 test(mode+' arcade checkpoint stores a usable game snapshot on entry',async()=>{
  const f=await setup(ids[3],mode),checkpoint=f.object('checkpoint');
  checkpoint.x=40;checkpoint.y=0;f.tick();
  assert.ok(gameSession.checkpoint);assert.equal(gameSession.checkpoint.entities.some(o=>o.id===f.player.id),true);
  assert.deepEqual(sequenceRuntime.errors,[]);
 });
}
