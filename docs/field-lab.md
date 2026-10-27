# WarLike Field Lab — terrain d'essai du moteur

Dans **WarLike Hub → Nouveau projet**, choisir **WarLike Field Lab**, puis **2D** ou **3D**. Le Hub génère une scène locale éditable sans dépendre d'assets distants, ce qui permet de reproduire les bugs de gameplay et de comparer les modes.

## Parcours guidé

1. **01 · Test marche** : avancer jusqu'au marqueur bleu **à pied** (ZQSD / WASD). Le test ignore les passages en véhicule.
2. **02 · Console interactive** : s'approcher de la console puis presser **E**.
3. **03 · Véhicule test** : s'approcher de la jeep et presser **E** pour entrer.
4. **04 · Test conduite** : atteindre la balise rouge **en véhicule**. Le Blueprint vérifie réellement que le personnage est monté dans un véhicule.
5. **05 · Diagnostic final** : valider les trois étapes précédentes puis presser **E**. Le HUD confirme 3 / 3.

Le circuit comporte deux obstacles physiques. Vérifier manuellement que les collisions fonctionnent et que le personnage ne traverse pas les murs ; cet aspect n'est **pas** marqué « réussi » automatiquement.

## Architecture

Le parcours utilise `createGenreScene('fieldlab', mode)` et conserve les objets dans le format de projet ordinaire. Les conditions Blueprint `playerOnFoot` et `playerInVehicle` sont interprétées par `conditionPass` dans le runtime des séquences. Les variables `labWalk`, `labInteract`, `labDrive` et `labCompleted` sont temporaires et réinitialisées à chaque session Play.

Ce laboratoire teste une séquence minimale reproductible. Il ne remplace pas les tests de navigateur, de WebGL, de physique de véhicule avancée, ni les tests C# natifs. Les projets déjà créés restent inchangés.
