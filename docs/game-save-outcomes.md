# Sauvegardes : conserver les fins et reprendre CHAMBRE 07

## Comportement corrigé

Une sauvegarde faite après une victoire ou une défaite conserve son état et son texte de fin. F5 ne remplace plus le texte par « Partie sauvegardée ». Au chargement, le jeu reste sur son écran de résultat ; les personnages et chronomètres ne reprennent pas leur simulation. Une sauvegarde faite en pause reprend normalement en jeu.

Le format `warlike.save.v1` reste lisible. `session.notice` est un champ facultatif ; aucun stockage ni projet existant n'est réécrit lors de la lecture. Les anciennes sauvegardes sans ce champ affichent un texte générique si leur état est `won` ou `lost`. Celles qui n'ont pas de champ `phase` reprennent en jeu. Les phases inconnues et les textes invalides sont refusés avant la modification de la scène courante.

Les signaux Blueprint en attente sont également conservés dans l'extension facultative `sequenceSignals`, version 1, avec leur acteur émetteur. Une sauvegarde juste après la réponse de Lia ne perd plus le déclenchement de la poursuite. La file et les identifiants sont validés, puis restaurés avant la prochaine mise à jour ; les anciens fichiers sans cette extension restent lisibles.

## Vérifications

- `tests/game-save-outcomes.test.mjs` : victoire, défaite, pause, anciens champs absents, données invalides et absence de mutation de l'ancien snapshot.
- `tests/chambre-07-native-gameplay.test.mjs` : pour chacune des deux fins, sortie et dialogue verrouillés au début, sauvegarde/reprise après chaque souvenir, pendant le dialogue, pendant la poursuite et après la victoire. Les champs inconnus d'un ancien objet restent présents.
- `scripts/test-chambre07-export-browser.mjs` : archive ZIP autonome, lancement sous Chromium et contrôle des collisions avec les moteurs interne et Rapier. Pour chaque fin, le parcours utilise les vraies commandes E/F5/F9 et le bouton de dialogue, avec trois reprises après rechargement de page et trois chargements rapides. Les requêtes externes du parcours sont bloquées. Les positions d'approche des objets sont placées par le test : cette vérification ne constitue pas un parcours manuel complet du labyrinthe.
- Une scène 2D au format historique est ouverte dans le navigateur, puis une ancienne sauvegarde de victoire sans texte est chargée. Identifiant, position, champ inconnu et octets du stockage sont conservés.

La CI produit les captures de la scène, des deux fins et de la reprise 2D. Les essais visuels manuels multi-navigateurs et la qualité complète du rendu restent distincts de ces contrôles automatiques. Ce correctif ne sérialise pas les actions Blueprint suspendues : sauvegarder au milieu d'un `Wait` reste un chantier séparé.
