import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTar,packageAssets} from '../js/core/unitypackage.js';
const encoder=new TextEncoder();
function tarFile(name,data){
 const header=new Uint8Array(512),put=(offset,size,value)=>header.set(encoder.encode(value).slice(0,size),offset);
 put(0,100,name);put(100,8,'0000644\0');put(124,12,data.length.toString(8).padStart(11,'0')+'\0');header[156]=48;
 header.set(encoder.encode('        '),148);
 const sum=header.reduce((a,b)=>a+b,0);put(148,8,sum.toString(8).padStart(6,'0')+'\0 ');
 return [header,data,new Uint8Array((512-data.length%512)%512)];
}
test('UnityPackage parser extracts GUID/pathname and asset safely',()=>{
 const entries=[...tarFile('abc12345/pathname',encoder.encode('Assets/Textures/wood.png\n')),...tarFile('abc12345/asset',new Uint8Array([137,80,78,71]))];
 const bytes=new Uint8Array(entries.reduce((n,a)=>n+a.length,0));let at=0;for(const b of entries){bytes.set(b,at);at+=b.length}
 const assets=packageAssets(parseTar(bytes));
 assert.equal(assets.length,1);assert.equal(assets[0].kind,'image');assert.equal(assets[0].path,'Assets/Textures/wood.png');
});
test('UnityPackage rejects traversal and distinguishes unsupported Unity assets',()=>{
 const map=new Map([['abcdef12/pathname',encoder.encode('../private/file.cs')],['abcdef12/asset',new Uint8Array([1])],['abcdeff0/pathname',encoder.encode('Assets/Level.prefab')],['abcdeff0/asset',new Uint8Array([2])]]);
 const assets=packageAssets(map);
 assert.equal(assets.length,1);assert.equal(assets[0].kind,'unsupported');
});
