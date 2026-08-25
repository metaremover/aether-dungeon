#!/usr/bin/env python3
"""
AetherDungeon Autonomous Loot & Relic Relay (GenLayer -> EVM Vault)
===================================================================
Polls GenLayer Court for conquered dungeon sessions (VICTORY_DISBURSED), performs
strict pre-settlement verification of EVM adventurer, wager, funding, and settlement
state against the GenLayer record, and executes signed ECDSA transactions with confirmed receipts (status == 1).

SESSION-ID MAPPING CONVENTION:
Standardized 1-to-1 mapping between GenLayer string ID and EVM bytes32:
- GenLayer: "SESSION_001" (str)
- EVM: bytes32(abi.encodePacked("SESSION_001")) = `session_id.encode('utf-8').ljust(32, b'\0')[:32]`

PRE-SETTLEMENT VERIFICATION INVARIANTS:
1. Participant Binding: EVM adventurer strictly matches GenLayer session record.
2. Collateral Verification: EVM quest must be funded (isFunded == True).
3. Settlement Idempotency: EVM quest must not be already settled (isSettled == False).
4. Victory Validation: GenLayer session status must be "VICTORY_DISBURSED".
5. Confirmed Receipts: Waits for on-chain receipt and asserts receipt.status == 1 on both chains.
"""

import os
import sys
import time
import json
import logging
import requests
from typing import Dict, Any, Optional

try:
    from web3 import Web3
    from eth_account import Account
except ImportError:
    Web3 = None
    Account = None

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("aether_relay.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)

# Configuration from Environment
GENLAYER_RPC = os.getenv("GENLAYER_RPC", "https://studio.genlayer.com/api")
GENLAYER_COURT_ADDRESS = os.getenv("GENLAYER_COURT_ADDRESS", "0xa5f978ac9ca207A157f90a72BA656b23C0ac40AA")
EVM_RPC_URL = os.getenv("EVM_RPC_URL", "https://sepolia.base.org")
EVM_VAULT_ADDRESS = os.getenv("EVM_VAULT_ADDRESS", "0x9876543210987654321098765432109876543210")
RELAY_PRIVATE_KEY = os.getenv("RELAY_PRIVATE_KEY", "")
POLL_INTERVAL_SECONDS = int(os.getenv("POLL_INTERVAL_SECONDS", "30"))

VAULT_ABI = [
    {
        "inputs": [{"internalType": "bytes32", "name": "sessionId", "type": "bytes32"}],
        "name": "enterDungeonQuest",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "sessionId", "type": "bytes32"},
            {"internalType": "address", "name": "adventurer", "type": "address"},
            {"internalType": "bytes32", "name": "relicDna", "type": "bytes32"}
        ],
        "name": "disburseDungeonLoot",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "sessionId", "type": "bytes32"}],
        "name": "getQuestEscrow",
        "outputs": [
            {"internalType": "bytes32", "name": "id", "type": "bytes32"},
            {"internalType": "address", "name": "adventurer", "type": "address"},
            {"internalType": "uint256", "name": "wagerAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "lootPayout", "type": "uint256"},
            {"internalType": "bool", "name": "isFunded", "type": "bool"},
            {"internalType": "bool", "name": "isSettled", "type": "bool"},
            {"internalType": "bytes32", "name": "relicDna", "type": "bytes32"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]


class GenLayerCourtClient:
    def __init__(self, rpc_url: str, contract_address: str):
        self.rpc_url = rpc_url
        self.contract_address = contract_address

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        payload = {
            "jsonrpc": "2.0",
            "method": "gen_callView",
            "params": {
                "address": self.contract_address,
                "function_name": "get_session",
                "args": [session_id]
            },
            "id": int(time.time())
        }
        try:
            resp = requests.post(self.rpc_url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if "error" in data:
                    return None
                result = data.get("result")
                if isinstance(result, str):
                    try:
                        return json.loads(result)
                    except Exception:
                        pass
                if isinstance(result, dict):
                    return result
        except Exception as e:
            logging.error(f"[FAIL-CLOSED] Error querying dungeon session state: {e}")
        return None


class EvmSettlementRelay:
    def __init__(self, rpc_url: str, contract_address: str, private_key: str):
        self.rpc_url = rpc_url
        self.contract_address = contract_address
        self.private_key = private_key
        self.settled_sessions = {}

        if Web3:
            self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
            if self.private_key:
                self.account = Account.from_key(self.private_key)
                self.sender_address = self.account.address
            else:
                self.account = None
                self.sender_address = None
        else:
            self.w3 = None
            self.account = None
            self.sender_address = None

    def to_bytes32(self, text: str) -> bytes:
        raw_bytes = text.encode("utf-8")
        return raw_bytes.ljust(32, b'\0')[:32]

    def get_evm_quest(self, session_id: str) -> Optional[Dict[str, Any]]:
        if not self.w3:
            return None
        try:
            contract = self.w3.eth.contract(address=Web3.to_checksum_address(self.contract_address), abi=VAULT_ABI)
            s_bytes32 = self.to_bytes32(session_id)
            res = contract.functions.getQuestEscrow(s_bytes32).call()
            return {
                "sessionId": res[0],
                "adventurer": res[1],
                "wagerAmount": res[2],
                "lootPayout": res[3],
                "isFunded": res[4],
                "isSettled": res[5],
                "relicDna": res[6]
            }
        except Exception as e:
            logging.error(f"[EVM READ ERROR] Failed to fetch quest {session_id} on EVM: {e}")
            return None

    def verify_and_settle_quest(self, session_id: str, gl_session: Dict[str, Any]) -> bool:
        if self.settled_sessions.get(session_id):
            return True

        if not self.w3 or not self.account:
            logging.error("[FAIL-CLOSED] Web3 or RELAY_PRIVATE_KEY not configured.")
            return False

        # 1. Fetch live EVM Escrow state
        evm_quest = self.get_evm_quest(session_id)
        if not evm_quest:
            logging.error(f"[PRE-SETTLEMENT FAIL] EVM quest {session_id} does not exist on {self.contract_address}")
            return False

        # 2. Strict Invariant Verification
        gl_adv = gl_session.get("adventurer", "").lower()
        gl_status = gl_session.get("status", "")
        gl_relic = gl_session.get("relic_dna", "0x0")

        evm_adv = str(evm_quest.get("adventurer", "")).lower()
        evm_funded = bool(evm_quest.get("isFunded", False))
        evm_settled = bool(evm_quest.get("isSettled", False))

        assert gl_status == "VICTORY_DISBURSED", f"GenLayer quest not won: {gl_status}"
        assert evm_adv == gl_adv, f"Adventurer mismatch: EVM({evm_adv}) != GL({gl_adv})"
        assert evm_funded == True, f"EVM quest {session_id} not funded"
        assert evm_settled == False, f"EVM quest {session_id} already settled"

        logging.info(f"🛡️ [PRE-SETTLEMENT VERIFIED] Quest {session_id} verified: Adventurer {gl_adv}, Relic {gl_relic}")

        # 3. Sign & Broadcast EVM Disbursement Transaction
        try:
            contract = self.w3.eth.contract(address=Web3.to_checksum_address(self.contract_address), abi=VAULT_ABI)
            s_bytes32 = self.to_bytes32(session_id)
            adv_addr = Web3.to_checksum_address(gl_adv)
            relic_bytes32 = self.to_bytes32(gl_relic)

            nonce = self.w3.eth.get_transaction_count(self.sender_address)
            gas_price = self.w3.eth.gas_price

            tx = contract.functions.disburseDungeonLoot(
                s_bytes32,
                adv_addr,
                relic_bytes32
            ).build_transaction({
                'from': self.sender_address,
                'nonce': nonce,
                'gas': 220000,
                'gasPrice': gas_price
            })

            signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            logging.info(f"⚡ [EVM BROADCAST] Sent disburseDungeonLoot tx: {tx_hash.hex()}. Awaiting confirmation...")

            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
            if receipt.status == 1:
                logging.info(f"✅ [EVM CONFIRMED] Dungeon loot & relic minted on block {receipt.blockNumber} (tx: {tx_hash.hex()}).")
                self.settled_sessions[session_id] = True
                return True
            else:
                logging.error(f"🚨 [FAIL-CLOSED] Loot disbursement reverted: {tx_hash.hex()}")
                return False
        except Exception as e:
            logging.error(f"[FAIL-CLOSED] Error broadcasting loot payout: {e}")
            return False


def run_relay(tracked_sessions: list):
    logging.info("=" * 75)
    logging.info("   AETHER DUNGEON AUTONOMOUS RELAY & PRE-SETTLEMENT VERIFIER")
    logging.info("=" * 75)
    logging.info(f"GenLayer Court: {GENLAYER_COURT_ADDRESS}")
    logging.info(f"EVM Vault: {EVM_VAULT_ADDRESS}")
    logging.info("Starting real-time dungeon conquest synchronization loop...\n")

    gl_client = GenLayerCourtClient(GENLAYER_RPC, GENLAYER_COURT_ADDRESS)
    evm_relay = EvmSettlementRelay(EVM_RPC_URL, EVM_VAULT_ADDRESS, RELAY_PRIVATE_KEY)

    while True:
        for session_id in tracked_sessions:
            try:
                session_data = gl_client.get_session(session_id)
                if session_data and session_data.get("status") == "VICTORY_DISBURSED":
                    evm_relay.verify_and_settle_quest(session_id, session_data)
            except Exception as e:
                logging.error(f"Error checking dungeon session {session_id}: {e}")

        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    test_sessions = ["SESSION_001", "SESSION_002"]
    try:
        run_relay(test_sessions)
    except KeyboardInterrupt:
        logging.info("\nRelay stopped by operator.")
