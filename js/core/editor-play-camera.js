// Keep editor navigation independent of the render frame rate. Play and Stop
// can both happen while RAF is suspended (hidden tab, breakpoint, slow frame).
export function createEditorPlayCamera(view,{enter=()=>{},leave=()=>{}}={}){
 let active=false,snapshot=null;
 return function sync(playing){
  if(!!playing===active)return;
  if(playing){
   snapshot={yaw:view.yaw,pitch:view.pitch,radius:view.radius,target:view.target.slice(),followPlayer:view.followPlayer};
   active=true;view.drag=null;enter();
  }else{
   active=false;
   try{leave()}finally{if(snapshot)Object.assign(view,snapshot);view.drag=null;snapshot=null}
  }
 };
}
