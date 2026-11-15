import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreGameProject,freshGameProject} from '../js/core/game-project.js';
import {gameSession,setGamePhase,saveGameSlot,readGameSlot,queueLoadGame,validateGameSave} from '../js/core/game-session.js';
import {resetSequences,updateSequences,sequenceRuntime} from '../js/core/logic-sequences.js';

function fixture(){
  restoreGameProject({...freshGameProject(),id:'saved-outcome'});resetSequences();
  const entries=new Map(),storage={getItem:key=>entries.get(key),setItem:(key,value)=>entries.set(key,value)};
  const entities=[{id:1,type:'player',name:'Legacy player',x:0,y:0,w:32,h:32,hp:100}];
  const context=()=>({playing:true,mode:'2d',entities,globals:sequenceRuntime.globals,fired:sequenceRuntime.fired,storage,keys:new Set()});
  return {entities,context,tick:()=>updateSequences(.016,context())};
}

for(const phase of ['won','lost'])test('saving and reloading a '+phase+' game retains its ending instead of resuming gameplay',()=>{
  const f=fixture(),ending=phase==='won'?'FIN · LA MÉMOIRE — Les fragments sont conservés.':'La chambre s’est refermée.';
  setGamePhase(phase,ending);saveGameSlot(f.context());
  assert.equal(gameSession.notice,ending,'saving must not overwrite the ending on screen');
  const saved=readGameSlot(f.context());assert.equal(saved.session.phase,phase);assert.equal(saved.session.notice,ending);
  setGamePhase('playing','Unrelated message');f.entities[0].x=99;
  queueLoadGame(f.context());f.tick();f.tick();
  assert.equal(gameSession.phase,phase);assert.equal(gameSession.notice,ending);assert.equal(f.entities[0].x,0);
});

test('paused and active saves resume playing without replaying stale UI notices',()=>{
  for(const phase of ['playing','paused']){
    const f=fixture();setGamePhase(phase,'Partie sauvegardée');saveGameSlot(f.context());
    queueLoadGame(f.context());f.tick();
    assert.equal(gameSession.phase,'playing');assert.equal(gameSession.notice,'');
  }
});

test('legacy saves with no notice or phase remain readable and are not rewritten',()=>{
  const f=fixture();saveGameSlot(f.context());const legacy=readGameSlot(f.context());
  delete legacy.session.notice;delete legacy.session.phase;
  const before=JSON.stringify(legacy);assert.equal(validateGameSave(legacy),legacy);
  gameSession.pending={kind:'restore',data:legacy};f.tick();
  assert.equal(gameSession.phase,'playing');assert.equal(JSON.stringify(legacy),before);
  legacy.session.phase='won';gameSession.pending={kind:'restore',data:legacy};f.tick();
  assert.equal(gameSession.phase,'won');assert.ok(gameSession.notice.length>0);
});

test('invalid saved phase or ending text is rejected before the live scene changes',()=>{
  const f=fixture();saveGameSlot(f.context());
  for(const patch of [{phase:'invalid'},{phase:{}},{notice:[]},{notice:'x'.repeat(241)}]){
    const broken=readGameSlot(f.context());Object.assign(broken.session,patch);
    assert.throws(()=>validateGameSave(broken),/partie|fin de partie/);
    assert.equal(f.entities[0].x,0);assert.equal(gameSession.phase,'playing');
  }
});
