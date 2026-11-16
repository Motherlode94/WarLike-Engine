import test from 'node:test';
import assert from 'node:assert/strict';
import {createNarrativeState,chooseNarrativeBeat,applyNarrativeBeat,advanceNarrativeTime,nextNarrativeEpisode} from '../js/core/narrative-director.js';
test('genre and context select deterministic cinematic beat',()=>{
 const s=createNarrativeState({genre:'rts'}),beats=[
 {id:'horror-scare',genres:['horror'],priority:90},
 {id:'arrival',genres:['rts'],conditions:[{type:'context',key:'reinforcements',value:true}],priority:4},
 {id:'generic',priority:1}];
 assert.equal(chooseNarrativeBeat(s,beats,{reinforcements:true}).id,'arrival');
});
test('continuity, cooldown, relationships and episodic progression',()=>{
 const s=createNarrativeState({genre:'horror'});
 const beat={id:'reveal',once:true,priority:5,tensionDelta:30,cooldown:3,flags:{liaKnown:true},relationships:{lia:15},cues:[{type:'dialogue',text:'Secret'},{type:'eval',code:'danger'}]};
 const result=applyNarrativeBeat(s,beat);
 assert.equal(s.tension,30);assert.equal(s.relationships.lia,15);assert.equal(result.cues.length,1);
 assert.equal(chooseNarrativeBeat(s,[beat]),null);
 advanceNarrativeTime(s,3);assert.equal(chooseNarrativeBeat(s,[beat]),null);
 nextNarrativeEpisode(s);assert.equal(s.episode,2);assert.equal(s.flags.liaKnown,true);
});
test('unknown conditions fail closed; priority ties are stable',()=>{
 const s=createNarrativeState();
 assert.equal(chooseNarrativeBeat(s,[{id:'unsafe',conditions:[{type:'js',code:'true'}]}]),null);
 assert.equal(chooseNarrativeBeat(s,[{id:'b'},{id:'a'}]).id,'a');
});
