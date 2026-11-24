import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoadSpline,roadSplineEntity} from '../js/core/gaia-road-spline.js';
import {gaiaSidewalkPath,planGaiaPedestrianSidewalkStep} from '../js/core/gaia-pedestrian-sidewalk-ai.js';
const road=roadSplineEntity(1,createRoadSpline([{x:0,z:-30},{x:0,z:30}],{width:6}));
test('WB 2.8b.2 derives distinct sidewalks and preserves authored road',()=>{
 const before=structuredClone(road),left=gaiaSidewalkPath(road.roadSpline,{side:'left'}),right=gaiaSidewalkPath(road.roadSpline);
 assert(left[0].x>0&&right[0].x<0);
 assert.deepEqual(road,before);
});
test('WB 2.8b.2 plans bounded steps and never teleports a character',()=>{
 const path=gaiaSidewalkPath(road.roadSpline),point=path[5],config={enabled:true,roadId:1,side:'right',speedMps:1.3,direction:1};
 const step=planGaiaPedestrianSidewalkStep([road],config,point,.02);
 assert.equal(step.status,'walking');
 assert(Math.hypot(step.dx,step.dz)<=1.3*.02+1e-8);
 assert.deepEqual(config,{enabled:true,roadId:1,side:'right',speedMps:1.3,direction:1});
 const saved=JSON.parse(JSON.stringify([road]));
 assert.deepEqual(planGaiaPedestrianSidewalkStep(saved,config,point,.02),step);
});
test('WB 2.8b.2 fail-safe for missing road or pedestrian outside sidewalk',()=>{
 const config={enabled:true,roadId:1};
 assert.equal(planGaiaPedestrianSidewalkStep([],config,{x:0,z:0},.02).status,'off-sidewalk');
 assert.equal(planGaiaPedestrianSidewalkStep([road],config,{x:200,z:0},.02).status,'off-sidewalk');
 assert.equal(planGaiaPedestrianSidewalkStep([road],{enabled:false},{x:0,z:0},.02).status,'disabled');
});
