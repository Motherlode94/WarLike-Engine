// The browser languages share one activation contract, including saved instances.
export class ScriptLifecycle {
 constructor(entry,invoke){this.entry=entry;this.invoke=invoke;this.awakened=entry.component.runtime.awakened===true||entry.component.runtime.started===true;this.active=false;this.destroyed=false}
 refresh(){
  if(this.destroyed)return;
  if(this.entry.attached&&!this.entry.attached()){this.dispose();return;}
  const e=this.entry;
  if(!this.awakened&&!e.failed&&e.entity.enabled!==false){this.awakened=true;e.component.runtime.awakened=true;this.invoke('Awake');}
  // A callback may disable itself. Set the transition first, then re-read it.
  for(let i=0;i<8;i++){
   const active=this.awakened&&!e.failed&&e.entity.enabled!==false&&e.component.enabled!==false;
   if(active===this.active)return;
   this.active=active;this.invoke(active?'OnEnable':'OnDisable',!active);
  }
  throw Error('OnEnable/OnDisable changent l’activation en boucle.');
 }
 start(){this.refresh();const e=this.entry;if(this.active&&!e.component.runtime.started){e.component.runtime.started=true;this.invoke('Start');this.refresh();}}
 run(method){this.start();if(this.active){this.invoke(method);this.refresh();}}
 dispose(){if(this.destroyed)return;this.destroyed=true;if(this.active){this.active=false;this.invoke('OnDisable',true);}if(this.awakened)this.invoke('OnDestroy',true);}
}
