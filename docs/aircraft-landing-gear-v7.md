# Aircraft V7 — Train d’atterrissage physique Rapier

## Intégration native
En 3D, ajouter **Vehicles → Aircraft → Aircraft Landing Gear**. Le composant crée les dépendances Aircraft Physics, Aircraft Systems, Collider3D et Rigidbody3D dynamique si elles sont absentes. L’Inspector générique expose ses paramètres.

Chaque train contient trois supports configurés en mètres avec un rayon, une longueur au repos, une course, un ressort, un amortisseur, une adhérence et une capacité de freinage. Des raycasts Rapier sont effectués au pas fixe, en excluant le châssis propre. Les forces sont appliquées au point de contact réel avec le sol, sans téléportation.

## Pilotage
- **G** : rétracter/déployer le train (Aircraft Systems V6). Train rentré : zéro contact de roue.
- **Espace** : freinage des roues pendant le pilotage. Le frein ne produit pas de poussée motrice.
- Le type du train doit correspondre au profil avion ou hélicoptère.

## Limites
Le train utilise une **suspension simulée par raycasts**, pas encore des roues indépendantes avec joints Rapier. Les collisions du fuselage restent actives. Il faut positionner et dimensionner les roues selon le modèle GLB choisi, vérifier l’absence de contact prématuré du fuselage et certifier les poses visuelles en Play comme après export.

## Validation
- Tests Node ciblés: aircraft-landing-gear-v7.test.mjs et aircraft-landing-gear-integration-v7.test.mjs
- Certifier le contact piste/héliport, la compression du train, les freins, la rétraction, l'export Web et la non-régression du vol V5/V6.
- Aucun résultat CI vert ne remplace un essai visuel sur vrai modèle GLB.
