// Shared gameplay-only mouse snapshot. Unity-style button indices.
const held=new Set(),pressed=new Set();
const index=button=>button===0?0:button===2?1:button===1?2:-1;
export function playMouseDown(button){const i=index(button);if(i<0)return;if(!held.has(i))pressed.add(i);held.add(i)}
export function playMouseUp(button){held.delete(index(button))}
export function clearPlayMouse(){held.clear();pressed.clear()}
export function consumePlayMousePresses(){pressed.clear()}
export function scriptMouseSnapshot(blocked=false){if(blocked){clearPlayMouse();return {mouseHeld:new Set(),mousePressed:new Set()}}return {mouseHeld:new Set(held),mousePressed:new Set(pressed)}}
