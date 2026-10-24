import test from 'node:test';
import assert from 'node:assert/strict';
import {audio,setAudioEnabled,setAudioVolume,playSound,initAudio,audioSettings} from '../js/core/audio.js';
test('master volume clamps correctly',()=>{
 assert.equal(setAudioVolume(1.9),1);
 assert.equal(setAudioVolume(-3),0);
 assert.equal(setAudioVolume(.42),.42);
});
test('mute state prevents any sound without browser AudioContext',()=>{
 setAudioEnabled(false);assert.equal(playSound('shot'),false);
 setAudioEnabled(true);assert.equal(typeof audioSettings().enabled,'boolean');
});
test('audio module degrades gracefully outside browser',()=>{
 assert.equal(initAudio(),false);
 assert.equal(playSound('pickup'),false);
 assert.equal(audio.ready,false);
});
