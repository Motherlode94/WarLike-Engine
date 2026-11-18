import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {glbVisualScale3d,glbVisualPlacement3d} from '../js/core/glb-visual-transform-3d.js';
import {projectedAxisDrag3d,projectedAxisScale3d,projectedAxisRotation3d,alignSceneObjects3d,snapSelected3d} from '../js/core/scene-editing-3d-tools.js';
import {sceneCamera3d,project3d} from '../js/core/viewport-3d.js';

test('GLB renderer dimensions match Inspector/collider dimensions on all axes',()=>{
 const bounds={x:0,y:1.5,z:0,w:4,h:3,d:2};
 const normal=[2,2,4],placement=glbVisualPlacement3d(bounds,1,normal);
 assert.deepEqual(placement.scale,[2,1.5,.5]);
 assert.deepEqual(placement.position,[0,2.5,0]);
 assert.deepEqual(placement.scale.map((s,i)=>s*normal[i]),[4,3,2]);
 assert.deepEqual(glbVisualScale3d({...bounds,w:8},normal),[4,1.5,.5]);
 assert.deepEqual(glbVisualScale3d({...bounds,h:6},normal),[2,3,.5]);
 assert.deepEqual(glbVisualScale3d({...bounds,d:8},normal),[2,1.5,2]);
});
test('rendering and GLB surface raycasting share identical visual transform',()=>{
 const source=readFileSync(new URL('../js/core/viewport-3d.js',import.meta.url),'utf8');
 assert.match(source,/glbVisualPlacement3d\(box,Number\(entity\.elevation3d\)/);
 assert.match(source,/pos\.map\(\(n,i\)=>n\*glbScale\[i\]\)/);
 assert.match(source,/glbVisualPlacement3d\(b,Number\(o\.elevation3d\)/);
 assert.match(source,/drawShape\(part\.mesh,position,scale,material/);
 assert.doesNotMatch(source,/scale=Math\.min\(b\.w\/size\[0\]/);
});
test('camera-oriented Gizmo translates in the visual direction of its handle',()=>{
 const pivot=[1,2,3],unit=[1,0,0];
 for(const yaw of [-2.4,-.68,.5,2.1]){
  const camera=sceneCamera3d([0,1,0],yaw,.6,25);
  const a=project3d(pivot,camera,1100,800);
  const b=project3d(pivot.map((n,i)=>n+unit[i]),camera,1100,800);
  assert.ok(a&&b);
  const dx=b.x-a.x,dy=b.y-a.y;
  assert.ok(projectedAxisDrag3d(a,b,dx,dy)>.95,'Drag handle outward must move positive in world');
  assert.ok(projectedAxisDrag3d(a,b,-dx,-dy)<-.95,'Dragging in opposite visual direction reverses world motion');
 }
});
test('short axes do not jump and multi-object align and grid snap remain editor-only',()=>{
 assert.equal(projectedAxisDrag3d({x:0,y:0},{x:.1,y:0},50,0),0);
 const objects=[{id:1,x:25,y:90,elevation3d:1},{id:2,x:115,y:170,elevation3d:2}];
 assert.equal(alignSceneObjects3d(objects,[1,2],{axis:'x'}),1);
 assert.equal(objects[1].x,25);
 assert.equal(snapSelected3d(objects,[2],{step:.5}),1);
 assert.equal(objects[1].x,32);
 assert.equal(objects[1].elevation3d,2);
});

test('scale Gizmo follows the displayed axis for camera orientations and reverses symmetrically',()=>{
 const pivot=[1,2,3];
 for(const axis of [[1,0,0],[0,1,0],[0,0,1]]){
  let verified=0;
  for(const yaw of [-2.3,-1.1,-.25,.75,1.8,2.75]){
   const camera=sceneCamera3d([0,1,0],yaw,.5,25);
   const origin=project3d(pivot,camera,1100,800);
   const end=project3d(pivot.map((v,i)=>v+axis[i]),camera,1100,800);
   if(!origin||!end||Math.hypot(end.x-origin.x,end.y-origin.y)<2)continue;
   const dx=end.x-origin.x,dy=end.y-origin.y;
   const outward=projectedAxisScale3d(origin,end,dx,dy);
   const inward=projectedAxisScale3d(origin,end,-dx,-dy);
   assert.ok(outward>1,`Outward drag must enlarge the selected axis: ${axis}, yaw=${yaw}`);
   assert.ok(inward<1,`Inward drag must shrink the selected axis: ${axis}, yaw=${yaw}`);
   assert.ok(Math.abs((outward+inward)-2)<1e-9);
   verified++;
  }
  assert.ok(verified>=2,'Axis needs several visible camera viewpoints');
 }
});
test('scale Gizmo stays stable with foreshortened and invalid handles',()=>{
 assert.equal(projectedAxisScale3d(null,null,140,20),1);
 assert.equal(projectedAxisScale3d({x:0,y:0},{x:.2,y:.2},140,20),1);
 assert.equal(projectedAxisScale3d({x:0,y:0},{x:100,y:0},0,20),1);
 assert.equal(projectedAxisScale3d({x:0,y:0},{x:100,y:0},2000,0),8);
 assert.equal(projectedAxisScale3d({x:0,y:0},{x:100,y:0},-2000,0),.1);
});

test('Rotate Gizmo responds to orbiting around the pivot, not arbitrary dx - dy',()=>{
 const pivot={x:100,y:100},start={x:150,y:100};
 assert.ok(Math.abs(projectedAxisRotation3d(pivot,start,{x:100,y:150})-90)<1e-8);
 assert.ok(Math.abs(projectedAxisRotation3d(pivot,start,{x:100,y:50})+90)<1e-8);
 assert.ok(Math.abs(projectedAxisRotation3d(pivot,start,{x:100,y:150},{directionSign:-1})+90)<1e-8);
 assert.equal(projectedAxisRotation3d(pivot,start,{x:200,y:100}),0,'radial drag must not rotate');
});
test('Rotate Gizmo rejects unstable pivot drags and takes shortest angular step',()=>{
 const pivot={x:100,y:100};
 assert.equal(projectedAxisRotation3d(pivot,{x:101,y:100},{x:100,y:160}),0);
 assert.equal(projectedAxisRotation3d(null,{x:50,y:100},{x:100,y:60}),0);
 const a={x:60,y:101},b={x:60,y:99};
 assert.ok(Math.abs(projectedAxisRotation3d(pivot,a,b))<5,'crossing the rear axis must not rotate 360 degrees');
});
