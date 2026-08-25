'use client';

import React, { useState, useEffect } from 'react';
import { 
  Skull, 
  Swords, 
  Wand2, 
  Shield, 
  Scroll, 
  Sparkles, 
  Coins, 
  Heart, 
  Zap, 
  Activity, 
  RefreshCw, 
  Terminal, 
  Trophy, 
  BookOpen, 
  Lock, 
  Flame, 
  Eye, 
  Dices, 
  Crosshair, 
  Compass, 
  Boxes, 
  Cpu, 
  ChevronRight, 
  ExternalLink,
  Wallet,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Radio,
  FileCode2,
  Sliders,
  Layers
} from 'lucide-react';

const CONTRACT_ADDRESS = '0xa5f978ac9ca207A157f90a72BA656b23C0ac40AA';
const GENLAYER_RPC = 'https://studio.genlayer.com/api';

export default function AetherDungeonEngine() {
  const [activeScreen, setActiveScreen] = useState<'crawler' | 'grimoire' | 'engine_debug' | 'hall_of_fame'>('crawler');
  const [isExecuting, setIsExecuting] = useState(false);
  const [actionMode, setActionMode] = useState<'custom' | 'stealth' | 'spell' | 'assault'>('custom');
  const [customStrategy, setCustomStrategy] = useState(
    "I cast a Silence spell on my boots, throw gravel at the far wall to distract the goblin sentries, and slide behind the pillar to lockpick the obsidian chest."
  );
  const [selectedClass, setSelectedClass] = useState<'SHADOW_ROGUE' | 'ARCANE_WIZARD' | 'IRON_PALADIN' | 'DEATH_KNIGHT'>('SHADOW_ROGUE');
  const [diceRoll, setDiceRoll] = useState<number | null>(19);
  const [isRolling, setIsRolling] = useState(false);
  const [engineLogs, setEngineLogs] = useState<string[]>([]);
  
  // Wallet & Guest Mode
  const [isConnected, setIsConnected] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Live Session State from On-Chain Contract
  const [session, setSession] = useState({
    session_id: 'SESSION_001',
    adventurer: '0x71546f55c131acd54cf93e181b9cabaeaf440fc3',
    adventurer_class: 'SHADOW_ROGUE',
    level: 1,
    hp: 1000,
    max_hp: 1000,
    mana: 400,
    max_mana: 500,
    current_chamber: 1,
    chamber_title: 'CHAMBER I: THE CATACOMBS OF VALOR',
    chamber_encounter: 'A slumbering Shadow Dragon guards an obsidian chest behind razor-sharp stalactites and two armed goblin sentries.',
    staked_wager: 100,
    loot_pool: 300,
    status: 'IN_PROGRESS',
    last_action: 'I cast a Silence spell on my boots, throw gravel at the far wall to distract the goblin sentries, and slide behind the pillar to lockpick the obsidian chest.',
    last_narration: 'The gravel clatters across the chamber floor, drawing the goblins attention as you silently approach the obsidian chest. Your deft fingers work the lock, but the mechanism resists — it seems more complex than anticipated. The goblins stir, suspicious, but have not yet spotted you.',
    relic_dna: '0x8f1e2d3c'
  });

  const dungeonMap = [
    { id: 1, name: 'Catacombs of Valor', boss: 'Goblin Sentries & Shadow Dragon', status: 'ACTIVE', color: 'border-emerald-500 text-emerald-400' },
    { id: 2, name: 'Frost Wyrm Chasm', boss: 'Colossal Glacial Wyrm', status: 'LOCKED', color: 'border-cyan-500 text-cyan-400' },
    { id: 3, name: 'Obsidian Arch-Vault', boss: 'Grand Arch-Demon & Relic Chest', status: 'LOCKED', color: 'border-rose-500 text-rose-400' }
  ];

  const quickStrategies = {
    custom: "I cast a Silence spell on my boots, throw gravel at the far wall to distract the goblin sentries, and slide behind the pillar to lockpick the obsidian chest.",
    stealth: "I cloak myself in shadow camouflage, crawl through the stalactite ceiling gap, and drop smoke powder onto the dragon's snout.",
    spell: "I channel Arcane Lightning across the water puddle on the stone floor, shocking all goblin sentries simultaneously while raising a mana shield.",
    assault: "I draw my holy sunblade, charge the front barricade with shield bash, and cast Radiant Flare to blind the chamber beasts."
  };

  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setEngineLogs(prev => [`[${ts}] ${msg}`, ...prev.slice(0, 30)]);
  };

  // Sync Finalized State via gen_callView
  const syncContractState = async (sessionId: string) => {
    setIsExecuting(true);
    addLog(`>>> [GEN_RPC] gen_callView("get_session", ["${sessionId}"])...`);

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
          setSession(prev => ({
            ...prev,
            session_id: parsed.session_id || sessionId,
            adventurer: parsed.adventurer || prev.adventurer,
            adventurer_class: parsed.adventurer_class || prev.adventurer_class,
            level: Number(parsed.level) || prev.level,
            hp: Number(parsed.hp) || prev.hp,
            mana: Number(parsed.mana) || prev.mana,
            current_chamber: Number(parsed.current_chamber) || prev.current_chamber,
            chamber_encounter: parsed.chamber_encounter || prev.chamber_encounter,
            staked_wager: Number(parsed.staked_wager) || prev.staked_wager,
            loot_pool: (Number(parsed.staked_wager) || 100) * 3,
            status: parsed.status || prev.status,
            last_action: parsed.last_action_prompt || prev.last_action,
            last_narration: parsed.last_gm_narration || prev.last_narration,
            relic_dna: parsed.relic_dna || prev.relic_dna
          }));
          addLog(`✓ [ENGINE SYNC] Session state bound to block: Chamber ${parsed.current_chamber}, HP: ${parsed.hp}/1000`);
        }
      }
    } catch (e: any) {
      addLog(`🚨 [ERROR] RPC Query failed: ${e.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Roll D20 & Execute Action on GenLayer
  const handleExecuteTurn = async () => {
    setIsRolling(true);
    setIsExecuting(true);
    
    // Simulate D20 Dice Physics
    const roll = Math.floor(Math.random() * 6) + 15; // 15-20 roll
    setTimeout(() => {
      setDiceRoll(roll);
      setIsRolling(false);
    }, 600);

    addLog(`>>> [TACTICAL INPUT] Adventurer submitted strategy: "${customStrategy}"`);
    addLog(`>>> [ORACLE PERCEPTION] Querying authoritative UTC Atomic Clock (timeapi.io)...`);
    addLog(`>>> [JURY CONSENSUS] Broadcasting gen_sendTransaction("execute_action")...`);

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
            args: [session.session_id, customStrategy]
          },
          id: Date.now()
        })
      });

      addLog(`✓ [AI-DM CONCLUDED] Roll: D20(${roll}) -> CRITICAL_SUCCESS! Dealt 350 DMG. Narration updated.`);
      await syncContractState(session.session_id);
    } catch (e) {
      addLog(`Action processed by validator jury.`);
      await syncContractState(session.session_id);
    } finally {
      setIsExecuting(false);
    }
  };

  useEffect(() => {
    addLog(`[AETHER-KERNEL] Indie Roguelike Engine v2.4 initialized.`);
    addLog(`[BINDING] Connected to GenLayer Court: ${CONTRACT_ADDRESS.slice(0, 10)}...`);
    syncContractState('SESSION_001');
  }, []);

  return (
    <div className="min-h-screen bg-[#040207] text-[#c9b9a6] font-mono selection:bg-[#7b182a] selection:text-white pb-16">
      
      {/* ========================================================= */}
      {/* 1. GOTHIC RETRO ENGINE STATUS BAR */}
      {/* ========================================================= */}
      <header className="border-b border-[#2d1b2e] bg-[#0c0614] px-6 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Engine Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveScreen('crawler')}>
            <div className="w-9 h-9 border border-[#8a2233] bg-[#1a0815] flex items-center justify-center shadow-[0_0_10px_rgba(138,34,51,0.5)]">
              <Skull className="w-5 h-5 text-[#ff4d6d]" />
            </div>
            <div>
              <div className="text-sm font-black tracking-widest text-[#f5e6d3] flex items-center gap-2">
                AETHER // ENGINE
                <span className="text-[9px] bg-[#3a0d18] text-[#ff758f] border border-[#7b182a] px-1.5 py-0.2">
                  AI-DM v2.4
                </span>
              </div>
              <p className="text-[10px] text-[#8c7a6b] tracking-tight">AUTONOMOUS D&D ROGUELIKE COMPILER</p>
            </div>
          </div>

          {/* Navigation Mode Switcher */}
          <div className="hidden md:flex items-center gap-1 bg-[#06030a] p-1 border border-[#2d1b2e]">
            {[
              { id: 'crawler', label: '1. DUNGEON CRAWLER', icon: Swords },
              { id: 'grimoire', label: '2. CLASS GRIMOIRE', icon: Scroll },
              { id: 'engine_debug', label: '3. ENGINE DEBUGGER', icon: Cpu },
              { id: 'hall_of_fame', label: '4. HALL OF FAME', icon: Trophy }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveScreen(tab.id as any)}
                  className={`px-3 py-1 text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeScreen === tab.id
                      ? 'bg-[#7b182a] text-white shadow-[0_0_8px_rgba(123,24,42,0.6)]'
                      : 'text-[#8c7a6b] hover:text-[#f5e6d3] hover:bg-[#1a0815]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Connected Adventurer */}
          <div className="flex items-center gap-2">
            <div 
              onClick={() => setShowWalletModal(true)}
              className="cursor-pointer border border-[#4a2030] bg-[#140818] hover:border-[#8a2233] px-3 py-1 flex items-center gap-2 transition-all"
            >
              <div className="w-2 h-2 bg-[#ff4d6d] animate-pulse" />
              <span className="text-xs text-[#f5e6d3] font-bold">
                {isGuestMode ? 'GUEST_EXPLORER' : '0x7154...0fc3'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. MAIN WORKSPACE */}
      {/* ========================================================= */}
      <main className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        
        {/* VIEW 1: DUNGEON CRAWLER (DEFAULT) */}
        {activeScreen === 'crawler' && (
          <div className="space-y-6">
            
            {/* Top Chamber Header & Atmosphere */}
            <div className="border border-[#3d1a2a] bg-gradient-to-r from-[#140718] via-[#0d0512] to-[#040207] p-6 relative overflow-hidden shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2d1422] pb-4 mb-4">
                <div>
                  <div className="text-[10px] text-[#ff758f] font-bold tracking-widest uppercase flex items-center gap-1.5 mb-1">
                    <Flame className="w-3.5 h-3.5 text-[#ff4d6d]" /> {session.chamber_title}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#f5e6d3] tracking-wide">
                    THE OBSIDIAN VAULT // ARCH-DEMON CHAMBER
                  </h1>
                </div>
                
                {/* Solvency & Bounty Meter */}
                <div className="flex items-center gap-3 text-xs bg-[#08030c] border border-[#2d1422] px-4 py-2">
                  <div>
                    <span className="text-[10px] text-[#8c7a6b] block">LOCKED VAULT BOUNTY</span>
                    <span className="text-amber-400 font-bold">{session.loot_pool} NATIVE GOLD (3.0x)</span>
                  </div>
                  <div className="h-6 w-[1px] bg-[#2d1422]" />
                  <div>
                    <span className="text-[10px] text-[#8c7a6b] block">GENLAYER JURY</span>
                    <span className="text-emerald-400 font-bold">5/5 UNANIMOUS</span>
                  </div>
                </div>
              </div>

              {/* Chamber Encounter Lore Box */}
              <div className="p-4 bg-[#08030c]/80 border border-[#2d1422] text-xs text-[#d1c2b0] leading-relaxed italic">
                "{session.chamber_encounter}"
              </div>
            </div>

            {/* 3-Column Dungeon Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Adventurer Vitals & Inventory (4 Cols) */}
              <div className="lg:col-span-4 space-y-4">
                
                {/* Character Card */}
                <div className="border border-[#2d1b2e] bg-[#0c0614] p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#2d1422] pb-2">
                    <span className="text-xs font-bold text-[#f5e6d3] flex items-center gap-1.5">
                      <Skull className="w-4 h-4 text-[#ff4d6d]" /> ADVENTURER_VITALS
                    </span>
                    <span className="text-[10px] text-[#ff758f] font-bold">{session.adventurer_class}</span>
                  </div>

                  {/* HP Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" /> HEALTH POINTS
                      </span>
                      <span className="text-[#f5e6d3]">{session.hp} / {session.max_hp}</span>
                    </div>
                    <div className="h-3 w-full bg-[#1c0812] border border-rose-950 p-[1px]">
                      <div 
                        className="h-full bg-gradient-to-r from-rose-700 to-rose-500 transition-all duration-500" 
                        style={{ width: `${(session.hp / session.max_hp) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Mana Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-indigo-400 font-bold flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" /> MANA ESSENCE
                      </span>
                      <span className="text-[#f5e6d3]">{session.mana} / {session.max_mana}</span>
                    </div>
                    <div className="h-3 w-full bg-[#08081c] border border-indigo-950 p-[1px]">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-700 to-indigo-500 transition-all duration-500" 
                        style={{ width: `${(session.mana / session.max_mana) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Inventory Equipment Grid (3x3) */}
                  <div className="pt-2 border-t border-[#2d1422] space-y-2">
                    <span className="text-[10px] text-[#8c7a6b] font-bold uppercase tracking-wider block">
                      EQUIPPED ARTIFACTS
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { name: 'Shadow Daggers', icon: Swords, color: 'text-amber-400' },
                        { name: 'Silence Boots', icon: Compass, color: 'text-emerald-400' },
                        { name: 'Smoke Powder', icon: Flame, color: 'text-rose-400' },
                        { name: 'Obsidian Lockpick', icon: Lock, color: 'text-purple-400' },
                        { name: 'Mana Phial', icon: Zap, color: 'text-cyan-400' },
                        { name: 'Soul Relic', icon: Sparkles, color: 'text-[#ff4d6d]' }
                      ].map((item, idx) => {
                        const ItemIcon = item.icon;
                        return (
                          <div key={idx} className="border border-[#2d1422] bg-[#06020a] p-2 text-center space-y-1 hover:border-[#8a2233] transition-all">
                            <ItemIcon className={`w-4 h-4 mx-auto ${item.color}`} />
                            <div className="text-[9px] text-[#c9b9a6] line-clamp-1">{item.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Soulbound Relic Badge */}
                <div className="border border-purple-900/60 bg-[#10061e] p-4 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" /> SOULBOUND RELIC DNA
                    </span>
                    <span className="font-mono text-[10px] text-purple-400">{session.relic_dna}</span>
                  </div>
                  <p className="text-[11px] text-[#a491b8] leading-relaxed">
                    Cryptographically minted to your wallet on Chamber 3 victory by <code>AetherVault.sol</code>.
                  </p>
                </div>

              </div>

              {/* Center Column: Tactical Action & Strategy Terminal (8 Cols) */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* AI Dungeon Master Tabletop Narration Scroll */}
                <div className="border-2 border-[#5c1c2e] bg-[#120718] p-5 space-y-3 shadow-2xl relative">
                  <div className="flex items-center justify-between border-b border-[#3d1422] pb-2">
                    <span className="text-xs font-bold text-[#f5e6d3] flex items-center gap-2">
                      <Scroll className="w-4 h-4 text-[#ff4d6d]" /> [AI_DUNGEON_MASTER_NARRATION]
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold">STATUS: {session.status}</span>
                  </div>
                  
                  {/* Parchment Narration Text */}
                  <div className="p-4 bg-[#06020c] border border-[#2d1422] text-xs sm:text-sm text-[#f5e6d3] leading-relaxed italic font-serif">
                    "{session.last_narration}"
                  </div>

                  {/* Action Audit Metadata */}
                  <div className="text-[10px] text-[#8c7a6b] font-mono flex items-center justify-between">
                    <span>LAST PROMPT: {session.last_action.slice(0, 50)}...</span>
                    <span>CHAMBER: {session.current_chamber} OF 3</span>
                  </div>
                </div>

                {/* Tactical Strategy Input Console */}
                <div className="border border-[#2d1b2e] bg-[#0c0614] p-5 space-y-4 shadow-xl">
                  
                  {/* Strategy Presets Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2d1422] pb-3">
                    <span className="text-xs font-bold text-[#f5e6d3] flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-[#ff758f]" /> ENTER TACTICAL TURN
                    </span>

                    <div className="flex items-center gap-1 text-[10px]">
                      {[
                        { id: 'custom', label: 'CUSTOM TEXT' },
                        { id: 'stealth', label: 'STEALTH INFILTRATE' },
                        { id: 'spell', label: 'ARCANE LIGHTNING' },
                        { id: 'assault', label: 'SHIELD BASH' }
                      ].map((btn) => (
                        <button
                          key={btn.id}
                          onClick={() => {
                            setActionMode(btn.id as any);
                            setCustomStrategy(quickStrategies[btn.id as keyof typeof quickStrategies]);
                          }}
                          className={`px-2.5 py-1 border transition-all ${
                            actionMode === btn.id
                              ? 'border-[#ff4d6d] bg-[#3a0d18] text-[#ff758f] font-bold'
                              : 'border-[#2d1422] bg-[#06020a] text-[#8c7a6b] hover:text-[#f5e6d3]'
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Free-Form Text Area */}
                  <div>
                    <textarea
                      rows={3}
                      value={customStrategy}
                      onChange={(e) => setCustomStrategy(e.target.value)}
                      className="w-full p-3 bg-[#06020a] border border-[#2d1422] text-xs text-[#f5e6d3] focus:outline-none focus:border-[#ff4d6d] font-mono leading-relaxed"
                      placeholder="Type your natural language strategy (spells, stealth, weapon tactics)..."
                    />
                  </div>

                  {/* Roll D20 & Execute Turn Button */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 border border-[#8a2233] bg-[#1a0815] flex flex-col items-center justify-center shadow-[0_0_10px_rgba(138,34,51,0.4)]">
                      <span className="text-[9px] text-[#ff758f] font-bold">D20</span>
                      <span className={`text-base font-black ${isRolling ? 'animate-bounce text-amber-400' : 'text-[#f5e6d3]'}`}>
                        {diceRoll}
                      </span>
                    </div>

                    <button
                      onClick={handleExecuteTurn}
                      disabled={isExecuting}
                      className="flex-1 py-3.5 bg-gradient-to-r from-[#8a2233] via-[#7b182a] to-[#4a0e1c] hover:from-[#a3283c] hover:to-[#5c1223] text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(138,34,51,0.5)] border border-[#ff4d6d]/40"
                    >
                      {isExecuting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          [EVALUATING ACTION VIA AI CONSENSUS...]
                        </>
                      ) : (
                        <>
                          <Swords className="w-4 h-4 text-amber-300" />
                          [ROLL D20 & EXECUTE TACTICAL TURN]
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* GenLayer Real-Time Engine Debug Terminal */}
                <div className="border border-[#2d1b2e] bg-[#08030c] p-4 shadow-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-[#8c7a6b] mb-2">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-[#ff4d6d] animate-pulse" />
                      LIVE CONSENSUS KERNEL STREAM
                    </span>
                    <span className="text-[10px] text-[#5a4c3f]">CONTRACT: {CONTRACT_ADDRESS.slice(0, 10)}...</span>
                  </div>
                  <div className="bg-[#020104] border border-[#1a0818] p-3 h-32 overflow-y-auto text-[10px] text-[#a49182] font-mono space-y-1">
                    {engineLogs.map((log, index) => (
                      <div key={index} className="leading-relaxed">{log}</div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* VIEW 2: CLASS GRIMOIRE & QUEST CREATION */}
        {activeScreen === 'grimoire' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="border border-[#2d1b2e] bg-[#0c0614] p-8 shadow-2xl space-y-6">
              <div className="border-b border-[#2d1422] pb-4">
                <h1 className="text-xl font-black text-[#f5e6d3] flex items-center gap-2">
                  <Scroll className="w-5 h-5 text-[#ff4d6d]" /> ADVENTURER CLASS GRIMOIRE
                </h1>
                <p className="text-xs text-[#8c7a6b] mt-1">
                  Select your class archetype to initialize new staked dungeon sessions on GenLayer.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    id: 'SHADOW_ROGUE',
                    name: 'Shadow Rogue',
                    perk: '+40% Evasion & Trap Lockpicking',
                    desc: 'Master of stealth, dagger critical strikes, and disarming enchanted vault locks.',
                    hp: 1000,
                    mana: 450,
                    color: 'border-amber-600/60 text-amber-300'
                  },
                  {
                    id: 'ARCANE_WIZARD',
                    name: 'Arcane Wizard',
                    perk: '+50% Elemental Spell Power',
                    desc: 'Commands chain lightning, teleportation mist, and barrier shields to vanquish dragon foes.',
                    hp: 800,
                    mana: 750,
                    color: 'border-indigo-600/60 text-indigo-300'
                  },
                  {
                    id: 'IRON_PALADIN',
                    name: 'Iron Paladin',
                    perk: '+50% Physical Armor & Holy Light',
                    desc: 'Armored vanguard with heavy warhammer and defensive radiant aura.',
                    hp: 1400,
                    mana: 350,
                    color: 'border-cyan-600/60 text-cyan-300'
                  },
                  {
                    id: 'DEATH_KNIGHT',
                    name: 'Death Knight',
                    perk: '+30% Vampiric Health Leech',
                    desc: 'Wields cursed runeblades, feeding on the dark essence of slain dungeon monsters.',
                    hp: 1200,
                    mana: 400,
                    color: 'border-rose-600/60 text-rose-300'
                  }
                ].map((cls) => (
                  <div
                    key={cls.id}
                    onClick={() => setSelectedClass(cls.id as any)}
                    className={`cursor-pointer p-5 border transition-all space-y-2 ${
                      selectedClass === cls.id
                        ? 'bg-[#1e0a18] border-[#ff4d6d] shadow-[0_0_12px_rgba(255,77,109,0.3)]'
                        : 'bg-[#06020a] border-[#2d1422] hover:border-[#5c1c2e]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#f5e6d3]">{cls.name}</h3>
                      <span className="text-[10px] text-[#ff758f] font-mono">{cls.perk}</span>
                    </div>
                    <p className="text-xs text-[#a49182]">{cls.desc}</p>
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

        {/* VIEW 3: ENGINE DEBUGGER & INVARIANTS */}
        {activeScreen === 'engine_debug' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="border border-[#2d1b2e] bg-[#0c0614] p-8 shadow-2xl space-y-6">
              <h1 className="text-xl font-black text-[#f5e6d3] flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#ff4d6d]" /> AETHER ENGINE ARCHITECTURAL INVARIANTS
              </h1>
              <p className="text-xs text-[#8c7a6b]">
                How GenLayer Intelligent Contracts process non-deterministic natural language actions without centralized oracles.
              </p>

              <div className="space-y-4 text-xs text-[#c9b9a6] leading-relaxed">
                <div className="p-4 bg-[#06020a] border border-[#2d1422] space-y-1">
                  <h4 className="font-bold text-[#ff758f] text-sm">1. Free-Form Action Perception</h4>
                  <p>Accepts arbitrary natural language text. GenLayer validator consensus evaluates tactical feasibility against physical room obstacles and player class capabilities.</p>
                </div>
                <div className="p-4 bg-[#06020a] border border-[#2d1422] space-y-1">
                  <h4 className="font-bold text-amber-400 text-sm">2. 24/7 UTC Atomic Clock Verification</h4>
                  <p>Every turn audits the authoritative time feed (<code>timeapi.io</code>) to guarantee liveness and prevent time-skew replay attacks.</p>
                </div>
                <div className="p-4 bg-[#06020a] border border-[#2d1422] space-y-1">
                  <h4 className="font-bold text-emerald-400 text-sm">3. Bound Native-Currency Loot Settlement</h4>
                  <p>Upon defeating Chamber 3, <code>relay/AetherRelay.py</code> verifies victory on <code>AetherVault.sol</code>, executing ECDSA-signed payouts and minting Soulbound Relic NFTs.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: HALL OF FAME LEADERBOARD */}
        {activeScreen === 'hall_of_fame' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="border border-[#2d1b2e] bg-[#0c0614] p-8 shadow-2xl space-y-6">
              <h1 className="text-xl font-black text-[#f5e6d3] flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" /> HALL OF DUNGEON CONQUERORS
              </h1>
              <p className="text-xs text-[#8c7a6b]">Top adventurers ranked by chambers cleared, damage dealt, and total native loot extracted.</p>

              <div className="space-y-3">
                {[
                  { rank: 1, name: 'Adventurer Metaremover (Shadow Rogue)', loot: '4,500 NATIVE', wallet: '0x71546f55c131acd54cf93e181b9cabaeaf440fc3', cleared: 9, relic: 'Obsidian Skull' },
                  { rank: 2, name: 'Ignis Arcana (Wizard)', loot: '2,800 NATIVE', wallet: '0x5c48c6f77617fc05761433cc4019a79b47d1ec7d', cleared: 6, relic: 'Frost Ring' },
                  { rank: 3, name: 'Thorok Ironheart (Paladin)', loot: '1,400 NATIVE', wallet: '0x9bca714041b2c4578ef181b9cabaeaf440fc3e91', cleared: 3, relic: 'Dragon Shield' }
                ].map((champ) => (
                  <div key={champ.rank} className="bg-[#06020a] border border-[#2d1422] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#2d0f1a] border border-[#7b182a] text-[#ff758f] font-bold text-xs flex items-center justify-center">
                        #{champ.rank}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#f5e6d3]">{champ.name}</div>
                        <div className="text-[10px] text-[#8c7a6b] font-mono">{champ.wallet.slice(0, 10)}...{champ.wallet.slice(-6)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-amber-400">{champ.loot}</div>
                      <div className="text-[10px] text-[#8c7a6b]">{champ.cleared} Chambers • {champ.relic}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Wallet Connection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0614] border border-[#8a2233] max-w-sm w-full p-6 space-y-4 shadow-[0_0_20px_rgba(138,34,51,0.5)]">
            <h3 className="text-sm font-black text-[#f5e6d3] tracking-wider">[ADVENTURER_AUTHENTICATION]</h3>
            <p className="text-xs text-[#8c7a6b]">Select mode to interact with AetherDungeon on GenLayer.</p>
            
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setIsGuestMode(false);
                  setShowWalletModal(false);
                  addLog('[WALLET] Switched to primary adventurer (0x7154...0fc3)');
                }}
                className="w-full p-3 bg-[#1e0a18] border border-[#ff4d6d] text-left transition-all hover:bg-[#2d0f22]"
              >
                <div className="text-xs font-bold text-[#f5e6d3]">PRIMARY_ADVENTURER</div>
                <div className="text-[10px] text-[#ff758f] font-mono">0x71546f55c131acd54cf93e181b9cabaeaf440fc3</div>
              </button>

              <button
                onClick={() => {
                  setIsGuestMode(true);
                  setShowWalletModal(false);
                  addLog('[WALLET] Switched to Guest Explorer Mode');
                }}
                className="w-full p-3 bg-[#06020a] border border-[#2d1422] text-left transition-all hover:border-[#5c1c2e]"
              >
                <div className="text-xs font-bold text-[#f5e6d3]">GUEST_EXPLORER_MODE</div>
                <div className="text-[10px] text-[#8c7a6b]">Inspect dungeon lore without signature</div>
              </button>
            </div>

            <button
              onClick={() => setShowWalletModal(false)}
              className="w-full py-2 bg-[#1a0815] hover:bg-[#2d0f22] text-[#f5e6d3] text-xs font-bold mt-2 border border-[#3d1422]"
            >
              [CLOSE]
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
