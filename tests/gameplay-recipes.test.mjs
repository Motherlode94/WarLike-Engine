import test from 'node:test';
import assert from 'node:assert/strict';
import {applyRecipe,recipes} from '../js/core/gameplay-recipes.js';
import {resetSequences,updateSequences,sequenceRuntime} from '../js/core/logic-sequences.js';
const press=(entities,player,keys)=>updateSequences(.016,{playing:true,entities,player,keys:new Set(keys)});

test('all advertised recipes can be applied',()=>{
 for(const recipe of recipes){const object={id:2,x:30,y:0,w:20,h:20};assert.equal(applyRecipe(object,recipe.id),true,recipe.id)}
});
test('loot chest grants player key only once',()=>{
 resetSequences();const player={id:1,x:0,y:0,w:20,h:20};const chest={id:2,x:25,y:0,w:20,h:20};
 applyRecipe(chest,'loot-chest');press([player,chest],player,['e']);assert.equal(player.inventory.items[0].id,'key');assert.equal(sequenceRuntime.globals.hasKey,1);
 press([player,chest],player,[]);press([player,chest],player,['e']);assert.equal(player.inventory.items[0].count,1);
});
test('healing station restores current player health',()=>{
 resetSequences();const player={id:1,x:0,y:0,w:20,h:20,stats:{maxHealth:100,health:30,maxStamina:100,stamina:100}};
 const healer={id:2,x:25,y:0,w:20,h:20};applyRecipe(healer,'healing-station');press([player,healer],player,['e']);assert.equal(player.stats.health,55);
});
test('locked door displays unlocked branch after key acquisition',()=>{
 resetSequences();const player={id:1,x:0,y:0,w:20,h:20};const chest={id:2,x:25,y:0,w:20,h:20};const door={id:3,x:45,y:0,w:20,h:20};
 applyRecipe(chest,'loot-chest');applyRecipe(door,'locked-door');press([player,chest,door],player,['e']);assert.equal(door.sequenceEnabled,false);
});
