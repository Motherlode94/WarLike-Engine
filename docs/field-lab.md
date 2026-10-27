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


## Diagnostics F8 — nouvelle instrumentation

Pendant Play, appuie sur **F8** pour ouvrir ou fermer le panneau **WarLike Engine Diagnostics**. Il affiche une fréquence d'images observée lissée (pas un benchmark GPU), le nombre de frames lentes, les objets de la scène, les actions Blueprint réellement exécutées, les entrées et sorties de véhicules ainsi que les collisions remontées par le contrôleur de conduite. Clique sur **Exporter le rapport JSON** pour obtenir la chronologie des événements, les variables Blueprint scalaires et les avertissements enregistrés.

Les données sont conservées en mémoire, plafonnées à 80 événements et 30 avertissements, et **réinitialisées à chaque nouveau Play**. Le projet n'est pas modifié par la capture.

Les balises conditionnelles `enter` réessaient désormais lorsqu'une condition change sans quitter la zone ; monter dans un véhicule déjà situé sur la balise peut donc valider l'étape de conduite. L'interaction E qui sert à monter/descendre ne déclenche plus simultanément une interaction Blueprint proche.

### Limites du diagnostic

- Le compteur « collisions » répertorie uniquement les collisions signalées par les contrôleurs de véhicule 2D/3D. Il ne représente pas toutes les contacts du moteur physique Rapier ni les collisions personnage.
- Le Field Lab **ne prouve pas** la physique de manière autonome ; les murs nécessitent un contrôle visuel. Le rapport l'indique explicitement.
- Les FPS mesurés sont dérivés du delta d'update observé, qui peut être plafonné par la boucle ; ce n'est pas un profilage GPU/CPU complet.
- Le C# local et le Play JavaScript sont encore deux runtimes indépendants ; ce rapport ne prétend pas mesurer la parité ou la connexion du bridge.
