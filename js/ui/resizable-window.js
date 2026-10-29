const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function dockedPanelWidths({width,left=245,right=350,leftFloating=false,rightFloating=false,prefer='right'}){
 const room=Math.max(0,width-12-Math.min(300,width*.4)),minLeft=leftFloating?0:Math.min(160,room*.43),minRight=rightFloating?0:Math.min(190,room*.57);
 let l=leftFloating?0:clamp(left,minLeft,640),r=rightFloating?0:clamp(right,minRight,880);
 if(l+r>room){if(prefer==='left'){r=Math.max(minRight,room-l);l=Math.min(l,room-r)}else{l=Math.max(minLeft,room-r);r=Math.min(r,room-l)}}
 return {left:Math.round(l),right:Math.round(r)};
}
export function projectPanelRange(height,chrome=60){
 const room=Math.max(0,height-chrome),min=Math.min(120,Math.floor(room*.3));
 return {min,max:Math.max(min,Math.floor(room-Math.min(160,room*.4)))};
}
// All dock separators use logical CSS pixels, including at 75–140% UI scale.
export function bindPanelSplitter(handle,{axis='x',direction=1,getValue,setValue,getLimits,defaultValue,onStart=()=>{},onCancel=()=>{},onEnd=()=>{}}){
 let drag=null;
 const refresh=()=>{const {min,max}=getLimits();handle.setAttribute('aria-valuemin',Math.round(min));handle.setAttribute('aria-valuemax',Math.round(max));handle.setAttribute('aria-valuenow',Math.round(getValue()));handle.setAttribute('aria-valuetext',Math.round(getValue())+' pixels')};
 const update=value=>{const {min,max}=getLimits();setValue(clamp(value,min,max));refresh()};
 const stop=cancel=>{if(!drag)return;const previous=drag;drag=null;if(cancel){update(previous.value);onCancel()}handle.classList.remove('is-resizing');document.body.classList.remove('resizing-panels');if(handle.hasPointerCapture?.(previous.id))handle.releasePointerCapture(previous.id);onEnd();window.dispatchEvent(new Event('resize'))};
 handle.title='Glisser pour ajuster · Double-clic : taille par défaut · Flèches · Maj : pas large · Échap : annuler';
 handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;onStart();drag={id:e.pointerId,start:axis==='x'?e.clientX:e.clientY,value:getValue(),scale:parseFloat(getComputedStyle(document.body).zoom)||1};handle.setPointerCapture(e.pointerId);handle.classList.add('is-resizing');document.body.classList.add('resizing-panels');document.body.style.setProperty('--window-resize-cursor',axis==='x'?'ew-resize':'ns-resize');e.preventDefault()});
 handle.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId)update(drag.value+((axis==='x'?e.clientX:e.clientY)-drag.start)/drag.scale*direction)});
 handle.addEventListener('pointerup',()=>stop(false));handle.addEventListener('pointercancel',()=>stop(true));handle.addEventListener('lostpointercapture',()=>stop(false));
 window.addEventListener('keydown',e=>{if(drag&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();stop(true)}},true);
 handle.addEventListener('keydown',e=>{
  const negative=axis==='x'?'ArrowLeft':'ArrowUp',positive=axis==='x'?'ArrowRight':'ArrowDown';
  if(![negative,positive,'Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();
  const limits=getLimits();update(e.key==='Home'?limits.min:e.key==='End'?limits.max:getValue()+(e.key===positive?1:-1)*direction*(e.shiftKey?64:16));onEnd();window.dispatchEvent(new Event('resize'));
 });
 handle.addEventListener('dblclick',e=>{e.preventDefault();update(defaultValue);onEnd();window.dispatchEvent(new Event('resize'))});refresh();
 return {refresh,isDragging:()=>!!drag};
}
export function resizedWindowRect(rect,edge,dx,dy,{width,height,minWidth=260,minHeight=180}={}){
 const start={x:clamp(rect.x,0,Math.max(0,width-1)),y:clamp(rect.y,0,Math.max(0,height-1)),width:Math.min(rect.width,width),height:Math.min(rect.height,height)};
 const right=Math.min(width,start.x+start.width),bottom=Math.min(height,start.y+start.height);
 let left=start.x,top=start.y,endX=right,endY=bottom;
 if(edge.includes('w'))left=clamp(start.x+dx,0,Math.max(0,right-Math.min(minWidth,right)));
 if(edge.includes('e'))endX=clamp(right+dx,Math.min(width,left+minWidth),width);
 if(edge.includes('n'))top=clamp(start.y+dy,0,Math.max(0,bottom-Math.min(minHeight,bottom)));
 if(edge.includes('s'))endY=clamp(bottom+dy,Math.min(height,top+minHeight),height);
 return {x:left,y:top,width:endX-left,height:endY-top};
}
// A separate frame keeps the handles on the window border when its content
// scrolls. Coordinates account for the editor's 75–140% CSS zoom.
export function makeWindowResizable(panel,{enabled=()=>true,minWidth=320,minHeight=210,onResize=()=>{},onEnd=()=>{},storageKey,moveHandle,controls=true}={}){
 if(panel.dataset.edgeResizable)return;
 panel.dataset.edgeResizable='true';
 const frame=document.createElement('div');frame.className='window-resize-frame';frame.dataset.resizeWindow=panel.id||panel.className;frame.hidden=true;document.body.append(frame);
 let drag=null,wasEnabled=false,saved=null,scheduled=false,restoreRect=null,maximized=false;
 try{saved=storageKey&&JSON.parse(localStorage.getItem(storageKey)||'null')}catch{}
 const visible=()=>enabled()&&!panel.hidden&&panel.isConnected&&panel.getClientRects().length>0&&!document.body.classList.contains('hub-open');
 const scale=()=>panel.getBoundingClientRect().width/(panel.offsetWidth||1)||parseFloat(getComputedStyle(document.body).zoom)||1;
 const apply=rect=>{
  const factor=scale();
  panel.style.setProperty('min-width',Math.min(minWidth,rect.width/factor)+'px','important');
  panel.style.setProperty('min-height',Math.min(minHeight,rect.height/factor)+'px','important');
  panel.style.setProperty('max-width','none','important');panel.style.setProperty('max-height','none','important');
  for(const [key,value] of Object.entries({left:rect.x/factor,top:rect.y/factor,width:rect.width/factor,height:rect.height/factor}))panel.style.setProperty(key,value+'px','important');
  panel.style.setProperty('right','auto','important');panel.style.setProperty('bottom','auto','important');
  if(!maximized)onResize({x:rect.x/factor,y:rect.y/factor,width:rect.width/factor,height:rect.height/factor});sync();
 };
 const save=()=>{const r=maximized?restoreRect:panel.getBoundingClientRect();saved={x:r.x/innerWidth,y:r.y/innerHeight,width:r.width/innerWidth,height:r.height/innerHeight};if(storageKey)try{localStorage.setItem(storageKey,JSON.stringify(saved))}catch{}onEnd();window.dispatchEvent(new Event('resize'))};
 const maximum=()=>{const top=Math.max(8,(document.querySelector('.studio-menubar')?.getBoundingClientRect().bottom||0)+8),bottom=(document.querySelector('.warlike-status-footer')?.getBoundingClientRect().height||0)+8;return {x:8,y:top,width:Math.max(1,innerWidth-16),height:Math.max(1,innerHeight-top-bottom)}};
 const header=moveHandle||panel.querySelector('.dock-title,.blueprint-header,.blueprint-window-header,header');
 let sizeButton=null;
 const toggleMaximize=()=>{
  if(!visible())return false;
  maximized=!maximized;panel.toggleAttribute('data-window-maximized',maximized);
  if(maximized&&!panel.contains(document.activeElement)){panel.tabIndex=-1;panel.focus({preventScroll:true})}
  if(maximized){const r=panel.getBoundingClientRect();restoreRect={x:r.x,y:r.y,width:r.width,height:r.height};apply(maximum())}else apply(restoreRect);
  if(sizeButton){sizeButton.textContent=maximized?'❐':'⛶';sizeButton.setAttribute('aria-label',maximized?'Restaurer la taille de la fenêtre':'Agrandir la fenêtre');sizeButton.title=maximized?'Restaurer la taille précédente · Échap':'Agrandir la fenêtre';sizeButton.setAttribute('aria-pressed',String(maximized))}
  save();return maximized;
 };
 if(controls&&header){sizeButton=document.createElement('button');sizeButton.type='button';sizeButton.className='window-size-button';sizeButton.textContent='⛶';sizeButton.setAttribute('aria-label','Agrandir la fenêtre');sizeButton.title='Agrandir la fenêtre';sizeButton.setAttribute('aria-pressed','false');sizeButton.onclick=e=>{e.stopPropagation();toggleMaximize()};const close=header.querySelector('button:last-child');if(close?.parentElement===header)header.insertBefore(sizeButton,close);else header.append(sizeButton)}
 function sync(){
  const active=visible();frame.hidden=!active;
  if(sizeButton)sizeButton.hidden=!active;
  if(!active){wasEnabled=false;if(maximized){maximized=false;panel.removeAttribute('data-window-maximized');if(enabled())apply(restoreRect);if(sizeButton){sizeButton.textContent='⛶';sizeButton.setAttribute('aria-label','Agrandir la fenêtre');sizeButton.setAttribute('aria-pressed','false')}}return}
  if(maximized){frame.hidden=true;const r=panel.getBoundingClientRect(),m=maximum();if(Object.keys(m).some(k=>Math.abs(r[k]-m[k])>.5))apply(m);return}
  if(!wasEnabled&&saved&&['x','y','width','height'].every(k=>Number.isFinite(saved[k]))){wasEnabled=true;apply({x:clamp(saved.x*innerWidth,0,Math.max(0,innerWidth-Math.min(minWidth,innerWidth))),y:clamp(saved.y*innerHeight,0,Math.max(0,innerHeight-Math.min(minHeight,innerHeight))),width:clamp(saved.width*innerWidth,Math.min(minWidth,innerWidth),innerWidth),height:clamp(saved.height*innerHeight,Math.min(minHeight,innerHeight),innerHeight)});return}
  wasEnabled=true;const rect=panel.getBoundingClientRect(),zoom=Number.parseFloat(getComputedStyle(document.body).zoom)||1;
  if(!drag&&(rect.right>innerWidth+1||rect.bottom>innerHeight+1||rect.left<0||rect.top<0)){
   const width=Math.min(rect.width,innerWidth),height=Math.min(rect.height,innerHeight);
   apply({x:clamp(rect.x,0,innerWidth-width),y:clamp(rect.y,0,innerHeight-height),width,height});return;
  }
  Object.assign(frame.style,{zoom:String(1/zoom),left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',zIndex:String((Number.parseInt(getComputedStyle(panel).zIndex)||100)+1)});
 }
 const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;sync()})}};
 const names={n:'haut',s:'bas',e:'droit',w:'gauche',ne:'supérieur droit',nw:'supérieur gauche',se:'inférieur droit',sw:'inférieur gauche'};
 const resize=(edge,dx,dy,start=panel.getBoundingClientRect())=>{const factor=scale();apply(resizedWindowRect({x:start.x,y:start.y,width:start.width,height:start.height},edge,dx,dy,{width:innerWidth,height:innerHeight,minWidth:minWidth*factor,minHeight:minHeight*factor}))};
 const stopResize=cancel=>{if(!drag)return;const previous=drag;drag=null;if(cancel)apply(previous.rect);document.body.classList.remove('window-edge-resizing');panel.classList.remove('window-is-resizing');if(previous.handle.hasPointerCapture(previous.pointer))previous.handle.releasePointerCapture(previous.pointer);save()};
 window.addEventListener('keydown',e=>{if(drag&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();stopResize(true)}},true);
 for(const edge of ['n','s','e','w','ne','nw','se','sw']){
  const handle=document.createElement('span');handle.className='window-resize-handle resize-'+edge;handle.dataset.resizeEdge=edge;handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-label','Redimensionner le bord '+names[edge]);handle.setAttribute('aria-orientation',edge==='e'||edge==='w'?'vertical':'horizontal');handle.title='Glisser · Double-clic : agrandir / restaurer · Flèches · Échap : annuler';frame.append(handle);
  handle.addEventListener('pointerdown',e=>{if(e.button!==0||!visible())return;e.preventDefault();e.stopPropagation();drag={edge,x:e.clientX,y:e.clientY,rect:panel.getBoundingClientRect(),pointer:e.pointerId,handle};handle.setPointerCapture(e.pointerId);panel.classList.add('window-is-resizing');document.body.classList.add('window-edge-resizing');document.body.style.setProperty('--window-resize-cursor',getComputedStyle(handle).cursor)});
  handle.addEventListener('pointermove',e=>{if(drag&&drag.pointer===e.pointerId)resize(edge,e.clientX-drag.x,e.clientY-drag.y,drag.rect)});
  handle.addEventListener('pointerup',()=>stopResize(false));handle.addEventListener('pointercancel',()=>stopResize(true));handle.addEventListener('lostpointercapture',()=>stopResize(false));
  handle.addEventListener('dblclick',e=>{e.preventDefault();toggleMaximize()});
  handle.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();resize(edge,(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0)*(e.shiftKey?40:12),(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0)*(e.shiftKey?40:12));save()});
 }
 if(moveHandle){
  let moving=null;moveHandle.style.cursor='move';
  moveHandle.addEventListener('pointerdown',e=>{if(e.button!==0||!visible()||e.target.closest('button,input,select,a,label'))return;moving={x:e.clientX,y:e.clientY,rect:panel.getBoundingClientRect(),id:e.pointerId};moveHandle.setPointerCapture(e.pointerId);e.preventDefault()});
  moveHandle.addEventListener('pointermove',e=>{if(!moving||moving.id!==e.pointerId)return;const {rect,x,y}=moving;apply({x:clamp(rect.x+e.clientX-x,0,Math.max(0,innerWidth-rect.width)),y:clamp(rect.y+e.clientY-y,0,Math.max(0,innerHeight-rect.height)),width:rect.width,height:rect.height})});
  const stop=()=>{if(moving){moving=null;save()}};moveHandle.addEventListener('pointerup',stop);moveHandle.addEventListener('pointercancel',stop);moveHandle.addEventListener('lostpointercapture',stop);
  moveHandle.addEventListener('dblclick',e=>{if(!e.target.closest('button,input,select,a,label'))toggleMaximize()});
 }
 window.addEventListener('keydown',e=>{if(maximized&&e.key==='Escape'&&(panel.contains(document.activeElement)||frame.contains(document.activeElement))){e.preventDefault();e.stopImmediatePropagation();toggleMaximize()}},true);
 new ResizeObserver(schedule).observe(panel);new MutationObserver(schedule).observe(panel,{attributes:true,attributeFilter:['class','style','hidden']});
 document.addEventListener('scroll',schedule,true);window.addEventListener('resize',schedule);document.addEventListener('warlike:workspace',schedule);document.addEventListener('warlike:project',schedule);sync();
 return {refresh:schedule,toggleMaximize,reset(){saved=null;if(maximized){maximized=false;panel.removeAttribute('data-window-maximized')}if(storageKey)try{localStorage.removeItem(storageKey)}catch{}wasEnabled=false;schedule()}};
}
