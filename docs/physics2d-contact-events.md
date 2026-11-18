# Physics2D — événements Collision et Trigger pour WarScript et WarNode

Cette implémentation utilise le **même état de scène 2D** que le contrôleur, les BoxCollider2D et les tuiles solides de Tilemap. L'éditeur ne simule pas de collisions hors du mode Play.

## Différence entre collision et trigger

- **Collision2D** : contact entre deux colliders solides ; les objets ne se traversent pas et le moteur déclenche `Enter` au premier contact, `Stay` pendant le contact, puis `Exit` quand ils se séparent.
- **Trigger2D** : mettre `collider2d.isTrigger = true` sur une zone. Le joueur peut la traverser : le contact génère `Enter/Stay/Exit` sans blocage de déplacement.
- Les cases **Mur** et **Pierre** d'un Tilemap sont prises en compte comme surfaces solides ; un Tilemap complet n'est pas traité comme une seule boîte opaque.

Les paires d'objets sont suivies par identifiant au cours des images. Le système se réinitialise au démarrage/à l'arrêt du runtime, refuse les colliders désactivés, et ne génère pas d'événements entre deux objets statiques sans acteur ou Rigidbody2D. Des limites de budget empêchent la livraison d'un nombre non borné d'événements.

## WarScript (.wls)

Attacher ce script à un GameObject possédant un Collider2D, puis lancer Play :

```csharp
public int passages = 0;

OnTriggerEnter2D() {
    passages++;
    Log("Entrée dans la zone : " + trigger.otherName);
    Set("zonePassages", passages);
}

OnTriggerExit2D() {
    Log("Sortie de la zone");
}

OnCollisionEnter2D() {
    Log("Collision avec : " + collision.otherName);
}
```

Les callbacks pris en charge sont : `OnTriggerEnter2D()`, `OnTriggerStay2D()`, `OnTriggerExit2D()`, `OnCollisionEnter2D()`, `OnCollisionStay2D()` et `OnCollisionExit2D()`. Ils sont sans paramètres, conformément à la version actuelle du compilateur WarScript. Pendant le callback, `trigger.otherId`, `trigger.otherName` ou `collision.otherId`, `collision.otherName` exposent **en lecture seule** le GameObject opposé. Ces propriétés valent 0/chaîne vide hors du contact en cours.

## WarNode / Blueprint

Sur le GameObject qui possède le Collider2D, créer un graphe avec l'un des six **événements natifs** :

- `triggerEnter2d`, `triggerStay2d`, `triggerExit2d`
- `collisionEnter2d`, `collisionStay2d`, `collisionExit2d`

Relier cet Event à une action `message`, `setVariable`, `emitSignal`, une quête, une animation, etc. Le moteur transmet les événements au **propriétaire du collider**, via les signaux internes `physics2d:trigger:enter:<id>` (idem pour les autres types et phases). L'événement est consommé par WarNode **à l'image de simulation suivante** ; cela évite de muter la liste d'objets durant la résolution physique. L'acteur lié au signal est le GameObject ayant touché le collider.

Les noms de phases sont sensibles à la casse : `triggerEnter2d` contient `Enter` avec majuscule et finit par `2d` en minuscule.

## Validation et limites

La détection utilise les rectangles du BoxCollider2D et les cellules solides Tilemap ; `CircleCollider2D`, `CapsuleCollider2D`, contacts avec normales/impulsions, sous-colliders multiples et paramètres `Collision2D` Unity ne sont **pas encore** pris en charge. Un événement Collision2D signale un toucher ou un léger chevauchement rectangulaire ; un Trigger2D exige un chevauchement strict. Il n'y a pas encore de journal visuel de contacts ni de filtrage avancé par layer/matrix.

Tests unitaires : `tests/physics-contact-events-2d.test.mjs`. Les tests navigateur et exports Web doivent être validés avant toute fusion.

## Filtrage par couches 2D (Phase 2)

Un `Collider2D` dispose désormais des propriétés facultatives `layer` (entier 0–31) et `mask` (bitmask entier non signé). Deux colliders entrent en collision uniquement si leurs masques autorisent réciproquement la couche de l'autre. Le même filtre s'applique aux obstacles physiques et aux événements de contacts/Trigger2D ; la désactivation d'une paire déjà en contact produit un événement `Exit` à la prochaine mise à jour.

Les anciennes scènes sans `layer`/`mask` restent compatibles : couche par défaut `0`, masque par défaut `4294967295` (toutes couches). Le filtrage est **par Collider2D**, pas encore une matrice de couches globale comme dans Unity, et les colliders Circle/Capsule restent hors de cette passe.
