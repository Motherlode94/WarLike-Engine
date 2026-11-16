# CHAMBRE 07 — LA VOIX
## Bible narrative v2 · « Les noms que l'on efface »

**Genre :** survival horror psychologique à la première personne, enquête, mémoire et identité.

**Promesse :** l'horreur vient du doute : le protagoniste est-il revenu dans la chambre, ou la chambre l'a-t-elle reconstruit ? Les indices doivent permettre au joueur de déduire le secret avant que Lia le formule.

### Canon narratif
- **2009 :** sept personnes disparaissent dans un immeuble condamné, pendant un protocole clandestin visant à reconstruire les consciences à partir de souvenirs enregistrés.
- **2026 :** le joueur se réveille dans la chambre 07 à 03:07. Ses souvenirs sont contradictoires.
- **Lia :** une personne reconstruite qui refuse d'être recréée indéfiniment. Elle ne ment pas directement, mais retient le prix de chaque choix.
- **L'ombre :** l'ancienne empreinte du protagoniste, devenue hostile quand une nouvelle version a pris sa place. Sa façon de marcher reprend celle du joueur ; on la présente avant de la montrer.
- **La chambre :** machine-lieu nourrie de témoignages, non simple démon. Elle propose de sauver les disparus, mais transforme le souvenir en prison.
- **Mystère principal :** le protagoniste a lui-même participé au protocole avant de devenir sujet de l'expérience.

### Prologue jouable — 03:07
1. Obscurité. Un téléphone sonne dans une pièce sans téléphone visible.
2. Une voix : « Tu m'avais promis de ne plus revenir. »
3. Le joueur trouve une porte marquée 07 et remarque que l'appartement ne possède aucun numéro sur les autres portes.
4. La lumière du couloir vacille au rythme de sa respiration. Aucune menace immédiate : laisser l'exploration installer la tension.

### Acte I — Trois versions du passé
- **Photographie** (salon) : sept personnes photographiées en 2009, une huitième silhouette découpée. Inscription : « Si tu vois ton visage, ne te souviens pas de ton nom. » Question dramatique : qui manque ?
- **Cassette** (archives) : enregistrement 03:07, la voix du protagoniste annonçant la reconstruction du sujet sept. Question : comment a-t-il enregistré un message en 2009 ?
- **Lettre** (chambre) : Lia demande qu'on cesse de la reconstruire. Une réponse de la main du protagoniste apparaît au verso. Question : le joueur est-il le sauveur, le responsable ou une autre victime ?
- **Construction de la tension** : après chaque preuve, faire varier un détail d'environnement sans retirer les repères nécessaires à la navigation ; jouer un bref son spatial plutôt qu'un jumpscare systématique.

### Acte II — La conversation avec Lia
Le joueur ne peut ouvrir la conversation finale sans les trois souvenirs. Lia expose les faits sans affirmer avec certitude l'identité de la version actuelle du joueur.

**Lia :** « Tu as retrouvé les trois preuves. En 2009, tu as accepté de reconstruire les disparus avec leurs souvenirs. Moi aussi. La chambre t'a reconstruit à ton tour. Tu peux porter cette vérité… ou sortir sans elle. Que choisis-tu ? »

- **Choix A — Je garde la vérité, même si elle me poursuit.** Le protagoniste accepte les noms et les conséquences. Lia prévient que l'ombre connaît son visage.
- **Choix B — Je refuse de devenir un autre souvenir.** Le protagoniste refuse le cycle, mais perd la mémoire qui lui permet de reconnaître Lia.

### Acte III — La poursuite
Après le choix, le poursuivant s'active. Le bruit de ses pas ressemble exactement aux pas du joueur, avec une seconde de retard. Le chemin de sortie reste lisible : l'horreur ne doit pas dépendre d'une impasse arbitraire.

### Fins conservant la structure du prototype
- **LA MÉMOIRE** : le joueur sort avec les sept noms. Sur une vitre, son reflet se déplace avec retard. Il a échappé à l'appartement, pas forcément au protocole.
- **LA RUPTURE** : le joueur sort sans souvenirs. Il trouve une photographie blanche et reçoit un appel de Lia à 03:07. Il a gagné la liberté, mais peut répéter le cycle.

Les deux fins restent des victoires du runtime, pour conserver la compatibilité des sauvegardes et des tests existants ; leurs implications restent ambivalentes.

### Développement ultérieur proposé — non encore implémenté
- Prologue interactif avec téléphone et répondeur.
- Un journal à indices croisés, permettant de reconstruire la chronologie sans exposition obligatoire.
- Un système de peur sans pénalité de mouvement trop punitive : perception sonore, reflets et lumière.
- Trois apparitions facultatives de l'ombre, sans combat, avant la chasse finale.
- Des variations de l'appartement déclenchées par les trois preuves, compatibles sauvegarde/chargement.
- Une véritable troisième fin secrète uniquement après création de conditions et tests dédiés ; ne pas prétendre qu'elle est jouable avant implémentation.
- Nouveaux modèles GLB riggés pour Lia et l'ombre, animations faciales, doublages et sous-titres accessibles.
- Tester les deux choix, le signal de poursuite, la collision des portes, les reprises F5/F9 et l'export autonome.

### Contraintes techniques
Conserver les IDs, noms d'entités et variables `chambrePhoto`, `chambreTape`, `chambreLetter`, `chambreChoice`, ainsi que les signaux `chambre:trust`, `chambre:reject` et `chambre:chase`. Les trois objets et les deux fins sont indispensables aux tests natifs existants. Ne pas ajouter de nouvelle branche de fin sans régression dédiée.

**État :** v2 narrative intégrée aux messages, descriptions, dialogue, poursuite et fins dans `js/core/chambre-07-scene.js`. Les séquences nouvelles de mise en scène proposées ci-dessus ne sont pas implémentées. Exécution Node et tests en navigateur non validés.
