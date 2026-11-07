// Reproducible full export, using the real runtime manifest and a local GLB.
// Run: node scripts/export-validation-game.mjs [output-directory]
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {registerLocalModel} from '../js/assets/real-models-3d.js';
import {exportGamePackage} from '../js/core/game-build.js';
import {freshGameProject} from '../js/core/game-project.js';
const root=new URL('../',import.meta.url),output=path.resolve(process.argv[2]||fileURLToPath(new URL('.validation-tools/exported-game',root))),dist=path.join(output,'dist');
const file=new File([await readFile(new URL('assets/free/kenney/mini-characters/character-male-a.glb',root))],'validation-character.glb');
const model=registerLocalModel(file);model.name='Personnage importé · validation';
const actor={id:1,name:'Personnage importé',type:'mesh3d',assetId:model.id,model3dId:model.id,meshShape:'glb',playable3d:true,x:0,y:0,w:64,h:128,depth3d:64,elevation3d:0,color:'#ffffff',rotation:0,collision3d:true,stats:{health:100,maxHealth:100},
 animatorGraph:{enabled:true,entry:'walk',states:[{id:'walk',name:'Marche',clip:'walk',duration:1,loop:true}],transitions:[],layers:[],parameters:[]},
 webScripts:[{scriptId:'qa-walk',name:'Walk.js',language:'javascript',values:{},source:'export const fields={frames:0}; export function Update(ctx){ctx.fields.frames++;ctx.Move(.8*ctx.Time.deltaTime,0,0);ctx.Set("validationFrames",ctx.fields.frames)}'}]};
const entities=[actor,
 {id:2,name:'Mur de collision',type:'mesh3d',assetId:'primitive-cube',meshShape:'cube',x:160,y:-96,w:32,h:160,depth3d:256,elevation3d:0,color:'#de7050',collision3d:true},
 {id:3,name:'Sol',type:'mesh3d',assetId:'primitive-cube',meshShape:'cube',x:-384,y:-384,w:768,h:8,depth3d:768,elevation3d:-.125,color:'#526f5d',collision3d:true},
 {id:4,name:'WarScript · rotation',type:'mesh3d',assetId:'primitive-cube',meshShape:'cube',x:-128,y:32,w:48,h:48,depth3d:48,elevation3d:.5,color:'#59b1eb',collision3d:false,warScripts:[{scriptId:'qa-spin',name:'Spin.wls',source:'Update(){Rotate(45 * Time.deltaTime);}',values:{}}]}];
const project={...freshGameProject(),id:'portable-validation',title:'Validation export GLB',physics3d:'builtin'};
const result=await exportGamePackage({entities,mode:'3d',project,camera:{x:0,y:0,zoom:1}},{fetcher:async url=>new Response(await readFile(url))});
await mkdir(dist,{recursive:true});
const bytes=new Uint8Array(await result.blob.arrayBuffer()),view=new DataView(bytes.buffer),decoder=new TextDecoder();let offset=0,count=0;
while(view.getUint32(offset,true)===0x04034b50){
 const size=view.getUint32(offset+18,true),length=view.getUint16(offset+26,true),extra=view.getUint16(offset+28,true),name=decoder.decode(bytes.subarray(offset+30,offset+30+length)),start=offset+30+length+extra;
 const target=path.join(dist,name);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes.subarray(start,start+size));offset=start+size;count++;
}
await mkdir(path.join(output,'.openai'),{recursive:true});
await writeFile(path.join(output,'.openai/hosting.json'),JSON.stringify({static:{directory:'dist'}}));
await writeFile(path.join(output,result.filename),bytes);
console.log(JSON.stringify({output,files:count,zipBytes:bytes.length,modelId:model.id}));
