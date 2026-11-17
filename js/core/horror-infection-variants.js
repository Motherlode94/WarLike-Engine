// Environmental infection variants, unrelated to a person's nationality.
// No implicit claims about real people, epidemiology, or geography.
import {creaturePreset} from './horror-creatures.js';
export const INFECTION_VARIANTS=Object.freeze({
 ordinary:{name:'Infecté errant',kind:'walker',habitat:'urban',visual:'déchirures et poussière',cue:'pas irréguliers',noiseResponse:'pursuit',packSize:3},
 bloated:{name:'Colosse muté',kind:'brute',habitat:'industrial',visual:'silhouette lourde, épaules asymétriques',cue:'respiration sourde',noiseResponse:'investigate',packSize:1},
 burrower:{name:'Rampant',kind:'crawler',habitat:'underground',visual:'quatre appuis, vêtements râpés',cue:'griffures au sol',noiseResponse:'ambush',packSize:2},
 echo:{name:'Échotraumatisé',kind:'stalker',habitat:'hospital',visual:'bandelettes et visage masqué',cue:'imitation de voix',noiseResponse:'stalk',packSize:1},
 ash:{name:'Cendreux',kind:'walker',habitat:'ashlands',visual:'peau et tissus couverts de suie',cue:'toux sèche',noiseResponse:'pursuit',packSize:4},
 frost:{name:'Givré',kind:'brute',habitat:'snow',visual:'givre sur les protections et les membres',cue:'craquements',noiseResponse:'investigate',packSize:1},
 marsh:{name:'Marécageux',kind:'crawler',habitat:'wetlands',visual:'boue et algues',cue:'clapotis',noiseResponse:'ambush',packSize:2}
});
export function infectedVariantPreset(id='ordinary'){
 const variant=INFECTION_VARIANTS[id];if(!variant)throw Error('Variante infectée inconnue');
 const preset=creaturePreset(variant.kind);
 preset.horrorCreature.variant=id;
 preset.horrorCreature.habitat=variant.habitat;
 preset.horrorCreature.visualDesign=variant.visual;
 preset.horrorCreature.audioCue=variant.cue;
 preset.horrorCreature.packSize=variant.packSize;
 preset.horrorCreature.noiseResponse=variant.noiseResponse;
 return preset;
}
