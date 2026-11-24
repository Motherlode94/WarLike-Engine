import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoadSpline,roadSplineEntity} from '../js/core/gaia-road-spline.js';
import {gaiaSidewalkPath,planGaiaPedestrianSidewalkStep,planGaiaPedestrianCrossingStep} from '../js/core/gaia-pedestrian-sidewalk-ai.js';
import {findGaiaRoadJunctions,roadJunctionEntity} from '../js/core/gaia-road-junctions.js';
import {buildGaiaPedestrianCrosswalks} from '../js/core/gaia-pedestrian-crosswalks.js';
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

test('WB 2.8b.3 pedestrian waits for vehicle red then crosses by bounded Rapier intent',()=>{
 const second=roadSplineEntity(2,createRoadSpline([{x:-30,z:0},{x:30,z:0}],{width:6}));
 const j=roadJunctionEntity(3,findGaiaRoadJunctions([road,second])[0]),entities=[road,second,j];
 const crossing=buildGaiaPedestrianCrosswalks(entities).find(c=>c.roadId===1&&c.center.z<0);
 assert(crossing);
 const bank={x:crossing.center.x+crossing.normal.x*(crossing.halfWidth+.55),
   z:crossing.center.z+crossing.normal.z*(crossing.halfWidth+.55)};
 const config={enabled:true,crosswalkId:crossing.id,speedMps:1.2};
 const waiting=planGaiaPedestrianCrossingStep(entities,config,bank,.02,{seconds:3});
 assert.equal(waiting.status,'waiting-for-crossing');
 assert.equal(waiting.dx,0);assert.equal(waiting.dz,0);
 const started=planGaiaPedestrianCrossingStep(entities,config,bank,.02,{seconds:20});
 assert.equal(started.status,'crossing');
 assert.equal(started.stage,'crossing');
 assert(Math.hypot(started.dx,started.dz)<=1.2*.02+1e-8);
 const halfway={x:crossing.center.x,z:crossing.center.z};
 const committed=planGaiaPedestrianCrossingStep(entities,{...config,crossingStartSide:started.crossingStartSide},
   halfway,.02,{stage:'crossing',seconds:3});
 assert.equal(committed.status,'crossing','never freeze on the roadway when lights change');
 const exit={x:crossing.center.x-crossing.normal.x*started.crossingStartSide*(crossing.halfWidth+.55),
  z:crossing.center.z-crossing.normal.z*started.crossingStartSide*(crossing.halfWidth+.55)};
 const done=planGaiaPedestrianCrossingStep(entities,{...config,crossingStartSide:started.crossingStartSide},
  exit,.02,{stage:'crossing',seconds:3});
 assert.equal(done.stage,'completed');
 assert.equal(planGaiaPedestrianCrossingStep(entities,config,exit,.02,{stage:'completed',seconds:20}),null);
 assert.deepEqual(entities,JSON.parse(JSON.stringify(entities)));
});
