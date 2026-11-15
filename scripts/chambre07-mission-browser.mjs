import assert from 'node:assert/strict';
import path from 'node:path';

// Exercise the extracted game's real E/F5 controls and dialogue buttons.
// Approaches are positioned by the fixture; navigation is tested separately.
export async function verifyChambre07Missions(browser,{origin,output}){
 const results=[];
 for(const answer of [0,1]){
  const context=await browser.newContext({viewport:{width:1440,height:900}}),errors=[],failed=[],external=[];
  try{
   await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin===origin||['data:','blob:'].includes(url.protocol))return route.continue();
    external.push(url.href);return route.abort();
   });
   const page=await context.newPage();
   page.on('pageerror',error=>errors.push(error.message));
   page.on('response',response=>{if(response.status()>=400)failed.push([response.status(),response.url()])});
   const snapshot=()=>page.evaluate(async()=>{
    const {state}=await import('/js/core/state.js'),{gameSession}=await import('/js/core/game-session.js'),{sequenceRuntime}=await import('/js/core/logic-sequences.js');
    const p=state.entities.find(o=>o.playable3d);
    return {phase:gameSession.phase,notice:gameSession.notice,globals:{...sequenceRuntime.globals},objectives:gameSession.objectives,dialogue:gameSession.dialogue,player:{id:p.id,x:p.x,y:p.y},hunter:state.entities.find(o=>o.tags?.includes('chambre07-hunter'))?.ai?.enabled,visible:state.entities.filter(o=>o.tags?.includes('chambre07-memory')&&o.visible!==false).length,errors:sequenceRuntime.errors};
   });
   const wait=fn=>page.waitForFunction(fn,null,{timeout:15000});
   const approach=async name=>{
    const id=await page.evaluate(async name=>{
     const {state}=await import('/js/core/state.js'),{adventureTarget}=await import('/js/core/adventure-runtime.js'),{interactionCenter}=await import('/js/core/interaction-range.js');
     const p=state.entities.find(o=>o.playable3d),target=state.entities.find(o=>o.name===name);
     if(!target)throw Error('Missing mission object: '+name);
     const center=interactionCenter(target,'3d');
     for(const [dx,dy] of [[-110,0],[110,0],[0,-110],[0,110]]){
      Object.assign(p,{x:center.x+dx-p.w/2,y:center.y+dy-(p.depth3d||p.h)/2,elevation3d:0,_verticalVelocity:0});
      if(adventureTarget(p,state.entities,{mode:'3d'})===target)return target.id;
     }
     throw Error('No clear approach to '+name);
    },name);
    await page.waitForFunction(async id=>{
     const {state}=await import('/js/core/state.js'),{adventureTarget}=await import('/js/core/adventure-runtime.js');
     return adventureTarget(state.entities.find(o=>o.playable3d),state.entities,{mode:'3d'})?.id===id;
    },id,{timeout:5000});
    await page.keyboard.press('e');
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   };
   const save=async()=>{
    await page.keyboard.press('F5');
    const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('warlike.save.v1:chambre07-e2e:quick')));
    assert.ok(data,'F5 did not write a real localStorage save');return data;
   };
   const resume=async()=>{
    await page.reload({waitUntil:'domcontentloaded'});
    const button=page.getByRole('button',{name:'Continuer la sauvegarde',exact:true});
    await button.waitFor({timeout:45000});await button.click();
    await wait(async()=>{
     const {gameSession}=await import('/js/core/game-session.js'),{state}=await import('/js/core/state.js');
     return state.playing&&gameSession.pending===null&&Object.keys(gameSession.objectives).length>=4;
    });
   };
   await page.goto(origin,{waitUntil:'domcontentloaded'});
   await page.getByRole('button',{name:'Jouer',exact:true}).click();
   await wait(async()=>{const {sequenceRuntime}=await import('/js/core/logic-sequences.js');return sequenceRuntime.globals.chambrePhoto===0;});
   await approach('Porte de sortie');assert.equal((await snapshot()).phase,'playing');
   await approach('Lia · la voix');assert.equal((await snapshot()).dialogue,null);
   for(const [name,key] of [['01 · Photographie','chambrePhoto'],['02 · Cassette','chambreTape'],['03 · Lettre','chambreLetter']]){
    await approach(name);
    await page.waitForFunction(async key=>{const {sequenceRuntime}=await import('/js/core/logic-sequences.js');return sequenceRuntime.globals[key]===1;},key);
    await save();await resume();
    const restored=await snapshot();assert.equal(restored.globals[key],1);assert.equal(restored.objectives['chambre:'+key]?.status,'complete');
   }
   assert.equal((await snapshot()).visible,0);
   await approach('Lia · la voix');
   await page.locator('[data-dialogue-choice="0"]').waitFor();
   const oldDialogue=(await snapshot()).dialogue.id;await save();await resume();
   await page.locator('[data-dialogue-choice="'+answer+'"]').waitFor();
   assert.notEqual((await snapshot()).dialogue.id,oldDialogue);
   await page.locator('[data-dialogue-choice="'+answer+'"]').click();
   await page.waitForFunction(async choice=>{const {sequenceRuntime}=await import('/js/core/logic-sequences.js');return sequenceRuntime.globals.chambreChoice===choice;},answer+1);
   await wait(async()=>{const {state}=await import('/js/core/state.js');return state.entities.find(o=>o.tags?.includes('chambre07-hunter'))?.ai?.enabled===true;});
   const savedChase=await save();
   assert.equal(savedChase.entities.find(o=>o.tags?.includes('chambre07-hunter'))?.ai?.enabled,true,'F5 did not persist the active hunter: '+JSON.stringify({globals:savedChase.globals,fired:savedChase.fired,dialogue:savedChase.session.dialogue}));
   await resume();
   const chase=await snapshot();assert.equal(chase.globals.chambreChoice,answer+1);assert.equal(chase.hunter,true,'Reload lost hunter: '+JSON.stringify(chase));
   assert.equal(chase.objectives['chambre:exit']?.status,'active');
   await approach('Porte de sortie');
   await wait(async()=>{const {gameSession}=await import('/js/core/game-session.js');return gameSession.phase==='won';});
   const ending=(await snapshot()).notice;assert.match(ending,answer===0?/LA MÉMOIRE/:/LA RUPTURE/);
   const savedEnding=await save();assert.equal(savedEnding.session.phase,'won');assert.equal(savedEnding.session.notice,ending);
   assert.equal((await snapshot()).notice,ending,'F5 replaced the ending');await resume();
   await page.getByRole('heading',{name:'Mission accomplie',exact:true}).waitFor();
   const final=await snapshot();assert.equal(final.phase,'won');assert.equal(final.notice,ending);
   assert.equal(final.objectives['chambre:exit']?.status,'complete');assert.deepEqual(final.errors,[]);
   assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(external,[]);
   await page.screenshot({path:path.join(output,'chambre07-ending-'+answer+'.png'),timeout:20000});
   results.push({answer,ending,phase:final.phase,completed:Object.values(final.objectives).filter(o=>o.status==='complete').length,coldResumes:6});
  }finally{await context.close();}
 }
 return results;
}

export async function verifyLegacy2dOutcome(browser,{origin,output}){
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 try{
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Jouer',exact:true}).waitFor({timeout:45000});
  const result=await page.evaluate(async()=>{
   const {restoreWorkspaces,workspace}=await import('/js/core/workspaces.js'),{restoreGameProject,freshGameProject}=await import('/js/core/game-project.js');
   const {state,notify}=await import('/js/core/state.js'),{togglePlay}=await import('/js/core/scene.js');
   const {gameSession,setGamePhase,saveGameSlot,readGameSlot,queueLoadGame}=await import('/js/core/game-session.js'),{sequenceRuntime}=await import('/js/core/logic-sequences.js');
   const project={...freshGameProject(),id:'legacy-2d-save',title:'Ancienne scène 2D',genre:'action'};
   const entities=[{id:17,type:'player',name:'Ancien joueur',skin:'scout',x:100,y:100,w:32,h:48,hp:100,legacyField:{keep:true}}];
   const slot={entities,selected:[17],nextId:18,camera:{x:0,y:0,zoom:1},game:project};
   restoreWorkspaces({workspaceMode:'2d',workspaces:{'2d':slot,'3d':{entities:[],selected:[],nextId:1,camera:{x:0,y:0,zoom:1}}}});
   restoreGameProject(project);document.dispatchEvent(new Event('warlike:project'));notify();togglePlay();
   const ctx=()=>({entities:state.entities,globals:sequenceRuntime.globals,fired:sequenceRuntime.fired});
   setGamePhase('won','Ancienne mission terminée.');saveGameSlot(ctx());
   const key='warlike.save.v1:legacy-2d-save:quick',legacy=readGameSlot(ctx());delete legacy.session.notice;
   localStorage.setItem(key,JSON.stringify(legacy));const before=localStorage.getItem(key);
   setGamePhase('playing');state.entities[0].x=900;queueLoadGame(ctx());
   await new Promise((resolve,reject)=>{
    const started=performance.now();function check(){
     if(gameSession.pending===null&&gameSession.phase==='won')resolve();
     else if(performance.now()-started>10000)reject(Error('2D legacy save did not restore'));
     else requestAnimationFrame(check);
    }requestAnimationFrame(check);
   });
   return {mode:workspace.mode,phase:gameSession.phase,notice:gameSession.notice,entity:state.entities[0],storageUnchanged:before===localStorage.getItem(key)};
  });
  assert.equal(result.mode,'2d');assert.equal(result.phase,'won');assert.equal(result.entity.x,100);
  assert.equal(result.entity.id,17);assert.deepEqual(result.entity.legacyField,{keep:true});assert.equal(result.storageUnchanged,true);
  await page.getByRole('heading',{name:'Mission accomplie',exact:true}).waitFor();
  await page.screenshot({path:path.join(output,'legacy-2d-outcome.png'),timeout:20000});assert.deepEqual(errors,[]);
  return {mode:result.mode,phase:result.phase,storageUnchanged:result.storageUnchanged};
 }finally{await context.close();}
}
