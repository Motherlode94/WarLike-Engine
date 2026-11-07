// Affine bridge between canonical (column-major) scene matrices and the
// existing WebGL renderer. Legacy geometry already has a world-space origin;
// the correction converts that reference pose into its exact affine pose.
import {composeTransformMatrix,invertMatrix4,multiplyMatrix4} from './scene-graph-v2.js';
const finiteMatrix=m=>Array.isArray(m)&&m.length===16&&m.every(Number.isFinite);
export const hasAffinePose=o=>finiteMatrix(o?.worldMatrix3d)&&finiteMatrix(o?.matrixReference3d);
export function affineCorrection3d(o){
 if(!hasAffinePose(o))return null;
 return multiplyMatrix4(o.worldMatrix3d,invertMatrix4(o.matrixReference3d));
}
export function normalMatrix3d(m){
 if(!finiteMatrix(m))throw Error('Matrice affine invalide');
 const inv=invertMatrix4(m);
 // Column-major inverse-transpose of linear 3x3.
 return [inv[0],inv[4],inv[8],inv[1],inv[5],inv[9],inv[2],inv[6],inv[10]];
}
export function legacyReferenceMatrix3d(o){
 return composeTransformMatrix([
  (Number(o.x)||0)/64,Number(o.elevation3d)||0,(Number(o.y)||0)/64
 ],[Number(o.rotationX3d)||0,-(Number(o.rotation)||0),Number(o.rotationZ3d)||0],[1,1,1]);
}
// Moving the editor gizmo must not discard authored affine shear.
// This updates the world matrix with an exact delta in the editor's world frame.
export function moveAffinePose3d(o,delta){
 if(!hasAffinePose(o))return false;
 if(!Array.isArray(delta)||delta.length!==3||!delta.every(Number.isFinite))throw Error('Déplacement 3D invalide');
 const world=[...o.worldMatrix3d];for(let axis=0;axis<3;axis++)world[12+axis]+=delta[axis];
 o.worldMatrix3d=world;return true;
}
// Kinematic/dynamic physics cannot represent shear in rigid body orientations.
// Keep the visual affine matrix intact, moving its origin along with the body.
export function followPhysicsPosition3d(o,newPosition,oldPosition){
 if(!hasAffinePose(o))return false;
 if(![newPosition,oldPosition].every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)))throw Error('Position physique invalide');
 return moveAffinePose3d(o,newPosition.map((n,i)=>n-oldPosition[i]));
}
