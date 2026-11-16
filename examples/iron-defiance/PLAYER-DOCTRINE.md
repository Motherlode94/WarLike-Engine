# Iron Defiance — doctrine du joueur (base fonctionnelle)

Ce lot n'invente pas un système de compagnie complet dans CENDRE-01 : il introduit des **règles déterministes réutilisables**, puis applique au prototype une correction essentielle des règles d'engagement.

## Décisions validées

- 12 soldats par escouade standard : Alpha 5, Beta 4, Delta 3, rôles variables, chefs et adjoints personnalisables.
- 3 escouades par peloton ; 3 pelotons par compagnie (108 soldats d'escouade sans soutien).
- Contrôle individuel/équipe/escouade ; ordres d'équipes verrouillés non écrasés par l'ordre collectif.
- Priorité aux formations ayant le plus grand pourcentage de pertes lors de l'attribution des renforts.
- Récupération automatique des munitions compatibles en sécurité ; changement d'arme principale sur autorisation.
- Équipages individuels, conducteur qualifié requis pour utiliser un véhicule mobile.
- Règle d'engagement : attaque sur ordre explicite, riposte à une attaque directe, aucune ouverture du feu allié sur simple détection.

## Modules

- `force-organization.js` : modèle initial d'escouade et fonctions pures, importables ailleurs dans WarLike Engine.
- `game-rules.js` : application initiale des règles d'engagement.
- `tests/force-organization.test.mjs` : tests unitaires du nouveau module.

## Restant à développer

Le prototype CENDRE-01 possède seulement 10 unités amies à ce stade ; une vraie compagnie 108 soldats, l'édition visuelle des groupes, les 22 GLB texturés intégrés, le pilotage FPS, les animations riggées, l'évacuation médicale, les transports complets, les stocks persistants et le commandement hiérarchique ne sont **pas** livrés dans ce lot. Ils nécessitent des incréments et des tests graphiques séparés. Aucune migration ni suppression des anciennes sauvegardes n'est réalisée.
