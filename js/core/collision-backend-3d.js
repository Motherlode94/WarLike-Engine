// Runtime-only ownership. Never serialized into projects or used by 2D scenes.
// Keeping this indirection separate avoids a Rapier/collision module cycle.
let backend=null;
export const collisionBackend3d=()=>backend;
export function installCollisionBackend3d(next){backend=next;}
export function releaseCollisionBackend3d(owner){if(backend?.owner===owner)backend=null;}
