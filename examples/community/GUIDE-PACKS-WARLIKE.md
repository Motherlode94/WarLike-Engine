# Packs Blueprint WarLike : premiers pas

Dans l’éditeur, ouvre **Assets → Communauté · Plugins**, cherche le pack et installe-le après son aperçu. Sélectionne ensuite un objet et applique une recette depuis les modèles de gameplay dans l’Inspecteur. Une recette remplace la séquence principale de l’objet : utilise un objet distinct par rôle, ou conserve une copie de ta séquence précédente. Les packs fonctionnent en 2D comme en 3D et leurs variables sont partagées dans la partie.

- **Cuisine et commerce** : place une réserve, un plan de préparation, un comptoir et un approvisionnement. Récolte deux ingrédients, prépare un repas, vends-le pour 10 crédits, puis achète quatre ingrédients pour 10 crédits. Les variables sont `cuisineIngredients`, `cuisineRepas` et `cuisineCredits`.
- **Quête de livraison** : place le donneur, le colis, la destination et éventuellement le panneau. Accepte la quête avant de récupérer le colis, puis livre-le. La destination termine la partie.
- **Accès et portes** : applique « Porte à signal » à l’objet qui bloque le passage. Active son collider 2D ou 3D. L’interrupteur envoie `acces:ouvrir` ; le signal masque la porte et désactive son collider. Toutes les portes utilisant ce signal s’ouvrent ensemble. La console et le panneau sont facultatifs.
- **Objectifs arcade** : applique « Pièce à collecter » à trois objets distincts, « Sortie à trois pièces » à une sortie et, si besoin, « Point de reprise » à un marqueur. Le joueur traverse les pièces, puis interagit avec la sortie pour gagner.

Ces packs sont des comportements Blueprint à placer et à adapter dans une scène, pas des jeux complets ni des modules autonomes de rendu ou de physique. Ils n’ajoutent pas de personnages, d’interface de boutique ou de modèles 3D.
