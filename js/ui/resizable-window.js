const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
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
export function makeWindowResizable(panel,{enabled=()=>true,minWidth=320,minHeight=210,onResize=()=>{},onEnd=()=>{},storageKey,moveHandle}={}){
 if(panel.dataset.edgeResizable)return;
 panel.dataset.edgeResizable='true';
 const frame=document.createElement('div');frame.className='window-resize-frame';frame.dataset.resizeWindow=panel.id||panel.className;frame.hidden=true;document.body.append(frame);
 let drag=null,wasEnabled=false,saved=null,scheduled=false;
 try{saved=storageKey&&JSON.parse(localStorage.getItem(storageKey)||'null')}catch{}
 const visible=()=>enabled()&&!panel.hidden&&panel.isConnected&&panel.getClientRects().length>0&&!document.body.classList.contains('hub-open');
 const scale=()=>panel.getBoundingClientRect().width/(panel.offsetWidth||1)||1;
 const apply=rect=>{
  const factor=scale();
  panel.style.setProperty('min-width','min('+minWidth+'px, calc(100vw / var(--editor-ui-scale,1)))','important');
  panel.style.setProperty('min-height','min('+minHeight+'px, calc(100dvh / var(--editor-ui-scale,1)))','important');
  for(const [key,value] of Object.entries({left:rect.x/factor,top:rect.y/factor,width:rect.width/factor,height:rect.height/factor}))panel.style.setProperty(key,value+'px','important');
  panel.style.setProperty('right','auto','important');panel.style.setProperty('bottom','auto','important');
  onResize({x:rect.x/factor,y:rect.y/factor,width:rect.width/factor,height:rect.height/factor});sync();
 };
 const save=()=>{const r=panel.getBoundingClientRect();saved={x:r.x/innerWidth,y:r.y/innerHeight,width:r.width/innerWidth,height:r.height/innerHeight};if(storageKey)try{localStorage.setItem(storageKey,JSON.stringify(saved))}catch{}onEnd();window.dispatchEvent(new Event('resize'))};
 function sync(){
  const active=visible();frame.hidden=!active;
  if(!active){wasEnabled=false;return}
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
 for(const edge of ['n','s','e','w','ne','nw','se','sw']){
  const handle=document.createElement('span');handle.className='window-resize-handle resize-'+edge;handle.dataset.resizeEdge=edge;handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-label','Redimensionner le bord '+names[edge]);handle.setAttribute('aria-orientation',edge==='e'||edge==='w'?'vertical':'horizontal');handle.title='Glisser pour redimensionner · Flèches au clavier';frame.append(handle);
  handle.addEventListener('pointerdown',e=>{if(e.button!==0||!visible())return;e.preventDefault();e.stopPropagation();drag={edge,x:e.clientX,y:e.clientY,rect:panel.getBoundingClientRect(),pointer:e.pointerId};handle.setPointerCapture(e.pointerId);document.body.classList.add('window-edge-resizing');document.body.style.setProperty('--window-resize-cursor',getComputedStyle(handle).cursor)});
  handle.addEventListener('pointermove',e=>{if(drag&&drag.pointer===e.pointerId)resize(edge,e.clientX-drag.x,e.clientY-drag.y,drag.rect)});
  const stop=()=>{if(!drag)return;drag=null;document.body.classList.remove('window-edge-resizing');save()};handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);handle.addEventListener('lostpointercapture',stop);
  handle.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();resize(edge,(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0)*(e.shiftKey?40:12),(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0)*(e.shiftKey?40:12));save()});
 }
 if(moveHandle){
  let moving=null;moveHandle.style.cursor='move';
  moveHandle.addEventListener('pointerdown',e=>{if(e.button!==0||!visible()||e.target.closest('button,input,select,a,label'))return;moving={x:e.clientX,y:e.clientY,rect:panel.getBoundingClientRect(),id:e.pointerId};moveHandle.setPointerCapture(e.pointerId);e.preventDefault()});
  moveHandle.addEventListener('pointermove',e=>{if(!moving||moving.id!==e.pointerId)return;const {rect,x,y}=moving;apply({x:clamp(rect.x+e.clientX-x,0,Math.max(0,innerWidth-rect.width)),y:clamp(rect.y+e.clientY-y,0,Math.max(0,innerHeight-rect.height)),width:rect.width,height:rect.height})});
  const stop=()=>{if(moving){moving=null;save()}};moveHandle.addEventListener('pointerup',stop);moveHandle.addEventListener('pointercancel',stop);moveHandle.addEventListener('lostpointercapture',stop);
 }
 new ResizeObserver(schedule).observe(panel);new MutationObserver(schedule).observe(panel,{attributes:true,attributeFilter:['class','style','hidden']});
 document.addEventListener('scroll',schedule,true);window.addEventListener('resize',schedule);document.addEventListener('warlike:workspace',schedule);document.addEventListener('warlike:project',schedule);sync();
 return {refresh:schedule,reset(){saved=null;if(storageKey)try{localStorage.removeItem(storageKey)}catch{}wasEnabled=false;schedule()}};
}
