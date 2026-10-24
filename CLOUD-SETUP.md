# WarLike Engine V0.4 — Characters and saving

## Included characters
Two original SVG sprite sheets stored inside this repository at `assets/characters/scout.svg` and `soldier.svg`. Each contains eight illustrated poses:
- Frame 0–1: idle
- Frame 2–5: walk
- Frame 6–7: attack

Character entities expose **Skin** and **Animation** selectors in the Inspector. Click the character cards in Project/Assets to place them. During Play mode, use arrow keys / ZQSD to move and **F** for attack. The SVG sheets are original starter artwork supplied with WarLike Engine and are not represented as Kenney artwork.

For more professionally illustrated CC0 sprite packs that can be imported later, see [Kenney Platformer Characters](https://kenney.nl/assets/platformer-characters) and [Kenney New Platformer Pack](https://kenney.nl/assets/new-platformer-pack).

## Automatic saving (without downloading JSON)
The app automatically saves the scene into the **browser's localStorage** every ~2.4 seconds and restores it on the same browser. No download necessary, but browser data may be lost when cleared and is not available on a second device.

## True cloud saving on Cloudflare Pages (requires binding setup)
A secure Pages Function exists at `functions/api/project.js` for same-owner cloud save. It is **not enabled** until Cloudflare is configured:
1. In Cloudflare, create a KV namespace, e.g. `WARLIKE_PROJECTS`.
2. Open your Pages project's **Settings → Bindings**, add a **KV namespace** binding with variable name `WARLIKE_SAVES`, select that namespace.
3. Under your Pages project's **Variables and Secrets**, add a **Secret** called `WARLIKE_CLOUD_TOKEN` with a long random value. Do NOT commit it to GitHub.
4. Redeploy the Pages project so Pages Functions receive the binding and secret.
5. Click **☁ Cloud** in WarLike Engine and enter your secret for that browser session. The frontend will send the credential only to its same-origin `/api/project` route.

Cloud storage uses one protected project slot, not multiple user accounts. The bearer token is stored in sessionStorage until the tab/browser session ends. Each write stores the JSON scene in KV. This is suitable for a private prototype, not public multi-user collaboration. For real accounts and projects, add OAuth + Cloudflare D1/R2 and access controls before allowing other users.

**Security:** The cloud endpoint rejects unauthenticated operations. Sharing your Pages URL does not share access to your cloud project. Keep the secret private.
