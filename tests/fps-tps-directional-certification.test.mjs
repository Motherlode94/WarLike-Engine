import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cameraFacingDegrees } from '../js/core/character-facing.js';
import { facingVector3d, targetInFacingArc3d } from '../js/core/look-direction.js';
import { cameraRelativeWalk3d } from '../js/core/gameplay-components.js';
import { facingVector2d, aimActor2d } from '../js/core/look-direction.js';

const actor = (x=0,y=0) => ({ id:1, x, y, w:32, h:32, depth3d:32, rotation:0 });
const at = (angle, distance=120) => ({ x:Math.cos(angle)*distance, y:Math.sin(angle)*distance, w:32, h:32, depth3d:32 });
const near = (actual,expected,tolerance=1e-8) => assert.ok(Math.abs(actual-expected)<tolerance, `${actual} != ${expected}`);
const source = (file) => readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('FPS/TPS camera controls character direction at every cardinal yaw', () => {
  const p=actor();
  // The actor must face the same ground direction as its camera;
  // neither third-person orbit position nor a click selects its facing.
  for (const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
    p.rotation=cameraFacingDegrees(yaw);
    const facing=facingVector3d(p);
    const walking=cameraRelativeWalk3d(0,1,yaw);
    near(facing.x,walking.x);
    near(facing.y,walking.z);
    const target=at(Math.atan2(facing.y,facing.x));
    const behind=at(Math.atan2(-facing.y,-facing.x));
    assert.equal(targetInFacingArc3d(p,target,1.2),true);
    assert.equal(targetInFacingArc3d(p,behind,1.2),false);
  }
});

test('moving diagonally is normalized, camera-relative and reversible', () => {
  for (const yaw of [0,.7,Math.PI/2,Math.PI]) {
    const diagonal=cameraRelativeWalk3d(1,1,yaw);
    near(Math.hypot(diagonal.x,diagonal.z),1);
    const reverse=cameraRelativeWalk3d(-1,-1,yaw);
    near(diagonal.x+reverse.x,0);
    near(diagonal.z+reverse.z,0);
    const idle=cameraRelativeWalk3d(0,0,yaw);
    assert.deepEqual(idle,{x:0,z:0,length:0});
  }
});

test('3D directional attack rejects sideways or backward targets at the boundary', () => {
  const p=actor();p.rotation=cameraFacingDegrees(0);
  const front=at(-Math.PI/2),back=at(Math.PI/2);
  const outside=at(-Math.PI/2+0.61);
  const inside=at(-Math.PI/2+0.59);
  assert.equal(targetInFacingArc3d(p,front,1.2),true);
  assert.equal(targetInFacingArc3d(p,back,1.2),false);
  assert.equal(targetInFacingArc3d(p,inside,1.2),true);
  assert.equal(targetInFacingArc3d(p,outside,1.2),false);
});

test('2D aiming respects pointer target and retains last direction without pointer', () => {
  const p=actor();
  p.facing2d='left';
  assert.deepEqual(facingVector2d(p),{x:-1,y:0});
  assert.deepEqual(aimActor2d(p,null),{x:-1,y:0});
  const right={x:180,y:16};
  assert.ok(aimActor2d(p,right).x>0);
  assert.equal(p.flipX,false);
  assert.ok(aimActor2d(p,null).x>0);
});

test('editor and exported gameplay share the same camera, facing and targeting modules', () => {
  const runtime=source('js/core/player-modules.js');
  const manifest=source('runtime-files.json');
  for(const name of ['look-direction.js','character-facing.js','gameplay-components.js']) {
    assert.ok(runtime.includes(name),`Missing module in player graph: ${name}`);
    assert.ok(manifest.includes(name),`Missing module in Web export: ${name}`);
  }
});

test('mouse movement drives view without click and clicks remain aim/fire actions', () => {
  const view=source('js/core/viewport-3d.js');
  assert.match(view,/canvas\.addEventListener\('pointermove',e=>\{if\(document\.pointerLockElement!==canvas\)applyMouseLook\(e\)/);
  assert.match(view,/view3d\.yaw-=dx\*sensitivity/);
  assert.match(view,/if\(isFps\(\)\)\{if\(e\.button===0\)\{e\.preventDefault\(\);fpsFiring=true;shootFps\(\)/);
  assert.match(view,/else if\(e\.button===2\)\{e\.preventDefault\(\);fpsAiming=true/);
});
