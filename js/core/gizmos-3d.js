import {updateAffineEditorPose3d,updateEditorEntityHierarchy3d,gizmoAxis3d,snap3d} from './scene-graph-v2.js';
import {rotationQuaternion3d} from './collider-3d.js';
import {projectedAxisDrag3d,projectedAxisScale3d,projectedAxisRotation3d,alignSceneObjects3d,snapSelected3d} from './scene-editing-3d-tools.js';
import {cameraFrustumCorners3d} from './editor-camera-frustum-3d.js';
import {sceneCameraView} from './scene-camera-3d.js';
import {initializeEditableTerrain,applyTerrainBrush,terrainBrushModes,terrainLayers} from './gaia-terrain-sculpt.js';
import {initializeRustGizmo,axisRayParameter,gizmoPointerRay} from './rust-gizmo-acceleration.js';
import {heightfieldAt3d,validTerrainHeightfield} from './gaia-terrain-physics.js';
import {createRoadSpline,sampleRoadSpline,roadSplineEntity,editRoadSpline} from './gaia-road-spline.js';
import {previewRoadGrade,applyRoadGradePlan} from './gaia-road-grading.js';
import {cityBuildingsAlongRoad} from './gaia-city-builder.js';
import {findGaiaRoadJunctions,roadJunctionEntity,roadJunctionBuffers3d} from './gaia-road-junctions.js';

// Lightweight scene-view transform gizmo: works in the existing WebGL 3D workspace.
const ns='http://www.w3.org/2000/svg';
const el=(tag,props={})=>{const node=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(props))node.setAttribute(k,String(v));return node};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function initSceneGizmo3d({canvas,host,state,view3d,project3d,objectBounds3d,getCamera,record,notify}){
 // Optional: enable math acceleration only if the Rust WASM build is present.
 if(!globalThis.__WARLIKE_BUILD__&&localStorage.getItem('warlike.gizmo.rust.enabled')==='true')void initializeRustGizmo();
 const layer=el('svg',{class:'warlike-gizmo-3d','aria-label':'Gizmo de transformation 3D'});
 layer.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:12;overflow:visible';
 const lines=['x','y','z'].map(axis=>{
  const line=el('line',{'data-gizmo-axis':axis,'stroke-width':4,'stroke-linecap':'round'});
  line.style.pointerEvents='stroke';line.style.cursor='grab';layer.append(line);return line;
 });
 const frustum=el('g',{'data-scene-camera-frustum':'true','stroke':'#8bd8e6','stroke-width':1.7,'fill':'none','stroke-dasharray':'6 4'});layer.append(frustum);
 const hub=el('circle',{r:7,fill:'#ffe48b',stroke:'#14202a','stroke-width':2});layer.append(hub);
 host.append(layer);
 const preview=document.createElement('canvas');
 preview.width=320;preview.height=180;
 preview.className='warlike-camera-frame-preview';
 preview.style.cssText='position:absolute;right:14px;bottom:14px;z-index:13;width:min(320px,42%);height:auto;aspect-ratio:16/9;border:1px solid #6fbcd1;border-radius:7px;background:#152638;box-shadow:0 5px 20px #0009;pointer-events:none';
 preview.setAttribute('aria-label','Aperçu géométrique ombré du cadrage Camera 3D');
 host.append(preview);

 const options=document.createElement('div');
 options.style.cssText='position:absolute;right:12px;top:12px;z-index:14;display:flex;gap:5px;align-items:center;background:#222832e8;border:1px solid #455363;border-radius:7px;padding:5px;color:#e5eaf1;font:12px Segoe UI,sans-serif';
 const mode=document.createElement('button');mode.type='button';mode.textContent='Global';mode.title='Basculer repère Local / Global';mode.setAttribute('aria-label','Repère Gizmo');mode.style.cssText='background:#303944;color:inherit;border:1px solid #455363;border-radius:4px;padding:4px 9px;cursor:pointer';mode.onclick=()=>{mode.textContent=mode.textContent==='Global'?'Local':'Global'};
 const snap=document.createElement('input');snap.type='checkbox';snap.checked=localStorage.getItem('warlike.snap3d.enabled')==='true';snap.setAttribute('aria-label','Activer snapping 3D');snap.onchange=()=>{localStorage.setItem('warlike.snap3d.enabled',String(snap.checked));document.dispatchEvent(new CustomEvent('warlike:snap3d',{detail:{enabled:snap.checked}}))};
 document.addEventListener('warlike:snap3d',e=>{snap.checked=Boolean(e.detail?.enabled)});
 const step=document.createElement('input');step.type='number';step.min='.01';step.max='20';step.step='.05';step.value=localStorage.getItem('warlike.snap3d.step')||'.5';step.title='Pas de snapping en mètres (rotation en degrés)';step.setAttribute('aria-label','Pas de snapping 3D');step.style.cssText='width:55px;background:#151b23;color:inherit;border:1px solid #455363;padding:3px';step.onchange=()=>{step.value=String(Math.min(20,Math.max(.01,Number(step.value)||.5)));localStorage.setItem('warlike.snap3d.step',step.value)};
 const snapMode=document.createElement('select');
 snapMode.setAttribute('aria-label','Mode de snapping 3D');snapMode.title='Accrochage grille, sommet, arête ou surface';
 snapMode.style.cssText='background:#303944;color:#e5eaf1;border:1px solid #455363;border-radius:4px;padding:4px;max-width:105px';
 for(const [value,label] of [['grid','Grille'],['vertex','Sommet'],['edge','Arête'],['surface','Surface']]){const opt=document.createElement('option');opt.value=value;opt.textContent=label;snapMode.append(opt)}
 snapMode.value=localStorage.getItem('warlike.snap3d.mode')||'grid';
 snapMode.onchange=()=>localStorage.setItem('warlike.snap3d.mode',snapMode.value);
 const action=(label,title,run)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.style.cssText='background:#303944;color:inherit;border:1px solid #566c70;border-radius:4px;padding:4px 8px;cursor:pointer';b.onclick=()=>{if(state.playing||!state.selected.length)return;const changed=run();if(changed){updateEditorEntityHierarchy3d(state.entities,{worldOverrideIds:new Set(state.selected)});record(title);notify();redraw()}};return b};
 const gridButton=action('Aligner grille','Aligner les objets sélectionnés sur la grille de l’éditeur',()=>snapSelected3d(state.entities,state.selected,{step:Math.max(.01,Number(step.value)||.5)}));
 const floorButton=action('Y = 0','Poser les objets au niveau zéro de la grille (repère visuel, pas un Collider)',()=>{let count=0;for(const o of state.entities.filter(o=>state.selected.includes(o.id))){if((o.elevation3d||0)!==0){o.elevation3d=0;count++}}return count});
 const alignX=action('Aligner X','Aligner les objets sélectionnés sur la position X du premier',()=>alignSceneObjects3d(state.entities,state.selected,{axis:'x'}));
 const alignZ=action('Aligner Z','Aligner les objets sélectionnés sur la position Z du premier',()=>alignSceneObjects3d(state.entities,state.selected,{axis:'y'}));
 const rustToggle=document.createElement('input');rustToggle.type='checkbox';
 rustToggle.setAttribute('aria-label','Accélération Rust expérimentale des Gizmos');
 rustToggle.title='Activer les calculs Rust/WASM optionnels, repli JavaScript si indisponible';
 rustToggle.checked=localStorage.getItem('warlike.gizmo.rust.enabled')==='true';
 rustToggle.onchange=()=>{localStorage.setItem('warlike.gizmo.rust.enabled',String(rustToggle.checked));if(rustToggle.checked)void initializeRustGizmo()};
 options.append(mode,snap,document.createTextNode('Snap'),step,snapMode,gridButton,floorButton,alignX,alignZ,document.createTextNode('Rust'),rustToggle);options.style.flexWrap='wrap';options.style.maxWidth='min(650px,75%)';host.append(options);
 // Native terrain editing uses the existing Scene View, not a separate editor.
 const terrainTools=document.createElement('div');
 terrainTools.className='warlike-gaia-terrain-tools';
 terrainTools.style.cssText='position:absolute;left:12px;bottom:58px;z-index:15;display:flex;gap:5px;align-items:center;flex-wrap:wrap;max-width:min(720px,90%);background:#202d34ed;border:1px solid #5d827c;border-radius:7px;padding:6px;color:#eaf5ed;font:12px system-ui';
 const terrainMode=document.createElement('select');terrainMode.setAttribute('aria-label','Outil de sculpture terrain 3D');
 for(const [value,label] of [['off','Déplacer'],['raise','Monter'],['lower','Creuser'],['smooth','Lisser'],['flatten','Aplatir'],['paint','Peindre']]){
  const opt=document.createElement('option');opt.value=value;opt.textContent=label;terrainMode.append(opt)
 }
 terrainMode.style.cssText='background:#293c43;color:inherit;border:1px solid #66837a;padding:4px';
 const radiusControl=document.createElement('input');radiusControl.type='number';radiusControl.min='.25';radiusControl.max='32';radiusControl.step='.25';radiusControl.value='2';radiusControl.style.cssText='width:58px;background:#293c43;color:inherit;border:1px solid #66837a;padding:4px';radiusControl.setAttribute('aria-label','Rayon de brosse en mètres');
 const strengthControl=document.createElement('input');strengthControl.type='number';strengthControl.min='.05';strengthControl.max='4';strengthControl.step='.1';strengthControl.value='.8';strengthControl.style.cssText=radiusControl.style.cssText;strengthControl.setAttribute('aria-label','Force de brosse');
 const layerControl=document.createElement('select');layerControl.style.cssText=terrainMode.style.cssText;layerControl.setAttribute('aria-label','Matériau terrain');
 for(const value of terrainLayers){const opt=document.createElement('option');opt.value=value;opt.textContent=value;layerControl.append(opt)}
 terrainTools.append(document.createTextNode('Gaia ·'),terrainMode,document.createTextNode('Rayon'),radiusControl,document.createTextNode('Force'),strengthControl,layerControl);
 host.append(terrainTools);
 const selectedTerrain=()=>state.entities.find(o=>state.selected.includes(o.id)&&(o.name==='Terrain'||o.terrainHeightfield||o.type==='terrain3d'));
 const selectedRoad=()=>state.entities.find(o=>state.selected.includes(o.id)&&o.roadSpline);
 const roadOverlay=el('svg',{class:'warlike-gaia-road-overlay','aria-label':'Tracé Road Editor sur Gaia'});
 roadOverlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:11;pointer-events:none;overflow:visible';
 host.append(roadOverlay);
 const roadButton=document.createElement('button');roadButton.type='button';roadButton.textContent='＋ Route';roadButton.title='Cliquer sur Gaia pour définir les points de contrôle';
 const roadFinish=document.createElement('button');roadFinish.type='button';roadFinish.textContent='Terminer';roadFinish.hidden=true;
 const roadWidth=document.createElement('input');roadWidth.type='number';roadWidth.min='1';roadWidth.max='60';roadWidth.step='.5';roadWidth.value='6';roadWidth.setAttribute('aria-label','Largeur de route en mètres');
 roadWidth.style.cssText=radiusControl.style.cssText;
 terrainTools.append(document.createTextNode('Route'),roadButton,document.createTextNode('m'),roadWidth,roadFinish);
 const gradePreview=document.createElement('button');gradePreview.type='button';gradePreview.textContent='Aperçu terrassement';gradePreview.title='Calculer les modifications Gaia sans modifier le relief';
 const gradeApply=document.createElement('button');gradeApply.type='button';gradeApply.textContent='Appliquer';gradeApply.disabled=true;
 const shoulderWidth=document.createElement('input');shoulderWidth.type='number';shoulderWidth.min='0';shoulderWidth.max='32';shoulderWidth.step='.5';shoulderWidth.value='2';shoulderWidth.setAttribute('aria-label','Largeur des accotements en mètres');shoulderWidth.style.cssText=radiusControl.style.cssText;
 const gradeInfo=document.createElement('span');gradeInfo.setAttribute('role','status');gradeInfo.style.maxWidth='180px';
 terrainTools.append(document.createTextNode('Accotement'),shoulderWidth,gradePreview,gradeApply,gradeInfo);
 const cityButton=document.createElement('button');cityButton.type='button';cityButton.textContent='＋ Quartier';
 cityButton.title='Générer de vrais bâtiments 3D de chaque côté de la route Gaia sélectionnée';
 cityButton.setAttribute('aria-label','Générer un quartier le long de la route sélectionnée');
 const cityInfo=document.createElement('span');cityInfo.setAttribute('role','status');
 terrainTools.append(cityButton,cityInfo);
 const junctionButton=document.createElement('button');junctionButton.type='button';junctionButton.textContent='＋ Carrefours';
 junctionButton.title='Créer des carrefours natifs entre les routes Gaia existantes';
 const junctionStatus=document.createElement('span');junctionStatus.setAttribute('role','status');
 terrainTools.append(junctionButton,junctionStatus);
 junctionButton.onclick=()=>{
  if(state.playing||!view3d.enabled)return;
  const roads=state.entities.filter(o=>o.roadSpline&&o.enabled!==false);
  if(roads.length<2){junctionStatus.textContent='Créer au moins deux routes Gaia';return}
  try{
   const candidates=findGaiaRoadJunctions(roads),existing=state.entities.filter(o=>o.roadJunction3d);
   const fresh=[];
   for(const junction of candidates){
    if(existing.some(o=>o.roadJunction3d?.roadIds?.join(',')===junction.roadIds.join(',')&&Math.hypot(o.roadJunction3d.center.x-junction.center.x,o.roadJunction3d.center.z-junction.center.z)<junction.radius*.35))continue;
    // Reject crossings without adequate terrain or with an unresolved level gap.
    roadJunctionBuffers3d(junction,roads,gaiaTiles());
    fresh.push(roadJunctionEntity(state.nextId+fresh.length,junction));
   }
   if(!fresh.length){junctionStatus.textContent='Aucun nouveau carrefour valide';return}
   state.entities.push(...fresh);state.nextId+=fresh.length;
   record('World Builder · '+fresh.length+' carrefour(s) Gaia');notify();
   junctionStatus.textContent=fresh.length+' carrefour(s) créé(s)';
  }catch(error){junctionStatus.textContent='Carrefours : '+String(error.message||error)}
 };

 cityButton.onclick=()=>{
  const road=selectedRoad();
  if(state.playing||!view3d.enabled||!road)return;
  try{
   const buildings=cityBuildingsAlongRoad(road,gaiaTiles(),state.entities,{firstId:state.nextId,maxBuildings:40});
   if(!buildings.length){cityInfo.textContent='Aucun emplacement Gaia compatible';return}
   state.entities.push(...buildings);
   state.nextId+=buildings.length;
   record('World Builder · quartier '+buildings.length+' bâtiments');
   notify();
   cityInfo.textContent=buildings.length+' bâtiments créés';
  }catch(error){cityInfo.textContent='Quartier : '+String(error.message||error)}
 };
 let pendingGrade=null;
 const invalidateGrade=()=>{pendingGrade=null;gradeApply.disabled=true;gradeInfo.textContent=''};
 let roadMode=false,roadDraft=null,roadDrag=null;
 const gaiaTiles=()=>state.entities.filter(o=>validTerrainHeightfield(o.terrainHeightfield)&&o.enabled!==false);
 const terrainAt=(x,z)=>{
  for(const tile of gaiaTiles()){
   const y=heightfieldAt3d(tile.terrainHeightfield,x,z);
   if(y!==null)return y;
  }
  return null;
 };
 const roadPointer=event=>{
  const rect=canvas.getBoundingClientRect(),ray=gizmoPointerRay(event.clientX,event.clientY,rect,getCamera());
  if(!ray||Math.abs(ray.direction[1])<1e-6)return null;
  const t=-ray.origin[1]/ray.direction[1];
  if(t<=0||t>1000)return null;
  const x=ray.origin[0]+ray.direction[0]*t,z=ray.origin[2]+ray.direction[2]*t;
  return terrainAt(x,z)===null?null:{x,z};
 };
 const redrawRoad=()=>{
  roadOverlay.replaceChildren();
  roadOverlay.style.display=view3d.enabled&&!state.playing?'block':'none';
  if(!view3d.enabled||state.playing)return;
  const rect=canvas.getBoundingClientRect(),cam=getCamera();
  roadOverlay.setAttribute('viewBox','0 0 '+rect.width+' '+rect.height);
  const roads=state.entities.filter(o=>o.roadSpline&&o.enabled!==false);
  for(const road of roads){
   const active=state.selected.includes(road.id),points=sampleRoadSpline(road.roadSpline,{segmentsPerSpan:8});
   const projected=points.map(p=>{
    const y=terrainAt(p.x,p.z);
    return y===null?null:project3d([p.x,y+road.roadSpline.elevationOffset,p.z],cam,rect.width,rect.height);
   });
   let run=[];
   const drawRun=()=>{if(run.length>1){const path=el('polyline',{points:run.join(' '),fill:'none',stroke:active?'#ffd46b':'#67b7df','stroke-width':active?4:2,'stroke-linecap':'round','stroke-linejoin':'round'});roadOverlay.append(path)}run=[]};
   for(const p of projected){if(!p){drawRun();continue}run.push(p.x+','+p.y)}
   drawRun();
   if(active)for(const point of road.roadSpline.points){
    const y=terrainAt(point.x,point.z);if(y===null)continue;
    const p=project3d([point.x,y+road.roadSpline.elevationOffset,point.z],cam,rect.width,rect.height);
    if(p)roadOverlay.append(el('circle',{cx:p.x,cy:p.y,r:6,fill:'#ffd46b',stroke:'#23333e','stroke-width':2}));
   }
  }
  if(roadDraft){const y=terrainAt(roadDraft.x,roadDraft.z);
   if(y!==null){const p=project3d([roadDraft.x,y+.1,roadDraft.z],cam,rect.width,rect.height);
    if(p)roadOverlay.append(el('circle',{cx:p.x,cy:p.y,r:6,fill:'#72e7bd'}));
   }
  }
 };
 gradePreview.onclick=()=>{
  invalidateGrade();
  const road=selectedRoad();if(state.playing||!road)return;
  try{
   const plan=previewRoadGrade(road.roadSpline,gaiaTiles(),{shoulderWidth:Number(shoulderWidth.value)});
   pendingGrade={roadId:road.id,plan,roadSignature:JSON.stringify(road.roadSpline)};
   gradeApply.disabled=!plan.changedSamples;
   gradeInfo.textContent=plan.changedSamples+' échantillons Gaia à modifier';
  }catch(error){gradeInfo.textContent=String(error.message||error)}
 };
 gradeApply.onclick=()=>{
  const preview=pendingGrade,road=selectedRoad();
  if(state.playing||!preview||!road||preview.roadId!==road.id||preview.roadSignature!==JSON.stringify(road.roadSpline)){invalidateGrade();return}
  try{
   const changed=applyRoadGradePlan(preview.plan,gaiaTiles());
   if(changed){record('Gaia Road · terrassement');notify()}
   invalidateGrade();
  }catch(error){invalidateGrade();gradeInfo.textContent=String(error.message||error)}
 };
 const syncRoadControls=()=>{
  roadButton.textContent=roadMode?'Arrêter le tracé':selectedRoad()?'Éditer la route':'＋ Route';
  roadFinish.hidden=!roadMode;
  roadWidth.disabled=!selectedRoad();gradePreview.disabled=!selectedRoad()||state.playing;cityButton.disabled=!selectedRoad()||state.playing;junctionButton.disabled=state.playing||state.entities.filter(o=>o.roadSpline&&o.enabled!==false).length<2;
  if(selectedRoad()&&document.activeElement!==roadWidth)roadWidth.value=String(selectedRoad().roadSpline.width);
 };
 roadButton.onclick=()=>{
  if(state.playing)return;
  if(!roadMode&&!selectedRoad()&&!gaiaTiles().length)return;
  invalidateGrade();roadMode=!roadMode;roadDraft=null;roadDrag=null;terrainMode.value='off';syncRoadControls();redrawRoad();
 };
 roadFinish.onclick=()=>{invalidateGrade();roadMode=false;roadDraft=null;roadDrag=null;syncRoadControls();redrawRoad()};
 roadWidth.onchange=()=>{
  const road=selectedRoad();if(!road||state.playing)return;
  const width=Number(roadWidth.value);if(!Number.isFinite(width)||width<1||width>60){roadWidth.value=String(road.roadSpline.width);return}
  if(width!==road.roadSpline.width){invalidateGrade();road.roadSpline=editRoadSpline(road.roadSpline,{action:'width',width});record('Road Editor · largeur');notify();redrawRoad()}
 };
 const roadControlHit=event=>{
  const road=selectedRoad();if(!road)return -1;
  const rect=canvas.getBoundingClientRect(),cam=getCamera();
  let hit=-1,dist=14;
  road.roadSpline.points.forEach((p,i)=>{
   const y=terrainAt(p.x,p.z);if(y===null)return;
   const q=project3d([p.x,y+road.roadSpline.elevationOffset,p.z],cam,rect.width,rect.height);
   const d=q?Math.hypot(q.x-(event.clientX-rect.left),q.y-(event.clientY-rect.top)):Infinity;
   if(d<dist){hit=i;dist=d}
  });
  return hit;
 };
 canvas.addEventListener('pointerdown',event=>{
  if(!roadMode||state.playing||!view3d.enabled||event.button!==0||event.altKey)return;
  const point=roadPointer(event);if(!point)return;
  invalidateGrade();const road=selectedRoad(),hit=roadControlHit(event);
  if(road&&hit>=0){roadDrag={id:road.id,index:hit,pointer:event.pointerId,changed:false};canvas.setPointerCapture(event.pointerId)}
  else if(road){try{road.roadSpline=editRoadSpline(road.roadSpline,{action:'append',point});record('Road Editor · ajouter point');notify()}catch(error){console.warn('Road Editor:',error.message)}}
  else if(roadDraft){
   if(Math.hypot(point.x-roadDraft.x,point.z-roadDraft.z)<.01){event.preventDefault();event.stopImmediatePropagation();return}
   const created=roadSplineEntity(state.nextId++,createRoadSpline([roadDraft,point],{width:Number(roadWidth.value)||6}));
   state.entities.push(created);state.selected=[created.id];roadDraft=null;
   record('Road Editor · créer route');notify()
  }else roadDraft=point;
  event.preventDefault();event.stopImmediatePropagation();syncRoadControls();redrawRoad();
 },true);
 canvas.addEventListener('pointermove',event=>{
  if(!roadDrag||roadDrag.pointer!==event.pointerId)return;
  const road=state.entities.find(o=>o.id===roadDrag.id),point=roadPointer(event);
  if(road&&point){try{invalidateGrade();road.roadSpline=editRoadSpline(road.roadSpline,{action:'move',index:roadDrag.index,point});roadDrag.changed=true;notify();redrawRoad()}catch{ /* Ignore degenerate overlapping control points. */ }}
  event.preventDefault();event.stopImmediatePropagation();
 },true);
 const finishRoadDrag=event=>{
  if(!roadDrag||roadDrag.pointer!==event.pointerId)return;
  if(roadDrag.changed)record('Road Editor · déplacer point');
  roadDrag=null;redrawRoad();event.stopImmediatePropagation();
 };
 canvas.addEventListener('pointerup',finishRoadDrag,true);
 canvas.addEventListener('pointercancel',finishRoadDrag,true);
 let painting=false,painted=false;
 const terrainStroke=event=>{
  if(state.playing||roadMode||terrainMode.value==='off'||event.button!==0&&!painting)return;
  const o=selectedTerrain();if(!o)return;
  const rect=canvas.getBoundingClientRect(),ray=gizmoPointerRay(event.clientX,event.clientY,rect,getCamera());
  if(!ray||Math.abs(ray.direction[1])<1e-6)return;
  const y=Number(o.elevation3d)||0,t=(y-ray.origin[1])/ray.direction[1];
  if(t<=0||t>1000)return;
  const x=ray.origin[0]+ray.direction[0]*t,z=ray.origin[2]+ray.direction[2]*t;
  const terrain=initializeEditableTerrain(o);
  if(Math.abs(x-terrain.offsetX)>terrain.size/2||Math.abs(z-terrain.offsetZ)>terrain.size/2)return;
  const changed=applyTerrainBrush(o,{mode:terrainMode.value,x,z,
   radius:Number(radiusControl.value)||2,strength:Number(strengthControl.value)||.8,
   targetHeight:terrain.height/2,layer:layerControl.value});
  if(changed){painted=true;notify()}
  event.preventDefault();event.stopImmediatePropagation();
 };
 canvas.addEventListener('pointerdown',event=>{if(roadMode||!selectedTerrain()||terrainMode.value==='off'||event.button!==0)return;painting=true;painted=false;terrainStroke(event)},true);
 canvas.addEventListener('pointermove',event=>{if(painting&&(event.buttons&1))terrainStroke(event)},true);
 const endTerrainStroke=()=>{if(painting&&painted)record('Gaia Terrain · '+terrainMode.value);painting=false;painted=false};
 canvas.addEventListener('pointerup',endTerrainStroke,true);
 canvas.addEventListener('pointercancel',endTerrainStroke,true);
 window.addEventListener('pointerup',endTerrainStroke);
 let drag=null,lastTool='';
 const tool=()=>document.querySelector('.scene-tools [data-tool].active')?.dataset.tool||'move';
 const center=()=>{
  const objects=state.entities.filter(o=>state.selected.includes(o.id)&&!o.roadSpline);
  if(!objects.length)return null;
  const pts=objects.map(objectBounds3d);
  return pts.reduce((p,b)=>[p[0]+b.x/pts.length,p[1]+b.y/pts.length,p[2]+b.z/pts.length],[0,0,0]);
 };
 const axes={x:[1,0,0],y:[0,1,0],z:[0,0,1]};
 const axisVector=(axis,o)=>gizmoAxis3d(axis,rotationQuaternion3d(o||{}),{local:mode.textContent==='Local'});
 const colors={x:'#f36868',y:'#68d781',z:'#64a9ff'};
 const redraw=()=>{
  const selected=center(),selectedObject=state.entities.find(o=>state.selected.includes(o.id)&&o.sceneCamera3d);
  terrainTools.hidden=!view3d.enabled||state.playing||(!selectedTerrain()&&!selectedRoad());
  syncRoadControls();redrawRoad();
  terrainTools.style.display=terrainTools.hidden?'none':'flex';
  const showingCamera=!!selectedObject&&selectedObject.sceneCamera3d.showFrustum!==false;
  // Hide the preview before the early return when Play starts or selection changes.
  preview.hidden=!selectedObject||selectedObject.sceneCamera3d.showPreview===false||state.playing||!view3d.enabled;
  const active=view3d.enabled&&!state.playing&&!!selected&&(tool()!=='hand'||showingCamera);
  layer.style.display=active?'block':'none';if(!active)return;
  const rect=canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
  layer.setAttribute('viewBox','0 0 '+rect.width+' '+rect.height);
  const cam=getCamera(),p=project3d(selected,cam,rect.width,rect.height);if(!p){layer.style.display='none';return}
  // Scene-only framing aid. This uses actual 3D camera projection, not a second game renderer.
  const selectedCam=state.entities.find(o=>state.selected.includes(o.id)&&o.sceneCamera3d);
  preview.hidden=!selectedCam||selectedCam.sceneCamera3d.showPreview===false||state.playing||!view3d.enabled;
  if(!preview.hidden&&preview.dataset.liveRenderer!=='webgl'){
   const ctx=preview.getContext('2d'),w=preview.width,h=preview.height;
   ctx.clearRect(0,0,w,h);ctx.fillStyle='#142536';ctx.fillRect(0,0,w,h);
   const view=sceneCameraView(selectedCam,state.entities,{yaw:view3d.yaw,pitch:view3d.pitch});
   if(view){
    ctx.strokeStyle='#5b879d';ctx.lineWidth=1;
    ctx.strokeRect(1,1,w-2,h-2);
    const boxes=state.entities.filter(e=>e!==selectedCam&&e.enabled!==false&&e.visible!==false).slice(0,160);
    // This is a lightweight shaded geometry preview, not a second WebGL pass.
    // Sort projected polygon faces far-to-near to preserve intuitive framing.
    const faces=[],screenPoint=p=>project3d(p,view,w,h);
    for(const entity of boxes){
     const box=objectBounds3d(entity);
     if(!box||![box.x,box.y,box.z,box.w,box.h,box.d].every(Number.isFinite))continue;
     const x=box.x,y=box.y,z=box.z,dx=box.w/2,dy=box.h/2,dz=box.d/2;
     const corners=[
      [x-dx,y-dy,z-dz],[x+dx,y-dy,z-dz],[x+dx,y+dy,z-dz],[x-dx,y+dy,z-dz],
      [x-dx,y-dy,z+dz],[x+dx,y-dy,z+dz],[x+dx,y+dy,z+dz],[x-dx,y+dy,z+dz]
     ].map(screenPoint);
     const color=/^#[0-9a-f]{6}$/i.test(entity.color||'')?entity.color:'#799e91';
     for(const [indices,alpha] of [[[3,2,6,7],.95],[[4,5,6,7],.62],[[0,1,2,3],.5],[[0,3,7,4],.72],[[1,2,6,5],.82]]){
      const poly=indices.map(i=>corners[i]);
      if(poly.some(p=>!p||!Number.isFinite(p.x+p.y)))continue;
      faces.push({poly,depth:poly.reduce((s,p)=>s+p.depth,0)/poly.length,color,alpha});
     }
    }
    faces.sort((a,b)=>b.depth-a.depth);
    ctx.save();ctx.beginPath();ctx.rect(1,19,w-2,h-20);ctx.clip();
    for(const face of faces){
     ctx.beginPath();ctx.moveTo(face.poly[0].x,face.poly[0].y);
     for(const point of face.poly.slice(1))ctx.lineTo(point.x,point.y);
     ctx.closePath();ctx.globalAlpha=face.alpha;ctx.fillStyle=face.color;ctx.fill();
     ctx.globalAlpha=.5;ctx.strokeStyle='#b0c9d5';ctx.lineWidth=.6;ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle='#b1d8e6';ctx.beginPath();ctx.moveTo(w/2-6,h/2);ctx.lineTo(w/2+6,h/2);ctx.moveTo(w/2,h/2-6);ctx.lineTo(w/2,h/2+6);ctx.stroke();
   }
   ctx.fillStyle='#e1eff4';ctx.font='11px system-ui';ctx.fillText('CAMERA · APERÇU GÉOMÉTRIQUE',9,16);
  }
  frustum.replaceChildren();
  if(showingCamera){
   const b=objectBounds3d(selectedObject);
   try{
    const bounds=cameraFrustumCorners3d([(Number(selectedObject.x)||0)/64,(Number(selectedObject.elevation3d)||0),(Number(selectedObject.y)||0)/64],[-(selectedObject.rotationX3d||0),selectedObject.rotation||0,selectedObject.rotationZ3d||0],selectedObject.sceneCamera3d,rect.width/rect.height);
    const vertices=[...bounds.near,...bounds.far].map(v=>project3d(v,cam,rect.width,rect.height));
    for(let i=0;i<4;i++)for(const [a,b] of [[i,(i+1)%4],[i+4,((i+1)%4)+4],[i,i+4]]){
     if(vertices[a]&&vertices[b])frustum.append(el('line',{x1:vertices[a].x,y1:vertices[a].y,x2:vertices[b].x,y2:vertices[b].y}));
    }
   }catch{/* A malformed camera preview must never interrupt Scene editing. */}
  }
  const mode=tool();lastTool=mode;
  hub.setAttribute('cx',p.x);hub.setAttribute('cy',p.y);
  hub.setAttribute('fill',mode==='rotate'?'#f2c66b':mode==='scale'||mode==='rect'?'#ffffff':'#ffe48b');
  for(let i=0;i<3;i++){
   const axis=['x','y','z'][i],line=lines[i],o=state.entities.find(x=>state.selected.includes(x.id)),v=axisVector(axis,o);
   const end=project3d(selected.map((n,j)=>n+v[j]*Math.max(.4,p.depth*.08)),cam,rect.width,rect.height);
   if(!end){line.style.display='none';continue}
   line.style.display='block';
   const dx=end.x-p.x,dy=end.y-p.y,len=Math.hypot(dx,dy)||1;
   const scale=mode==='rotate'?1.2:1;
   line.setAttribute('x1',p.x+dx/len*11);line.setAttribute('y1',p.y+dy/len*11);
   line.setAttribute('x2',p.x+dx/len*64*scale);line.setAttribute('y2',p.y+dy/len*64*scale);
   line.setAttribute('stroke',mode==='rotate'?'#f2c66b':mode==='scale'||mode==='rect'?'#f5d678':colors[axis]);
  }
 };
 layer.addEventListener('pointerdown',event=>{
  const axis=event.target.getAttribute('data-gizmo-axis');
  if(!axis||event.button!==0||event.altKey||state.playing)return;
  const selected=state.entities.filter(o=>state.selected.includes(o.id));
  if(!selected.length)return;
  event.preventDefault();event.stopPropagation();
  const cam=getCamera(),rect=canvas.getBoundingClientRect(),pivot=center(),first=selected[0];
  const direction=axisVector(axis,first),pivotScreen=pivot&&project3d(pivot,cam,rect.width,rect.height);
  const endScreen=pivot&&project3d(pivot.map((v,i)=>v+direction[i]),cam,rect.width,rect.height);
  drag={pointer:event.pointerId,axis,startX:event.clientX,startY:event.clientY,mode:lastTool,
   pivotScreen,endScreen,
   // Pointer position and view-facing sign are frozen for the entire drag.
   startPointer:{x:event.clientX-rect.left,y:event.clientY-rect.top},
   axisFacing:(()=>{
    if(!pivot||!Array.isArray(cam?.eye))return 1;
    const facing=direction.reduce((sum,n,i)=>sum+n*(cam.eye[i]-pivot[i]),0);
    return facing<0?-1:1;
   })(),
   rustStart:(()=>{
    if(!pivot||lastTool!=='move')return null;
    const ray=gizmoPointerRay(event.clientX,event.clientY,rect,cam);
    return ray?axisRayParameter(ray.origin,ray.direction,pivot,direction):null;
   })(),
   rustPivot:pivot,rustAxis:direction,
   objects:selected.map(o=>({id:o.id,x:o.x,y:o.y,elevation3d:o.elevation3d||0,w:o.w,h:o.h,depth3d:o.depth3d??o.h,rotation:o.rotation||0,rotationX3d:o.rotationX3d||0,rotationZ3d:o.rotationZ3d||0,worldMatrix3d:Array.isArray(o.worldMatrix3d)?[...o.worldMatrix3d]:null,matrixReference3d:Array.isArray(o.matrixReference3d)?[...o.matrixReference3d]:null}))};
  event.target.setPointerCapture(event.pointerId);
 });
 layer.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.pointer)return;
  const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
  const rect=canvas.getBoundingClientRect(),cam=getCamera();
  const ray=drag.rustStart!==null&&drag.rustPivot?gizmoPointerRay(event.clientX,event.clientY,rect,cam):null;
  const current=ray?axisRayParameter(ray.origin,ray.direction,drag.rustPivot,drag.rustAxis):null;
  const amount=current!==null&&drag.rustStart!==null?current-drag.rustStart:projectedAxisDrag3d(drag.pivotScreen,drag.endScreen,dx,dy),snapStep=snap.checked?Math.max(.01,Number(step.value)||.5):0;
  const surfaceHit=snap.checked&&drag.mode==='move'&&snapMode.value!=='grid'?
   view3d.surfaceAt?.(event.clientX,event.clientY,{excludeIds:drag.objects.map(o=>o.id),groundFallback:snapMode.value==='surface'}):null;
  const quant=(value,increment)=>snapStep?snap3d(value,increment??snapStep):value;
  for(const start of drag.objects){
   const o=state.entities.find(o=>o.id===start.id);if(!o)continue;
   if(drag.mode==='rotate'){
    const pointer={x:event.clientX-rect.left,y:event.clientY-rect.top};
    const raw=projectedAxisRotation3d(drag.pivotScreen,drag.startPointer,pointer,{directionSign:drag.axisFacing});
    const degrees=quant(raw,snapStep?Math.max(1,snapStep*30):0);
    if(drag.axis==='x')o.rotationX3d=start.rotationX3d+degrees;
    else if(drag.axis==='z')o.rotationZ3d=start.rotationZ3d+degrees;
    else o.rotation=start.rotation+degrees;
   }else if(drag.mode==='scale'||drag.mode==='rect'){
    const factor=projectedAxisScale3d(drag.pivotScreen,drag.endScreen,dx,dy);
    const scaled=value=>Math.max(4,Math.round(quant(value*factor/64)*64));
    if(drag.axis==='x')o.w=scaled(start.w);
    else if(drag.axis==='y')o.h=scaled(start.h);
    else o.depth3d=scaled(start.depth3d);
   }else{
    const direction=axisVector(drag.axis,{...o,rotation:start.rotation,rotationX3d:start.rotationX3d,rotationZ3d:start.rotationZ3d});
    if(surfaceHit){
     // Project the pointer-to-feature displacement on the selected gizmo axis.
     const center=[start.x/64+(start.w||64)/128,start.elevation3d+(start.h||64)/128,start.y/64+(start.depth3d||start.h||64)/128];
     const distance=direction.reduce((sum,n,i)=>sum+n*(surfaceHit.point[i]-center[i]),0);
     o.x=(start.x/64+direction[0]*distance)*64;
     o.elevation3d=start.elevation3d+direction[1]*distance;
     o.y=(start.y/64+direction[2]*distance)*64;
    }else{
     o.x=quant(start.x/64+direction[0]*amount)*64;
     o.elevation3d=quant(start.elevation3d+direction[1]*amount);
     o.y=quant(start.y/64+direction[2]*amount)*64;
    }
   }
   // Keep the authored affine shear instead of throwing it away when the gizmo moves.
   if(start.worldMatrix3d&&start.matrixReference3d)updateAffineEditorPose3d(o,start.worldMatrix3d,start.matrixReference3d);
  }
  if(drag.objects.length)updateEditorEntityHierarchy3d(state.entities,{worldOverrideIds:new Set(drag.objects.map(o=>o.id))});
  redraw();
 });
 const finish=event=>{
  if(!drag||event.pointerId!==drag.pointer)return;
  const changed=drag.objects.some(start=>{const o=state.entities.find(o=>o.id===start.id);return o&&(o.x!==start.x||o.y!==start.y||o.elevation3d!==start.elevation3d||o.w!==start.w||o.h!==start.h||o.depth3d!==start.depth3d||o.rotation!==start.rotation||o.rotationX3d!==start.rotationX3d||o.rotationZ3d!==start.rotationZ3d)});
  if(changed)record('Gizmo 3D : '+drag.mode);
  drag=null;notify();
 };
 layer.addEventListener('pointerup',finish);
 layer.addEventListener('pointercancel',finish);
 layer.addEventListener('lostpointercapture',finish);
 return redraw;
}
