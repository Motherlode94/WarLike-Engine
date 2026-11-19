import {state} from '../core/state.js';
import {toolsState} from '../core/view-options.js';
import {drawGizmo2d} from '../core/gizmos-2d.js';
import {selectionBox,rectFromPoints} from '../core/input.js';
export function drawOverlay2d(ctx,c){if(!state.playing)drawGizmo2d(ctx,state.entities.filter(o=>state.selected.includes(o.id)),toolsState.tool,c.zoom);
if(!state.playing&&selectionBox.active&&selectionBox.start&&selectionBox.end){
 const r=rectFromPoints(selectionBox.start,selectionBox.end);
 ctx.save();ctx.fillStyle='#64dccc2c';ctx.strokeStyle='#67e0cf';ctx.lineWidth=1.7/c.zoom;ctx.setLineDash([7/c.zoom,4/c.zoom]);ctx.fillRect(r.x,r.y,r.w,r.h);ctx.strokeRect(r.x,r.y,r.w,r.h);ctx.restore();
}}
