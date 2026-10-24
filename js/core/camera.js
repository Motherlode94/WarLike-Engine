import clamp from '../../src/math/clamp.js';
import {state} from './state.js';
export const toWorld=p=>({x:(p.x-state.camera.x)/state.camera.zoom,y:(p.y-state.camera.y)/state.camera.zoom});
export const toScreen=p=>({x:p.x*state.camera.zoom+state.camera.x,y:p.y*state.camera.zoom+state.camera.y});
export function zoomAt(f,p){const before=toWorld(p),c=state.camera;c.zoom=clamp(c.zoom*f,.2,5);c.x=p.x-before.x*c.zoom;c.y=p.y-before.y*c.zoom;document.querySelector('#zoomLabel').textContent=Math.round(c.zoom*100)+'%'}
export function resetCamera(){state.camera={x:0,y:0,zoom:1};document.querySelector('#zoomLabel').textContent='100%'}
export function setCamera(data){if(data&&Number.isFinite(data.zoom)&&data.zoom>=.2&&data.zoom<=5){state.camera={x:Number(data.x)||0,y:Number(data.y)||0,zoom:data.zoom};document.querySelector('#zoomLabel').textContent=Math.round(data.zoom*100)+'%'}}
