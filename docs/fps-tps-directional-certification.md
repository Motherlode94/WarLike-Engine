# FPS/TPS — critères de certification directionnelle

Cette livraison ajoute des tests de non-régression à la logique FPS/TPS déjà présente. Elle ne modifie pas les contrôles de jeu ni l'interface.

## Comportement contractuel

- Déplacer la souris change la direction de la caméra sans maintenir un clic, en mode Play.
- Le personnage 3D est orienté selon la caméra : tourner à 90° ou 180° modifie aussi l'axe de marche et le cône de tir.
- Le clic gauche déclenche le tir ; le clic droit sert à viser. Aucune touche F n'est requise pour le tir à la souris (un raccourci clavier facultatif peut toujours exister).
- Les déplacements diagonaux sont normalisés et les directions inverses restent cohérentes.
- En 2D, sans visée au pointeur, le personnage conserve la dernière direction observée.
- Les modules de logique de visée et de mouvement sont repris dans les manifestes de l'export Web.

## Contrôles ajoutés

`tests/fps-tps-directional-certification.test.mjs` couvre : angles cardinaux FPS/TPS, mouvement relatif à la caméra, cône de tir avant/arrière et proche limite, orientation 2D, disponibilité des modules à l'export et contrats d'entrée souris.

Ces tests complètent les scénarios Chromium déjà présents dans `scripts/test-complete-3d-browser.mjs`, mais ne remplacent pas leur exécution.

## Quality gates

1. `node --test tests/fps-tps-directional-certification.test.mjs`
2. `npm test` et `npm run typecheck`
3. `npm run build:runtime` suivi d'une vérification des manifestes générés.
4. `npm run test:3d:browser`, `npm run test:export:browser`.
5. Sur le jeu exporté : déplacer la souris librement et contrôler orientation de l'avatar, collisions, visée du clic droit et tir au clic gauche.
6. Répéter en vue FPS, puis TPS, dans une scène incluant obstacles et cibles latérales et arrière.
7. Vérifier que l'enregistrement, la réouverture et l'export autonome ne changent ni les mappings ni le comportement.

**Une CI verte n'est pas une certification complète** du gameplay manuel sur tous les appareils et navigateurs. Aucune fusion avant validation des Quality Gates.
