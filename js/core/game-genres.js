// Shared project metadata. This module has no engine, DOM or scene-factory imports.
export const genreTemplates={
 superhero:{label:'Hero Forge · Super-héros',description:'Pouvoirs, FX, progression RPG, monde réactif et escouade RTS',modes:['2d','3d']},
 sandbox:{label:'Projet vierge',description:'Scène minimale et bibliothèque libre',modes:['2d','3d']},
 tactical:{label:'FPS / TPS',description:'Capture et escouade de combat',modes:['2d','3d']},
 openworld:{label:'Monde ouvert',description:'Vehicule, PNJ et mission',modes:['2d','3d']},
 platformer:{label:'Plateforme',description:'Personnage, saut, gravité, plateformes et obstacles Kenney',modes:['2d']},
 survival:{label:'Survival · Survie',description:'Besoins vitaux, récolte, fabrication, campement et dangers nocturnes',modes:['2d','3d']},
 rts:{label:'RTS',description:'Unites et capture',modes:['2d','3d']},
 horror:{label:'Horror',description:'Traque, cachette et generatrice',modes:['2d','3d']},
 fieldlab:{label:'WarLike Field Lab',description:'Circuit de diagnostic : marche, interactions, véhicule et obstacles',modes:['2d','3d']},
 rp:{label:'Roleplay (RP)',description:'Ville, PNJ, dialogue, boutique, réputation',modes:['2d','3d']},
 racing:{label:'Racing',description:'Véhicule pilotable, départ, checkpoints, arrivée',modes:['2d','3d']},
 simulation:{label:'Simulation',description:'Atelier, machines, production et ressources',modes:['2d','3d']},
 rpg:{label:'RPG',description:'Personnage, quête, expérience, marchand et soin',modes:['2d','3d']},
 fourx:{label:'Stratégie 4X',description:'Explorer, étendre, exploiter, exterminer (prototype au tour par tour)',modes:['2d','3d']}
};

const details={
 superhero:{stage:'playable',features:['Six pouvoirs, animations et effets visuels','Progression RPG et escouade','Mission, secours et destruction']},
 survival:{stage:'playable',features:['Besoins vitaux, ressources et inventaire','Fabrication, feu et abri','Cycle jour/nuit et dangers']},
 platformer:{stage:'playable',features:['Sprites Kenney et contrôleur plateforme','Gravité, saut et course','Sols solides, plateformes et caisses physiques']},
 sandbox:{stage:'blank',features:['Une scène minimale à construire librement']},
 fieldlab:{stage:'tool',features:['Circuit de diagnostic des contrôles, interactions et véhicules']},
 tactical:{stage:'base',labels:{'2d':'Action · Vue du dessus','3d':'Action · FPS / TPS'},features:['Joueur, couverture et adversaire','Véhicule armé et objectif de capture']},
 openworld:{stage:'base',features:['Véhicule, PNJ et livraison']},
 rts:{stage:'base',features:['Escouade, ressources et capture','Navigation et ordres tactiques à personnaliser']},
 horror:{stage:'base',features:['Traqueur, cachette et génératrice']},
 rp:{stage:'base',features:['PNJ, emploi et commerce','Monnaie et réputation via Blueprint']},
 racing:{stage:'base',features:['Véhicule pilotable et circuit','Départ, checkpoint et arrivée']},
 simulation:{stage:'base',features:['Atelier, production et maintenance','Exemples d’économie Blueprint']},
 rpg:{stage:'base',features:['Quête, marchand, soin et inventaire','Exemples de progression Blueprint']},
 fourx:{stage:'base',features:['Exploration, colonisation et ressources','Prototype de fin de tour ; sans adversaire stratégique autonome']}
};
for(const [id,info] of Object.entries(details))Object.assign(genreTemplates[id],info);
export const normalizeGenre=value=>Object.hasOwn(genreTemplates,value)?value:'sandbox';
export const genreCompatible=(genre,mode)=>Object.hasOwn(genreTemplates,genre)&&genreTemplates[genre].modes.includes(mode);
export const compatibleGenres=mode=>Object.entries(genreTemplates).filter(([,template])=>template.modes.includes(mode));
export const genreForMode=(genre,mode)=>genreCompatible(genre,mode)?genre:'sandbox';
export const genreLabel=(genre,mode)=>{const template=genreTemplates[normalizeGenre(genre)];return template.labels?.[mode]||template.label};
export const genreStage=genre=>({playable:'Scène jouable',base:'Base à compléter',tool:'Outil de diagnostic',blank:'Projet libre'})[genreTemplates[normalizeGenre(genre)].stage];
// Infer only when older data has no valid genre metadata. Explicit choices win.
export function resolveGameGenre(value,entities=[]){
 if(Object.hasOwn(genreTemplates,value))return value;
 if(!Array.isArray(entities))return 'sandbox';
 entities=entities.filter(o=>o&&typeof o==='object');
 if(entities.some(o=>o.survival))return 'survival';
 if(entities.some(o=>o.superhero))return 'superhero';
 if(entities.some(o=>Array.isArray(o.tags)&&o.tags.some(t=>typeof t==='string'&&t.startsWith('fieldlab-'))))return 'fieldlab';
 const native=new Set(entities.flatMap(o=>(Array.isArray(o.csharpComponents)?o.csharpComponents:[]).filter(Boolean).map(c=>c.kind)));
 for(const [kind,genre] of [['FourXEmpire','fourx'],['Roleplay','rp'],['SimulationEconomy','simulation'],['RpgProgression','rpg'],['RacingRules','racing']])if(native.has(kind))return genre;
 if(entities.some(o=>Array.isArray(o.tags)&&o.tags.includes('race-vehicle')))return 'racing';
 if(entities.some(o=>o.controller2d?.mode==='platformer'))return 'platformer';
 return 'sandbox';
}
