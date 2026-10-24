# WarLike Studio V1.3 — RPG Systems

Original, independent Game Creator 2–inspired visual workflow. Not a copy of the proprietary Unity extension.

## Implemented
- Branching dialogues with selectable choices and linked nodes
- Quest states, objectives, progress and completion, journal (J)
- Inventory slots, item counts, selection/equipment indicator (I)
- Visual Logic actions: dialogue, quests, items, variables, events and conditions
- Configurable AI states: patrol, chase, guard, wander, flee, follow; adjustable speed and detection radius
- One-click RPG Demo: talk to Elara (E), accept a quest, find three relics, open the gate

## Editor
Select an object, add Visual Logic and configure Triggers, Conditions and Actions. Dialogue Tree in Inspector allows multiple nodes and choices; target -1 closes, 0+ branches to a specific node. Actions and dialogue definitions are part of saved scenes.

## Limits
This is a functional starter feature set, NOT a complete Game Creator 2 implementation. Missing full visual behavior-tree graph, advanced cutscene timeline, graph animation state machine, crafting, equipped-weapon effects, localization and scalable user/project cloud accounts. Runtime quest and inventory progress reset between Play sessions. Cloudflare KV must still be configured separately.