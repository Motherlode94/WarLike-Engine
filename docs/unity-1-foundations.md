# WarLike Engine — Fondation robuste inspirée de Unity 1.0 (2005)

> Objectif : emprunter les **principes** d'un éditeur 3D utilisable de bout en bout. Aucun code, asset, marque ou composant propriétaire Unity n'est copié.

## Base historique vérifiée

- Juin-juillet 2005 : Unity 1.0.x sur Mac, moteur graphique, physique Novodex, scripts sur environnement .NET, éditeur commercial et jeu GooBall (Game Developer, 14 juillet 2005).
- Août 2005 : Unity **1.1** ajoute la publication Windows, un SDK de plugins C/C++ et améliore les workflows de projets volumineux (Macworld, 22 août 2005). Ces fonctions ne doivent **pas** être attribuées à Unity 1.0.
- Décembre 2005 : Unity **1.2** améliore encore l'éditeur, le rendu et le workflow ; ne pas confondre avec la première sortie.

Sources :
- https://www.gamedeveloper.com/game-platforms/overtheedge-announces-unity-1-0-2-release
- https://www.macworld.com/article/176746/unity-3.html
- https://www.mactech.com/2005/12/24/unity-1-2-3d-game-editor/

## Les invariants WarLike à construire

| Pilier | Garantie attendue | Fichiers & vérifications |
|---|---|---|
| Scene/Game | Même scène, même IDs, pas de perte d'objets à la conversion | `scene-contract.js`, tests de sérialisation |
| GameObject/Component | Transform stable, composants sérialisés, unknown components préservés | `component-definitions.js`, `inspector-model.js` |
| Physique | Sol, Character Controller, collisions et triggers cohérents | `physics-3d.js`, tests de gameplay |
| Prefabs | L'instance n'hérite ni du `parentId` ni des IDs du modèle source ; overrides respectés | `prefab-library.js`, tests de duplication |
| Play | Exécuter le jeu sans modifier définitivement la scène éditée | `runtime-session.js`, tests Play/Stop |
| Sauvegarde | Après une erreur d'écriture ou de lecture, garder la dernière version récupérable | `project-storage-guard.js`, `project-hub.js` |
| Build | Package Web autonome, modèle GLB et textures contenus dans le runtime, erreur explicite si ressource absente | `game-build.js`, tests Chromium |
| Ergonomie | Scene/Hierarchy/Inspector/Project clairs, fonctions avancées non destructrices | `docking.js`, `focus-menu.js` |

### Correctifs implémentés dans ce lot

1. **Prefabs de GameObject unique** : nettoyage des références source `parentId`, `sceneObjectId`, `prefabSourceId`, `prefabOverrides` et métadonnées d'instance. Les anciens prefabs mal enregistrés restent instanciables comme racines indépendantes. Cette mesure ne remplace **pas** un moteur de prefabs imbriqués.
2. **Sauvegarde de projets** : avant de remplacer un snapshot valide, copie de secours dans `warlike.hub.project.<id>.backup.v1`, puis écriture du projet et de l'index. Si l'écriture de l'index échoue, tentative de rollback du projet. Si la sauvegarde principale est endommagée, ouverture depuis la copie de secours avec un avertissement.
3. **Tests** : `tests/project-storage-guard.test.mjs`, `tests/project-hub.test.mjs` et `tests/prefab-library.test.mjs`.

### Limites de sécurité des sauvegardes

- Le backup est **local au même navigateur et au même stockage** ; il ne protège pas contre une suppression de toutes les données de site ou un disque perdu. Pour un backup indépendant, exporter le projet et ses assets.
- En cas de quota de stockage insuffisant, la copie de secours peut échouer. Le moteur tente alors l'écriture et le rollback mais ne peut garantir la récupération lorsque le navigateur refuse **toutes** les écritures.
- Une version antérieure à ce correctif n'a pas nécessairement de copie de secours ; la règle ne reconstitue pas des données qui n'existent plus.
- Les sauvegardes de progression d'un jeu et les projets de l'éditeur sont deux flux distincts. Cette modification concerne le **Hub de projets**.
- Le test automatisé est une exigence de robustesse, pas une preuve d'équivalence graphique, fonctionnelle ou de performance avec Unity.

## Ordre de la prochaine consolidation

**P0** : Play/Stop sans mutations involontaires, données et dépendances GLB, validation scènes historiques, build reproductible.

**P1** : Inspector entièrement typé, prefabs hiérarchiques et variantes, éditeur d'animation rig/IK fiable.

**P2** : ombres et rendu PBR plus complet, profilage, optimisations pour grandes scènes.

Cette feuille de route reste soumise à la règle [WL-COMPAT-001](../AGENTS.md). La compatibilité des anciens projets doit être éprouvée, et non déclarée par défaut.

## Lot Inspector ↔ Play ↔ Export — novembre 2026

WarLike distingue désormais les composants avec **Inspector dédié** et les composants enregistrés sans vue spécialisée. Ces derniers reçoivent un panneau de repli éditable pour leurs champs scalaires (nombre, texte et booléen) dans `js/ui/generic-component-inspector.js`. Les valeurs restent dans les **données du composant d'origine**, sans nouveau format de sauvegarde. Les composants complexes et les tableaux ne sont pas modifiés arbitrairement.

- Ajouter via `Add Component` : le composant doit apparaître dans l'Inspector.
- Éditer : changement validé par `setInspectorValue`, historique et notifications de l'éditeur.
- Réinitialiser ou supprimer : respect des dépendances définies dans `componentRemovalBlockers` ; désactivation pendant Play.
- Convertir / exporter : les données de composant restent dans l'entité, y compris pour les scènes `warlike.scene.v2` via `LegacyEntity`.
- Régression : `tests/generic-component-inspector.test.mjs` vérifie les composants d'horreur et du monde ouvert, le round-trip et l'export.

**Limite :** ce panneau de repli ne remplace pas un éditeur spécialisé pour les graphes, scripts, références d'objets, listes complexes, animation et runtime C# local. Le rendu visuel réel de chaque panneau reste à contrôler manuellement.

## Validation physique avancée — novembre 2026

Les scénarios de `tests/physics-rapier-dynamics-regression.test.mjs` chargent **Rapier WASM réel**, et non un mock :

- Joint `hinge` : évolution du corps sous la gravité et comparaison de la trajectoire avec la définition de build Web.
- Joint `ball` : déplacement avec contrainte et même test de parité.
- Deux Rigidbody empilés : contact, absence de pénétration excessive, stabilité et parité Play/export.
- CCD : un cube très rapide ne doit pas traverser un plancher mince.
- Préflight : une articulation 3D active sur `physics3d: 'builtin'` est bloquée à l'export Web avec instruction de passer à Rapier.

Le moteur physique interne reste une solution simple de prototypage et **ne prend pas en charge les joints d'impulsion**. Une exportation silencieusement dégradée serait trompeuse. Le test Chromium de CHAMBRE 07 vérifie séparément une chute de Rigidbody et un contact `grounded3d` stable pour **builtin** et **Rapier**. Les tests numériques d'articulations, de pile et de CCD utilisent les données sérialisées du build mais ne remplacent pas un test navigateur distinct de chaque scénario ni une validation de performance sur appareils lents.

Les anciennes scènes ne sont ni converties ni réécrites. Une scène historique avec des joints pourra nécessiter le choix explicite de Rapier avant export.

## Prefabs hiérarchiques — socle v2 (12 novembre 2026)

Le format ancien `{id,name,components}` reste valide et la fonction historique `instantiatePrefab()` continue de créer un seul objet. Le système ajoute des APIs compatibles pour enregistrer une sous-hiérarchie depuis les entités de scène : `makePrefabHierarchy`, `savePrefabHierarchy`, `instantiatePrefabHierarchy`, `createPrefabVariant`, `resolvePrefabVariant`.

- Chaque nœud utilise une clé logique stable indépendante des futurs identifiants de scène.
- Les liens `parentId` et `joint3d.targetId` internes sont remappés lors de l'instanciation, sans reprendre les références aux IDs du projet source.
- Les positions des enfants sont conservées telles qu'elles sont représentées par le graphe actuel ; seul le placement de la racine est modifié à la création d'une nouvelle instance.
- La structure est contrôlée : une seule racine, parents existants, aucun cycle, pas plus de 1000 nœuds.
- L'Inspector permet d'enregistrer un objet et tous ses enfants, puis de créer des instances supplémentaires. Le bouton n'apparaît que si la sélection possède au moins un enfant.
- Les overrides de l'Inspector et leur remise à zéro utilisent désormais le bon nœud, sans réécrire la hiérarchie ni les identifiants.
- Les variantes à propriétés surchargées peuvent être sauvegardées dans la bibliothèque via `savePrefabVariant` et sont résolues depuis leur source à chaque lecture ; leurs champs non surchargés suivent donc les évolutions du parent. **L'interface complète de création et de gestion des variantes reste à développer.**

Tests : `tests/prefab-hierarchy-v2.test.mjs` et `tests/prefab-hierarchy-inspector.test.mjs`. Les tests de conversion de scène et de build ne remplacent pas encore un parcours complet dans deux navigateurs.

**Attention :** les références externes à la sous-hiérarchie ne sont pas automatiquement réassignées : une articulation 3D active pointant vers un objet extérieur bloque la création du prefab avec une erreur explicite. Aucun système de clonage d'assets importés ou de prefabs imbriqués récursifs n'est revendiqué à ce stade. La règle WL-COMPAT-001 demeure prioritaire.

## Caméra 3D et proximité des murs — novembre 2026

La caméra 3D Play conserve son système de suivi amorti et de contraction instantanée du bras au contact. Les obstacles sont maintenant calculés avec la géométrie du `BoxCollider` en mètres, son orientation 3D par quaternion et ses décalages locaux. Le rayon est transformé dans les axes du collider pour détecter la face réelle des murs inclinés : une boîte non tournée n'est plus utilisée pour représenter un mur incliné. Les autres géométries (sphere/capsule) utilisent encore des boîtes de sécurité conservatrices, pas un balayage exact de la forme.

Le correctif s'applique dans le viewport WebGL pendant Play et dans le runtime Web exporté, sans changement de format de scène. Le calcul de base de la caméra ne peut plus produire des vecteurs de vue nuls lorsque le bras atteint momentanément une longueur quasi nulle. Les tests `tests/play-camera.test.mjs` vérifient :
- Mur fin et incliné qui coupe le rayon caméra ;
- Mur tourné et trop éloigné qui ne doit pas raccourcir la caméra ;
- Offset local de Collider tourné avec l'objet ;
- Retrait immédiat et retour progressif sans dépassement ;
- Base de caméra orthonormale malgré la proximité d'un obstacle.

Limites restantes : occlusion par les vrais triangles concaves des modèles GLB, continuité visuelle sur obstacles mobiles et analyse visuelle des problèmes de `near clipping` dans des jeux complets. Ces tests mathématiques n'établissent pas encore une équivalence de caméra avec les outils cinématiques actuels de Unity.

## GLB — géométrie triangulée correctement (12 novembre 2026)

Le parseur des GLB acceptait uniquement les primitives `mode=4` (`TRIANGLES`). Des surfaces pouvaient ainsi disparaître silencieusement si un fichier glTF utilisait `mode=5` (`TRIANGLE_STRIP`) ou `mode=6` (`TRIANGLE_FAN`). Les primitives de ces deux modes sont désormais converties en triangles avant la génération des sommets, des UV, des normales et des données d'animation. La conversion alterne correctement l'orientation des triangles d'une bande et ignore les triangles dégénérés sans supprimer les autres faces.

Cette modification se trouve dans `js/assets/real-models-3d.js` et est couverte par `tests/real-models-3d.test.mjs`. Elle ne modifie ni les fichiers GLB importés, ni le schéma des projets sauvegardés.

**Limites :** les primitives glTF de type `POINTS`, `LINES`, `LINE_STRIP` et `LINE_LOOP` ne sont pas des surfaces triangulées et restent non rendues. Les extensions de compression avancée et la compatibilité visuelle de toutes les textures/normal maps ne sont pas acquises par ce correctif. Le pipeline de textures, d'ombres dynamiques et de matériaux PBR doit être validé séparément avec des modèles réels.

## GLB — diagnostics de textures et matériaux (12 novembre 2026)

L'import de GLB reconnaît désormais les URI de textures relatives avec des caractères échappés et des paramètres de version ou fragments (par exemple `textures/wood.png?rev=2`). Les URL de textures doivent rester sur le même hôte HTTP(S) que le GLB ; les schémas arbitraires sont refusés. Cela ne rend pas pour autant les textures distantes disponibles hors ligne.

Au lieu d'omettre silencieusement les textures de couleur, le parseur collecte des `materialWarnings` pour les références sans image prise en charge ou sans coordonnées UV. Le viewport 3D affiche également un avertissement en cas d'échec réseau/CORS ou de décodage d'une image. Le matériau garde sa couleur de base si une texture échoue ; **ce rendu de secours n'est pas considéré comme une validation de fidélité du modèle**.

Des tests avec un GLB synthétique contrôlent les URI relatives, les UV, le facteur `baseColorFactor`, la rugosité, la métallicité et les erreurs de ressources manquantes. La compatibilité avec les extensions de textures compressées, toutes les variantes PBR et l'inclusion hors ligne des textures externes restent des chantiers distincts.

## Export Web — GLB distants et textures autonomes (12 novembre 2026)

L'export Web utilise maintenant `portable-remote-models.js` pour les modèles GLB distants **référencés par le jeu**. Leurs fichiers sont téléchargés pendant la préparation du ZIP ; toute image de matériau externe PNG, JPEG ou WebP référencée par le GLB est intégrée directement dans une nouvelle copie binaire du GLB grâce à `packageGlb`. Les copies se trouvent dans `assets/remote/`, et le catalogue exporté référence la copie locale au lieu de l'URL distante. Les fichiers sources et les projets enregistrés restent inchangés.

**Garanties :** URL HTTPS directe, chemins de textures relatifs au même hôte, validation des téléchargements et du MIME, taille de 25 Mo par GLB emballé et budget total de 100 Mo pour les GLB locaux et distants. En cas d'image manquante ou d'accès CORS impossible, l'export échoue avec une erreur explicite ; il ne produit pas silencieusement un modèle blanc. Les licences des auteurs continuent à s'appliquer, même à une copie distribuée dans le ZIP.

Les tests `tests/portable-remote-models.test.mjs` vérifient l'intégration effective des octets de texture dans un GLB, l'échec volontaire si une image manque, le rejet des ressources externes non autorisées, ainsi que la présence du modèle local et de son nouveau chemin dans un export ZIP complet.

**Limites restantes :** textures compressées `KHR_texture_basisu`, extensions PBR avancées, modèles qui chargent des dépendances de plusieurs origines, gros assets dépassant la limite d'export, licences interdisant la redistribution et validation visuelle de nombreux modèles réels. Un modèle déjà inclus dans `assets/free/` continue à utiliser son catalogue local et ses dépendances déclarées.
