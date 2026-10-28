# Hero Forge

Hero Forge ajoute une base de jeu de super-héros à WarLike, utilisable en 2D et en 3D. Ses composants RPG, simulation, FX et RTS peuvent aussi équiper les autres templates.

## Lancer la mission

Dans **Hub → Nouveau projet**, choisir le genre **Hero Forge · Super-héros**, puis 2D ou 3D. Dans un projet ouvert, **Game → Hero Forge · Scène super-héros** remplace la scène avec une étape d’historique annulable. Enregistrer le projet précédent si nécessaire.

La mission utilise les ressources locales Kenney et Quaternius : un héros, deux agents alliés, trois monstres, des décors destructibles, un générateur endommagé, une station et un civil. Les objectifs Blueprint demandent de secourir le civil, rétablir l’alimentation et neutraliser les trois menaces. La mort du héros déclenche la défaite.

## Contrôles en Play

| Commande | Action |
| --- | --- |
| WASD / ZQSD / flèches | Déplacement du héros |
| 1 | Trait d’énergie : projectile, collision balayée, dégâts et impact |
| 2 | Onde de choc : dégâts de zone, poussée physique et destruction |
| 3 | Ruée : déplacement limité par les obstacles, brève invulnérabilité |
| 4 | Bouclier temporaire absorbant les dégâts |
| 5 | Activer / désactiver le vol ; il consomme de l’énergie |
| Espace / X pendant le vol | Monter / descendre en 3D ; avancer vers le haut / bas de la scène en 2D |
| Maj pendant le vol | Accélérer, avec une consommation supérieure |
| 6 | Ralliement : soin, bouclier, bonus de dégâts et suivi des alliés proches |
| E près d’une installation / d’un civil | Réparer en dépensant des matériaux / secourir une fois |
| U | Dépenser un point dans la branche RPG choisie dans l’Inspecteur |
| Clic gauche sur un agent / Maj + clic | Sélection / ajout à la sélection RTS |
| Clic droit au sol / sur un ennemi | Déplacement en formation / ordre d’attaque aux agents sélectionnés |
| HUD : Suivre / Tenir / Attaquer | Ordres à la sélection, ou aux alliés si aucun agent n’est sélectionné |

La caméra 3D oriente le héros et la visée. La visée assistée privilégie une menace devant le personnage ; en 2D, le trait vise le pointeur. Les pouvoirs ont leurs propres coûts et recharges. Le HUD affiche les valeurs réellement disponibles et permet également de déclencher les pouvoirs. Il se replie quand le viewport est trop petit ; le bouton **＋** le développe avec défilement.

## Composants de l’Inspecteur

**Super-héros · Pouvoirs** propose Gardien, Vélociste, Arcaniste et Technologue. Choisir un archétype puis **Appliquer cet archétype** initialise ses statistiques. Régler ensuite couleur, énergie, régénération, dégâts, portée, ruée, bouclier et vitesse de vol. Les six emplacements sont réassignables.

**Progression RPG** conserve niveau, expérience, points et trois branches de cinq rangs : Combat augmente les dégâts ; Défense renforce la résistance et le bouclier ; Commandement améliore le soutien. Un niveau demande `100 × niveau actuel` XP et donne un point et 10 PV maximum. Les éliminations, secours, destructions et réparations donnent des récompenses ; les récompenses de ressources et de réparation sont limitées pour empêcher leur répétition sur le même décor.

**Émetteur FX** propose énergie, feu, électricité, fumée, soin et portail : couleur, débit, taille, durée, vitesse et gravité. Cocher **Prévisualiser dans la scène** pour régler un effet sans Play. Les anneaux, impacts, traînées et bulles de protection utilisent les mêmes systèmes. En 3D, les particules sont regroupées en deux lots GPU maximum ; les trois qualités limitent le total à 280, 800 ou 1 600 particules. La pause gèle la simulation et Stop nettoie les effets temporaires.

**Simulation · Réseau et monde** définit un décor destructible, un générateur, un consommateur ou un civil. Les équipements portant le même nom de réseau partagent leur production. La puissance d’un générateur dépend de son intégrité ; les consommateurs sont alimentés selon leur priorité. Une station alimentée accélère la régénération d’énergie du héros proche. Les destructions désactivent le rendu et les collisions du décor ; une réparation suffisante le rétablit. Les matériaux récupérés servent à ces réparations.

**Unité tactique RTS** règle équipe, vitesse, portée, dégâts, cadence, distance de suivi et défense automatique. Les agents utilisent la navigation sur grille A* et les collisions pour leurs déplacements. Les tirs appliquent de vrais dégâts ; les équipes alliées sont protégées.

Ajouter ces composants à un personnage ou un objet existant avec **Ajouter un composant**. La progression, les interactions de simulation, les unités et les émetteurs fonctionnent aussi sans le composant Super-héros.

## Blueprint

Le groupe **Hero Forge** expose les actions suivantes :

| Action | Usage |
| --- | --- |
| Activer un pouvoir — `castHeroPower` | `bolt`, `nova`, `dash`, `shield`, `flight`, `rally` |
| Restaurer de l’énergie — `restoreHeroEnergy` | Recharge par récompense, objet ou événement |
| Donner de l’expérience — `giveExperience` | Progression après une quête ou un combat |
| Améliorer une compétence — `upgradeHeroSkill` | `power`, `guard` ou `command` ; consomme un point |
| Émettre un effet visuel — `emitFx` | Type, couleur et échelle sur la cible |
| Secourir / réparer une installation — `repairSimulationNode` | Applique les conditions de proximité et de matériaux de l’interaction |
| Donner un ordre RTS — `rtsOrder` | `move`, `follow`, `hold`, `attack`, cible ou destination |

Les conditions vérifient l’énergie minimale, un pouvoir prêt, le vol actif, le niveau RPG, la réputation, une installation alimentée ou un civil secouru. Elles se combinent aux objectifs, variables, dialogues, sauvegardes et fins de partie existants.

## Sauvegarde, export et limites

Les composants, compétences, matériaux et ordres sont conservés dans les données de scène et les sauvegardes du jeu. L’export Web inclut les modules et les ressources réellement utilisés ; il se lance depuis un serveur HTTP local ou un hébergement statique. Le HUD de jeu est conservé dans l’export, sans le bouton d’installation de la scène de démonstration.

Le vol 3D est limité à 60 mètres et respecte les volumes de collision ; la caméra reste celle du contrôleur existant. La 2D utilise un plan de jeu, sans profondeur de vol supplémentaire. La destruction remplace l’état d’un objet et peut lui appliquer une poussée : elle ne fracture pas son maillage. La simulation énergétique fonctionne par réseau nommé, sans câblage spatial. Les FX sont procéduraux avec halos additifs ; ils ne constituent pas un système de fluides ou un post-traitement de bloom. Ces systèmes s’exécutent dans le Play Web et ne sont pas une extension du runtime C# séparé.

Le code Hero Forge et ses FX sont développés pour **WarLike Studio — Hardi Victor MBANVU / HardieBay**. Les modèles, sprites, sons et éléments UI utilisés restent crédités à **Kenney** et **Quaternius**, selon les archives CC0 livrées. Voir [Sources et licences](../SOURCES.md) et [l’inventaire des packs](complete-model-library.md).
