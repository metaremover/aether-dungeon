# AetherDungeon — Autonomous AI Game Master D&D Roguelike & Staked Vault

> **"The world's first on-chain tabletop D&D RPG where an Intelligent Contract acts as the autonomous Dungeon Master, adjudicating free-form player text actions and releasing staked native treasure."**

---

## 🔗 Verified Deployments & Links
- **GenLayer Explorer Contract**: [`0x2EB8E42A6E7a650e995B2adc306c4051Af1Db122`](https://explorer-studio.genlayer.com/address/0x2EB8E42A6E7a650e995B2adc306c4051Af1Db122)
- **Live DApp Dashboard**: [`https://aether-dungeon.vercel.app/`](https://aether-dungeon.vercel.app/)
- **GitHub Repository**: [`https://github.com/metaremover/aether-dungeon`](https://github.com/metaremover/aether-dungeon)

---

## 🛡️ End-to-End Wager Flow & Reviewer Safeguards (Gen. Dave Updates)

### 1. Bound Vault Quest & Wager Parity
- **Session-ID Mapping**: Standardized 1-to-1 mapping (`str "SESSION_001"` $\leftrightarrow$ `bytes32(abi.encodePacked("SESSION_001"))` / `to_bytes32()`).
- **Bound Wager**: `enter_dungeon(sessionId, class, wager)` records the exact staked wager on GenLayer, matching the native `msg.value` deposited into `AetherVault.sol` via `enterDungeonQuest(sessionId)`.

### 2. Signed Client Creation & Transaction Success
- Frontend dashboard executes the signed EVM vault staking and GenLayer quest creation, awaiting confirmed receipts (`receipt.status == 1` / `gen_callView("get_session")`) before presenting the active chamber.

### 3. Relay Autonomous Session Discovery & Pre-Settlement Verification
- `relay/AetherRelay.py` scans on-chain sessions (`get_total_sessions`, `get_session_by_index`), queries EVM `getQuestEscrow(sessionId)`, and strictly verifies:
  - `evm.adventurer == gl.adventurer`
  - `evm.wagerAmount == gl.staked_wager`
  - `evm.isFunded == True`
  - `evm.isSettled == False`
  - `gl.status == "VICTORY_DISBURSED"`
  - `vault_balance >= payout`

### 4. Underfunded Settlement Strict Reversion Guard
- `AetherVault.sol` strictly asserts `require(address(this).balance >= payout, "[ERR_UNDERFUNDED]")` and reverts if the vault is underfunded, preventing any quest from being marked settled or paid without confirmed fund transfer.

### 5. Contract-Level AI Enums & Combat Value Bounds
- `AetherDungeonCourt.py` enforces strict validation of AI feasibility enums (`CRITICAL_SUCCESS`, `SUCCESS`, `PARTIAL_SUCCESS`, `FAILURE`, `CRITICAL_FAIL`) and clamps combat metrics (`0 <= damage <= 1000`, `0 <= hp_lost <= 500`, `0 <= mana_used <= 500`) in contract code before updating on-chain state.
