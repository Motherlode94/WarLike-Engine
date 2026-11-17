// WarLike UI v0.1 — deterministic, dependency-free layout model inspired by
// Unity uGUI RectTransform + Canvas Scaler. No arbitrary HTML or script execution.
const number=(v,fallback)=>Number.isFinite(v)?v:fallback;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const vector=(v,fallback)=>Array.isArray(v)&&v.length===2?v.map((x,i)=>number(x,fallback[i])):[...fallback];
export function defaultUiCanvas(){return {renderMode:'overlay',referenceResolution:[1920,1080],scaleMode:'scaleWithScreenSize',matchWidthOrHeight:.5,sortOrder:0,enabled:true}}
export function defaultUiRect(){return {anchorMin:[.5,.5],anchorMax:[.5,.5],pivot:[.5,.5],anchoredPosition:[0,0],sizeDelta:[200,60],rotation:0,enabled:true}}
export function defaultUiElement(){return {kind:'panel',text:'',color:'#283e50',textColor:'#ffffff',interactable:true,eventName:''}}
export function validateUiCanvas(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Canvas invalide');
 const canvas={...defaultUiCanvas(),...value};
 if(!['overlay'].includes(canvas.renderMode))throw Error('Le rendu Camera / World Space n’est pas encore opérationnel');
 if(!['constantPixelSize','scaleWithScreenSize'].includes(canvas.scaleMode))throw Error('Mode Canvas Scaler inconnu');
 canvas.referenceResolution=vector(canvas.referenceResolution,[1920,1080]);
 if(canvas.referenceResolution.some(n=>n<64||n>16384))throw Error('Résolution de référence invalide');
 canvas.matchWidthOrHeight=clamp(number(canvas.matchWidthOrHeight,.5),0,1);
 canvas.sortOrder=clamp(Math.trunc(number(canvas.sortOrder,0)),-100,100);
 canvas.enabled=canvas.enabled!==false;
 return canvas;
}
export function validateUiRect(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('RectTransform invalide');
 const rect={...defaultUiRect(),...value};
 for(const key of ['anchorMin','anchorMax','pivot']){
  rect[key]=vector(rect[key],defaultUiRect()[key]);
  if(rect[key].some(n=>n<0||n>1))throw Error('Ancrages et pivot entre 0 et 1');
 }
 if(rect.anchorMin.some((v,i)=>v>rect.anchorMax[i]))throw Error('Anchor Min dépasse Anchor Max');
 rect.anchoredPosition=vector(rect.anchoredPosition,[0,0]);
 rect.sizeDelta=vector(rect.sizeDelta,[200,60]);
 if([...rect.anchoredPosition,...rect.sizeDelta].some(n=>Math.abs(n)>100000))throw Error('Dimensions UI trop grandes');
 rect.rotation=clamp(number(rect.rotation,0),-360,360);
 rect.enabled=rect.enabled!==false;
 return rect;
}
export function uiCanvasScale(canvas,width,height){
 const c=validateUiCanvas(canvas);
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Viewport UI invalide');
 if(c.scaleMode==='constantPixelSize')return 1;
 const [rw,rh]=c.referenceResolution;
 // Geometric blend follows Unity Canvas Scaler's logarithmic width/height interpolation.
 return Math.pow(2,(1-c.matchWidthOrHeight)*Math.log2(width/rw)+c.matchWidthOrHeight*Math.log2(height/rh));
}
// Coordinates use top-left origin on screen and Unity-style Y-up anchoredPosition.
export function resolveUiRect(rect,parent){
 const r=validateUiRect(rect);
 if(!parent||![parent.x,parent.y,parent.width,parent.height].every(Number.isFinite))throw Error('Parent RectTransform invalide');
 const min=[parent.x+parent.width*r.anchorMin[0],parent.y+parent.height*(1-r.anchorMax[1])];
 const extent=[parent.width*(r.anchorMax[0]-r.anchorMin[0]),parent.height*(r.anchorMax[1]-r.anchorMin[1])];
 const width=Math.max(0,extent[0]+r.sizeDelta[0]),height=Math.max(0,extent[1]+r.sizeDelta[1]);
 const anchorX=min[0]+extent[0]*r.pivot[0],anchorY=min[1]+extent[1]*(1-r.pivot[1]);
 const x=anchorX+r.anchoredPosition[0]-width*r.pivot[0];
 const y=anchorY-r.anchoredPosition[1]-height*(1-r.pivot[1]);
 return {x,y,width,height,rotation:r.rotation};
}
export function uiLayoutTree(entities,viewportWidth,viewportHeight,{maxNodes=1024}={}){
 if(!Array.isArray(entities))throw Error('Entités UI invalides');
 const result=[],byId=new Map(entities.map(e=>[e.id,e])),visiting=new Set();
 const canvasNodes=entities.filter(e=>e.uiCanvas?.enabled!==false&&e.uiCanvas);
 const render=(entity,canvas,parentRect,depth)=>{
  if(depth>32||result.length>=maxNodes||visiting.has(entity.id))return;
  if(entity.uiRect?.enabled===false)return;
  visiting.add(entity.id);
  const rect=resolveUiRect(entity.uiRect||{},parentRect);
  if(entity.uiElement?.kind&&entity.uiElement.kind!=='none')result.push({id:entity.id,canvasId:canvas.id,parentId:entity.parentId??null,rect,element:entity.uiElement,sortOrder:validateUiCanvas(canvas.uiCanvas).sortOrder,depth});
  for(const child of entities.filter(e=>e.parentId===entity.id))if(!child.uiCanvas)render(child,canvas,rect,depth+1);
  visiting.delete(entity.id);
 };
 for(const canvas of canvasNodes){
  const settings=validateUiCanvas(canvas.uiCanvas),scale=uiCanvasScale(settings,viewportWidth,viewportHeight);
  const root={x:0,y:0,width:viewportWidth/scale,height:viewportHeight/scale};
  for(const child of entities.filter(e=>e.parentId===canvas.id&&!e.uiCanvas))render(child,canvas,root,0);
  for(const item of result.filter(e=>e.canvasId===canvas.id)){item.rect={x:item.rect.x*scale,y:item.rect.y*scale,width:item.rect.width*scale,height:item.rect.height*scale,rotation:item.rect.rotation}}
 }
 return result.sort((a,b)=>a.sortOrder-b.sortOrder);
}
