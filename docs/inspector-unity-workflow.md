# Inspector : fonctionnement de référence Unity

L’Inspector suit la sélection de Hierarchy et de Scene, ou la ressource choisie dans Project. Son verrou conserve les identifiants des objets inspectés et retrouve leurs données après Undo/Redo. Il se libère lorsque les objets ont disparu ou que le contexte projet/scène/2D–3D change.

## Utilisation

| Action | Comportement |
| --- | --- |
| Clic dans Hierarchy | Affiche les propriétés du GameObject. |
| Ctrl/Maj + clic | Édite les champs communs de plusieurs objets ; les valeurs différentes sont signalées par un tiret. |
| Valeur de… | Applique la valeur d’un objet aux autres sans remplacer leurs autres propriétés. |
| Verrouiller | Conserve l’objet, les objets ou la ressource inspectés lorsque la sélection change. |
| Normal / Debug | Passe des propriétés éditables aux données sérialisées en lecture seule. |
| Repérer | Révèle le GameObject dans son groupe de Hierarchy. |
| Recherche / filtre | Filtre les composants et leurs propriétés ; indique un résultat vide. |
| Affichage… | Déplie ou replie tous les composants affichés. Les plis individuels sont conservés par objet et contexte. |
| Menu ⋮ | Copie/colle les données compatibles, réinitialise, retire ou déplace un composant selon ses capacités. |
| Ajouter un composant | Cherche les composants Web et C# local. En sélection multiple, ajoute les composants manquants à chaque objet. |
| Clic sur une ressource de Project | Affiche ses métadonnées sans créer d’instance. |
| Double-clic / Entrée sur une ressource | Ouvre le script/la scène, prévisualise le son/l’animation ou crée une instance, selon son type. L’Inspector propose aussi une action explicite. |

Les champs numériques de Transform et les champs partagés acceptent des expressions telles que `2 * 3` et `(10 + 5) / 2`, sans exécuter de JavaScript. Les références C# simples utilisent un sélecteur d’objets par nom et identifiant. Les menus d’activation écrivent uniquement les indicateurs `enabled` réellement utilisés par les composants.

Les positions et dimensions 3D utilisent des mètres dans l’interface : X/Z sont convertis depuis les unités historiques de scène, Y utilise `elevation3d`. En 2D, les dimensions restent en unités/pixels de scène. WarLike utilise des dimensions explicites ; la réinitialisation de Transform annonce donc précisément « position et rotation ».

Les modifications de scène passent par le même historique que l’éditeur. Pendant Play, les champs de scène sont en lecture seule. La sélection, le verrou, les recherches, Debug et la copie restent disponibles. L’ordre visuel des composants ne modifie pas leur ordre d’exécution. L’ordre Inspector, les groupes, la visibilité et les références de prefabs sont conservés à l’import JSON.

Les instances de prefabs enregistrés affichent leurs propriétés différentes et peuvent retrouver les propriétés de leur source, avec annulation possible ; leur identifiant, leur nom et leur position restent conservés. La source n’est pas écrasée par cette action.

## Périmètre et limites

- Les composants, listes et graphes propres à un objet ainsi que les composants natifs C# sont édités en sélection individuelle. L’édition multiple porte sur les champs scalaires communs des composants Web ; ses choix connus utilisent des listes fermées.
- Les sources de scripts s’ouvrent dans Script Studio. Il n’y a pas de compilation C# arbitraire ni de découverte Roslyn de nouveaux champs publics dans cette modification.
- Les métadonnées de ressources sont en lecture seule ; cette interface n’ajoute pas de pipeline d’import Unity ou de système complet de prefabs imbriqués et variants.
- Le verrou de ressource est attaché à la session courante. Les prefabs de l’utilisateur et l’état des plis sont stockés dans le navigateur.

## Validation

581 tests JavaScript réussis et contrôle TypeScript réussi. Les tests ajoutés vérifient les identifiants verrouillés, les restaurations d’historique, les suppressions, les modifications multiples atomiques, les types et valeurs non finies, les expressions numériques, le presse-papiers indépendant, les métadonnées et le rétablissement des prefabs.

Vérifications dans l’interface : verrouillage objet et ressource, modification multiple, ajout de Rigidbody aux deux objets puis modification de masse, collage de couleur et annulation, déplacement d’un composant puis retour, recherche vide, inspection puis instanciation explicite d’un sprite, panneau étroit, unités 3D, propriétés désactivées pendant Play et rétablies après Stop, sélecteur C# de référence d’objet. Le navigateur de validation ne disposait pas de WebGL : le rendu 3D n’a pas pu être validé.

## Références

- [The Inspector window](https://docs.unity3d.com/6000.1/Documentation/Manual/UsingTheInspector.html)
- [Manage components and their values](https://docs.unity3d.com/6000.1/Documentation/Manual/InspectorManageComponents.html)
- [Inspect items](https://docs.unity3d.com/6000.1/Documentation/Manual/InspectorItems.html)
- [The Editor interface](https://docs.unity3d.com/6000.1/Documentation/Manual/unity-editor.html)
- [2D game development](https://docs.unity3d.com/6000.1/Documentation/Manual/Unity2D.html)
- [3D quickstart](https://docs.unity3d.com/6000.1/Documentation/Manual/Quickstart3D.html)
