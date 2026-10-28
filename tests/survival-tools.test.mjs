import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSurvival,defaultSurvivalNode,ensureSurvival,survivalAction,survivalHarvestTarget,gatherSurvival} from '../js/core/survival-runtime.js';
import {survivalTools,survivalToolStatus} from '../js/core/survival-tools.js';
import {inventoryCount} from '../js/core/gameplay-components.js';
import {createSurvivalScene} from '../js/core/survival-scene.js';
import {moveBody2d,colliderRect2d} from '../js/core/physics-2d.js';
import {reconcileLanSurvivors} from '../js/core/lan-survivors.js';
import {captureGameSave,queueLoadGame,saveGameSlot,applySessionChange} from '../js/core/game-session.js';
import {restoreGameProject} from '../js/core/game-project.js';
import {resetSequences,updateSequences,conditionPass} from '../js/core/logic-sequences.js';
import {createBlueprintPreset} from '../js/core/blueprint-presets.js';
import {gameRuntimeFiles,gameRuntimeModels,gameBuildModelCatalog} from '../js/core/game-build.js';
import {get3dAsset} from '../js/assets/catalog-3d.js';
const actor=(id=1)=>({id,type:'player',name:'Survivant',x:0,y:0,w:32,h:64,depth3d:32,team:1,stats:{health:100,maxHealth:100},inventory:{capacity:12,items:[{id:'wood',count:20},{id:'stone',count:20},{id:'fiber',count:20}],equipment:{}},survival:defaultSurvival()});
const resource=(kind='wood',id=2)=>({id,type:'object',x:60,y:0,w:30,h:40,depth3d:30,survivalNode:{...defaultSurvivalNode(),kind,stock:100,maxStock:100}});
const act=(p,action,entities=[p],mode='2d')=>{ensureSurvival(p).actionCooldown=0;return survivalAction(p,action,entities,{mode})};

for(const mode of ['2d','3d'])test(mode+' tools craft into inventory, match resources, wear, break and repair atomically',()=>{
 for(const [id,kind] of [['axe','wood'],['pickaxe','stone']]){
  const p=actor(),node=resource(kind),entities=[p,node],def=survivalTools[id];
  assert.equal(act(p,'craft:'+id,entities,mode).ok,true);assert.equal(inventoryCount(p,def.item),1);assert.equal(survivalToolStatus(p,id).durability,20);
  const before=inventoryCount(p,kind);assert.equal(act(p,'gather',entities,mode).ok,true);assert.equal(inventoryCount(p,kind),before+4);assert.equal(survivalToolStatus(p,id).durability,19);
  p.survivalState.tools[id].durability=1;assert.equal(act(p,'gather',entities,mode).ok,true);assert.equal(survivalToolStatus(p,id).durability,0);
  const wornCount=inventoryCount(p,kind);assert.equal(act(p,'gather',entities,mode).ok,true);assert.equal(inventoryCount(p,kind),wornCount+2);assert.equal(survivalToolStatus(p,id).durability,0);
  const wood=inventoryCount(p,'wood'),stone=inventoryCount(p,'stone');assert.equal(act(p,'repair:'+id,entities,mode).ok,true);assert.equal(survivalToolStatus(p,id).durability,20);assert.equal(inventoryCount(p,'wood'),wood-1);assert.equal(inventoryCount(p,'stone'),stone-1);
  const inventory=structuredClone(p.inventory);assert.equal(act(p,'repair:'+id,entities,mode).ok,false);assert.deepEqual(p.inventory,inventory);assert.equal(act(p,'craft:'+id,entities,mode).ok,false);assert.deepEqual(p.inventory,inventory);
 }
});

test('a tool does not boost or wear on the other resource or an unsuccessful harvest',()=>{
 const p=actor(),node=resource('stone');act(p,'craft:axe');const before=inventoryCount(p,'stone');assert.equal(act(p,'gather',[p,node]).ok,true);assert.equal(inventoryCount(p,'stone'),before+2);assert.equal(survivalToolStatus(p,'axe').durability,20);
 node.survivalNode.kind='wood';node.survivalNode.stock=0;assert.equal(act(p,'gather',[p,node]).ok,false);assert.equal(survivalToolStatus(p,'axe').durability,20);
 node.survivalNode.stock=4;p.inventory.items=p.inventory.items.filter(item=>item.id!=='wood');p.inventory.capacity=p.inventory.items.length;assert.equal(act(p,'gather',[p,node]).ok,false);assert.equal(node.survivalNode.stock,4);assert.equal(survivalToolStatus(p,'axe').durability,20);
});

test('crafting accounts for freed ingredient slots and never charges for a tool without inventory room',()=>{
 const p=actor();p.inventory.capacity=3;const before=structuredClone(p.inventory);assert.equal(act(p,'craft:axe').ok,false);assert.deepEqual(p.inventory,before);assert.equal(survivalToolStatus(p,'axe').owned,false);
 p.inventory.items=[{id:'wood',count:2},{id:'stone',count:2},{id:'fiber',count:1}];assert.equal(act(p,'craft:axe').ok,true);assert.deepEqual(p.inventory.items,[{id:'survival-axe',count:1}]);
 p.survivalState.tools.axe.durability=1;const broken=structuredClone(p.survivalState.tools);assert.equal(act(p,'repair:axe').ok,false);assert.deepEqual(p.survivalState.tools,broken);assert.equal(act(p,'repair:__proto__').ok,false);
});

test('a successful partial harvest costs one use and configurable tool settings survive serialization',()=>{
 const p=actor(),node=resource();p.survival.toolDurability=6;p.survival.toolHarvestBonus=3;act(p,'craft:axe');node.survivalNode.stock=1;assert.equal(act(p,'gather',[p,node]).ok,true);assert.equal(survivalToolStatus(p,'axe').durability,5);const restored=JSON.parse(JSON.stringify(p));assert.equal(survivalToolStatus(restored,'axe').durability,5);assert.equal(survivalToolStatus(restored,'axe').maxDurability,6);assert.equal(survivalToolStatus(restored,'axe').bonus,3);
});

for(const mode of ['2d','3d'])test(mode+' walls block gathering without using stock or tool durability',()=>{
 const p=actor(),node=resource(),wall={id:5,type:'object',x:40,y:-40,w:5,h:120,depth3d:120};act(p,'craft:axe');const inventory=structuredClone(p.inventory);
 assert.equal(survivalHarvestTarget(p,[p,node,wall],{mode}).blocked,true);assert.equal(act(p,'gather',[p,node,wall],mode).ok,false);assert.deepEqual(p.inventory,inventory);assert.equal(node.survivalNode.stock,100);assert.equal(survivalToolStatus(p,'axe').durability,20);
 wall.sequenceEnabled=false;assert.equal(act(p,'gather',[p,node,wall],mode).ok,true);
});

test('2D offset colliders block the harvest ray and triggers remain traversable',()=>{
 const p=actor(),node=resource(),wall={id:5,type:'prefab',x:1000,y:1000,w:1,h:1,collision3d:false,collider2d:{enabled:true,offsetX:-960,offsetY:-1040,width:5,height:120}};
 assert.equal(survivalHarvestTarget(p,[p,node,wall]).blocked,true);wall.collider2d.isTrigger=true;assert.equal(gatherSurvival(p,[p,node,wall]).ok,true);
});

test('targeting skips exhausted, hidden and unreachable resources in favor of a reachable stock',()=>{
 const p=actor(),empty=resource(),live={...resource('stone',3),x:70,y:60},hidden={...resource('water',4),x:32,visible:false};empty.survivalNode.stock=0;
 assert.equal(survivalHarvestTarget(p,[p,empty,live,hidden]).node.id,3);assert.equal(act(p,'gather',[p,empty,live,hidden]).ok,true);assert.equal(inventoryCount(p,'water'),0);
 const wall={id:8,type:'object',x:40,y:-25,w:5,h:70};empty.survivalNode.stock=10;assert.equal(survivalHarvestTarget(p,[p,empty,live,wall]).node.id,3);
});

test('the actual 2D Survival tree and rock colliders stop fast character movement at their footprints',()=>{
 const scene=createSurvivalScene('2d');
 for(const kind of ['wood','stone']){const node=scene.entities.find(o=>o.survivalNode?.kind===kind),box=colliderRect2d(node);assert.equal(node.collider2d.enabled,true);const p={id:999,type:'player',x:box.x-60,y:box.y+5,w:20,h:20};const hit=moveBody2d(p,500,0,[p,node]);assert.equal(hit.blockedX,true);assert.ok(p.x+p.w<=box.x+.001);assert.equal(node.survivalNode.stock,12)}
});

test('host saves and companion reconnects preserve each tool, while a new name starts without it',()=>{
 restoreGameProject({id:'tool-save'});resetSequences();const p=actor(),entities=[p];let id=50;act(p,'craft:axe');const host={id:'h',name:'Hôte'};
 reconcileLanSurvivors(entities,[host,{id:'g',name:'Ami'}],p,{hostId:'h',allocateId:()=>id++});const guest=entities[1];assert.equal(survivalToolStatus(guest,'axe').owned,false);guest.inventory.items.push({id:'wood',count:5},{id:'stone',count:5},{id:'fiber',count:1});act(guest,'craft:pickaxe');guest.survivalState.tools.pickaxe.durability=7;
 const store=new Map(),ctx={entities,globals:{},fired:[],storage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)}};saveGameSlot(ctx);guest.survivalState.tools.pickaxe.durability=0;queueLoadGame(ctx);applySessionChange(ctx);assert.equal(survivalToolStatus(entities[1],'pickaxe').durability,7);
 const restoredHost=entities[0];reconcileLanSurvivors(entities,[host],restoredHost,{hostId:'h',allocateId:()=>id++});const saved=JSON.parse(JSON.stringify(captureGameSave(ctx)));const h=saved.entities[0];reconcileLanSurvivors(saved.entities,[host,{id:'g2',name:'Ami'}],h,{hostId:'h',allocateId:()=>id++});assert.equal(survivalToolStatus(saved.entities[1],'pickaxe').durability,7);assert.equal(survivalToolStatus(h,'axe').durability,20);
});

test('Blueprint tool repair and conditions operate on the same inventory and durability as the HUD',()=>{
 resetSequences();const p=actor();act(p,'craft:axe');p.survivalState.tools.axe.durability=0;ensureSurvival(p).actionCooldown=0;
 assert.equal(conditionPass({type:'survivalToolUsable',key:'axe'},p,{entities:[p]}),false);assert.equal(conditionPass({type:'survivalToolDurabilityBelow',key:'axe',value:25},p,{entities:[p]}),true);
 p.sequence={enabled:true,event:'start',once:true,instructions:[{type:'repairSurvivalTool',value:'axe'}]};updateSequences(.1,{playing:true,entities:[p],player:p,keys:new Set()});assert.equal(survivalToolStatus(p,'axe').durability,20);assert.equal(conditionPass({type:'survivalToolUsable',key:'axe'},p,{entities:[p]}),true);
 for(const id of ['survival-craft-axe','survival-craft-pickaxe','survival-repair-tool'])assert.ok(createBlueprintPreset(id,'2d'));
});

test('old Survival projects also export real Kenney tool models and just their used thumbnails',()=>{
 const data={project:{scenes:[{entities:[{survival:{enabled:true}}]}]}},models=gameRuntimeModels(data),ids=models.map(o=>o.id),axe=get3dAsset(survivalTools.axe.modelId),pick=get3dAsset(survivalTools.pickaxe.modelId),unused=get3dAsset('free-survival-kit-tool-shovel');
 assert.ok(ids.includes(axe.id)&&ids.includes(pick.id));const files=[axe.url.slice(2),pick.url.slice(2),axe.thumbnailUrl.slice(2),pick.thumbnailUrl.slice(2),unused.url.slice(2),unused.thumbnailUrl.slice(2),...axe.textureFiles.map(s=>s.slice(2))];const selected=gameRuntimeFiles(files,data);assert.ok(selected.includes(axe.url.slice(2)));assert.ok(selected.includes(axe.thumbnailUrl.slice(2)));assert.ok(!selected.includes(unused.url.slice(2)));assert.ok(!selected.includes(unused.thumbnailUrl.slice(2)));
 const catalog=gameBuildModelCatalog('js/assets/free-game-assets.js','export const freeSprites2d=[];',data);assert.ok(catalog.includes(axe.id)&&catalog.includes(pick.id));
});
