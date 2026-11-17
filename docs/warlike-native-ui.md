# WarLike UI — fondations de l’interface native des jeux

Référence fonctionnelle : [Unity UI / uGUI 1.0](https://docs.unity3d.com/Packages/com.unity.ugui@1.0/manual/index.html).

**Ne pas confondre** l’interface des outils WarLike Engine (Hierarchy, Inspector, Scene, Project) et l’interface **créée dans les jeux** (HUD, menus, inventaires, boutons).

## Phase 1 : modèle de composants et données éditables

Les composants suivants sont proposés dans **Add Component → Interface du jeu** :
- **UI Canvas · Overlay** : racine d’interface, résolution de référence, mode de Canvas Scaler et ordre de rendu
- **UI RectTransform** : ancres min/max normalisées, pivot, position ancrée, Size Delta et rotation
- **UI Element** : données de Panel, Text, Button ou Image, couleur, texte, nom d’événement

Leurs réglages sont éditables dans le **même Inspector natif**, sauvegardés dans les entités de la scène et conservés par l’import/export JSON.

Le module pur `js/core/ui-canvas-layout.js` résout les rectangles des GameObjects enfants en respectant leur `parentId`, les ancres/pivots et une mise à l’échelle par résolution inspirée de Canvas Scaler. Il est sans dépendance navigateur, DOM ou service cloud.

**Limites explicites du premier jalon :**
- Seul le mode **Screen Space — Overlay** est accepté dans le modèle. Les modes Camera et World Space sont rejetés explicitement.
- Il n’y a **pas encore de rendu automatique** des entités UI dans les viewports Scene, Game ou le lecteur Web exporté.
- Aucun bouton ne déclenche encore de WarNode, WarScript ni événement de jeu. Le champ `eventName` est une donnée réservée.
- Ni système de navigation clavier/manette, ni raycast UI, ni masques/images 9-slice, ni layout groups, ni animations de transitions ne sont implémentés.
- Cette étape ne change **pas** les panneaux de l’éditeur WarLike Engine ni ses CSS.

## Contrat cible pour une démo native

Créer dans Hierarchy un GameObject Canvas, y ajouter comme enfants un Panel, un texte et un Button. Le résultat devra être visible dans **Scene et Game**, redimensionné selon les résolutions d’écran, manipulable par les composants Inspector, réactif aux événements WarNode/WarScript en Play, puis identique dans l’export Web autonome.

Ce scénario est **un critère d’acceptation futur**, pas un test actuellement validé.

## Prochaines étapes

1. Adaptateur de rendu DOM/SVG ou WebGL rattaché au runtime d’Engine, pas de micro-jeu ni d’iframe autonome
2. Édition des rectangles UI à la souris dans Scene avec ancres et pivots visualisés
3. EventSystem natif de bouton, ordre de focus, clavier/manette/tactile et contrôles accessibles
4. Liaison UI → WarNode, WarScript puis framework C# ; observabilité et erreurs explicites
5. Tests Play/Stop, sauvegarde/rechargement et export autonome identiques

La documentation Unity sert de référence de comportement, sans reprendre son code ni présenter cette implémentation comme un port complet d’uGUI.
