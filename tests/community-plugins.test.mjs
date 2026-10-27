import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {communityApiVersion,validateCommunityPack,loadCommunityPacks,installCommunityPack,uninstallCommunityPack,communityRecipes,applyCommunityRecipe,previewCommunityPack,compareCommunityVersions} from '../js/core/community-plugins.js';
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

test('update preview blocks version downgrades and repeat installation',()=>{
 const storage=store();loadCommunityPacks(storage);
 const first=previewCommunityPack(example);
 assert.equal(first.action,'install');
 assert.equal(first.compatible,true);
 installCommunityPack(example,storage);
 assert.equal(previewCommunityPack(example).action,'same-version');
 assert.throws(()=>installCommunityPack(example,storage),/version/);
 const newer={...example,version:'1.1.0'};
 assert.equal(previewCommunityPack(newer).action,'upgrade');
 installCommunityPack(newer,storage);
 assert.equal(previewCommunityPack(example).action,'downgrade');
 assert.throws(()=>installCommunityPack(example,storage),/ancienne/);
 assert.equal(compareCommunityVersions('2.0.0','1.99.99'),1);
 assert.equal(compareCommunityVersions('1.0.0','1.0.0'),0);
});
test('manifest cannot modify prototype keys in global Blueprint storage',()=>{
 const bad={...example,recipes:[{id:'polluting',sequence:{event:'interact',instructions:[{type:'setVariable',key:'__proto__',value:1}]}}]};
 assert.throws(()=>validateCommunityPack(bad),/Clé/);
 const badCondition={...example,recipes:[{id:'polluting',sequence:{event:'interact',conditions:[{type:'variable',key:'constructor',value:1}],instructions:[]}}]};
 assert.throws(()=>validateCommunityPack(badCondition),/Clé/);
});
test('catalog only loads curated same-origin manifests',async()=>{
 const {communityCatalog,loadCatalogEntry}=await import('../js/core/community-catalog.js');
 assert.equal(communityCatalog.length,4);
 const result=await loadCatalogEntry('field-tools',{fetcher:async url=>({
  ok:true,headers:{get:()=>null},text:async()=>readFileSync(new URL('../'+url.replace(/^\.\//,''),import.meta.url),'utf8')
 })});
 assert.equal(result.id,'field-tools');
 await assert.rejects(()=>loadCatalogEntry('https://evil.example/code'),/inconnu/);
});
test('manager requires explicit confirmation before installation and provides search',()=>{
 const ui=readFileSync(new URL('../js/ui/community-manager.js',import.meta.url),'utf8');
 assert.match(ui,/previewCommunityPack\(input\)/);
 assert.match(ui,/confirm\.onclick/);
 assert.match(ui,/search\.addEventListener\('input',render\)/);
 assert.match(ui,/loadCatalogEntry\(item\.id\)/);
});

test('2D and 3D packs are validated and filtered per workspace',()=>{
 const source2d=JSON.parse(readFileSync(new URL('../examples/community/platformer-2d.json',import.meta.url),'utf8'));
 const source3d=JSON.parse(readFileSync(new URL('../examples/community/adventure-3d.json',import.meta.url),'utf8'));
 assert.deepEqual(validateCommunityPack(source2d).modes,['2d']);
 assert.deepEqual(validateCommunityPack(source3d).modes,['3d']);
 const storage=store();loadCommunityPacks(storage);
 installCommunityPack(source2d,storage);
 installCommunityPack(source3d,storage);
 assert.equal(communityRecipes('2d').length,3);
 assert.equal(communityRecipes('3d').length,3);
 const node={id:9,type:'object'};
 assert.equal(applyCommunityRecipe(node,'community:platformer-2d:checkpoint-2d','3d'),false);
 assert.equal(applyCommunityRecipe(node,'community:platformer-2d:checkpoint-2d','2d'),true);
 assert.equal(node.sequence.event,'enter');
 const bad={...source2d,modes:['2d','invalid']};
 assert.throws(()=>validateCommunityPack(bad),/Modes/);
 const badRecipe={...source2d,recipes:[{...source2d.recipes[0],modes:['3d']}]};
 assert.throws(()=>validateCommunityPack(badRecipe),/Modes/);
});
