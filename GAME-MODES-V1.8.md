# WarLike Studio V1.8 — Game Mode Expansion + Player & Vehicle Controller

## Play controls

- **On foot:** ZQSD / WASD or arrow keys to move; Shift to sprint; K ninja melee; F / mouse to shoot; C to toggle smooth follow camera.
- **Vehicles:** approach a Jeep, Buggy or any other vehicle; E enter. Z/W/Up accelerate, S/Down reverse/brake, Q/A/Left and D/Right steer, Space handbrake; E exit; C toggles camera follow.
- Vehicles have collision handling with Buildings and Props; the player is hidden while seated and returns to the world on exit. Foot collision uses AABB for solid obstacles.
- Open **Game → mode selector → Charger la démo choisie**. Demos include a playable hero, bots, Jeep and Buggy.

## Extended local modes

- Deathmatch: individual kill leaderboard, respawns, time and score limits, bot-versus-bot attacks.
- Team Deathmatch: team scores, friendly-fire checks on player bullets, skirmish bots.
- Battle Royale: contracting storm, storm damage, consumable medkits, ammo, armor, loot pickups with E and last-survivor rule.
- Roleplay: choose a job (R), role salary, jobs in Police Station, Hospital, Shop, Warehouse and HQ. Press E near the corresponding building to earn income. Medic heals, Mechanic repairs nearby vehicles.
- Frontline: three flags A/B/C, zone occupancy capture and score income; bots navigate directly toward objectives without pathfinding.

## Editor integration

All five mode rule presets can be applied to a scene with **Game → Ajouter Game Mode à la scène**, and customized in **Inspector → Game Mode Rules**. Player and team assignment can be edited. The mode config survives JSON scene export/import and local autosave. Play/Stop restores the authoring scene.

## Limitations

- Still a **local single-player prototype**, not online multiplayer. Dedicated servers, secure authentication, replication, lag compensation, lobby service, matchmaking and anti-cheat are not present.
- Bots use simple direct navigation, not pathfinding. Vehicles are kinematic 2D rather than realistic suspension physics. RP jobs and loot are prototype loops, not persistent production systems.
- Code syntax checked. CI test execution, Unity C# compilation and Cloudflare deployment not verified here.
