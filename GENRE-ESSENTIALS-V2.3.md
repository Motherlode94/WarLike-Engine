# WarLike Studio V2.3 — Genre Essentials Asset Pack

**72 additional original SVG prefabs**, integrated directly into the existing Project / Assets browser. Previous catalogue: 175. New catalogue: **247**. All sprites render offline and share the standard add/double-click/drag-to-scene and Inspector workflows.

## Pack by category
| Category | Added | Examples |
|---|---:|---|
| Characters | 10 | Football player, basketball player, referee, boxer, wrestler, samurai, pirate, farmer, firefighter |
| Monsters | 10 | Zombie nurse, zombie soldier, zombie dog, infected mutant, ghost, vampire, orc, dragon whelp, giant rat, sand worm |
| Vehicles | 10 | Sports car, race car, bus, taxi, fire truck, tractor, motorboat, speedboat, fighter jet, RTS harvester |
| Weapons | 10 | Boxing glove, hockey stick, fencing sword, baseball bat, chakram, boomerang, mace, scythe, baton, wand |
| Props | 24 | Football, basketball, tennis ball, goal, hoop, net, ring, scoreboard, road segments, street signs, crops, walls |
| VFX | 8 | Sword swipe, punch impact, speed trail, confetti, engine flame, skid, water splash, shield burst |
| **Total** | **72** | |

## Use
1. Open the Studio; go to **Project / Assets**.
2. Select Characters, Monsters, Vehicles, Weapons, Props, or VFX, or use search terms like **sport**, **RTS**, **fantasy**, **ville**.
3. Double click an item to instantiate it, or drag its thumbnail into the Scene.
4. Edit the prefab in Inspector and save/export your scene as usual.

The new stone wall, wooden palisade and traffic barrier are collision-solid for player, projectiles and vehicles. Other assets inherit existing category behavior; vehicles use the current 2D vehicle controller. Sport objects are currently props, **not full sport-specific match rules**.

## Verification
- New asset count by category: 10 + 10 + 10 + 10 + 24 + 8 = 72.
- Added automated regression tests in `tests/genre-essentials.test.mjs` for total count, unique IDs, SVG preview generation and genre tags.
- JS syntax checked on all modified files; the committed regression tests have not yet been run in the GitHub CI or a browser during this turn.
- SVG art is procedurally illustrated, not licensed 3D models or motion capture / professional sprite sheets.
