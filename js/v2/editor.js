import {createComponent} from '../core/components-v2.js';
import {createScene,createGameObject,addGameObject,duplicateGameObject,removeGameObject,deserializeScene,serializeScene} from '../core/scene-graph-v2.js';
import {createSceneHistory,setComponentProperty,renameGameObject} from '../core/scene-commands-v2.js';
const $=id=>document.getElementById(id),canvas=$('viewport'),ctx=canvas.getContext('2d');
let scene=createScene('Prototype V2'),selected=null,history,drag=null;
addGameObject(scene,createGameObject('GameObject','object-1'));
history=createSceneHistory(scene);selected='object-1';
const status=message=>$('status').textContent=message;
function publishScene(){window.dispatchEvent(new CustomEvent('warlike:v2-scene',{detail:structuredClone(scene)}))}
window.addEventListener('warlike:v2-request-scene',publishScene);
function edit(label,action){try{history.commit(label,action);scene=history.scene;refresh();publishScene()}catch(error){status(error.message)}}
const selectedObject=()=>scene.objects.find(object=>object.id===selected);
const colors=['#51d3b9','#8daff4','#ffc578','#d69aea'];
function position(object){const tr=object.components.find(c=>c.type==='Transform');return tr?.position||[0,0,0]}
function project(p,width,height){return [width/2+(p[0]-p[2])*.707*38,height*.56+(p[0]+p[2])*.35*38-p[1]*38]}
function draw(){
 const d=Math.min(devicePixelRatio||1,2),width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
 if(canvas.width!==Math.round(width*d)||canvas.height!==Math.round(height*d)){canvas.width=Math.round(width*d);canvas.height=Math.round(height*d)}
 ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle='#101b28';ctx.fillRect(0,0,width,height);
 ctx.lineWidth=1;for(let i=-12;i<=12;i++){
  for(const [a,b] of [[[i,0,-12],[i,0,12]],[[-12,0,i],[12,0,i]]]){
   const pa=project(a,width,height),pb=project(b,width,height);ctx.strokeStyle=i===0?'#547685':'#293e4e';ctx.beginPath();ctx.moveTo(...pa);ctx.lineTo(...pb);ctx.stroke();
  }
 }
 scene.objects.forEach((o,index)=>{
  const p=position(o),center=project(p,width,height),radius=15;
  ctx.fillStyle=colors[index%colors.length];ctx.strokeStyle=o.id===selected?'#ffffff':'#22384d';ctx.lineWidth=o.id===selected?3:1;
  ctx.beginPath();ctx.moveTo(center[0],center[1]-radius);ctx.lineTo(center[0]+radius,center[1]-radius*.35);ctx.lineTo(center[0]+radius,center[1]+radius*.65);ctx.lineTo(center[0],center[1]+radius*1.4);ctx.lineTo(center[0]-radius,center[1]+radius*.65);ctx.lineTo(center[0]-radius,center[1]-radius*.35);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#e6f5fc';ctx.font='12px system-ui';ctx.fillText(o.name,center[0]+20,center[1]);
 });
}
function refresh(){
 const hierarchy=$('hierarchy');hierarchy.replaceChildren();
 scene.objects.forEach(object=>{const button=document.createElement('button');button.textContent=(object.parentId?'  ↳ ':'◇ ')+object.name;button.classList.toggle('selected',object.id===selected);button.onclick=()=>{selected=object.id;refresh()};hierarchy.append(button)});
 const inspector=$('inspector');inspector.replaceChildren();const o=selectedObject();
 if(o){
  const name=document.createElement('label');name.textContent='Nom';const field=document.createElement('input');field.value=o.name;field.onchange=()=>edit('Renommer',s=>renameGameObject(s,o.id,field.value));name.append(field);inspector.append(name);
  const addSelect=document.createElement('select');
  for(const type of ['MeshRenderer','BoxCollider','Rigidbody']){const option=document.createElement('option');option.value=type;option.textContent=type;addSelect.append(option)}
  const addButton=document.createElement('button');addButton.textContent='＋ Ajouter composant';
  addButton.onclick=()=>edit('Ajouter composant',next=>{const obj=next.objects.find(item=>item.id===o.id);if(!obj.components.some(c=>c.type===addSelect.value))obj.components.push(createComponent(addSelect.value))});
  inspector.append(addSelect,addButton);
  for(const component of o.components){
   const title=document.createElement('h2');title.textContent=component.type;inspector.append(title);
   if(component.type==='MeshRenderer'){
    for(const property of ['shape','color']){
     const label=document.createElement('label');label.textContent=property;
     const input=document.createElement(property==='shape'?'select':'input');
     if(property==='shape')for(const choice of ['box','sphere','cylinder']){const opt=document.createElement('option');opt.value=choice;opt.textContent=choice;input.append(opt)}
     else input.type='color';
     input.value=component[property];input.onchange=()=>edit('MeshRenderer '+property,s=>setComponentProperty(s,o.id,'MeshRenderer',property,input.value));
     label.append(input);inspector.append(label)
    }
   }
   if(component.type==='BoxCollider'){
    const label=document.createElement('label');label.textContent='Collision Box — X / Y / Z';
    const line=document.createElement('div');line.className='triplet';
    component.size.forEach((value,i)=>{const input=document.createElement('input');input.type='number';input.min='.01';input.step='.1';input.value=String(value);
     input.onchange=()=>edit('BoxCollider size',next=>{const collider=next.objects.find(it=>it.id===o.id).components.find(c=>c.type==='BoxCollider');const dims=[...collider.size];dims[i]=Number(input.value);if(!Number.isFinite(dims[i])||dims[i]<=0)throw Error('Taille de collision invalide');collider.size=dims});line.append(input)});
    label.append(line);inspector.append(label);
   }
   if(component.type==='MeshRenderer'){
    for(const property of ['roughness','metalness']){
     const label=document.createElement('label');label.textContent=property==='roughness'?'Rugosité':'Métallique';
     const input=document.createElement('input');input.type='range';input.min='0';input.max='1';input.step='.01';input.value=String(component[property]??(property==='roughness'?.48:.08));
     const value=document.createElement('small');value.textContent=Number(input.value).toFixed(2);
     input.oninput=()=>{value.textContent=Number(input.value).toFixed(2)};
     input.onchange=()=>edit('Matériau '+property,next=>setComponentProperty(next,o.id,'MeshRenderer',property,Number(input.value)));
     label.append(input,value);inspector.append(label);
    }
   }
   if(component.type==='Rigidbody'){
    const label=document.createElement('label');label.textContent='Body Type';const input=document.createElement('select');
    for(const choice of ['dynamic','fixed','kinematic']){const option=document.createElement('option');option.value=choice;option.textContent=choice;input.append(option)}
    input.value=component.bodyType;input.onchange=()=>edit('Rigidbody type',s=>setComponentProperty(s,o.id,'Rigidbody','bodyType',input.value));label.append(input);inspector.append(label);
   }
   if(component.type==='Transform')for(const key of ['position','rotation','scale']){
    const label=document.createElement('label');label.textContent=key.toUpperCase();
    const line=document.createElement('div');line.className='triplet';
    component[key].forEach((value,i)=>{const input=document.createElement('input');input.type='number';input.step='0.1';input.value=String(value);input.title=['X','Y','Z'][i];input.onchange=()=>edit('Modifier '+key,s=>{const obj=s.objects.find(it=>it.id===o.id);const next=[...obj.components.find(c=>c.type==='Transform')[key]];next[i]=Number(input.value);setComponentProperty(s,o.id,'Transform',key,next)});line.append(input)});
    label.append(line);inspector.append(label);
   }
  }
 }
 $('undo').disabled=!history.canUndo;$('redo').disabled=!history.canRedo;draw();
}
$('add').onclick=()=>{const id=crypto.randomUUID();edit('Ajouter',s=>addGameObject(s,createGameObject('GameObject',id)));selected=id;refresh()};
$('duplicate').onclick=()=>{if(!selected)return;let id;edit('Dupliquer',s=>{id=duplicateGameObject(s,selected).id});if(id)selected=id;refresh()};
$('remove').onclick=()=>{if(!selected)return;edit('Supprimer',s=>removeGameObject(s,selected));selected=scene.objects[0]?.id||null;refresh();publishScene()};
$('undo').onclick=()=>{scene=history.undo();selected=scene.objects.some(o=>o.id===selected)?selected:scene.objects[0]?.id;refresh()};
$('redo').onclick=()=>{scene=history.redo();selected=scene.objects.some(o=>o.id===selected)?selected:scene.objects[0]?.id;refresh()};
$('save').onclick=()=>{try{const blob=new Blob([serializeScene(scene)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='warlike-v2-scene.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Scène exportée')}catch(error){status(error.message)}};
$('load').onclick=()=>$('file').click();
$('file').onchange=async event=>{try{scene=deserializeScene(await event.target.files[0].text());history=createSceneHistory(scene);selected=scene.objects[0]?.id||null;refresh();status('Scène importée')}catch(error){status('Import : '+error.message)}finally{event.target.value=''}};
function mousePoint(event){const rect=canvas.getBoundingClientRect();return [event.clientX-rect.left,event.clientY-rect.top]}
canvas.addEventListener('pointerdown',event=>{const [x,y]=mousePoint(event),width=canvas.clientWidth,height=canvas.clientHeight;let closest=null,distance=Infinity;for(const o of scene.objects){const [a,b]=project(position(o),width,height),dist=Math.hypot(x-a,y-b);if(dist<distance&&dist<40){distance=dist;closest=o}}if(!closest)return;selected=closest.id;drag={x,y,id:closest.id,start:position(closest)};drag.pointerId=event.pointerId;canvas.setPointerCapture(event.pointerId);refresh()});
canvas.addEventListener('pointermove',event=>{if(!drag)return;const [x,y]=mousePoint(event);const dx=x-drag.x,dy=y-drag.y;const shiftX=(dx+dy*2)/53.7,shiftZ=(dy*2-dx)/53.7;status('Déplacement : '+shiftX.toFixed(2)+' / '+shiftZ.toFixed(2))});
canvas.addEventListener('pointerup',event=>{if(!drag)return;const [x,y]=mousePoint(event),dx=x-drag.x,dy=y-drag.y;const original=drag;drag=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);if(Math.hypot(dx,dy)<3)return;edit('Déplacer GameObject',s=>setComponentProperty(s,original.id,'Transform','position',[original.start[0]+(dx+dy*2)/53.7,original.start[1],original.start[2]+(dy*2-dx)/53.7]))});
function freeMouse(){
 if(drag?.pointerId!==undefined&&canvas.hasPointerCapture(drag.pointerId))canvas.releasePointerCapture(drag.pointerId);
 drag=null;
 if(document.pointerLockElement)document.exitPointerLock();
 canvas.style.cursor='default';
 status('Souris libre · sélection et navigation disponibles');
}
canvas.addEventListener('pointercancel',freeMouse);
canvas.addEventListener('lostpointercapture',()=>{drag=null});
window.addEventListener('keydown',event=>{if(event.key==='Escape')freeMouse()});
window.addEventListener('blur',()=>{drag=null});
window.addEventListener('resize',draw);refresh();publishScene();
