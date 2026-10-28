// French authoring labels and parameter schemas. Runtime opcodes stay stable.
const groups={
 'Survie · Fabrication':['survivalInteract','craftSurvivalItem','consumeSurvivalItem','repairSurvivalTool'],
 'Animation & FX':['playAnimatorState','setAnimatorParameter','emitOwnedFx'],
 'Hero Forge':['castHeroPower','restoreHeroEnergy','giveExperience','upgradeHeroSkill','emitFx','repairSimulationNode','rtsOrder'],
 'Logique':['branch','wait','emitSignal','enableObject'],
 'Variables':['setVariable','addVariable','setLocal','addLocal'],
 'Partie & sauvegarde':['winGame','loseGame','pauseGame','resumeGame','saveGame','loadGame','setCheckpoint','restoreCheckpoint','loadScene'],
 'Objectifs & temps':['setObjective','addObjectiveProgress','completeObjective','startTimer','stopTimer'],
 'Interface & dialogue':['message','showDialogue','closeDialogue'],
 'Monde & objets':['spawnObject','destroyObject','moveObject','teleportObject','setPosition','setRotation','setScale','setColor','setVisibility','setCollision','setTag','removeTag','setLight','setAudio'],
 'Personnage & inventaire':['setHealth','addHealth','damageObject','healObject','giveItem','removeItem','equipItem','setAnimation','setBehavior','setSpeed','addSpeed','setStamina','addStamina'],
 'Score & équipe':['setScore','addScore','setTeam'],
 'Survie & horreur':['setHunger','addHunger','setThirst','addThirst','setFear','setThreat'],
 'Intelligence artificielle':['setAiState','setAiFaction','setAiTarget','clearAiTarget','setAiEnabled','setAiDetection','setAiAttackRange','setAiPatrolPoint','setAiLineOfSight','setAiFieldOfView','setAiMemory','setAiSearchDuration']
};
export const instructionLabels={
 repairSurvivalTool:'Réparer un outil de survie',survivalInteract:'Récolter une ressource de survie',craftSurvivalItem:'Fabriquer un objet de survie',consumeSurvivalItem:'Utiliser une provision ou un campement',
 playAnimatorState:'Activer un état Animator',setAnimatorParameter:'Définir un paramètre Animator',emitOwnedFx:'Déclencher le FX de l’objet',
 castHeroPower:'Activer un pouvoir',restoreHeroEnergy:'Restaurer de l’énergie',giveExperience:'Donner de l’expérience',upgradeHeroSkill:'Améliorer une compétence',emitFx:'Émettre un effet visuel',repairSimulationNode:'Secourir / réparer une installation',rtsOrder:'Donner un ordre RTS',
 branch:'Si / Sinon',wait:'Attendre',emitSignal:'Envoyer un signal',enableObject:'Activer un objet',
 setVariable:'Définir une variable',addVariable:'Modifier une variable',setLocal:'Définir une variable locale',addLocal:'Modifier une variable locale',
 winGame:'Terminer par une victoire',loseGame:'Terminer par une défaite',pauseGame:'Mettre en pause',resumeGame:'Reprendre la partie',saveGame:'Sauvegarder la partie',loadGame:'Charger une sauvegarde',setCheckpoint:'Poser un checkpoint',restoreCheckpoint:'Revenir au checkpoint',loadScene:'Changer de scène',
 setObjective:'Créer un objectif',addObjectiveProgress:'Faire progresser un objectif',completeObjective:'Terminer un objectif',startTimer:'Démarrer un compte à rebours',stopTimer:'Arrêter un compte à rebours',
 message:'Afficher un message',showDialogue:'Afficher un dialogue',closeDialogue:'Fermer le dialogue',
 spawnObject:'Créer une instance d’objet',destroyObject:'Détruire un objet',moveObject:'Déplacer un objet',teleportObject:'Téléporter un objet',setPosition:'Définir la position',setRotation:'Définir la rotation',setScale:'Définir l’échelle',setColor:'Changer la couleur',setVisibility:'Afficher / masquer',setCollision:'Activer la collision',setTag:'Ajouter un tag',removeTag:'Retirer un tag',
 setHealth:'Définir la santé',addHealth:'Modifier la santé',damageObject:'Infliger des dégâts',healObject:'Soigner',giveItem:'Donner un objet',removeItem:'Retirer un objet',equipItem:'Équiper un objet',setAnimation:'Jouer une animation',setBehavior:'Définir le comportement',setSpeed:'Définir la vitesse',addSpeed:'Modifier la vitesse',
 setAiState:'Définir l’état IA',setAiFaction:'Définir la faction',setAiTarget:'Désigner une cible IA',clearAiTarget:'Oublier la cible IA',setAiEnabled:'Activer l’IA',setAiDetection:'Régler la détection',setAiAttackRange:'Régler la portée d’attaque',setAiPatrolPoint:'Définir le point de patrouille',setAiLineOfSight:'Exiger une ligne de vue',setAiFieldOfView:'Régler le champ de vision',setAiMemory:'Régler la mémoire IA',setAiSearchDuration:'Régler la durée de recherche',
 reloadWeapon:'Recharger l’arme',setWeaponAmmo:'Définir les munitions',addWeaponAmmo:'Ajouter des munitions',setWeaponDamage:'Définir les dégâts de l’arme',repairVehicle:'Réparer le véhicule',refuelVehicle:'Ravitailler le véhicule',setVehicleEngine:'Allumer le moteur',fireVehicleWeapon:'Tirer avec le véhicule',setVehicleGear:'Changer de rapport',setVehicleWeapon:'Armer le véhicule',
 setScore:'Définir le score',addScore:'Modifier le score',setTeam:'Changer d’équipe',setFuel:'Définir le carburant',addFuel:'Modifier le carburant',setHunger:'Définir la faim',addHunger:'Modifier la faim',setThirst:'Définir la soif',addThirst:'Modifier la soif',setStamina:'Définir l’endurance',addStamina:'Modifier l’endurance',setFear:'Définir la peur',setThreat:'Définir le niveau de menace',setLight:'Allumer / éteindre la lumière',setAudio:'Activer / couper le son',setVehicleState:'Définir l’état du véhicule'
};
export const conditionLabels={survivalToolUsable:'Outil de survie utilisable',survivalToolDurabilityBelow:'Durabilité d’un outil inférieure à',survivalMilestone:'Étape de campement partagée',survivalPartyDefeated:'Tous les survivants à terre',survivalNeedBelow:'Besoin vital inférieur à',survivalBuilt:'Campement construit',survivalNightsAtLeast:'Nuits survécues au moins égales à',animatorStateIs:'État Animator actif',heroEnergyAbove:'Énergie du héros au moins égale à',heroPowerReady:'Pouvoir prêt',heroFlightActive:'Vol actif',rpgLevelAtLeast:'Niveau RPG au moins égal à',heroReputationAtLeast:'Réputation au moins égale à',simulationPowered:'Installation alimentée',simulationRescued:'Civil secouru',always:'Toujours vrai',variable:'Variable globale',localVariable:'Variable locale',distanceLess:'Joueur à proximité',distanceGreater:'Joueur éloigné',healthBelow:'Santé inférieure à',healthAbove:'Santé supérieure à',inventoryHas:'Possède un objet',inventoryMissing:'Objet manquant',hasTag:'Possède un tag',tagMissing:'Tag absent',objectEnabled:'Objet activé',playerInVehicle:'Joueur en véhicule',playerOnFoot:'Joueur à pied',randomChance:'Probabilité',aiStateIs:'État de l’IA',aiCanSeeTarget:'Cible visible',aiHasTarget:'Cible acquise',aiAwarenessAbove:'Niveau d’alerte supérieur à',sameFaction:'Même faction que le joueur',isHostile:'Hostile au joueur',entityExists:'Objet présent',objectiveActive:'Objectif en cours',objectiveComplete:'Objectif terminé',timerRunning:'Compte à rebours actif',timerExpired:'Temps écoulé',gamePhaseIs:'État de la partie',saveExists:'Sauvegarde disponible',speedAbove:'Vitesse supérieure à',speedBelow:'Vitesse inférieure à',distanceToPointLess:'Proche d’un point',distanceToPointGreater:'Éloigné d’un point',horrorThreatAbove:'Menace supérieure à',horrorFearAbove:'Peur supérieure à',gameTimeAbove:'Temps de jeu supérieur à',objectType:'Type d’objet',weaponAmmoAbove:'Munitions supérieures à',weaponReady:'Arme prête',vehicleDriveable:'Véhicule utilisable',vehicleFuelBelow:'Carburant inférieur à',vehicleHealthBelow:'Santé du véhicule inférieure à',vehicleHasDriver:'Véhicule conduit'};
export const eventLabels={start:'Au démarrage',interact:'À l’interaction',enter:'À l’entrée dans la zone',exit:'À la sortie de la zone',keyDown:'À l’appui d’une touche',interval:'À intervalle régulier',signal:'À la réception d’un signal',healthChanged:'Quand la santé change',death:'À la mort de l’objet',variableChanged:'Quand une variable change',objectiveCompleted:'Quand un objectif est terminé',timerExpired:'Quand le temps est écoulé'};
const words=value=>String(value).replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());
export const labelFor=(type,kind='action')=>(kind==='event'?eventLabels:kind==='condition'?conditionLabels:instructionLabels)[type]||words(type);
export const actionGroup=type=>Object.entries(groups).find(([,types])=>types.includes(type))?.[0]||(/Vehicle|Fuel|Gear/.test(type)?'Véhicules':/Weapon/.test(type)?'Armes':'Gameplay avancé');
const keyed=new Set(['setVariable','addVariable','setLocal','addLocal','giveItem','removeItem','equipItem','setObjective','completeObjective','addObjectiveProgress','startTimer','stopTimer','saveGame','loadGame']);
const keyConditions=new Set(['variable','localVariable','inventoryHas','inventoryMissing','objectiveActive','objectiveComplete','timerRunning','timerExpired','saveExists']);
const bools=new Set(['enableObject','setVisibility','setCollision','setLight','setAudio','setVehicleEngine','setVehicleWeapon','setAiEnabled','setAiLineOfSight']);
const texts=new Set(['message','showDialogue','setVariable','setLocal','setAnimation','setBehavior','emitSignal','setTag','removeTag','setObjective','setAiState','setAiFaction','loadScene','winGame','loseGame','setVehicleState']);
const noValue=new Set(['branch','destroyObject','equipItem','completeObjective','setCheckpoint','restoreCheckpoint','stopTimer','saveGame','loadGame','pauseGame','resumeGame','closeDialogue','clearAiTarget','reloadWeapon','fireVehicleWeapon']);
export const targetable=type=>!['branch','wait','message','emitSignal','setVariable','addVariable','setLocal','addLocal','setObjective','completeObjective','addObjectiveProgress','startTimer','stopTimer','saveGame','loadGame','restoreCheckpoint','loadScene','winGame','loseGame','pauseGame','resumeGame','showDialogue','closeDialogue','spawnObject'].includes(type);
export function actionFields(type){
 if(type==='repairSurvivalTool')return [{key:'value',label:'Outil',type:'select',choices:['axe','pickaxe']}];
 if(type==='survivalInteract')return [];
 if(type==='craftSurvivalItem')return [{key:'value',label:'Recette',type:'select',choices:['campfire','shelter','bandage','meal','axe','pickaxe']}];
 if(type==='consumeSurvivalItem')return [{key:'value',label:'Action',type:'select',choices:['drink','eat','rest','refuel','revive']}];
 if(type==='playAnimatorState')return [{key:'value',label:'Identifiant de l’état',type:'text',default:'motion'},{key:'duration',label:'Durée · s',type:'number',default:1}];
 if(type==='setAnimatorParameter')return [{key:'key',label:'Nom du paramètre',type:'text'},{key:'value',label:'Valeur',type:'text'},{key:'valueType',label:'Type',type:'select',choices:['number','boolean','string']}];
 if(type==='emitOwnedFx')return [{key:'value',label:'Nombre de particules',type:'number',default:24}];
 if(type==='castHeroPower')return [{key:'value',label:'Pouvoir',type:'select',choices:['bolt','nova','dash','shield','flight','rally']}];
 if(type==='upgradeHeroSkill')return [{key:'value',label:'Branche',type:'select',choices:['power','guard','command']}];
 if(type==='emitFx')return [{key:'value',label:'Effet',type:'select',choices:['energy','fire','electric','smoke','heal','portal']},{key:'color',label:'Couleur #RRGGBB',type:'text',default:'#64e9ff'},{key:'scale',label:'Échelle',type:'number',default:1}];
 if(type==='repairSimulationNode')return [];
 if(type==='rtsOrder')return [{key:'value',label:'Ordre',type:'select',choices:['move','follow','hold','attack']},{key:'key',label:'ID cible · vide = joueur',type:'text'},{key:'x',label:'Destination X · déplacement',type:'number'},{key:'y',label:'Destination Y/Z · déplacement',type:'number'}];
 const fields=[];
 if(keyed.has(type))fields.push({key:'key',label:/Game$/.test(type)?'Emplacement de sauvegarde':/Objective/.test(type)?'Identifiant de l’objectif':/Timer/.test(type)?'Identifiant du compte à rebours':/Item/.test(type)?'Identifiant de l’objet':'Nom de variable',type:'text'});
 if(!noValue.has(type))fields.push({key:'value',label:type==='wait'?'Durée (secondes)':type==='showDialogue'?'Texte du dialogue':type==='loadScene'?'Identifiant de la scène':type==='spawnObject'?'ID de l’objet modèle':type==='setObjective'?'Texte de l’objectif':type==='startTimer'?'Durée (secondes)':type==='emitSignal'?'Nom du signal':'Valeur',type:bools.has(type)?'boolean':texts.has(type)?'text':'number'});
 if(['moveObject','teleportObject','setPosition','setAiPatrolPoint','spawnObject'].includes(type))fields.push({key:'x',label:'X',type:'number'},{key:'y',label:'Y / Z au sol',type:'number'});
 if(type==='setObjective')fields.push({key:'total',label:'Quantité à atteindre',type:'number',default:1});
 if(type==='showDialogue')fields.push({key:'speaker',label:'Nom du personnage',type:'text'},{key:'signal',label:'Signal à la fermeture',type:'text',default:'dialogue:closed'});
 if(type==='equipItem')fields.push({key:'slot',label:'Emplacement',type:'select',choices:['weapon','armor']});
 if(type==='spawnObject')fields.push({key:'name',label:'Nom de l’instance',type:'text'});
 return fields;
}
export function conditionFields(type){
 if(type==='survivalToolUsable'||type==='survivalToolDurabilityBelow')return [{key:'key',label:'Outil',type:'select',choices:['axe','pickaxe']},...(type==='survivalToolDurabilityBelow'?[{key:'value',label:'Durabilité restante · %',type:'number',default:25}]:[])];
 if(type==='survivalMilestone')return [{key:'key',label:'Étape',type:'select',choices:['campfire','shelter','meal','dawn','expedition']}];
 if(type==='survivalPartyDefeated')return [];
 if(type==='survivalNeedBelow')return [{key:'key',label:'Besoin',type:'select',choices:['food','water','rest','warmth']},{key:'value',label:'Seuil · %',type:'number',default:20}];
 if(type==='survivalBuilt')return [{key:'key',label:'Construction',type:'select',choices:['campfire','shelter']}];
 if(type==='survivalNightsAtLeast')return [{key:'value',label:'Nuits',type:'number',default:1}];
 if(type==='animatorStateIs')return [{key:'value',label:'Identifiant de l’état',type:'text',default:'motion'}];
 if(type==='heroPowerReady')return [{key:'value',label:'Pouvoir',type:'select',choices:['bolt','nova','dash','shield','flight','rally']}];
 if(['heroFlightActive','simulationPowered','simulationRescued'].includes(type))return [];
 const fields=[];
 if(keyConditions.has(type))fields.push({key:'key',label:'Identifiant',type:'text'});
 if(['distanceToPointLess','distanceToPointGreater'].includes(type))fields.push({key:'x',label:'Point X',type:'number'},{key:'y',label:'Point Y / Z au sol',type:'number'});
 if(['variable','localVariable'].includes(type))fields.push({key:'operator',label:'Comparaison',type:'select',choices:['==','!=','>','<','>=','<=']});
 if(!['always','objectEnabled','playerInVehicle','playerOnFoot','aiCanSeeTarget','aiHasTarget','sameFaction','isHostile','objectiveActive','objectiveComplete','timerRunning','timerExpired','saveExists','vehicleDriveable','vehicleHasDriver','weaponReady'].includes(type))fields.push({key:'value',label:['distanceToPointLess','distanceToPointGreater'].includes(type)?'Distance':'Valeur',type:['variable','localVariable','hasTag','tagMissing','aiStateIs','objectType','gamePhaseIs'].includes(type)?'text':'number'});
 return fields;
}
export function eventFields(type){
 const fields=[];
 if(['interact','enter','exit'].includes(type))fields.push({key:'radius',label:'Rayon de la zone',type:'number',default:96});
 if(['interact','keyDown'].includes(type))fields.push({key:'key',label:'Touche',type:'text',default:'e'});
 if(['signal','objectiveCompleted','timerExpired'].includes(type))fields.push({key:'signal',label:type==='signal'?'Nom du signal':'Identifiant',type:'text'});
 if(type==='interval')fields.push({key:'interval',label:'Intervalle (secondes)',type:'number',default:2});
 if(type==='variableChanged')fields.push({key:'variable',label:'Nom de la variable',type:'text'});
 return fields;
}
