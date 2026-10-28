// Sprite characters stay upright; vertical travel retains their last horizontal facing.
export function faceMovement2d(actor,dx,dy){
 if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<.0001)return;
 if(Math.abs(dx)>.0001)actor.flipX=dx<0;
 actor.facing2d=Math.abs(dx)>=Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
}
// Models face +Z at zero rotation. Orbit yaw is measured from the camera's +Z side.
export const cameraFacingDegrees=yaw=>((180-Number(yaw)*180/Math.PI)%360+360)%360;
