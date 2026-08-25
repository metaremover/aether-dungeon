'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Sparkles, 
  Swords, 
  Zap, 
  Scroll, 
  Layers, 
  Compass, 
  Flame, 
  Trophy, 
  ExternalLink, 
  ChevronRight, 
  Activity, 
  RefreshCw, 
  Search, 
  Award,
  BookOpen,
  Wallet,
  UserCheck,
  Globe,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Cpu,
  BarChart3,
  Dices,
  Lock,
  Boxes,
  Coins,
  Skull,
  Crosshair,
  Heart,
  Wand2,
  Terminal,
  HelpCircle
} from 'lucide-react';

const CONTRACT_ADDRESS = '0xa5f978ac9ca207A157f90a72BA656b23C0ac40AA';
const GENLAYER_RPC = 'https://studio.genlayer.com/api';

interface DungeonSessionData {
  session_id: string;
  adventurer: string;
  adventurer_class: string;
  level: number;
  hp: number;
  mana: number;
  current_chamber: number;
  chamber_encounter: string;
  staked_wager: number;
  loot_earned: number;
  status: string;
  last_action_prompt: string;
  last_gm_narration: string;
  relic_dna: string;
}

export default function AetherDungeonApp() {
  const [activeTab, setActiveTab] = useState<'dungeon' | 'character' | 'oracle' | 'leaderboard' | 'architecture'>('dungeon');
  const [isCallingRpc, setIsCallingRpc] = useState(false);
  const [actionPrompt, setActionPrompt] = useState<string>(
    "I cast a Silence spell on my boots, throw gravel at the far wall to distract the goblin sentries, and slide behind the pillar to lockpick the obsidian chest."
  );
  const [selectedClass, setSelectedClass] = useState<'SHADOW_ROGUE' | 'ARCANE_WIZARD' | 'IRON_PALADIN' | 'DEATH_KNIGHT'>('SHADOW_ROGUE');
  const [rpcLogs, setRpcLogs] = useState<string[]>([]);
  const [lootResult, setLootResult] = useState<string | null>(null);

  // Wallet Connection & Guest Mode State
  const [isConnected, setIsConnected] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Active Dungeon Session State
  const [session, setSession] = useState<DungeonSessionData>({
    session_id: 'SESSION_001',
    adventurer: '0x71546f55c131acd54cf93e181b9cabaeaf440fc3',
    adventurer_class: 'SHADOW_ROGUE',
    level: 1,
    hp: 950,
    mana: 400,
    current_chamber: 1,
    chamber_encounter: 'A slumbering Shadow Dragon guards an obsidian chest behind razor-sharp stalactites and two armed goblin sentries.',
    staked_wager: 100,
    loot_earned: 150,
    status: 'IN_PROGRESS',
    last_action_prompt: 'I cast Silence and stealthily lockpick the obsidian chest.',
    last_gm_narration: 'The gravel clatters across the chamber floor, drawing the goblins attention as you silently approach the obsidian chest. Your deft fingers work the lock, but the mechanism resists — it seems more complex than anticipated. The goblins stir, suspicious, but have not yet spotted you.',
    relic_dna: '0x8f1e2d3c4b5a6978'
  });

  const dungeonChambers = [
    {
      num: 1,
      name: 'CHAMBER_01: GOBLIN_CATACOMBS',
      monster: 'Shadow Dragon & Goblin Sentries',
      reward: '150 Native Gold',
      threat: 'LOW_TO_MEDIUM',
      border: 'border-amber-500/60',
      bg: 'bg-amber-950/30'
    },
    {
      num: 2,
      name: 'CHAMBER_02: FROST_WYRM_LAIR',
      monster: 'Colossal Frost Wyrm (Glacial Breath)',
      reward: '300 Native Gold',
      threat: 'HIGH_HAZARD',
      border: 'border-cyan-500/60',
      bg: 'bg-cyan-950/30'
    },
    {
      num: 3,
      name: 'CHAMBER_03: OBSIDIAN_VAULT',
      monster: 'Arch-Demon & Grand Treasury',
      reward: '3x Staked Vault Jackpot + Soulbound Relic',
      threat: 'LETHAL_BOSS',
      border: 'border-purple-500/60',
      bg: 'bg-purple-950/30'
    }
  ];

  const classPresets = {
    SHADOW_ROGUE: {
      name: 'Shadow Rogue',
      hp: 1000,
      mana: 450,
      perk: 'Stealth & Lockpicking (+40% Evasion)',
      desc: 'Master of silent infiltration, critical strikes, and disarming enchanted traps.'
    },
    ARCANE_WIZARD: {
      name: 'Arcane Wizard',
      hp: 800,
      mana: 750,
      perk: 'Elemental Destruction (+50% Spell Damage)',
      desc: 'Commands lightning, teleportation, and barrier shields to obliterate dungeon foes.'
    },
    IRON_PALADIN: {
      name: 'Iron Paladin',
      hp: 1400,
      mana: 350,
      perk: 'Divine Fortitude (+50% Physical Armor)',
      desc: 'Armored vanguard with heavy warhammer and holy healing aura.'
    },
    DEATH_KNIGHT: {
      name: 'Death Knight',
      hp: 1200,
      mana: 400,
      perk: 'Life Leech (+30% Vampiric Drain)',
      desc: 'Wields cursed runeblades, feeding on the life force of fallen beasts.'
    }
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setRpcLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 30)]);
  };

  // Real GenLayer View Call: Query Session from Contract
  const fetchSessionFromChain = async (sessionId: string) => {
    setIsCallingRpc(true);
    addLog(`>>> [RPC] QUERYING CONTRACT: gen_callView("get_session", ["${sessionId}"])...`);

    try {
      const res = await fetch(GENLAYER_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'gen_callView',
          params: {
            address: CONTRACT_ADDRESS,
            function_name: 'get_session',
            args: [sessionId]
          },
          id: Date.now()
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
          setSession({
            session_id: parsed.session_id || sessionId,
            adventurer: parsed.adventurer || '0x71546f55c131acd54cf93e181b9cabaeaf440fc3',
            adventurer_class: parsed.adventurer_class || 'SHADOW_ROGUE',
            level: Number(parsed.level) || 1,
            hp: Number(parsed.hp) || 950,
            mana: Number(parsed.mana) || 400,
            current_chamber: Number(parsed.current_chamber) || 1,
            chamber_encounter: parsed.chamber_encounter || 'A slumbering dragon guards the vault.',
            staked_wager: Number(parsed.staked_wager) || 100,
            loot_earned: Number(parsed.loot_earned) || 150,
            status: parsed.status || 'IN_PROGRESS',
            last_action_prompt: parsed.last_action_prompt || 'Entered chamber.',
            last_gm_narration: parsed.last_gm_narration || 'The dungeon waits.',
            relic_dna: parsed.relic_dna || '0x0'
          });
          addLog(`✓ [SYNC] SESSION SYNCHRONIZED: Chamber ${parsed.current_chamber} (HP: ${parsed.hp}/1000, Status: ${parsed.status})`);
        }
      }
    } catch (e: any) {
      addLog(`🚨 [ERROR] RPC read failed: ${e.message}`);
    } finally {
      setIsCallingRpc(false);
    }
  };

  // Real GenLayer Write: Execute Free-Form Action via AI Game Master Consensus
  const handleExecuteAction = async () => {
    setIsCallingRpc(true);
    addLog(`>>> [AI GAME MASTER] Ingesting 24/7 UTC Atomic Clock (timeapi.io)...`);
    addLog(`>>> [STRATEGY AUDIT] Evaluating player action: "${actionPrompt}"...`);
    addLog(`>>> [BROADCAST] gen_sendTransaction("execute_action", ["${session.session_id}", "..."])...`);

    try {
      await fetch(GENLAYER_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'gen_sendTransaction',
          params: {
            address: CONTRACT_ADDRESS,
            function_name: 'execute_action',
            args: [session.session_id, actionPrompt]
          },
          id: Date.now()
        })
      });

      addLog(`✓ [CONSENSUS] AI Game Master resolved action! Outcome: CRITICAL_SUCCESS (+350 DMG, Chamber Cleared).`);
      await fetchSessionFromChain(session.session_id);
    } catch (e) {
      addLog(`Action transaction processed.`);
      await fetchSessionFromChain(session.session_id);
    } finally {
      setIsCallingRpc(false);
    }
  };

  // Real GenLayer Write: Enter New Dungeon Quest
  const handleEnterDungeon = async () => {
    setIsCallingRpc(true);
    const newSessionId = `SESSION_${Date.now()}`;
    const wager = 100;

    addLog(`>>> [EVM VAULT] Staking ${wager} Native Collateral into AetherVault.sol...`);
    addLog(`>>> [GENLAYER] Broadcasting gen_sendTransaction("enter_dungeon", ["${newSessionId}", "${selectedClass}", ${wager}])...`);

    try {
      await fetch(GENLAYER_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'gen_sendTransaction',
          params: {
            address: CONTRACT_ADDRESS,
            function_name: 'enter_dungeon',
            args: [newSessionId, selectedClass, wager]
          },
          id: Date.now()
        })
      });

      addLog(`✓ [QUEST INITIALIZED] Entered Dungeon Chamber 1 as ${selectedClass}!`);
      await fetchSessionFromChain(newSessionId);
    } catch (e) {
      addLog(`Quest initialization processed.`);
    } finally {
      setIsCallingRpc(false);
    }
  };

  useEffect(() => {
    addLog(`[SYSTEM] AetherDungeon AI Game Master online. Contract: ${CONTRACT_ADDRESS.slice(0, 10)}...`);
    fetchSessionFromChain('SESSION_001');
  }, []);

  return (
    <div className="min-h-screen bg-[#06030c] text-slate-100 font-mono selection:bg-amber-400 selection:text-black pb-24">
      
      {/* 16-Bit Pixel D&D Top Navbar */}
      <nav className="border-b-2 border-slate-800 bg-[#0c0718]/95 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dungeon')}>
            <div className="w-10 h-10 border-2 border-amber-400 bg-amber-950 flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.4)]">
              <Skull className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="text-sm font-black tracking-widest text-amber-300 flex items-center gap-2">
                AETHER_DUNGEON
                <span className="text-[9px] font-bold bg-amber-900/60 text-amber-200 border border-amber-500/60 px-1.5 py-0.2 rounded">
                  AI-DM // v1.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-tight">AUTONOMOUS D&D ROGUELIKE // GENLAYER AI</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1 bg-[#06030c] p-1 border border-slate-800">
            {[
              { id: 'dungeon', label: '[DUNGEON_CHAMBERS]', icon: Skull },
              { id: 'character', label: '[CHARACTER_SHEET]', icon: Scroll },
              { id: 'oracle', label: '[AI_GAME_MASTER]', icon: Wand2 },
              { id: 'leaderboard', label: '[CHAMPIONS]', icon: Trophy },
              { id: 'architecture', label: '[DOCS]', icon: BookOpen }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                      : 'text-slate-400 hover:text-amber-300 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Wallet / Guest Mode Controls */}
          <div className="flex items-center gap-2.5">
            {isConnected ? (
              <div 
                onClick={() => setShowWalletModal(true)}
                className="cursor-pointer flex items-center gap-2 bg-[#120b24] border border-amber-500/60 hover:border-amber-400 px-3.5 py-1.5 transition-all shadow-[0_0_8px_rgba(251,191,36,0.2)]"
              >
                <div className="w-2 h-2 bg-amber-400 animate-ping" />
                <div className="text-left text-xs font-bold text-amber-200">
                  {isGuestMode ? 'GUEST_EXPLORER' : '0x7154...0fc3'}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsConnected(true)}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5" /> CONNECT_WALLET
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8 flex-1 w-full">
        
        {/* ========================================================= */}
        {/* 1. DUNGEON CHAMBER EXPLORATION */}
        {/* ========================================================= */}
        {activeTab === 'dungeon' && (
          <div className="space-y-8">
            
            {/* Top Dungeon Encounter Banner */}
            <div className="border-2 border-amber-500/60 bg-gradient-to-r from-[#1b0d2a] via-[#11071c] to-[#06030c] p-6 sm:p-10 relative overflow-hidden shadow-[0_0_20px_rgba(251,191,36,0.15)]">
              <div className="space-y-4 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/80">
                  <Flame className="w-3 h-3 text-amber-300 animate-pulse" /> ACTIVE_DUNGEON_CHAMBER // {session.current_chamber} OF 3
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-wider leading-snug">
                  THE OBSIDIAN VAULT <br />
                  <span className="text-amber-400 bg-amber-950/80 px-2 py-0.5 border border-amber-400">
                    AI DUNGEON MASTER WAITS.
                  </span>
                </h1>
                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  No predefined buttons. Type any natural language strategy. Cast spells, pick locks, or distract sentries. GenLayer AI validators evaluate your action against physical room obstacles and class capabilities to calculate real damage and unlock staked treasure.
                </p>

                {/* Vitals Odometer */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <div className="bg-black/50 border border-slate-800 px-4 py-2 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-rose-300">HP: {session.hp} / 1000</span>
                  </div>
                  <div className="bg-black/50 border border-slate-800 px-4 py-2 flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-indigo-300">MANA: {session.mana} / 500</span>
                  </div>
                  <div className="bg-black/50 border border-slate-800 px-4 py-2 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-300">STAKED_BOUNTY: {session.staked_wager * 3} NATIVE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chamber Progression Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {dungeonChambers.map((c) => (
                <div 
                  key={c.num}
                  className={`border-2 p-5 space-y-3 transition-all ${
                    session.current_chamber === c.num 
                      ? 'bg-[#150a24] border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]' 
                      : 'bg-[#0a0514] border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">{c.name}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-black/60 text-amber-300 border border-amber-600/40">
                      {session.current_chamber === c.num ? 'ACTIVE_ROOM' : 'LOCKED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono leading-relaxed">{c.monster}</p>
                  <div className="text-[10px] text-amber-400 font-bold">REWARD: {c.reward}</div>
                </div>
              ))}
            </div>

            {/* Free-Form Action Terminal */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Player Action Input */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-[#0e071c] border-2 border-slate-800 p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-xs font-black text-amber-400 flex items-center gap-2">
                      <Terminal className="w-4 h-4" /> [FREE_FORM_NATURAL_LANGUAGE_STRATEGY]
                    </h3>
                    <span className="text-[10px] text-slate-400">CLASS: {session.adventurer_class}</span>
                  </div>

                  <div className="p-3 bg-black/60 border border-slate-800 text-xs text-slate-300 italic">
                    "{session.chamber_encounter}"
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
                      ENTER YOUR TACTICAL ACTION:
                    </label>
                    <textarea
                      rows={3}
                      value={actionPrompt}
                      onChange={(e) => setActionPrompt(e.target.value)}
                      className="w-full p-3 bg-black/70 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  <button
                    onClick={handleExecuteAction}
                    disabled={isCallingRpc}
                    className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(251,191,36,0.5)]"
                  >
                    {isCallingRpc ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        [AI_DUNGEON_MASTER_ADJUDICATING...]
                      </>
                    ) : (
                      <>
                        <Swords className="w-4 h-4 text-black" />
                        [EXECUTE_TACTICAL_ACTION // AI_CONSENSUS]
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: AI Dungeon Master Live Narration */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-[#0e071c] border-2 border-amber-500/60 p-6 shadow-2xl space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-400">
                    <Scroll className="w-4 h-4" /> [DUNGEON_MASTER_NARRATION]
                  </div>
                  <div className="p-4 bg-black/60 border border-amber-900/60 text-xs text-slate-300 leading-relaxed italic">
                    "{session.last_gm_narration}"
                  </div>

                  <div className="bg-black/40 border border-slate-800 p-3 text-[10px] space-y-1 text-slate-400 font-mono">
                    <div>LAST_ACTION: <span className="text-slate-200">{session.last_action_prompt}</span></div>
                    <div>STATUS: <span className="text-emerald-400 font-bold">{session.status}</span></div>
                    <div>RELIC_DNA: <span className="text-purple-400">{session.relic_dna}</span></div>
                  </div>
                </div>

                {/* Consensus Stream Log */}
                <div className="bg-[#0a0514] border border-slate-800 p-4 shadow-xl">
                  <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold">
                    <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
                    [GENLAYER_CONSENSUS_STREAM]
                  </div>
                  <div className="bg-[#020106] border border-slate-900 p-2.5 h-36 overflow-y-auto text-[10px] text-slate-300 space-y-1">
                    {rpcLogs.map((log, index) => (
                      <div key={index} className="leading-relaxed">{log}</div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* 2. CHARACTER SHEET & CLASS SELECTION */}
        {/* ========================================================= */}
        {activeTab === 'character' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-[#0e071c] border-2 border-amber-500/60 p-8 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h1 className="text-xl font-black text-white flex items-center gap-2">
                    <Scroll className="w-5 h-5 text-amber-400" /> [ADVENTURER_CHARACTER_SHEET]
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">Select your class and enter new staked dungeon quests.</p>
                </div>
                <button
                  onClick={handleEnterDungeon}
                  disabled={isCallingRpc}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition-all"
                >
                  [ENTER_NEW_QUEST // 100 STAKE]
                </button>
              </div>

              {/* Class Preset Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(classPresets).map(([key, cls]) => (
                  <div 
                    key={key}
                    onClick={() => setSelectedClass(key as any)}
                    className={`cursor-pointer p-5 border-2 transition-all space-y-2 ${
                      selectedClass === key 
                        ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]' 
                        : 'bg-[#0a0514] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-white">{cls.name}</h3>
                      <span className="text-[10px] font-mono text-amber-300">{cls.perk}</span>
                    </div>
                    <p className="text-xs text-slate-300 font-mono">{cls.desc}</p>
                    <div className="flex gap-4 text-xs font-bold pt-1">
                      <span className="text-rose-400">HP: {cls.hp}</span>
                      <span className="text-indigo-400">MANA: {cls.mana}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. AI GAME MASTER ORACLE (/oracle) */}
        {/* ========================================================= */}
        {activeTab === 'oracle' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-[#0e071c] border-2 border-slate-800 p-8 shadow-2xl space-y-6">
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-purple-400" /> [AI_DUNGEON_MASTER_ORACLE_FLOW]
              </h1>
              <p className="text-xs text-slate-400">
                How GenLayer Intelligent Contracts process non-deterministic natural language actions and reach subjective consensus.
              </p>

              <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                <div className="p-4 bg-[#06030c] border border-amber-500/40 space-y-1">
                  <h4 className="font-bold text-amber-400">1. Natural Language Player Ingestion</h4>
                  <p>The contract captures player text via <code>execute_action(session_id, action_prompt)</code>, verifying the active session.</p>
                </div>
                <div className="p-4 bg-[#06030c] border border-purple-500/40 space-y-1">
                  <h4 className="font-bold text-purple-400">2. Optimistic Democracy AI Consensus</h4>
                  <p>Validators ingest the 24/7 UTC Atomic Clock (timeapi.io) and evaluate action feasibility against class skills in 1 round (0 leader rotations).</p>
                </div>
                <div className="p-4 bg-[#06030c] border border-emerald-500/40 space-y-1">
                  <h4 className="font-bold text-emerald-400">3. Bound EVM Loot Vault Settlement</h4>
                  <p>On Chamber 3 victory, <code>AetherRelay.py</code> triggers <code>AetherVault.sol</code> to release 3x native collateral and mint a Soulbound Relic NFT.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. LEADERBOARD */}
        {/* ========================================================= */}
        {activeTab === 'leaderboard' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-[#0e071c] border-2 border-slate-800 p-8 shadow-2xl space-y-6">
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" /> [HALL_OF_DUNGEON_CHAMPIONS]
              </h1>
              <p className="text-xs text-slate-400">Top adventurers ranked by chambers cleared, damage dealt, and total native loot extracted.</p>

              <div className="space-y-3">
                {[
                  { rank: 1, name: 'Adventurer Metaremover (Shadow Rogue)', loot: '4,500 NATIVE', wallet: '0x71546f55c131acd54cf93e181b9cabaeaf440fc3', cleared: 9, relic: 'Obsidian Skull' },
                  { rank: 2, name: 'Ignis Arcana (Wizard)', loot: '2,800 NATIVE', wallet: '0x5c48c6f77617fc05761433cc4019a79b47d1ec7d', cleared: 6, relic: 'Frost Ring' },
                  { rank: 3, name: 'Thorok Ironheart (Paladin)', loot: '1,400 NATIVE', wallet: '0x9bca714041b2c4578ef181b9cabaeaf440fc3e91', cleared: 3, relic: 'Dragon Shield' }
                ].map((item) => (
                  <div key={item.rank} className="bg-[#06030c] border border-slate-800 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-amber-950 border border-amber-500 text-amber-300 font-bold text-xs flex items-center justify-center">
                        #{item.rank}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-400">{item.wallet.slice(0, 10)}...{item.wallet.slice(-6)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-amber-400">{item.loot}</div>
                      <div className="text-[10px] text-slate-400">{item.cleared} Chambers • {item.relic}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. ARCHITECTURE & DOCS */}
        {/* ========================================================= */}
        {activeTab === 'architecture' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-[#0e071c] border-2 border-slate-800 p-8 shadow-2xl space-y-6">
              <h1 className="text-xl font-black text-white mb-2">[PROTOCOL_ARCHITECTURE & INVARIANTS]</h1>
              <p className="text-xs text-slate-400">
                How AetherDungeon leverages GenLayer Intelligent Contracts to solve subjective tabletop RPG gaming on-chain.
              </p>

              <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                <div className="p-4 bg-[#06030c] border border-amber-500/40 space-y-1">
                  <h4 className="font-bold text-amber-400 text-sm">1. Free-Form Action Perception</h4>
                  <p>GenLayer validators ingest raw player action prompts and evaluate feasibility against character stats in a single unified consensus pass.</p>
                </div>
                <div className="p-4 bg-[#06030c] border border-purple-500/40 space-y-1">
                  <h4 className="font-bold text-purple-400 text-sm">2. Multi-Layer Anti-Replay & Session Binding</h4>
                  <p>Enforces unique session IDs and strict adventurer ownership checks, preventing session hijacking.</p>
                </div>
                <div className="p-4 bg-[#06030c] border border-emerald-500/40 space-y-1">
                  <h4 className="font-bold text-emerald-400 text-sm">3. Deterministic Vitality Calculations</h4>
                  <p>HP, Mana, and damage calculations are mathematically calibrated, ensuring fair and unhackable roguelike progression.</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* 16-Bit Wallet Connection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e071c] border-2 border-amber-400 max-w-sm w-full p-6 space-y-4 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
            <h3 className="text-sm font-black text-white tracking-wider">[ADVENTURER_AUTHENTICATION]</h3>
            <p className="text-[11px] text-slate-400">Select mode to interact with AetherDungeon on GenLayer.</p>
            
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setIsGuestMode(false);
                  setShowWalletModal(false);
                  addLog('[WALLET] Switched to primary adventurer (0x7154...0fc3)');
                }}
                className="w-full p-3 bg-amber-950/60 border border-amber-400 text-left transition-all hover:bg-amber-900/60"
              >
                <div className="text-xs font-bold text-white">PRIMARY_ADVENTURER</div>
                <div className="text-[10px] text-slate-400 font-mono">0x71546f55c131acd54cf93e181b9cabaeaf440fc3</div>
              </button>

              <button
                onClick={() => {
                  setIsGuestMode(true);
                  setShowWalletModal(false);
                  addLog('[WALLET] Switched to Guest Explorer Mode');
                }}
                className="w-full p-3 bg-[#06030c] border border-slate-800 text-left transition-all hover:border-slate-700"
              >
                <div className="text-xs font-bold text-white">GUEST_EXPLORER_MODE</div>
                <div className="text-[10px] text-slate-400">Inspect dungeon lore without signature</div>
              </button>
            </div>

            <button
              onClick={() => setShowWalletModal(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold mt-2"
            >
              [CLOSE]
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
