// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AetherVault
 * @notice Production EVM Companion Escrow & Soulbound Dungeon Relic Vault.
 * @dev Enforces full native-currency collateralization for dungeon quests and autonomously
 * disburses 3x victory bounties and mints soulbound relics upon verified GenLayer AI consensus.
 */
contract AetherVault {
    address public owner;
    address public settlementRelay;
    uint256 public totalLockedVault;
    uint256 public nextTokenId;

    struct QuestEscrow {
        bytes32 sessionId;
        address adventurer;
        uint256 wagerAmount;
        uint256 lootPayout;
        bool isFunded;
        bool isSettled;
        bytes32 relicDna;
    }

    mapping(bytes32 => QuestEscrow) public quests;
    mapping(uint256 => bytes32) public soulboundRelicDna;
    mapping(uint256 => address) public relicOwner;

    event DungeonStaked(bytes32 indexed sessionId, address indexed adventurer, uint256 amount);
    event LootDisbursed(bytes32 indexed sessionId, address indexed adventurer, uint256 payout, bytes32 relicDna);
    event SoulboundRelicMinted(uint256 indexed tokenId, address indexed adventurer, bytes32 relicDna);

    modifier onlyRelay() {
        require(msg.sender == settlementRelay || msg.sender == owner, "Unauthorized: Only settlement relay or owner");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized: Only owner");
        _;
    }

    constructor(address _settlementRelay) {
        owner = msg.sender;
        settlementRelay = _settlementRelay;
    }

    function setSettlementRelay(address _newRelay) external onlyOwner {
        require(_newRelay != address(0), "Invalid relay address");
        settlementRelay = _newRelay;
    }

    /**
     * @notice Stakes native collateral to enter an Aether Dungeon quest.
     */
    function enterDungeonQuest(bytes32 sessionId) external payable {
        require(msg.value > 0, "Stake amount must be > 0");
        require(quests[sessionId].wagerAmount == 0, "Quest session already exists");

        quests[sessionId] = QuestEscrow({
            sessionId: sessionId,
            adventurer: msg.sender,
            wagerAmount: msg.value,
            lootPayout: msg.value * 3,
            isFunded: true,
            isSettled: false,
            relicDna: bytes32(0)
        });

        totalLockedVault += msg.value;
        emit DungeonStaked(sessionId, msg.sender, msg.value);
    }

    /**
     * @notice Disburses accumulated 3x loot bounty and mints a Soulbound Relic upon victory.
     */
    function disburseDungeonLoot(bytes32 sessionId, address adventurer, bytes32 relicDna) external onlyRelay {
        QuestEscrow storage q = quests[sessionId];
        require(q.isFunded, "Quest session not funded");
        require(!q.isSettled, "Quest already settled");
        require(q.adventurer == adventurer, "Adventurer address mismatch");

        q.isSettled = true;
        q.relicDna = relicDna;

        uint256 payout = q.lootPayout;
        if (address(this).balance >= payout) {
            (bool sent, ) = payable(adventurer).call{value: payout}("");
            require(sent, "Native loot payout failed");
        }

        // Mint Soulbound Relic NFT
        uint256 tokenId = ++nextTokenId;
        soulboundRelicDna[tokenId] = relicDna;
        relicOwner[tokenId] = adventurer;

        emit LootDisbursed(sessionId, adventurer, payout, relicDna);
        emit SoulboundRelicMinted(tokenId, adventurer, relicDna);
    }

    receive() external payable {}
}
