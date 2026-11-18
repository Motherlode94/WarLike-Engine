# WarLike Engine — Interface native de jeu (Phase 3, premier jalon)

Le modèle `uiCanvas` + `uiRect` + `uiElement` est maintenant relié à un overlay natif en **Play 2D et Play 3D**.

## Créer une interface

1. Créer un GameObject portant `UI Canvas` en mode Overlay.
2. Créer un GameObject enfant sous ce Canvas, lui ajouter `UI RectTransform` et `UI Element`.
3. Choisir le type `panel`, `text` ou `button` et modifier les ancrages, dimensions, texte et couleurs.
4. Pour un `button`, saisir un nom d'événement autorisé dans `UI Element.eventName` (par exemple `menu:play`).
5. Dans WarNode, ajouter un nœud/une séquence de type **Signal** qui écoute le même nom.

Les boutons sans événement explicite émettent le signal `ui:click:<GameObject.id>`. L'affichage utilise exclusivement `textContent`, sans interpréter d'HTML de projet ni exécuter du JavaScript arbitraire.

Le rendu prend en compte la résolution de référence et les ancrages définis par `uiCanvasScale`/`uiLayoutTree`. Il n'est affiché que pendant Play et partage le viewport du jeu en 2D et 3D.

## Limites actuelles

- **Image UI**, Canvas Camera/World Space, masques, navigation complète manette/clavier, scroll views et animations UI : non livrés dans ce premier jalon.
- Le bouton émet un **signal WarNode** ; il ne lance pas automatiquement un autre projet ni une scène et il n'appelle pas directement le C# local.
- Les couleurs acceptent `#RRGGBB`, les textes sont bornés, et les événements acceptent un identifiant limité. Les scripts fournis dans les données UI ne sont jamais exécutés.
- Les tests Node couvrent modèle/layout/signaux et la liaison déclarative au client. Les tests navigateur sur interactions souris/clavier, Play/Stop et export Web restent nécessaires avant fusion.

Il reste à améliorer la fidélité PBR des GLB, les ombres et le post-traitement dans le même programme Phase 3.
