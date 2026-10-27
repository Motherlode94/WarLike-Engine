import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {communityApiVersion,validateCommunityPack,loadCommunityPacks,installCommunityPack,uninstallCommunityPack,communityRecipes,applyCommunityRecipe} from '../js/core/community-plugins.js';
const example=JSON.parse(readFileSync(new URL('../examples/community/field-tools.json',import.meta.url),'utf8'));
const store=()=>{
 const data=new Map();
 return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,String(value))};
};
test('safe SDK accepts a versioned example and freezes its allowed capability surface',()=>{
 assert.equal(communityApiVersion,'1.0');
 const manifest=validateCommunityPack(example);
 assert.equal(manifest.recipes.length,2);
 assert.equal(manifest.recipes[0].sequence.event,'interact');
 assert.equal(manifest.recipes[0].sequence.instructions[0].type,'addVariable');
 assert.equal('script' in manifest,false);
});
test('install, update, uninstall, reload and apply community Blueprint recipes',()=>{
 const storage=store();
 loadCommunityPacks(storage);
 const pack=installCommunityPack(example,storage);
 assert.equal(pack.id,'field-tools');
 assert.equal(communityRecipes().length,2);
 const object={id:2,type:'object'};
 assert.equal(applyCommunityRecipe(object,'community:field-tools:welcome-npc'),true);
 assert.equal(object.sequence.instructions[0].key,'reputation');
 object.sequence.instructions[0].key='tampered';
 assert.equal(communityRecipes().length,2);
 assert.equal(applyCommunityRecipe({},'community:missing:recipe'),false);
 const updated={...example,version:'1.0.1'};
 installCommunityPack(updated,storage);
 assert.equal(loadCommunityPacks(storage)[0].version,'1.0.1');
 assert.equal(uninstallCommunityPack('field-tools',storage),true);
 assert.equal(communityRecipes().length,0);
});
test('reject executable code, unsupported operations, unsafe schema and large manifests',()=>{
 const invalid=[
  {...example,apiVersion:'2.0'},
  {...example,id:'../../breakout'},
  {...example,version:'latest'},
  {...example,recipes:[{id:'bad-code',sequence:{event:'start',instructions:[{type:'eval',value:'code'}]}}]},
  {...example,recipes:[{id:'bad-code',sequence:{event:'start',instructions:[{type:'destroyObject'}]}}]},
  {...example,recipes:[{id:'bad-code',sequence:{event:'start',instructions:[{type:'message',value:{nested:'payload'}}]}}]},
  {...example,recipes:[{id:'bad-code',sequence:{event:'start',instructions:[{type:'message',value:'OK'}],script:'alert(1)'}}]},
  {...example,recipes:[{id:'bad-code',sequence:{event:'start',instructions:[],conditions:[{type:'randomChance',value:1}]}}]},
  {...example,description:'x'.repeat(132000)}
 ];
 for(const pack of invalid)assert.throws(()=>validateCommunityPack(pack));
});
test('community extension appears in Inspector without loading arbitrary scripts',()=>{
 const inspector=readFileSync(new URL('../js/ui/inspector.js',import.meta.url),'utf8');
 const editor=readFileSync(new URL('../js/editor.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(inspector,/communityRecipes\(\)/);
 assert.match(inspector,/applyCommunityRecipe/);
 assert.match(editor,/initCommunityManager\(\)/);
 assert.match(html,/id="warlikeOpenCommunity"/);
});
