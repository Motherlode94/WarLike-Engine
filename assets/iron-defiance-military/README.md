# Iron Defiance — WarLike Military Asset Pack Vol. 1

12 assets 3D originaux ont été générés comme géométries dans Meshy. Consultez `manifest.json` pour les identifiants des tâches Meshy et leur catégorie.

## Pipeline
1. Contrôler visuellement chaque modèle Meshy et son texturage.
2. Télécharger les **GLB** depuis Meshy (ne pas insérer de lien signé périmable dans le dépôt).
3. Placer les GLB validés dans ce dossier `assets/iron-defiance-military/` ou dans WarLike Library. Remplir `glbPath` dans le manifeste après import effectif.
4. Vérifier orientations, dimensions en mètres, UV/matériaux, normals, tri count et rendu dans WarLike Engine.
5. Séparer roues, tourelles, canons, chenilles et rotors. Pour les soldats : retopologie/rig humanoïde et animation dans Rig Studio.
6. Ajouter colliders, points de feu et couverture ; tester dans l'éditeur **et** dans l'export Web.

**Important** : le modèle AI peut produire une seule géométrie fusionnée ; les pivots requis ne sont pas garantis. Ni rigging, ni mouvements, ni collisions, ni import GLB dans Engine ne sont déclarés terminés.

Les identifiants des tâches sont des références de génération ; aucune URL temporaire ni jeton privé n'est versionné.
