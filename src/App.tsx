import { useEffect, useState } from 'react';
import {
  Castle,
  Swords,
  ScrollText,
  Map as MapIcon,
  Trophy,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { ArmyPanel } from './components/ArmyPanel';
import { BattleLog } from './components/BattleLog';
import { CityPanel } from './components/CityPanel';
import { FactionSelectScreen } from './components/FactionSelectScreen';
import { GameControls } from './components/GameControls';
import { GameMap } from './components/GameMap';
import { OfflineStatusBanner } from './components/PWAStatusBanner';
import { TopBar } from './components/TopBar';
import { Language } from './game/types';
import { useGameState } from './hooks/useGameState';
import { soundFX } from './utils/sound';

type MobileDrawerTab = 'none' | 'city' | 'army' | 'log';

export default function App() {
  const {
    gameState,
    toast,
    hasSavedGame,
    startCampaign,
    resetToTitle,
    selectCity,
    handleCityClickOnMap,
    selectArmy,
    setCommandMode,
    orderArmyToCity,
    retreatArmy,
    setArmyDefend,
    captureCityWithArmy,
    recruitCityGarrison,
    upgradeCityWalls,
    reinforceArmyTroops,
    mobilizeNewArmy,
    togglePause,
    setSpeed,
    saveGame,
    loadGame,
  } = useGameState();

  const [lang, setLang] = useState<Language>('en');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<MobileDrawerTab>('none');
  const [desktopLeftCollapsed, setDesktopLeftCollapsed] =
    useState<boolean>(false);
  const [desktopRightCollapsed, setDesktopRightCollapsed] =
    useState<boolean>(false);

  // Support ?autostart=1 query param for instant playing mode verification
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && gameState.screen === 'faction_select') {
      startCampaign(gameState.playerFactionId);
    }
  }, [gameState.screen, gameState.playerFactionId, startCampaign]);

  // Mirror game state machine to document.body.dataset.state
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (gameState.screen === 'faction_select') {
      document.body.dataset.state = 'title';
    } else if (gameState.screen === 'victory') {
      document.body.dataset.state = 'gameover';
    } else if (gameState.isPaused) {
      document.body.dataset.state = 'paused';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [gameState.screen, gameState.isPaused]);

  const handleToggleLang = () => {
    soundFX.playSelect();
    setLang((prev) => (prev === 'en' ? 'th' : 'en'));
  };

  const handleToggleMute = () => {
    const muted = soundFX.toggleMute();
    setIsMuted(muted);
  };

  // Spacebar shortcut to Pause / Resume when playing
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameState.screen !== 'playing') return;
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'BUTTON'
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState.screen, togglePause]);

  // Derived active objects
  const playerFaction = gameState.factions[gameState.playerFactionId];
  const selectedCity =
    gameState.cities.find((c) => c.id === gameState.selectedCityId) || null;
  const selectedArmy =
    gameState.armies.find((a) => a.id === gameState.selectedArmyId) || null;
  const armiesAtSelectedCity = selectedCity
    ? gameState.armies.filter((a) => a.currentCityId === selectedCity.id)
    : [];
  const playerArmies = gameState.armies.filter(
    (a) => a.ownerFactionId === gameState.playerFactionId
  );

  // Title / Faction Selection Screen
  if (gameState.screen === 'faction_select') {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden bg-[#12100E]">
        <OfflineStatusBanner lang={lang} />
        <div className="flex-1 min-h-0 overflow-hidden">
          <FactionSelectScreen
            initialFaction={gameState.playerFactionId}
            hasSavedGame={hasSavedGame}
            lang={lang}
            isMuted={isMuted}
            onToggleLang={handleToggleLang}
            onToggleMute={handleToggleMute}
            onStartCampaign={startCampaign}
            onLoadSavedGame={loadGame}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden flex flex-col bg-[#12100E] text-[#F3ECE0]">
      {/* Offline Connectivity Banner (only appears when browser is offline) */}
      <OfflineStatusBanner lang={lang} />

      {/* 1. Top Resource Bar */}
      <TopBar
        playerFaction={playerFaction}
        cities={gameState.cities}
        seasonYear={gameState.seasonYear}
        lang={lang}
        onToggleLang={handleToggleLang}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenFactionSelect={resetToTitle}
      />

      {/* 2. Main Interactive Map & Low-Occlusion Perimeter Panels */}
      <main className="relative flex-1 w-full min-h-0 overflow-hidden">
        {/* Strategic Map Canvas (100% background fill) */}
        <GameMap
          cities={gameState.cities}
          armies={gameState.armies}
          factions={gameState.factions}
          selectedCityId={gameState.selectedCityId}
          selectedArmyId={gameState.selectedArmyId}
          commandMode={gameState.commandMode}
          combatEffects={gameState.combatEffects}
          lang={lang}
          onSelectCity={(cityId) => {
            handleCityClickOnMap(cityId);
            if (gameState.commandMode === 'none') {
              setMobileTab('city');
            }
          }}
          onSelectArmy={(armyId) => {
            selectArmy(armyId);
            setMobileTab('army');
          }}
          onCancelCommandMode={() => setCommandMode('none')}
        />

        {/* Toast Feedback Notification */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed top-16 sm:top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none max-w-[92vw] px-3.5 py-2 rounded bg-[#181613] border border-[#D97706] shadow-xl text-xs sm:text-sm font-medium text-[#F3ECE0] text-center"
          >
            {toast.text[lang]}
          </div>
        )}

        {/* ===================================================================
            DESKTOP LAYOUT (lg: >= 1024px) — Preserves Left & Right Docks
            with Collapsible Toggle Support for Maximum Map Visibility
        =================================================================== */}
        {/* Desktop Left Dock: City Information Panel & Battle Event Log */}
        <div className="hidden lg:flex flex-col justify-between pointer-events-none absolute top-3 bottom-3 left-3 z-10 gap-3">
          {desktopLeftCollapsed ? (
            <button
              type="button"
              onClick={() => setDesktopLeftCollapsed(false)}
              className="pointer-events-auto min-h-[40px] px-3 py-2 rounded bg-[#181613]/95 hover:bg-[#231F1A] border border-[#3D3426] text-xs font-semibold text-[#F3ECE0] flex items-center gap-2 shadow-lg cursor-pointer"
              title={lang === 'en' ? 'Expand City & Log Panels' : 'แสดงหน้าต่างเมืองและบันทึก'}
            >
              <PanelLeftOpen className="w-4 h-4 text-[#D97706]" />
              <span>
                {selectedCity
                  ? selectedCity.name[lang]
                  : lang === 'en'
                  ? 'City & Log'
                  : 'เมืองและบันทึก'}
              </span>
            </button>
          ) : (
            <div className="w-80 xl:w-84 flex flex-col justify-between h-full gap-3">
              <div className="pointer-events-auto overflow-y-auto max-h-[calc(100%-11rem)]">
                <div className="flex justify-end mb-1">
                  <button
                    type="button"
                    onClick={() => setDesktopLeftCollapsed(true)}
                    className="px-2 py-1 rounded bg-[#181613]/90 hover:bg-[#231F1A] border border-[#3D3426] text-[11px] text-[#A89F8E] hover:text-[#F3ECE0] flex items-center gap-1 cursor-pointer"
                    title={lang === 'en' ? 'Collapse Left Panel' : 'ย่อแถบด้านซ้าย'}
                  >
                    <PanelLeftClose className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>{lang === 'en' ? 'Hide Panel' : 'ซ่อนแถบ'}</span>
                  </button>
                </div>
                <CityPanel
                  city={selectedCity}
                  allCities={gameState.cities}
                  armiesAtCity={armiesAtSelectedCity}
                  activeBattles={gameState.activeBattles}
                  factions={gameState.factions}
                  playerFactionId={gameState.playerFactionId}
                  lang={lang}
                  onRecruitGarrison={recruitCityGarrison}
                  onUpgradeWalls={upgradeCityWalls}
                  onMobilizeArmy={mobilizeNewArmy}
                  onSelectCity={selectCity}
                  onSelectArmy={selectArmy}
                />
              </div>

              <div className="pointer-events-auto shrink-0">
                <BattleLog events={gameState.battleLog} lang={lang} />
              </div>
            </div>
          )}
        </div>

        {/* Desktop Right Dock: Army Information Panel, Command Panel & Game Controls */}
        <div className="hidden lg:flex flex-col justify-between pointer-events-none absolute top-3 bottom-3 right-3 w-80 xl:w-84 z-10 gap-3 items-end">
          {desktopRightCollapsed ? (
            <button
              type="button"
              onClick={() => setDesktopRightCollapsed(false)}
              className="pointer-events-auto min-h-[40px] px-3 py-2 rounded bg-[#181613]/95 hover:bg-[#231F1A] border border-[#3D3426] text-xs font-semibold text-[#F3ECE0] flex items-center gap-2 shadow-lg cursor-pointer"
              title={lang === 'en' ? 'Expand Army Command Panel' : 'แสดงหน้าต่างกองทัพ'}
            >
              <PanelRightOpen className="w-4 h-4 text-[#D97706]" />
              <span>
                {selectedArmy
                  ? selectedArmy.general.name[lang]
                  : lang === 'en'
                  ? 'Army Commands'
                  : 'คำสั่งกองทัพ'}
              </span>
            </button>
          ) : (
            <div className="w-full pointer-events-auto overflow-y-auto max-h-[calc(100%-4.5rem)]">
              <div className="flex justify-end mb-1">
                <button
                  type="button"
                  onClick={() => setDesktopRightCollapsed(true)}
                  className="px-2 py-1 rounded bg-[#181613]/90 hover:bg-[#231F1A] border border-[#3D3426] text-[11px] text-[#A89F8E] hover:text-[#F3ECE0] flex items-center gap-1 cursor-pointer"
                  title={lang === 'en' ? 'Collapse Right Panel' : 'ย่อแถบด้านขวา'}
                >
                  <span>{lang === 'en' ? 'Hide Panel' : 'ซ่อนแถบ'}</span>
                  <PanelRightClose className="w-3.5 h-3.5 text-[#D97706]" />
                </button>
              </div>
              <ArmyPanel
                army={selectedArmy}
                playerArmies={playerArmies}
                cities={gameState.cities}
                factions={gameState.factions}
                playerFactionId={gameState.playerFactionId}
                commandMode={gameState.commandMode}
                lang={lang}
                onSelectArmy={selectArmy}
                onSetCommandMode={setCommandMode}
                onOrderArmyToCity={(armyId, targetCityId, mode) =>
                  orderArmyToCity(armyId, targetCityId, mode)
                }
                onRetreat={retreatArmy}
                onDefend={setArmyDefend}
                onCaptureCity={captureCityWithArmy}
                onReinforceTroop={reinforceArmyTroops}
              />
            </div>
          )}

          <div className="w-full pointer-events-auto shrink-0">
            <GameControls
              isPaused={gameState.isPaused}
              gameSpeed={gameState.gameSpeed}
              hasSavedGame={hasSavedGame}
              lang={lang}
              onTogglePause={togglePause}
              onSetSpeed={setSpeed}
              onSaveGame={saveGame}
              onLoadGame={loadGame}
            />
          </div>
        </div>

        {/* ===================================================================
            TABLET LAYOUT (md: 768px - 1023px) — Contextual Collapsible Side
            Inspector alongside the Map + Accessible Bottom Controls
        =================================================================== */}
        <div className="hidden md:flex lg:hidden pointer-events-none absolute inset-0 z-20">
          {/* Tablet Contextual Side Drawer (Left Side so Top-Right Map Zoom stays clear) */}
          {mobileTab !== 'none' && (
            <div className="pointer-events-auto w-80 max-h-[calc(100%-5rem)] overflow-y-auto m-3 shadow-2xl">
              {mobileTab === 'city' && (
                <CityPanel
                  city={selectedCity}
                  allCities={gameState.cities}
                  armiesAtCity={armiesAtSelectedCity}
                  activeBattles={gameState.activeBattles}
                  factions={gameState.factions}
                  playerFactionId={gameState.playerFactionId}
                  lang={lang}
                  onRecruitGarrison={recruitCityGarrison}
                  onUpgradeWalls={upgradeCityWalls}
                  onMobilizeArmy={mobilizeNewArmy}
                  onSelectCity={selectCity}
                  onSelectArmy={(aid) => {
                    selectArmy(aid);
                    setMobileTab('army');
                  }}
                  onClose={() => setMobileTab('none')}
                />
              )}
              {mobileTab === 'army' && (
                <ArmyPanel
                  army={selectedArmy}
                  playerArmies={playerArmies}
                  cities={gameState.cities}
                  factions={gameState.factions}
                  playerFactionId={gameState.playerFactionId}
                  commandMode={gameState.commandMode}
                  lang={lang}
                  onSelectArmy={selectArmy}
                  onSetCommandMode={(m) => {
                    setCommandMode(m);
                  }}
                  onOrderArmyToCity={(armyId, targetCityId, mode) => {
                    orderArmyToCity(armyId, targetCityId, mode);
                  }}
                  onRetreat={retreatArmy}
                  onDefend={setArmyDefend}
                  onCaptureCity={captureCityWithArmy}
                  onReinforceTroop={reinforceArmyTroops}
                  onClose={() => setMobileTab('none')}
                />
              )}
              {mobileTab === 'log' && (
                <BattleLog
                  events={gameState.battleLog}
                  lang={lang}
                  onClose={() => setMobileTab('none')}
                />
              )}
            </div>
          )}

          {/* Tablet Bottom Dock Bar */}
          <div className="pointer-events-auto absolute bottom-0 inset-x-0 bg-[#161411]/95 border-t border-[#3D3426] pb-safe px-safe px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setMobileTab('none')}
                className={`min-h-[42px] px-3 py-1.5 rounded flex items-center justify-center gap-1.5 font-medium cursor-pointer ${
                  mobileTab === 'none'
                    ? 'bg-[#D97706] text-[#12100E] font-semibold'
                    : 'bg-[#221E19] text-[#C9C0B1]'
                }`}
              >
                <MapIcon className="w-4 h-4 shrink-0" />
                <span>{lang === 'en' ? 'Full Map' : 'แผนที่'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setMobileTab((prev) => (prev === 'city' ? 'none' : 'city'))
                }
                className={`min-h-[42px] px-3 py-1.5 rounded flex items-center justify-center gap-1.5 font-medium cursor-pointer ${
                  mobileTab === 'city'
                    ? 'bg-[#D97706] text-[#12100E] font-semibold'
                    : 'bg-[#221E19] text-[#C9C0B1]'
                }`}
              >
                <Castle className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-[110px]">
                  {selectedCity
                    ? selectedCity.name[lang]
                    : lang === 'en'
                    ? 'City'
                    : 'เมือง'}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setMobileTab((prev) => (prev === 'army' ? 'none' : 'army'))
                }
                className={`min-h-[42px] px-3 py-1.5 rounded flex items-center justify-center gap-1.5 font-medium cursor-pointer ${
                  mobileTab === 'army'
                    ? 'bg-[#D97706] text-[#12100E] font-semibold'
                    : 'bg-[#221E19] text-[#C9C0B1]'
                }`}
              >
                <Swords className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-[110px]">
                  {selectedArmy
                    ? selectedArmy.general.name[lang]
                    : lang === 'en'
                    ? 'Army'
                    : 'กองทัพ'}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setMobileTab((prev) => (prev === 'log' ? 'none' : 'log'))
                }
                className={`min-h-[42px] px-3 py-1.5 rounded flex items-center justify-center gap-1.5 font-medium cursor-pointer ${
                  mobileTab === 'log'
                    ? 'bg-[#D97706] text-[#12100E] font-semibold'
                    : 'bg-[#221E19] text-[#C9C0B1]'
                }`}
              >
                <ScrollText className="w-4 h-4 shrink-0" />
                <span>{lang === 'en' ? 'Chronicles' : 'บันทึก'}</span>
              </button>
            </div>

            <GameControls
              isPaused={gameState.isPaused}
              gameSpeed={gameState.gameSpeed}
              hasSavedGame={hasSavedGame}
              lang={lang}
              onTogglePause={togglePause}
              onSetSpeed={setSpeed}
              onSaveGame={saveGame}
              onLoadGame={loadGame}
            />
          </div>
        </div>

        {/* ===================================================================
            MOBILE PHONE LAYOUT (< 768px, down to 320px) — Touch Bottom Sheet
            Drawer & Ergonomic Thumb-Zone Command Bar
        =================================================================== */}
        <div className="md:hidden absolute bottom-0 inset-x-0 z-20 flex flex-col pointer-events-none">
          {mobileTab !== 'none' && (
            <div className="pointer-events-auto max-h-[56dvh] overflow-y-auto mx-1.5 mb-1.5 rounded-t-md shadow-2xl border-t-2 border-[#D97706]">
              {mobileTab === 'city' && (
                <CityPanel
                  city={selectedCity}
                  allCities={gameState.cities}
                  armiesAtCity={armiesAtSelectedCity}
                  activeBattles={gameState.activeBattles}
                  factions={gameState.factions}
                  playerFactionId={gameState.playerFactionId}
                  lang={lang}
                  onRecruitGarrison={recruitCityGarrison}
                  onUpgradeWalls={upgradeCityWalls}
                  onMobilizeArmy={mobilizeNewArmy}
                  onSelectCity={selectCity}
                  onSelectArmy={(aid) => {
                    selectArmy(aid);
                    setMobileTab('army');
                  }}
                  onClose={() => setMobileTab('none')}
                />
              )}
              {mobileTab === 'army' && (
                <ArmyPanel
                  army={selectedArmy}
                  playerArmies={playerArmies}
                  cities={gameState.cities}
                  factions={gameState.factions}
                  playerFactionId={gameState.playerFactionId}
                  commandMode={gameState.commandMode}
                  lang={lang}
                  onSelectArmy={selectArmy}
                  onSetCommandMode={(m) => {
                    setCommandMode(m);
                    if (m !== 'none') setMobileTab('none');
                  }}
                  onOrderArmyToCity={(armyId, targetCityId, mode) => {
                    orderArmyToCity(armyId, targetCityId, mode);
                    setMobileTab('none');
                  }}
                  onRetreat={retreatArmy}
                  onDefend={setArmyDefend}
                  onCaptureCity={captureCityWithArmy}
                  onReinforceTroop={reinforceArmyTroops}
                  onClose={() => setMobileTab('none')}
                />
              )}
              {mobileTab === 'log' && (
                <BattleLog
                  events={gameState.battleLog}
                  lang={lang}
                  onClose={() => setMobileTab('none')}
                />
              )}
            </div>
          )}

          {/* Mobile Bottom Navigation & Game Controls Strip */}
          <div className="pointer-events-auto bg-[#161411] border-t border-[#3D3426] pb-safe px-safe px-1.5 py-1.5 flex flex-col gap-1.5">
            <div className="grid grid-cols-4 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setMobileTab('none')}
                className={`min-h-[44px] py-1.5 px-1 rounded flex items-center justify-center gap-1 font-medium cursor-pointer ${
                  mobileTab === 'none'
                    ? 'bg-[#D97706] text-[#12100E] font-semibold'
                    : 'bg-[#221E19] text-[#C9C0B1]'
                }`}
              >
                <MapIcon className="w-4 h-4 shrink-0" />
                <span className="truncate">{lang === 'en' ? 'Map' : 'แผนที่'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setMobileTab((prev) => (prev === 'city' ? 'none' : 'city'))
                }
                className={`min-h-[44px] py-1.5 px-1 rounded flex items-center justify-center gap-1 font-medium cursor-pointer truncate ${
                  mobileTab === 'city'
                    ? 'bg-[#D97706] text-[#12100E] font-semibold'
                    : 'bg-[#221E19] text-[#C9C0B1]'
                }`}
              >
                <Castle className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {selectedCity
                    ? selectedCity.name[lang]
                    : lang === 'en'
                    ? 'City'
                    : 'เมือง'}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setMobileTab((prev) => (prev === 'army' ? 'none' : 'army'))
                }
                className={`min-h-[44px] py-1.5 px-1 rounded flex items-center justify-center gap-1 font-medium cursor-pointer truncate ${
                  mobileTab === 'army'
                    ? 'bg-[#D97706] text-[#12100E] font-semibold'
                    : 'bg-[#221E19] text-[#C9C0B1]'
                }`}
              >
                <Swords className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {selectedArmy
                    ? selectedArmy.general.name[lang]
                    : lang === 'en'
                    ? 'Army'
                    : 'กองทัพ'}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setMobileTab((prev) => (prev === 'log' ? 'none' : 'log'))
                }
                className={`min-h-[44px] py-1.5 px-1 rounded flex items-center justify-center gap-1 font-medium cursor-pointer truncate ${
                  mobileTab === 'log'
                    ? 'bg-[#D97706] text-[#12100E] font-semibold'
                    : 'bg-[#221E19] text-[#C9C0B1]'
                }`}
              >
                <ScrollText className="w-4 h-4 shrink-0" />
                <span className="truncate">{lang === 'en' ? 'Log' : 'บันทึก'}</span>
              </button>
            </div>

            <GameControls
              isPaused={gameState.isPaused}
              gameSpeed={gameState.gameSpeed}
              hasSavedGame={hasSavedGame}
              lang={lang}
              onTogglePause={togglePause}
              onSetSpeed={setSpeed}
              onSaveGame={saveGame}
              onLoadGame={loadGame}
            />
          </div>
        </div>

        {/* Unification Victory Modal */}
        {gameState.screen === 'victory' && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4"
          >
            <div className="max-w-md w-full bg-[#181613] border-2 border-[#F59E0B] rounded-md p-6 text-center shadow-2xl">
              <div className="w-14 h-14 rounded-full bg-[#D97706]/20 border border-[#F59E0B] flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-7 h-7 text-[#F59E0B]" />
              </div>
              <h2 className="font-display font-bold text-2xl text-[#F3ECE0]">
                {lang === 'en'
                  ? 'THE REALM IS UNITED!'
                  : 'รวบรวมแผ่นดินสามก๊กสำเร็จ!'}
              </h2>
              <p className="text-sm text-[#C9C0B1] mt-2 leading-relaxed">
                {lang === 'en'
                  ? `${playerFaction.name.en} under ${playerFaction.rulerName.en} has conquered all eight strategic capitals and brought peace to All Under Heaven.`
                  : `${playerFaction.name.th} ภายใต้การนำของ ${playerFaction.rulerName.th} ได้พิชิตทั้ง 8 หัวเมืองยุทธศาสตร์และรวมแผ่นดินเป็นหนึ่งเดียวสำเร็จ`}
              </p>

              <div className="grid grid-cols-2 gap-2 my-5 bg-[#12100E] border border-[#2C251C] rounded p-3 text-xs">
                <div>
                  <div className="text-[#A89F8E]">
                    {lang === 'en' ? 'Total Troops' : 'กำลังพลรวม'}
                  </div>
                  <div className="font-mono-num font-bold text-base text-[#F59E0B] mt-0.5">
                    {playerFaction.totalMilitaryStrength.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[#A89F8E]">
                    {lang === 'en' ? 'Completed In' : 'เวลาที่ใช้'}
                  </div>
                  <div className="font-mono-num font-bold text-base text-[#34D399] mt-0.5">
                    {gameState.seasonYear[lang]}
                  </div>
                </div>
              </div>

              <button
                type="button"
                data-start="true"
                onClick={resetToTitle}
                className="w-full min-h-[48px] py-2.5 rounded bg-[#D97706] hover:bg-[#B45309] text-[#12100E] font-display font-bold text-sm tracking-wide transition-colors cursor-pointer"
              >
                {lang === 'en' ? 'Play Again' : 'เริ่มสงครามครั้งใหม่'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
