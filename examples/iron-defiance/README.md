# Iron Defiance — CENDRE-01 (vertical slice RTS 3D)

Ce prototype indépendant utilise Three.js, les règles dans `game-rules.js` et un export Web compilé avec esbuild. Le menu **Game** de WarLike Engine propose une entrée vers `examples/iron-defiance/index.html`.

## Jouer
Depuis la racine d'Engine, servir le dépôt sur un serveur HTTP. Le fichier source HTML importe Three.js depuis le CDN lors du développement. Le bundle compilé dans `dist/` contient Three.js et peut fonctionner sans CDN.

- Sélection : clic gauche, rectangle de sélection, Maj pour ajouter ; G sélectionne tous les soldats et véhicules commandables.
- Clic droit sur le sol : ordre de mouvement en formation. ZQSD/WASD/flèches déplacent la caméra, molette zoome, clic droit glissé oriente la caméra.
- Space : pause ; boutons : approvisionnement, arrêt/reprise du convoi, sauvegarde/reprise, recommencer, importer GLB.
- L'objectif est d'accompagner le convoi jusqu'à l'extraction verte. L'escorte automatique ne démarre que lorsqu'une force amie est proche et qu'aucun ennemi immédiat ne menace le convoi.

## Systèmes
- Carte 3D polygonale avec routes, bâtiments statiques, barricades et couvertures ; A* sur grille 2 mètres.
- 10 unités amies dont un convoi civil, 7 unités ennemies ; distances, orientation, tir, projectiles, armures directionnelles, composants véhicule, ravitaillement.
- IA hostile de détection et engagement ; tirs bloqués par les bâtiments. Logistique et munitions limitées.
- Animation procédurale des membres et roues ; pivot simplifié de tourelle ; vrai rig humanoïde et maillage de tourelle séparé **non garantis** pour les GLB Meshy.
- Sauvegarde locale versionnée, victoire et défaite ; aucune synchronisation Cloud active.

## Installer les 12 Meshy GLB
Les **12 tâches de géométrie et texturage Meshy ont réussi**, mais les octets des GLB ne sont **pas** dans ce dépôt. Télécharger les GLB dans son espace Meshy, leur donner leur nom ID, puis importer :
`ID-INF-01.glb`, `ID-INF-02.glb`, `ID-INF-03.glb`,
`ID-ARM-01.glb`, `ID-ARM-02.glb`, `ID-ARM-03.glb`,
`ID-LOG-01.glb`, `ID-LOG-02.glb`,
`ID-DRN-01.glb`, `ID-DRN-02.glb`,
`ID-ENV-01.glb`, `ID-ENV-02.glb`.
Les fichiers choisis avec « Importer GLB Meshy » remplacent les modèles de remplacement dans la mission courante. L'import en mémoire ne persiste pas après actualisation ; installer les assets dans WarLike Library pour un archivage local.
`assets/iron-defiance-military/rig-profiles.json` documente les squelettes et pivots de chaque unité ; ces rigs ne sont pas construits automatiquement par Meshy.

## Construire un jeu Web autonome
```sh
cd examples/iron-defiance
npm install
npm test
npm run build
# servir examples/iron-defiance/dist/ sur n'importe quel hébergement HTTP statique
```
Le bundle `dist/game.js` embarque Three.js. L'option GLB charge les fichiers que choisit le joueur en mémoire du navigateur. Pour **intégrer les GLB dans l'export**, placer des fichiers normalisés dans `examples/iron-defiance/models/` avant la compilation ; la compilation les copie alors vers `dist/models/`. L'importation automatique au démarrage depuis ce répertoire constitue un chantier supplémentaire.

## Limites de validation
Les tests Node valident les règles, et la CI Chromium vérifie le chargement, la sélection de groupe, les ordres, la sauvegarde et la reprise. Le prototype n'est pas encore un projet 3D entièrement éditable dans la Scene View / Inspector de WarLike Engine : c'est une scène jouable publiée sous `examples/`.
Les GLB nécessitent encore une vérification des textures, UV, dimensions, géométrie, pivots réels, rigging, collisions de précision et animations dans le moteur. Aucun test physique de hardware ni équilibrage de campagne longue durée n'a été effectué.
