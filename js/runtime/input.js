import {state} from '../core/state.js';
import {isTypingTarget} from '../core/editor-clipboard.js';
// Gameplay input only: no selection, authoring shortcuts, clipboard or history.
export function bindPlayerInput(){
 window.addEventListener('keydown',event=>{
  if(event.defaultPrevented||!state.playing||event.ctrlKey||event.metaKey||isTypingTarget(event.target)||isTypingTarget(document.activeElement))return;
  const key=event.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))event.preventDefault();
  state.keys.add(key);if(!event.repeat)state.keyPresses.add(key);
 });
 window.addEventListener('keyup',event=>state.keys.delete(event.key.toLowerCase()));
 window.addEventListener('blur',()=>{state.keys.clear();state.keyPresses.clear()});
}
