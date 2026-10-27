import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('WarLike exposes C# connection, scene sync and step controls',()=>{
 const html=read('index.html');
 const ids=['openCsharpRuntime','csharpRuntimePanel','csharpRuntimeConnect','csharpRuntimeSync','csharpRuntimeTick','csharpRuntimeSecond','csharpRuntimeTemplate'];
 for(const id of ids)assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(read('js/editor.js'),/initCSharpBridge\(\)/);
});
test('C# bridge uses loopback and executes scene through JSON API',()=>{
 const ui=read('js/ui/csharp-runtime.js');
 const native=read('csharp/WarLike.Bridge/Program.cs');
 assert.match(ui,/http:\/\/127\.0\.0\.1:8765/);
 assert.match(ui,/request\('\/scene','POST',currentScene\(\)\)/);
 assert.match(ui,/request\('\/tick','POST',\{dt\}\)/);
 assert.match(ui,/second\.addEventListener\('click',\(\)=>simulate\(1\)\)/);
 assert.match(native,/GameWorld\.FromWarLikeJson\(json\)/);
 assert.match(native,/world\.Tick\(dt\)/);
 assert.match(native,/rotation=a\.Rotation/);
});
test('C# scripts never execute through eval or dynamic browser compilation',()=>{
 const ui=read('js/ui/csharp-runtime.js');
 assert.doesNotMatch(ui,/\beval\s*\(/);
 assert.doesNotMatch(ui,/new Function\s*\(/);
 assert.match(ui,/state\.playing\)return/);
});

test('per-object C# script source is retained in the scene and exportable',()=>{
 const html=read('index.html');
 for(const id of ['csharpScriptName','csharpScriptSource','csharpScriptLoad','csharpScriptSave','csharpScriptExport'])assert.ok(html.includes('id="'+id+'"'));
 const source=read('js/ui/csharp-runtime.js');
 assert.match(source,/object\.csharpScript=\{name:safeName\(scriptName\.value\),source:scriptSource\.value\}/);
 assert.match(source,/record\('C# : enregistrer script/);
 assert.match(source,/anchor\.download=safeName\(scriptName\.value\)\+'\.cs'/);
});

test('Inspector offers C# script editing on the selected GameObject',()=>{
 const inspector=read('js/ui/inspector.js');
 assert.match(inspector,/openCSharp\.textContent='C# Script'/);
 assert.match(inspector,/document\.getElementById\('csharpScriptLoad'\)\?\.click\(\)/);
});

test('native VehicleController is connected from Inspector through scene JSON to .NET runtime',()=>{
 const inspector=read('js/ui/inspector.js');
 const engine=read('csharp/WarLike.Runtime/Engine.cs');
 const bridge=read('csharp/WarLike.Bridge/Program.cs');
 const vehicle=read('csharp/WarLike.Runtime/VehicleControllerComponent.cs');
 const ui=read('js/ui/csharp-runtime.js');
 const html=read('index.html');
 assert.match(inspector,/VehicleController:\{maxSpeed:310/);
 assert.match(engine,/case "VehicleController":/);
 assert.match(engine,/new VehicleControllerComponent/);
 assert.match(vehicle,/override void FixedUpdate\(float fixedDeltaTime\)/);
 assert.match(vehicle,/void SetInput\(float throttle, float steer, bool handbrake = false\)/);
 assert.match(bridge,/AbsolutePath=="\/vehicle\/input"/);
 assert.match(ui,/request\('\/vehicle\/input','POST'/);
 for(const id of ['csharpVehicleForward','csharpVehicleBrake','csharpVehicleLeft','csharpVehicleRight','csharpVehicleHandbrake','csharpVehicleNeutral'])assert.ok(html.includes('id="'+id+'"'));
});
