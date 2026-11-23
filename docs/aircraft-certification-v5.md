# Aircraft V5 — Certification de vol physique Rapier

## Livrables de cette étape

Deux scènes construites exclusivement avec les GameObjects natifs de WarLike Engine :

1. **`aircraftCertificationScene('airplane')`** : piste, marquages, avion physique Rapier, pilote jouable, caméra aérienne et composants sérialisables.
2. **`aircraftCertificationScene('helicopter')`** : sol, hélisurface, hélicoptère physique, pilote jouable et caméra.

Les unités sont cohérentes avec WarLike : X/Z en unités de scène (64 unités = 1 mètre), altitude Y en mètres. Les modèles visuels sont des primitives, non des GLB d'aéronefs finalisés.

## Tests automatisés

`node --test tests/aircraft-certification-v5.test.mjs`

- Contrats des scènes natives et prérequis Rigidbody3D/Collider3D ;
- Sauvegarde / réouverture via `canonicalScene` et `runtimeEntities` ;
- Préparation d'un projet autonome via `prepareGameDefinition`, vérification du graphe de modules du Player Web ;
- **Rapier réel** : poussée, portance, ascension d'hélicoptère, chute sous gravité, comparaison de l'impulsion moteur ;
- Maintien d'altitude stationnaire en égalisant poussée rotor et gravité effective de Rapier ;
- Atterrissage sur la géométrie de collision du véritable héliport, sans traversée du sol.

Les tests utilisent le vrai module `@dimforge/rapier3d-compat`. Ils ne remplacent pas le calcul de forces par des simulations factices.

## Critères de validation navigateur encore nécessaires

- Faire apparaître ces scènes dans le menu des exemples de l'éditeur avant de les présenter comme démos interactives accessibles ;
- Réaliser le cycle complet **Edit → Play → Stop → Save → Reopen → Export ZIP → Play Web exporté** ;
- Vérifier visuellement le pilotage de l'avion sur piste, la prise de vitesse et le décollage, puis l'atterrissage et les collisions. La piste n'intègre pas encore de train d'atterrissage à roues ;
- Vérifier que le pilote entre/sort, que la caméra V (cockpit/externe) fonctionne et que les instruments sont corrects ;
- Benchmarks stabilité/temps CPU avec scènes complexes et collisions multiples.

## Remarque physique importante

Le World Rapier de l'Engine utilise par défaut une gravité de **15 m/s²** ; le profil hélicoptère V2 définit une poussée maximale de **42 000 N** pour **2 200 kg**. L'équilibre statique dans cette scène demande donc environ **79 % de collectif**, et non la constante `collectiveHover` ≈ 52 % prévue par un calcul à 9,81 m/s². La correction de l'assistance au vol devra utiliser la **gravité effective de la scène**, et non une constante différente.

Les tests n'attestent pas encore la fidélité d'un simulateur aéronautique ni la certification complète du navigateur. **Ne pas fusionner tant qu'un workflow CI échoue.**
