# Animator, FX Studio et coop locale

Ces systèmes sont du code WarLike Studio, développé pour le projet de **Hardi Victor MBANVU — HardieBay**. Les animations et modèles utilisés conservent les crédits Kenney / Quaternius de leur pack, consultables dans l’Inspecteur et dans [Sources et licences](../SOURCES.md).

## Animator : construire le comportement du personnage

1. Sélectionner un personnage, puis ouvrir **Animation → Animator · Graphe et mélanges**, ou le bouton du composant Animator dans l’Inspecteur.
2. Créer le graphe si nécessaire. Le template Hero Forge en possède déjà un : locomotion, saut, chute, attaque, pouvoir, vol et mort.
3. **Cadrer le graphe** montre tous les états ; **100 %** permet d’inspecter les cartes en taille réelle. Les cartes se déplacent à la souris ; le panneau se déplace par son titre et se redimensionne par ses bords.
4. Choisir le clip de chaque état parmi les animations du modèle. Les alias `idle`, `walk`, `run`, etc. utilisent aussi le mapping de l’Animator 3D existant. Sans clip correspondant, aucun nouveau mouvement squelettique n’est inventé.
5. Activer le mélange 1D pour interpoler les poses entre repos, marche et course. Le paramètre `speed` est calculé sur le déplacement réel en mètres/seconde ; l’aperçu possède une vitesse simulée.
6. Régler les transitions et leurs conditions. **Tous les états** est une origine distincte. Les transitions sont évaluées dans l’ordre de priorité ; **Priorité ↑** remonte une transition. La mort reste prioritaire sur un état forcé.
7. Ajouter jusqu’à quatre couches 3D. Choisir un clip, un poids et les noms des os racines séparés par des virgules. Le masque inclut leurs descendants ; une liste vide concerne tout le squelette.
8. Ajouter des événements FX, son ou signal à un instant normalisé entre 0 et 1. La durée de l’état règle leur horloge ; en boucle, ils se répètent. Un changement d’état émet aussi `animation:<id>:enter` dans Blueprint pendant Play.

Blueprint expose **Jouer un état Animator**, **Définir un paramètre Animator**, **Émettre le FX de l’objet** et la condition **État Animator actif**. Les paramètres personnalisés peuvent être numériques, booléens ou textuels. Le graphe, ses événements et ses couches sont conservés dans le projet et les exports.

La 2D utilise les noms d’animations des sprites ; les mélanges squelettiques et masques d’os concernent la 3D. Il n’y a pas encore d’IK, de retargeting entre squelettes différents ni de blend tree 2D. Un état de vol peut utiliser un clip existant si le modèle ne possède pas d’animation de vol.

## FX Studio : modifier et synchroniser les effets

Sélectionner un objet, puis **Animation → FX Studio · Courbes et traînées**, ou ouvrir FX Studio depuis le composant Super-héros. Ajouter un émetteur et choisir un preset énergie, feu, éclair, fumée, soin ou portail.

- Régler débit, durée de vie, vitesse, gravité, résistance à l’air, couleurs de départ/fin et forme d’émission radiale ou directionnelle.
- Sur les courbes de taille et d’opacité : cliquer pour ajouter un point, glisser pour l’ajuster, clic droit sur un point pour le retirer. Chaque courbe accepte huit points.
- Activer les traînées et l’arrêt au contact des colliders. Les collisions des particules sont balayées ; elles ne produisent pas d’impulsion physique.
- **Tester une explosion** déclenche une émission immédiate. **Aperçu FX dans la scène** permet de régler l’effet avant Play.
- **Ajouter cet FX au pouvoir** ajoute l’effet au pouvoir sélectionné du personnage. **Ajouter à l’état Animator sélectionné** place l’effet dans sa liste d’événements, à 0,25 par défaut.

Les budgets Réduits / Standard / Élevés bornent les particules et les traînées. Les effets sont procéduraux : ce studio n’édite pas encore des shaders, des textures de particules ou un graphe GPU.

## Jouer ensemble sur votre réseau local

Le serveur Python est livré avec le moteur **et avec les jeux exportés**. Il utilise uniquement la bibliothèque standard de **Python 3.10+** : aucun compte, abonnement ou relais extérieur. Le navigateur de l’hôte simule le jeu ; Python sert les fichiers et relaie les commandes et les états.

### Sur le PC hôte

1. Récupérer le [dépôt WarLike Engine](https://github.com/Motherlode94/WarLike-Engine) ou décompresser un jeu exporté.
2. Dans ce dossier, lancer **start-warlike-multi.cmd** sous Windows, ou :

   ```bash
   python3 python/warlike.py multiplayer
   ```

3. Garder le terminal ouvert. Il affiche `http://localhost:8765/`, une adresse réseau pour les autres PC et une **clé d’hébergement**.
4. Ouvrir cette adresse locale dans le navigateur. Dans le moteur : créer/ouvrir le projet, arrêter Play, puis **Game → Multijoueur local · Coop privée**. Dans un jeu exporté : **Coop locale · Héberger / Rejoindre** dans le menu de démarrage.
5. Saisir son nom et la clé du terminal, puis **Héberger et jouer**. Donner le **code de salon** aux autres joueurs. La clé d’hébergement n’est pas nécessaire pour rejoindre.

### Sur les autres PC

1. Se connecter au même réseau que l’hôte et ouvrir **l’adresse réseau affichée dans son terminal**, par exemple `http://192.168.1.20:8765/`.
2. Ouvrir le panneau de coop, saisir son nom et le code du salon, puis **Rejoindre et jouer**. Le mode 2D/3D et la scène viennent de l’hôte ; l’invité reçoit son propre personnage.
3. Si le pare-feu du PC hôte demande une autorisation pour Python, autoriser l’accès sur le réseau privé utilisé. Un Wi-Fi avec isolation des clients peut empêcher les PC de se joindre.

Le site Cloudflare propose les commandes et les instructions. Pour la session LAN, tous les joueurs utilisent le moteur ou le jeu **servi par votre Python local**, à la même adresse d’origine. Le bouton **Ouvrir le moteur local** sert à ouvrir cette adresse. Le site public n’héberge pas votre serveur et ne peut pas lancer Python à votre place.

### Contrôles et comportement

| Commande | Résultat partagé |
| --- | --- |
| ZQSD / WASD / flèches, Maj, espace | Déplacement, sprint, saut ; collisions calculées par l’hôte |
| Caméra 3D | Orientation propre à chaque joueur, envoyée avec ses commandes |
| 1–6 | Pouvoirs, coûts, recharges, projectiles, dégâts et boucliers |
| E | Secourir un civil ou réparer une installation à portée |
| U | Dépenser ses points dans la spécialité RPG configurée |
| F | Attaque de proximité de l’invité |
| Échap chez l’hôte | Pause de toute la partie ; les invités cessent de se déplacer |
| Quitter le salon | Retrait du personnage invité et restauration de la scène d’édition précédente |

Les ennemis peuvent cibler l’un ou l’autre joueur. La progression, les installations et les effets sont partagés par les états publiés par l’hôte. Les invités n’envoient pas de position ou de monde arbitraires. Les mouvements sont interpolés côté invité ; il n’y a pas encore de prédiction ni de rollback.

### Périmètre actuel

- **Quatre joueurs maximum**, une scène de **256 objets maximum**, avec jusqu’à trois places réservées aux personnages invités. Le personnage de l’hôte sert de base aux personnages invités.
- Utiliser les ressources intégrées ou des fichiers durables accessibles à tous depuis le même serveur. Une URL temporaire `blob:` importée sur un PC n’est pas un transfert d’asset réseau.
- L’hôte gère sauvegardes, chargements, changements de scène et escouades RTS. Un changement de scène recrée les personnages invités. Les véhicules, dialogues à choix, menus d’inventaire RPG complexes et commandes RTS par invité ne disposent pas encore de protocole coop dédié.
- Garder le navigateur hôte actif et visible : sa simulation dépend de ses frames. Le serveur Python n’est pas un serveur de physique autonome. Si l’hôte quitte, le salon ferme ; une session silencieuse expire après 15 secondes, et une commande de déplacement non rafraîchie est neutralisée après 0,5 seconde.
- Cette première coop vise le réseau local privé. Elle ne comprend ni matchmaking Internet, migration de l’hôte, serveur dédié, chiffrement de transport propre, ni écran partagé sur un seul clavier.

Pour changer de port : `python3 python/warlike.py multiplayer --port 9000`. Pour tester uniquement sur le PC hôte : ajouter `--host 127.0.0.1`.

Le [template Survival](survival.md) possède un protocole dédié pour les provisions, récoltes et fabrications de chaque invité. Les campements, les stocks et les objectifs de Première aube sont partagés. Un invité pose ses constructions avec l’aperçu ; l’hôte valide la portée, les obstacles et les ingrédients avant de les créer. Le secours d’un allié coûte deux fibres. Les survivants déconnectés sont conservés hors de la scène dans la sauvegarde de l’hôte et retrouvent leurs provisions avec leur nom distinct. F5 / F9 et le menu Pause gèrent la sauvegarde du camp.

## Navigation A*

La navigation utilise une file de priorité déterministe et simplifie les trajets par visibilité avec une marge autour des obstacles. Le lissage s’applique aux trajets JavaScript et à ceux issus du module C++/WASM. L’option `smooth:false` conserve les points de grille pour diagnostic. `node scripts/bench-pathfinding.mjs` compare les deux sorties sur des scènes reproductibles ; ce système reste une grille A*, sans NavMesh.
