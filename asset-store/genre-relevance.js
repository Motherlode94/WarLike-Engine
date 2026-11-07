// Suggested scene uses, not claims of ready-made gameplay or built-in vehicle rigs.
const families={
 tactical:['company','battlefield','tactical','rts'],survival:['survival','fourx'],
 horror:['horror'],simulation:['simulation','rp','lifesim','openworld'],rpg:['rpg','adventure']
};
const packs={
 tactical:new Set(['animatedtanks','ultimategun','toonshootergamekit','turretpack','zombieapocalypsekit','ultimatefantasyrts','city-kit-industrial','modular-buildings','modularstreets','downtowncitymegakit','car-kit','cars']),
 survival:new Set(['survival','survival-kit','animated-characters-survivors','nature-kit','stylizednaturemegakit','modular-cave-kit','ultimatecrops','modularscifimegakit','space-station-kit']),
 horror:new Set(['zombieapocalypsekit','graveyard-kit','ultimate-monsters','ultimatehomeinterior','modular-cave-kit']),
 simulation:new Set(['factory-kit','city-kit-commercial','city-kit-industrial','city-kit-suburban','car-kit','cars','publictransport','farmbuildings','furniture-kit','ultimatehomeinterior','sushirestaurantkit','ultimatecrops']),
 rpg:new Set(['rpgcharacters','ultimaterpg','ultimate-monsters','modular-dungeon-kit','medievalvillagemegakit','fantasypropsmegakit','retro-fantasy-kit'])
};
export function recommendedGenres(asset){
 return Object.keys(families).filter(id=>packs[id].has(asset.pack)||(Array.isArray(asset.genres)&&asset.genres.some(g=>families[id].includes(g))));
}
