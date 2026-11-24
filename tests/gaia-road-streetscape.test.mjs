import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeEditableTerrain} from '../js/core/gaia-terrain-sculpt.js';
import {createRoadSpline,roadSplineEntity} from '../js/core/gaia-road-spline.js';
import {findGaiaRoadJunctions} from '../js/core/gaia-road-junctions.js';
import {roadStreetscapeBuffers3d} from '../js/core/gaia-road-streetscape.js';
import {loadRapier3d,createRapierScene,disposeRapierScene} from '../js/core/rapier-physics-3d.js';

function fixture(){
 const t={id:1,type:'terrain3d',name:'Gaia',x:-3200,y:-3200,w:6400,h:640,depth3d:6400,enabled:true,collision3d:true,visible:true};
 initializeEditableTerrain(t,{resolution:33,maxHeight:8});
 const a=roadSplineEntity(2,createRoadSpline([{x:-22,z:0},{x:22,z:0}],{width:6,elevationOffset:.08}));
 const b=roadSplineEntity(3,createRoadSpline([{x:0,z:-22},{x:0,z:22}],{width:6,elevationOffset:.08}));
 return {t,a,b};
}
test('WB 2.4 builds sidewalks and raised curbs along both sides without changing Gaia',()=>{
 const {t,a}=fixture(),before=structuredClone([t,a]);
 const street=roadStreetscapeBuffers3d(a.roadSpline,[t]);
 assert(street.sidewalks.triangleCount>0);
 assert(street.curbs.triangleCount>0);
 assert.equal(street.crosswalks.triangleCount,0,'zebra bars require an intersection');
 assert.equal(street.sidewalks.indices.length,street.sidewalks.triangleCount*3);
 assert.equal(street.sidewalks.renderVertices.length,street.sidewalks.positions.length*2);
 assert.deepEqual([t,a],before);
 for(let i=0;i<street.sidewalks.renderVertices.length;i+=6)assert(street.sidewalks.renderVertices[i+4]>.5,'pavements must have upward-facing normals');
});
test('WB 2.4 places painted crossings before both sides of a physical junction',()=>{
 const {t,a,b}=fixture(),j=findGaiaRoadJunctions([a,b]);
 assert.equal(j.length,1);
 const street=roadStreetscapeBuffers3d(a.roadSpline,[t],j);
 assert.equal(street.crosswalks.triangleCount,16,'four stripes on each approach, two triangles each');
 assert(street.crosswalks.positions.some(v=>Math.abs(v)>3),'zebra bars must not cover the central junction polygon');
 for(let i=0;i<street.crosswalks.renderVertices.length;i+=6)assert(street.crosswalks.renderVertices[i+4]>.5,'markings must face up');
});
test('streetscape is stable after saving and reloading the authored road and Gaia',()=>{
 const {t,a,b}=fixture(),junctions=findGaiaRoadJunctions([a,b]);
 const expected=roadStreetscapeBuffers3d(a.roadSpline,[t],junctions);
 const saved=JSON.parse(JSON.stringify({t,a,junctions}));
 const actual=roadStreetscapeBuffers3d(saved.a.roadSpline,[saved.t],saved.junctions);
 for(const key of ['sidewalks','curbs','crosswalks']){
  assert.deepEqual([...actual[key].positions],[...expected[key].positions]);
  assert.deepEqual([...actual[key].indices],[...expected[key].indices]);
 }
});
test('invalid road or unsafe sidewalk dimensions fail explicitly',()=>{
 const {t,a}=fixture();
 assert.throws(()=>roadStreetscapeBuffers3d({schema:'bad'},[t]),/Invalid Gaia/);
 assert.throws(()=>roadStreetscapeBuffers3d(a.roadSpline,[t],[],{curbHeight:1}),/geometry settings/);
});
test('Rapier builds physical pavement and curb colliders attached to the original road rigid body',async()=>{
 const api=await loadRapier3d();assert(api);
 const {t,a}=fixture(),scene=createRapierScene(api,[t,a]);
 try{
  assert.deepEqual(scene.errors,[]);
  const actor=scene.actors.get(a.id);
  assert.equal(actor.streetColliders.length,2);
  const ray=new api.Ray({x:0,y:10,z:4.2},{x:0,y:-1,z:0});
  const sidewalk=actor.streetColliders[0].castRay(ray,20,true);
  assert(sidewalk!==null,'sidewalk must receive physical ray contact');
  assert(actor.body.translation().x===0&&actor.body.translation().z===0);
 }finally{disposeRapierScene(scene)}
});
