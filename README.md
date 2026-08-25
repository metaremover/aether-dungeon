# AetherDungeon — Autonomous AI Game Master D&D Roguelike & Staked Vault

> **"The world's first on-chain tabletop D&D RPG where an Intelligent Contract acts as the autonomous Dungeon Master, adjudicating free-form player text actions and releasing staked native treasure."**

---

## 🔗 Verified Deployments & Links
- **GenLayer Explorer Contract**: [`0xa5f978ac9ca207A157f90a72BA656b23C0ac40AA`](https://explorer-studio.genlayer.com/address/0xa5f978ac9ca207A157f90a72BA656b23C0ac40AA)
- **Live DApp Dashboard**: [`https://aether-dungeon.vercel.app/`](https://aether-dungeon.vercel.app/)
- **GitHub Repository**: [`https://github.com/metaremover/aether-dungeon`](https://github.com/metaremover/aether-dungeon)

---

## 🛡️ Production Invariants & Reviewer Safeguards
1. **Free-Form Natural Language Strategy**:
   - Players type arbitrary tactical text (spells, stealth, weapon maneuvers) evaluated subjectively by GenLayer AI consensus.
2. **Multi-Layer Anti-Replay & Session Binding**:
   - Unique session IDs (`[ERR_REPLAY_01]`) and strict caller authorization checks (`[ERR_AUTH_01]`). Reverts verified on-chain.
3. **Single-Round Unified AI Consensus**:
   - Ingests 24/7 UTC Atomic Clock (`timeapi.io`) + player class capabilities + action prompt in 1 parallel prompt pass (0 leader rotations).
4. **Deterministic Vitality & Combat Calibration**:
   - Calculates action feasibility, damage dealt, HP lost, and chamber progression mathematically.
5. **Bound Native-Currency Loot Vault**:
   - `relay/AetherRelay.py` validates Chamber 3 victory on `AetherVault.sol`, signs ECDSA transactions, and confirms on-chain receipts (`status == 1`) to disburse 3x native collateral and mint a Soulbound Relic NFT.
