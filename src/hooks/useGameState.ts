import { useCallback, useEffect, useState } from 'react';
import { runStrategicAITick } from '../game/aiEngine';
import {
  createInitialGameState,
  getSeasonYearText,
  recalculateFactions,
} from '../game/initialState';
import {
  calculateArmyStats,
  computeUnitAndTerrainMultiplier,
  findShortestCityRoute,
  GENERALS,
  TERRAIN_INFO,
  TROOP_TYPES,
} from '../game/mapData';
import {
  ActiveBattle,
  Army,
  ArmyStatus,
  BattleEvent,
  City,
  CombatEffect,
  CommandMode,
  GameState,
  LocalizedText,
  PlayableFactionId,
  TroopComposition,
  TroopType,
} from '../game/types';
import { soundFX } from '../utils/sound';
import {
  hasSavedGameInStorage,
  loadGameFromStorage,
  saveGameToStorage,
} from '../utils/storage';

export interface ToastNotice {
  id: string;
  type: 'success' | 'warning' | 'info';
  text: LocalizedText;
}

function scaleComposition(comp: TroopComposition, ratio: number): TroopComposition {
  const clamped = Math.max(0, Math.min(1, ratio));
  return {
    spearmen: Math.max(0, Math.round(comp.spearmen * clamped)),
    cavalry: Math.max(0, Math.round(comp.cavalry * clamped)),
    archers: Math.max(0, Math.round(comp.archers * clamped)),
    infantry: Math.max(0, Math.round(comp.infantry * clamped)),
  };
}

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState('wei', false)
  );
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [hasSavedGame, setHasSavedGame] = useState<boolean>(() =>
    hasSavedGameInStorage()
  );

  const triggerToast = useCallback(
    (text: LocalizedText, type: 'success' | 'warning' | 'info' = 'info') => {
      setToast({
        id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type,
        text,
      });
    },
    []
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Real-time simulation tick loop (respects Pause & 1x/2x Game Speed)
  useEffect(() => {
    if (gameState.screen !== 'playing' || gameState.isPaused) return;

    const intervalMs = gameState.gameSpeed === 2 ? 450 : 900;

    const timer = window.setInterval(() => {
      setGameState((prev) => {
        if (prev.screen !== 'playing' || prev.isPaused) return prev;

        const nextTick = prev.tickCount + 1;
        const seasonYear = getSeasonYearText(nextTick);
        const cities: City[] = prev.cities.map((c) => ({
          ...c,
          position: { ...c.position },
          underSiege: false,
        }));
        let armies: Army[] = prev.armies.map((a) => ({
          ...a,
          position: { ...a.position },
          composition: { ...a.composition },
          routeQueue: a.routeQueue ? [...a.routeQueue] : [],
        }));
        const factions = {
          wei: { ...prev.factions.wei },
          shu: { ...prev.factions.shu },
          wu: { ...prev.factions.wu },
          neutral: { ...prev.factions.neutral },
        };
        const newEvents: BattleEvent[] = [];
        const nextActiveBattles: ActiveBattle[] = [];
        const nowMs = Date.now();
        const activeEffects: CombatEffect[] = prev.combatEffects.filter(
          (ef) => nowMs - ef.createdAt < 1800
        );

        const pushEvent = (
          type: BattleEvent['type'],
          message: LocalizedText,
          factionId?: BattleEvent['factionId']
        ) => {
          newEvents.unshift({
            id: `evt_${nextTick}_${Math.random().toString(36).slice(2, 7)}`,
            timestamp: seasonYear.en,
            tick: nextTick,
            type,
            factionId,
            message,
          });
        };

        // 1. Periodic Resource Tax, Harvest & Morale Recovery (every 6 ticks)
        if (nextTick % 6 === 0) {
          for (const city of cities) {
            const owner = factions[city.ownerFactionId];
            if (owner) {
              owner.gold += city.goldYield;
              owner.supplies += city.supplyYield;
            }
            // Gradual garrison recovery only when not under active siege
            const hasHostileAtCity = armies.some(
              (a) =>
                a.currentCityId === city.id &&
                a.ownerFactionId !== city.ownerFactionId &&
                a.status !== 'retreating'
            );
            const maxNaturalGarrison = city.level * 900;
            if (!hasHostileAtCity && city.garrison > 0 && city.garrison < maxNaturalGarrison) {
              city.garrison = Math.min(maxNaturalGarrison, city.garrison + 90);
              city.siegeProgress = Math.max(0, (city.siegeProgress || 0) - 15);
            }
          }

          // Recover morale for armies stationed at friendly cities with supplies
          for (const army of armies) {
            const ownerFac = factions[army.ownerFactionId];
            const atCity = cities.find((c) => c.id === army.currentCityId);
            if (
              (army.status === 'idle' || army.status === 'defending') &&
              atCity &&
              atCity.ownerFactionId === army.ownerFactionId &&
              ownerFac &&
              ownerFac.supplies > 0
            ) {
              army.morale = Math.min(100, army.morale + 8);
              const refreshed = calculateArmyStats(
                army.composition,
                army.general,
                army.status,
                army.morale
              );
              army.attackStat = refreshed.attackStat;
              army.defenseStat = refreshed.defenseStat;
            }
          }

          const playerFaction = factions[prev.playerFactionId];
          const playerCityCount = cities.filter(
            (c) => c.ownerFactionId === prev.playerFactionId
          ).length;

          if (playerCityCount > 0 && nextTick % 12 === 0) {
            pushEvent(
              'economy',
              {
                en: `Imperial granaries and tax collectors delivered resources from ${playerCityCount} cities to ${playerFaction.name.en}.`,
                th: `คลังหลวงและกองเสบียงเก็บภาษีและผลผลิตจาก ${playerCityCount} หัวเมืองเข้าสู่ ${playerFaction.name.th}`,
              },
              prev.playerFactionId
            );
          }
        }

        // 2. Process Marching, Retreating, and Engaging Armies
        const destroyedArmyIds = new Set<string>();
        const capturedCityIdsThisTick = new Set<string>();

        for (let i = 0; i < armies.length; i++) {
          const army = armies[i];
          if (destroyedArmyIds.has(army.id)) continue;

          // A. Handle Movement along Connected Route (Marching / Attacking / Retreating)
          if (
            (army.status === 'marching' ||
              army.status === 'attacking' ||
              army.status === 'retreating') &&
            army.targetCityId
          ) {
            const originCity = cities.find((c) => c.id === army.originCityId);
            const targetCity = cities.find((c) => c.id === army.targetCityId);

            if (!targetCity) {
              army.status = 'idle';
              army.targetCityId = null;
              continue;
            }

            const startX = originCity ? originCity.position.x : army.position.x;
            const startY = originCity ? originCity.position.y : army.position.y;
            const dx = targetCity.position.x - startX;
            const dy = targetCity.position.y - startY;
            const dist = Math.max(120, Math.hypot(dx, dy));

            const cavRatio =
              army.troopCount > 0 ? army.composition.cavalry / army.troopCount : 0;
            const terrainSpeedMult =
              TERRAIN_INFO[targetCity.terrain]?.marchSpeedMultiplier || 1.0;
            const baseStep = 50 / dist;
            const speedMult =
              (1 + cavRatio * 0.35) *
              (1 + army.general.speedBonus / 100) *
              terrainSpeedMult;

            const nextProgress = Math.min(1, army.movementProgress + baseStep * speedMult);
            army.movementProgress = nextProgress;
            army.position = {
              x: startX + dx * nextProgress,
              y: startY + dy * nextProgress,
            };

            // Supply consumption while marching
            const ownerFac = factions[army.ownerFactionId];
            if (ownerFac) {
              if (ownerFac.supplies > 0) {
                ownerFac.supplies = Math.max(
                  0,
                  ownerFac.supplies - Math.max(4, Math.round(army.troopCount / 450))
                );
              } else {
                // Out of supplies reduces morale
                army.morale = Math.max(25, army.morale - 3);
              }
            }

            if (nextProgress >= 1) {
              army.movementProgress = 0;
              army.originCityId = targetCity.id;
              army.currentCityId = targetCity.id;
              army.targetCityId = null;

              if (targetCity.ownerFactionId === army.ownerFactionId) {
                // Friendly city reached
                const offsetAngle = ((i + 1) * 1.65) % (Math.PI * 2);
                army.position = {
                  x: targetCity.position.x + Math.cos(offsetAngle) * 40,
                  y: targetCity.position.y + Math.sin(offsetAngle) * 34,
                };
                const wasRetreating = army.status === 'retreating';
                army.status = 'idle';
                const refreshed = calculateArmyStats(
                  army.composition,
                  army.general,
                  'idle',
                  army.morale
                );
                army.attackStat = refreshed.attackStat;
                army.defenseStat = refreshed.defenseStat;

                pushEvent(
                  'movement',
                  wasRetreating
                    ? {
                        en: `${army.name.en} (${army.general.name.en}) completed its retreat to ${targetCity.name.en} and is regrouping.`,
                        th: `${army.name.th} (${army.general.name.th}) ถอยทัพกลับถึงเมือง ${targetCity.name.th} และกำลังตั้งหลักใหม่`,
                      }
                    : {
                        en: `${army.name.en} (${army.general.name.en}) arrived at ${targetCity.name.en}.`,
                        th: `${army.name.th} นำโดย ${army.general.name.th} เดินทัพถึงเมือง ${targetCity.name.th} แล้ว`,
                      },
                  army.ownerFactionId
                );
              } else {
                // Arrived at a hostile/neutral city -> transition into active siege/combat!
                army.status = 'capturing';
                army.position = {
                  x: targetCity.position.x - 42,
                  y: targetCity.position.y + 30,
                };
                pushEvent(
                  'combat',
                  {
                    en: `${army.name.en} (${army.general.name.en}) reached the walls of ${targetCity.name.en} and initiated siege combat!`,
                    th: `${army.name.th} (${army.general.name.th}) ประชิดกำแพงเมือง ${targetCity.name.th} และเริ่มเปิดฉากศึกตีเมือง!`,
                  },
                  army.ownerFactionId
                );
              }
            }
          }

          // B. Resolve Active Siege & Field Combat at Hostile Cities
          if (army.currentCityId && army.status !== 'marching' && army.status !== 'retreating') {
            const currentCity = cities.find((c) => c.id === army.currentCityId);
            if (
              currentCity &&
              currentCity.ownerFactionId !== army.ownerFactionId &&
              !capturedCityIdsThisTick.has(currentCity.id)
            ) {
              currentCity.underSiege = true;
              army.status = 'capturing';

              soundFX.playSwordClash();
              activeEffects.push({
                id: `fx_clash_${nowMs}_${army.id}`,
                position: { ...currentCity.position },
                createdAt: nowMs,
                type: 'clash',
                color: factions[army.ownerFactionId].color,
              });

              // Find any enemy field army defending this city
              const defendingArmy = armies.find(
                (other) =>
                  other.id !== army.id &&
                  !destroyedArmyIds.has(other.id) &&
                  other.currentCityId === currentCity.id &&
                  other.ownerFactionId === currentCity.ownerFactionId &&
                  other.status !== 'retreating'
              );

              const { attackerMult, defenderMult } = computeUnitAndTerrainMultiplier(
                army.composition,
                defendingArmy?.composition,
                currentCity.terrain
              );

              const wallMult = 1 + currentCity.wallLevel * 0.14;
              const attackerEffectivePower =
                (army.attackStat * 12 + army.troopCount * 0.45) * attackerMult;

              const defenderArmyPower = defendingArmy
                ? (defendingArmy.defenseStat * 12 + defendingArmy.troopCount * 0.45) *
                  defenderMult
                : 0;
              const garrisonPower =
                currentCity.garrison * 0.55 * wallMult * defenderMult;
              const totalDefenderPower = Math.max(80, defenderArmyPower + garrisonPower);

              // Calculate round casualties (multi-tick combat resolution)
              const powerRatio = attackerEffectivePower / totalDefenderPower;
              const defenderLossTroops = Math.max(
                140,
                Math.round(Math.min(1150, attackerEffectivePower * 0.34))
              );
              const attackerLossTroops = Math.max(
                90,
                Math.round(
                  Math.min(
                    950,
                    (totalDefenderPower * 0.26) / Math.max(0.55, powerRatio)
                  )
                )
              );

              // Apply casualties to defending field army first, then city garrison
              let remainingDefLoss = defenderLossTroops;
              if (defendingArmy && defendingArmy.troopCount > 0) {
                const armyShare = Math.min(
                  defendingArmy.troopCount,
                  Math.round(remainingDefLoss * 0.65)
                );
                const keepRatio = Math.max(
                  0,
                  (defendingArmy.troopCount - armyShare) / defendingArmy.troopCount
                );
                defendingArmy.composition = scaleComposition(
                  defendingArmy.composition,
                  keepRatio
                );
                defendingArmy.morale = Math.max(15, defendingArmy.morale - 12);
                const dStats = calculateArmyStats(
                  defendingArmy.composition,
                  defendingArmy.general,
                  defendingArmy.status,
                  defendingArmy.morale
                );
                defendingArmy.troopCount = dStats.troopCount;
                defendingArmy.attackStat = dStats.attackStat;
                defendingArmy.defenseStat = dStats.defenseStat;

                remainingDefLoss = Math.max(0, remainingDefLoss - armyShare);

                if (defendingArmy.troopCount < 250) {
                  destroyedArmyIds.add(defendingArmy.id);
                  pushEvent(
                    'combat',
                    {
                      en: `${defendingArmy.general.name.en}'s defending army was wiped out at ${currentCity.name.en}!`,
                      th: `ทัพป้องกันของ ${defendingArmy.general.name.th} ถูกตีแตกพ่ายยับเยิน ณ เมือง ${currentCity.name.th}!`,
                    },
                    army.ownerFactionId
                  );
                }
              }

              // Apply remaining damage to City Garrison & Siege Progress
              const prevGarrison = currentCity.garrison;
              currentCity.garrison = Math.max(0, currentCity.garrison - remainingDefLoss);
              const garrisonKilled = prevGarrison - currentCity.garrison;

              const siegeGain = Math.round(28 * Math.min(1.8, Math.max(0.5, powerRatio)));
              currentCity.siegeProgress = Math.min(
                100,
                (currentCity.siegeProgress || 0) + siegeGain
              );

              // Apply casualties & morale change to Attacker
              const prevAtkTroops = army.troopCount;
              const atkKeepRatio =
                prevAtkTroops > 0
                  ? Math.max(0, (prevAtkTroops - attackerLossTroops) / prevAtkTroops)
                  : 0;
              army.composition = scaleComposition(army.composition, atkKeepRatio);
              army.morale = Math.max(
                15,
                Math.min(100, army.morale + (powerRatio >= 1.05 ? -4 : -14))
              );
              const aStats = calculateArmyStats(
                army.composition,
                army.general,
                army.status,
                army.morale
              );
              army.troopCount = aStats.troopCount;
              army.attackStat = aStats.attackStat;
              army.defenseStat = aStats.defenseStat;
              const actualAtkLoss = prevAtkTroops - army.troopCount;

              // Check if Attacker is destroyed or forced to Retreat
              if (army.troopCount < 220) {
                destroyedArmyIds.add(army.id);
                currentCity.underSiege = false;
                currentCity.siegeProgress = 0;
                pushEvent(
                  'combat',
                  {
                    en: `${army.name.en} (${army.general.name.en}) was annihilated beneath the walls of ${currentCity.name.en}!`,
                    th: `${army.name.th} (${army.general.name.th}) ถูกตีพ่ายแพ้หมดสภาพหน้ากำแพงเมือง ${currentCity.name.th}!`,
                  },
                  currentCity.ownerFactionId
                );
                continue;
              }

              if (
                (army.morale <= 28 || army.troopCount < 500) &&
                currentCity.garrison > 250
              ) {
                // Forced Retreat along connected road back to a friendly city
                const retreatTargetId =
                  currentCity.connectedCityIds.find((cid) => {
                    const cObj = cities.find((c) => c.id === cid);
                    return cObj && cObj.ownerFactionId === army.ownerFactionId;
                  }) || currentCity.connectedCityIds[0];

                if (retreatTargetId) {
                  army.originCityId = currentCity.id;
                  army.targetCityId = retreatTargetId;
                  army.movementProgress = 0.08;
                  army.status = 'retreating';
                  currentCity.underSiege = false;

                  const retreatCity = cities.find((c) => c.id === retreatTargetId);
                  pushEvent(
                    'combat',
                    {
                      en: `Low morale (${army.morale}%) forced ${army.general.name.en} to retreat from ${currentCity.name.en} toward ${retreatCity?.name.en || 'safety'}!`,
                      th: `ขวัญกำลังใจตกต่ำ (${army.morale}%) ทำให้ ${army.general.name.th} ต้องสั่งถอยทัพจาก ${currentCity.name.th} มุ่งสู่ ${retreatCity?.name.th || 'แนวหลัง'}!`,
                    },
                    army.ownerFactionId
                  );
                  continue;
                }
              }

              // Check Valid City Capture Conditions:
              // Garrison depleted to 0 (or <= 150 with 100% siege breach) and no active defending army remains
              const activeDefendingArmyRemains = armies.some(
                (other) =>
                  other.id !== army.id &&
                  !destroyedArmyIds.has(other.id) &&
                  other.currentCityId === currentCity.id &&
                  other.ownerFactionId === currentCity.ownerFactionId &&
                  other.status !== 'retreating' &&
                  other.troopCount >= 250
              );

              if (
                !activeDefendingArmyRemains &&
                (currentCity.garrison <= 0 ||
                  (currentCity.garrison <= 200 &&
                    (currentCity.siegeProgress || 0) >= 100))
              ) {
                // Capture City!
                capturedCityIdsThisTick.add(currentCity.id);
                const previousOwner = factions[currentCity.ownerFactionId];
                currentCity.ownerFactionId = army.ownerFactionId;
                currentCity.underSiege = false;
                currentCity.siegeProgress = 0;
                currentCity.garrison = Math.max(850, Math.round(army.troopCount * 0.32));
                currentCity.wallLevel = Math.max(1, currentCity.wallLevel - 1);

                army.status = 'idle';
                army.morale = Math.min(100, army.morale + 18);
                const capStats = calculateArmyStats(
                  army.composition,
                  army.general,
                  'idle',
                  army.morale
                );
                army.attackStat = capStats.attackStat;
                army.defenseStat = capStats.defenseStat;

                soundFX.playCaptureHorn();
                activeEffects.push({
                  id: `fx_cap_${nowMs}_${currentCity.id}`,
                  position: { ...currentCity.position },
                  createdAt: nowMs,
                  type: 'capture',
                  color: factions[army.ownerFactionId].color,
                });

                pushEvent(
                  'capture',
                  {
                    en: `CITY CAPTURED! ${army.name.en} (${army.general.name.en}) breached ${currentCity.name.en} and seized it from ${previousOwner.name.en}!`,
                    th: `ยึดครองสำเร็จ! ${army.name.th} (${army.general.name.th}) ตีหักด่านเมือง ${currentCity.name.th} จาก ${previousOwner.name.th} ได้สำเร็จ!`,
                  },
                  army.ownerFactionId
                );
              } else {
                // Ongoing siege battle round report
                const existingBattle = prev.activeBattles.find(
                  (b) => b.cityId === currentCity.id && b.attackerArmyId === army.id
                );
                const roundNum = (existingBattle?.round || 0) + 1;

                nextActiveBattles.push({
                  id: `battle_${currentCity.id}_${army.id}`,
                  cityId: currentCity.id,
                  attackerArmyId: army.id,
                  attackerFactionId: army.ownerFactionId,
                  defenderFactionId: currentCity.ownerFactionId,
                  defenderArmyId: defendingArmy?.id || null,
                  round: roundNum,
                  attackerInitialTroops:
                    existingBattle?.attackerInitialTroops || prevAtkTroops,
                  defenderInitialTroops:
                    existingBattle?.defenderInitialTroops ||
                    prevGarrison + (defendingArmy?.troopCount || 0),
                  lastAttackerCasualties: actualAtkLoss,
                  lastDefenderCasualties:
                    garrisonKilled + (defenderLossTroops - remainingDefLoss),
                  siegeProgress: currentCity.siegeProgress || 0,
                  terrain: currentCity.terrain,
                });

                pushEvent(
                  'combat',
                  {
                    en: `Siege of ${currentCity.name.en} (Round ${roundNum}): ${army.general.name.en} (-${actualAtkLoss}) vs Defenders (-${garrisonKilled + (defenderLossTroops - remainingDefLoss)}). Garrison: ${currentCity.garrison.toLocaleString()} · Breach: ${currentCity.siegeProgress}%.`,
                    th: `ศึกตีเมือง ${currentCity.name.th} (รอบที่ ${roundNum}): ${army.general.name.th} (สูญเสีย ${actualAtkLoss}) ปะทะ ฝ่ายป้องกัน (สูญเสีย ${garrisonKilled + (defenderLossTroops - remainingDefLoss)}) · ทหารเมืองเหลือ ${currentCity.garrison.toLocaleString()} (${currentCity.siegeProgress}%)`,
                  },
                  army.ownerFactionId
                );
              }
            }
          }
        }

        if (destroyedArmyIds.size > 0) {
          armies = armies.filter((a) => !destroyedArmyIds.has(a.id));
        }

        // 3. Run Strategic Enemy AI (Evaluates threats, reinforces cities, launches attacks)
        runStrategicAITick({
          tickCount: nextTick,
          playerFactionId: prev.playerFactionId,
          factions,
          cities,
          armies,
          pushEvent,
        });

        const updatedFactions = recalculateFactions(factions, cities, armies);
        const playerOwnedCount = updatedFactions[prev.playerFactionId].ownedCities.length;
        const nextScreen: GameState['screen'] =
          playerOwnedCount === cities.length ? 'victory' : prev.screen;

        const nextSelectedArmyId =
          prev.selectedArmyId && destroyedArmyIds.has(prev.selectedArmyId)
            ? null
            : prev.selectedArmyId;

        return {
          ...prev,
          screen: nextScreen,
          tickCount: nextTick,
          seasonYear,
          factions: updatedFactions,
          cities,
          armies,
          activeBattles: nextActiveBattles,
          selectedArmyId: nextSelectedArmyId,
          battleLog: [...newEvents, ...prev.battleLog].slice(0, 50),
          combatEffects: activeEffects,
        };
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [gameState.screen, gameState.isPaused, gameState.gameSpeed]);

  const startCampaign = useCallback((factionId: PlayableFactionId) => {
    soundFX.playWarDrum();
    setGameState(createInitialGameState(factionId, true));
  }, []);

  const resetToTitle = useCallback(() => {
    soundFX.playSelect();
    setGameState((prev) => createInitialGameState(prev.playerFactionId, false));
  }, []);

  // Issue Move or Attack Order along connected map roads
  const orderArmyToCity = useCallback(
    (armyId: string, targetCityId: string, mode: 'move' | 'attack') => {
      setGameState((prev) => {
        const army = prev.armies.find((a) => a.id === armyId);
        const targetCity = prev.cities.find((c) => c.id === targetCityId);
        if (!army || !targetCity) return prev;

        if (army.ownerFactionId !== prev.playerFactionId) {
          triggerToast(
            {
              en: 'You can only command armies belonging to your own faction.',
              th: 'ท่านสามารถออกคำสั่งได้เฉพาะกองทัพของฝ่ายตนเองเท่านั้น',
            },
            'warning'
          );
          return prev;
        }

        if (army.status === 'retreating') {
          triggerToast(
            {
              en: `${army.name.en} is currently retreating and cannot take new orders until it reaches safety.`,
              th: `${army.name.th} กำลังถอยทัพ ไม่สามารถรับคำสั่งใหม่ได้จนกว่าจะถึงเมืองปลอดภัย`,
            },
            'warning'
          );
          return prev;
        }

        if (army.currentCityId === targetCityId && !army.targetCityId) {
          triggerToast(
            {
              en: `${army.name.en} is already positioned at ${targetCity.name.en}.`,
              th: `${army.name.th} ประจำการอยู่ที่เมือง ${targetCity.name.th} อยู่แล้ว`,
            },
            'info'
          );
          return { ...prev, commandMode: 'none' };
        }

        const currentCity = prev.cities.find((c) => c.id === army.currentCityId);
        if (!currentCity) return prev;

        // Prevent movement across disconnected routes / impassable mountain-river barriers
        if (!currentCity.connectedCityIds.includes(targetCityId)) {
          const shortestRoute = findShortestCityRoute(
            prev.cities,
            currentCity.id,
            targetCityId
          );
          const firstHopCity = shortestRoute
            ? prev.cities.find((c) => c.id === shortestRoute[0])
            : null;

          triggerToast(
            firstHopCity
              ? {
                  en: `Unreachable directly! Impassable terrain blocks ${currentCity.name.en} → ${targetCity.name.en}. March via ${firstHopCity.name.en} first.`,
                  th: `ไม่สามารถลัดข้ามภูมิประเทศได้! ไม่มีถนนสายตรงจาก ${currentCity.name.th} ไป ${targetCity.name.th} ต้องเดินทัพผ่าน ${firstHopCity.name.th} ก่อน`,
                }
              : {
                  en: `No connected road route exists between ${currentCity.name.en} and ${targetCity.name.en}.`,
                  th: `ไม่มีเส้นทางเดินทัพเชื่อมต่อระหว่าง ${currentCity.name.th} และ ${targetCity.name.th}`,
                },
            'warning'
          );
          return prev;
        }

        const isHostile = targetCity.ownerFactionId !== prev.playerFactionId;
        const newStatus: ArmyStatus =
          isHostile || mode === 'attack' ? 'attacking' : 'marching';

        soundFX.playWarDrum();

        const updatedArmies: Army[] = prev.armies.map((a) => {
          if (a.id !== army.id) return a;
          const stats = calculateArmyStats(
            a.composition,
            a.general,
            newStatus,
            a.morale
          );
          return {
            ...a,
            originCityId: currentCity.id,
            targetCityId: targetCity.id,
            routeQueue: [],
            movementProgress: 0.05,
            status: newStatus,
            intendedAction: mode,
            lastOrderTick: prev.tickCount,
            attackStat: stats.attackStat,
            defenseStat: stats.defenseStat,
          };
        });

        const evt: BattleEvent = {
          id: `evt_cmd_${Date.now()}`,
          timestamp: prev.seasonYear.en,
          tick: prev.tickCount,
          type: isHostile ? 'combat' : 'movement',
          factionId: prev.playerFactionId,
          message: isHostile
            ? {
                en: `${army.name.en} (${army.general.name.en}) marches from ${currentCity.name.en} to assault ${targetCity.name.en}!`,
                th: `${army.name.th} นำโดย ${army.general.name.th} เคลื่อนทัพจาก ${currentCity.name.th} บุกโจมตี ${targetCity.name.th}!`,
              }
            : {
                en: `${army.name.en} (${army.general.name.en}) marches along the road from ${currentCity.name.en} to ${targetCity.name.en}.`,
                th: `${army.name.th} นำโดย ${army.general.name.th} เคลื่อนพลตามเส้นทางจาก ${currentCity.name.th} สู่ ${targetCity.name.th}`,
              },
        };

        triggerToast(
          isHostile
            ? {
                en: `Marching to attack ${targetCity.name.en}!`,
                th: `สั่งเคลื่อนทัพบุกโจมตี ${targetCity.name.th}!`,
              }
            : {
                en: `Marching toward ${targetCity.name.en}.`,
                th: `กำลังเคลื่อนทัพไปยัง ${targetCity.name.th}`,
              },
          'success'
        );

        return {
          ...prev,
          armies: updatedArmies,
          commandMode: 'none',
          battleLog: [evt, ...prev.battleLog].slice(0, 50),
        };
      });
    },
    [triggerToast]
  );

  // Manual Retreat Command for an Army in combat or marching
  const retreatArmy = useCallback(
    (armyId: string) => {
      setGameState((prev) => {
        const army = prev.armies.find((a) => a.id === armyId);
        if (!army || army.ownerFactionId !== prev.playerFactionId) return prev;

        const currentCity = prev.cities.find((c) => c.id === army.currentCityId);
        if (!currentCity) return prev;

        const friendlyNeighborId =
          currentCity.connectedCityIds.find((cid) => {
            const c = prev.cities.find((city) => city.id === cid);
            return c && c.ownerFactionId === prev.playerFactionId;
          }) || army.originCityId;

        if (!friendlyNeighborId || friendlyNeighborId === currentCity.id) {
          triggerToast(
            {
              en: 'Army is already stationed at a friendly city.',
              th: 'กองทัพอยู่ในเขตเมืองฝ่ายเดียวกันอยู่แล้ว',
            },
            'info'
          );
          return prev;
        }

        const retreatDest = prev.cities.find((c) => c.id === friendlyNeighborId);
        if (!retreatDest) return prev;

        soundFX.playSelect();

        const updatedArmies: Army[] = prev.armies.map((a) => {
          if (a.id !== armyId) return a;
          const stats = calculateArmyStats(
            a.composition,
            a.general,
            'retreating',
            a.morale
          );
          return {
            ...a,
            originCityId: currentCity.id,
            targetCityId: retreatDest.id,
            movementProgress: 0.08,
            status: 'retreating',
            attackStat: stats.attackStat,
            defenseStat: stats.defenseStat,
          };
        });

        const evt: BattleEvent = {
          id: `evt_ret_${Date.now()}`,
          timestamp: prev.seasonYear.en,
          tick: prev.tickCount,
          type: 'movement',
          factionId: prev.playerFactionId,
          message: {
            en: `${army.name.en} broke off engagement and is retreating toward ${retreatDest.name.en}.`,
            th: `${army.name.th} ถอนกำลังออกจากสมรภูมิและกำลังถอยทัพกลับสู่ ${retreatDest.name.th}`,
          },
        };

        triggerToast(
          {
            en: `Retreating toward ${retreatDest.name.en}.`,
            th: `สั่งถอยทัพกลับไปยัง ${retreatDest.name.th}`,
          },
          'info'
        );

        return {
          ...prev,
          armies: updatedArmies,
          commandMode: 'none',
          battleLog: [evt, ...prev.battleLog].slice(0, 50),
        };
      });
    },
    [triggerToast]
  );

  const selectCity = useCallback((cityId: string | null) => {
    if (!cityId) {
      setGameState((prev) => ({
        ...prev,
        selectedCityId: null,
        commandMode: 'none',
      }));
      return;
    }

    soundFX.playSelect();

    setGameState((prev) => {
      if (
        (prev.commandMode === 'move' || prev.commandMode === 'attack') &&
        prev.selectedArmyId
      ) {
        return prev;
      }
      return {
        ...prev,
        selectedCityId: cityId,
      };
    });
  }, []);

  const handleCityClickOnMap = useCallback(
    (cityId: string) => {
      const activeMode = gameState.commandMode;
      const activeArmyId = gameState.selectedArmyId;
      if ((activeMode === 'move' || activeMode === 'attack') && activeArmyId) {
        orderArmyToCity(activeArmyId, cityId, activeMode);
        return;
      }
      selectCity(cityId);
    },
    [gameState.commandMode, gameState.selectedArmyId, orderArmyToCity, selectCity]
  );

  const selectArmy = useCallback((armyId: string | null) => {
    if (armyId) {
      soundFX.playSelect();
    }
    setGameState((prev) => {
      const army = prev.armies.find((a) => a.id === armyId);
      return {
        ...prev,
        selectedArmyId: armyId,
        selectedCityId: army?.currentCityId ?? prev.selectedCityId,
        commandMode: 'none',
      };
    });
  }, []);

  const setCommandMode = useCallback((mode: CommandMode) => {
    soundFX.playSelect();
    setGameState((prev) => {
      const nextMode: CommandMode = prev.commandMode === mode ? 'none' : mode;
      return {
        ...prev,
        commandMode: nextMode,
      };
    });
  }, []);

  const setArmyDefend = useCallback(
    (armyId: string) => {
      setGameState((prev) => {
        const army = prev.armies.find((a) => a.id === armyId);
        if (!army || army.ownerFactionId !== prev.playerFactionId) return prev;

        soundFX.playSelect();

        const nextStatus: ArmyStatus =
          army.status === 'defending' ? 'idle' : 'defending';
        const stats = calculateArmyStats(
          army.composition,
          army.general,
          nextStatus,
          army.morale
        );

        const updatedArmies: Army[] = prev.armies.map((a) =>
          a.id === armyId
            ? {
                ...a,
                status: nextStatus,
                targetCityId: null,
                movementProgress: 0,
                attackStat: stats.attackStat,
                defenseStat: stats.defenseStat,
              }
            : a
        );

        const evt: BattleEvent = {
          id: `evt_def_${Date.now()}`,
          timestamp: prev.seasonYear.en,
          tick: prev.tickCount,
          type: 'movement',
          factionId: prev.playerFactionId,
          message:
            nextStatus === 'defending'
              ? {
                  en: `${army.name.en} fortified camp in defensive formation (+25% Defense).`,
                  th: `${army.name.th} ตั้งค่ายกลป้องกันอย่างมั่นคง (พลังป้องกัน +25%)`,
                }
              : {
                  en: `${army.name.en} broke camp and stands ready to march.`,
                  th: `${army.name.th} ถอนค่ายป้องกัน เตรียมพร้อมเคลื่อนพล`,
                },
        };

        triggerToast(
          nextStatus === 'defending'
            ? {
                en: `${army.name.en} entered Defend formation (+25% DEF).`,
                th: `${army.name.th} ตั้งค่ายป้องกัน (+25% ป้องกัน)`,
              }
            : {
                en: `${army.name.en} returned to standard readiness.`,
                th: `${army.name.th} กลับสู่สถานะเตรียมพร้อม`,
              },
          'info'
        );

        return {
          ...prev,
          armies: updatedArmies,
          commandMode: 'none',
          battleLog: [evt, ...prev.battleLog].slice(0, 50),
        };
      });
    },
    [triggerToast]
  );

  // Capture City Command (validates siege & garrison conditions)
  const captureCityWithArmy = useCallback(
    (armyId: string) => {
      setGameState((prev) => {
        const army = prev.armies.find((a) => a.id === armyId);
        if (!army || army.ownerFactionId !== prev.playerFactionId) return prev;

        const city = prev.cities.find((c) => c.id === army.currentCityId);
        if (!city) {
          triggerToast(
            {
              en: 'Army must be positioned at a city to capture it.',
              th: 'กองทัพต้องประชิดหรืออยู่ที่เมืองเป้าหมายจึงจะยึดเมืองได้',
            },
            'warning'
          );
          return prev;
        }

        if (city.ownerFactionId === prev.playerFactionId) {
          triggerToast(
            {
              en: `${city.name.en} is already under your banner! Use 'Attack' to march on a connected hostile city.`,
              th: `เมือง ${city.name.th} อยู่ใต้การปกครองของท่านแล้ว! ใช้คำสั่ง 'บุกโจมตี' เพื่อตีเมืองศัตรู`,
            },
            'info'
          );
          return prev;
        }

        // Check if defending enemy field armies still block capture
        const defendingEnemyArmy = prev.armies.find(
          (other) =>
            other.id !== army.id &&
            other.currentCityId === city.id &&
            other.ownerFactionId === city.ownerFactionId &&
            other.status !== 'retreating' &&
            other.troopCount >= 250
        );

        const { attackerMult, defenderMult } = computeUnitAndTerrainMultiplier(
          army.composition,
          defendingEnemyArmy?.composition,
          city.terrain
        );
        const wallMult = 1 + city.wallLevel * 0.14;
        const atkPower =
          (army.attackStat * 14 + army.troopCount * 0.55) * attackerMult;
        const defPower =
          (city.garrison * 0.6 * wallMult +
            (defendingEnemyArmy ? defendingEnemyArmy.troopCount * 0.55 : 0)) *
          defenderMult;

        if (!defendingEnemyArmy && (city.garrison <= 450 || atkPower >= defPower * 0.85)) {
          soundFX.playCaptureHorn();
          const previousOwner = prev.factions[city.ownerFactionId];

          const updatedCities: City[] = prev.cities.map((c) =>
            c.id === city.id
              ? {
                  ...c,
                  ownerFactionId: prev.playerFactionId,
                  underSiege: false,
                  siegeProgress: 0,
                  garrison: Math.max(900, Math.round(army.troopCount * 0.32)),
                  wallLevel: Math.max(1, c.wallLevel - 1),
                }
              : c
          );

          const updatedArmies: Army[] = prev.armies.map((a) => {
            if (a.id !== army.id) return a;
            const nextComp = scaleComposition(a.composition, 0.84);
            const nextMorale = Math.min(100, a.morale + 15);
            const stats = calculateArmyStats(
              nextComp,
              a.general,
              'idle',
              nextMorale
            );
            return {
              ...a,
              status: 'idle',
              morale: nextMorale,
              composition: nextComp,
              troopCount: stats.troopCount,
              attackStat: stats.attackStat,
              defenseStat: stats.defenseStat,
            };
          });

          const updatedFactions = recalculateFactions(
            prev.factions,
            updatedCities,
            updatedArmies
          );

          const evt: BattleEvent = {
            id: `evt_cap_${Date.now()}`,
            timestamp: prev.seasonYear.en,
            tick: prev.tickCount,
            type: 'capture',
            factionId: prev.playerFactionId,
            message: {
              en: `${army.name.en} (${army.general.name.en}) stormed the gates and captured ${city.name.en} from ${previousOwner.name.en}!`,
              th: `${army.name.th} (${army.general.name.th}) บุกทะลวงประตูเมืองและยึดครอง ${city.name.th} จาก ${previousOwner.name.th} สำเร็จ!`,
            },
          };

          triggerToast(
            {
              en: `${city.name.en} has been captured!`,
              th: `ยึดครองเมือง ${city.name.th} สำเร็จ!`,
            },
            'success'
          );

          const playerOwnedCount =
            updatedFactions[prev.playerFactionId].ownedCities.length;
          const nextScreen: GameState['screen'] =
            playerOwnedCount === updatedCities.length ? 'victory' : prev.screen;

          return {
            ...prev,
            screen: nextScreen,
            cities: updatedCities,
            armies: updatedArmies,
            activeBattles: prev.activeBattles.filter((b) => b.cityId !== city.id),
            factions: updatedFactions,
            commandMode: 'none',
            battleLog: [evt, ...prev.battleLog].slice(0, 50),
            combatEffects: [
              ...prev.combatEffects,
              {
                id: `fx_cap_${Date.now()}`,
                position: { ...city.position },
                createdAt: Date.now(),
                type: 'capture',
                color: prev.factions[prev.playerFactionId].color,
              },
            ],
          };
        } else {
          // Inflict a siege assault round, reducing garrison and advancing siegeProgress
          soundFX.playSwordClash();
          const garrisonDamage = Math.max(220, Math.round(atkPower * 0.28));
          const atkDamage = Math.max(120, Math.round(defPower * 0.2));

          const updatedCities: City[] = prev.cities.map((c) =>
            c.id === city.id
              ? {
                  ...c,
                  underSiege: true,
                  garrison: Math.max(0, c.garrison - garrisonDamage),
                  siegeProgress: Math.min(100, (c.siegeProgress || 0) + 32),
                }
              : c
          );

          const updatedArmies: Army[] = prev.armies.map((a) => {
            if (a.id !== army.id) return a;
            const keepRatio = Math.max(
              0.4,
              (a.troopCount - atkDamage) / Math.max(1, a.troopCount)
            );
            const nextComp = scaleComposition(a.composition, keepRatio);
            const nextMorale = Math.max(25, a.morale - 8);
            const stats = calculateArmyStats(
              nextComp,
              a.general,
              'capturing',
              nextMorale
            );
            return {
              ...a,
              status: 'capturing',
              morale: nextMorale,
              composition: nextComp,
              troopCount: stats.troopCount,
              attackStat: stats.attackStat,
              defenseStat: stats.defenseStat,
            };
          });

          const updatedFactions = recalculateFactions(
            prev.factions,
            updatedCities,
            updatedArmies
          );

          const remainingGarrison = Math.max(0, city.garrison - garrisonDamage);
          triggerToast(
            {
              en: `Siege assault on ${city.name.en}! Garrison reduced to ${remainingGarrison.toLocaleString()}. Continue siege to capture!`,
              th: `บุกโจมตีกำแพงเมือง ${city.name.th}! ทหารรักษาการณ์ลดเหลือ ${remainingGarrison.toLocaleString()} ล้อมตีต่อเพื่อยึดเมือง!`,
            },
            'info'
          );

          return {
            ...prev,
            cities: updatedCities,
            armies: updatedArmies,
            factions: updatedFactions,
          };
        }
      });
    },
    [triggerToast]
  );

  const recruitCityGarrison = useCallback(
    (cityId: string) => {
      setGameState((prev) => {
        const city = prev.cities.find((c) => c.id === cityId);
        if (!city || city.ownerFactionId !== prev.playerFactionId) return prev;

        const goldCost = 180;
        const supplyCost = 160;
        const playerFaction = prev.factions[prev.playerFactionId];

        if (playerFaction.gold < goldCost || playerFaction.supplies < supplyCost) {
          triggerToast(
            {
              en: `Insufficient resources! Need ${goldCost} Gold & ${supplyCost} Supplies.`,
              th: `ทรัพยากรไม่เพียงพอ! ต้องการทอง ${goldCost} และเสบียง ${supplyCost}`,
            },
            'warning'
          );
          return prev;
        }

        soundFX.playSelect();

        const updatedCities = prev.cities.map((c) =>
          c.id === cityId ? { ...c, garrison: c.garrison + 450 } : c
        );

        const nextFactions = {
          ...prev.factions,
          [prev.playerFactionId]: {
            ...playerFaction,
            gold: playerFaction.gold - goldCost,
            supplies: playerFaction.supplies - supplyCost,
          },
        };

        const updatedFactions = recalculateFactions(
          nextFactions,
          updatedCities,
          prev.armies
        );

        const evt: BattleEvent = {
          id: `evt_rec_${Date.now()}`,
          timestamp: prev.seasonYear.en,
          tick: prev.tickCount,
          type: 'economy',
          factionId: prev.playerFactionId,
          message: {
            en: `Recruited +450 garrison soldiers in ${city.name.en}.`,
            th: `เกณฑ์ทหารรักษาการณ์เพิ่ม +450 นาย ณ เมือง ${city.name.th}`,
          },
        };

        triggerToast(
          {
            en: `+450 Garrison recruited in ${city.name.en}.`,
            th: `เกณฑ์ทหารรักษาการณ์ +450 นาย ที่ ${city.name.th}`,
          },
          'success'
        );

        return {
          ...prev,
          cities: updatedCities,
          factions: updatedFactions,
          battleLog: [evt, ...prev.battleLog].slice(0, 50),
          combatEffects: [
            ...prev.combatEffects,
            {
              id: `fx_rec_${Date.now()}`,
              position: { ...city.position },
              createdAt: Date.now(),
              type: 'recruit',
              color: playerFaction.color,
            },
          ],
        };
      });
    },
    [triggerToast]
  );

  const upgradeCityWalls = useCallback(
    (cityId: string) => {
      setGameState((prev) => {
        const city = prev.cities.find((c) => c.id === cityId);
        if (!city || city.ownerFactionId !== prev.playerFactionId) return prev;

        if (city.wallLevel >= city.maxWallLevel) {
          triggerToast(
            {
              en: `${city.name.en} walls are already at maximum fortification level (${city.maxWallLevel}).`,
              th: `กำแพงเมือง ${city.name.th} อยู่ในระดับสูงสุดแล้ว (ระดับ ${city.maxWallLevel})`,
            },
            'info'
          );
          return prev;
        }

        const goldCost = city.wallLevel * 220;
        const playerFaction = prev.factions[prev.playerFactionId];

        if (playerFaction.gold < goldCost) {
          triggerToast(
            {
              en: `Need ${goldCost} Gold to upgrade ${city.name.en} walls.`,
              th: `ต้องการทอง ${goldCost} เพื่อเสริมกำแพงเมือง ${city.name.th}`,
            },
            'warning'
          );
          return prev;
        }

        soundFX.playWarDrum();

        const updatedCities = prev.cities.map((c) =>
          c.id === cityId
            ? { ...c, wallLevel: c.wallLevel + 1, level: Math.min(5, c.level + 1) }
            : c
        );

        const nextFactions = {
          ...prev.factions,
          [prev.playerFactionId]: {
            ...playerFaction,
            gold: playerFaction.gold - goldCost,
          },
        };

        const evt: BattleEvent = {
          id: `evt_wall_${Date.now()}`,
          timestamp: prev.seasonYear.en,
          tick: prev.tickCount,
          type: 'economy',
          factionId: prev.playerFactionId,
          message: {
            en: `Fortified ${city.name.en} city walls to Level ${city.wallLevel + 1}.`,
            th: `เสริมปราการกำแพงเมือง ${city.name.th} สู่ระดับ ${city.wallLevel + 1}`,
          },
        };

        triggerToast(
          {
            en: `${city.name.en} walls upgraded to Lv.${city.wallLevel + 1}!`,
            th: `อัปเกรดกำแพงเมือง ${city.name.th} เป็นระดับ ${city.wallLevel + 1}!`,
          },
          'success'
        );

        return {
          ...prev,
          cities: updatedCities,
          factions: nextFactions,
          battleLog: [evt, ...prev.battleLog].slice(0, 50),
        };
      });
    },
    [triggerToast]
  );

  const reinforceArmyTroops = useCallback(
    (armyId: string, troopType: TroopType) => {
      setGameState((prev) => {
        const army = prev.armies.find((a) => a.id === armyId);
        if (!army || army.ownerFactionId !== prev.playerFactionId) return prev;

        const tInfo = TROOP_TYPES[troopType];
        const goldCost = tInfo.goldCostPer100 * 3;
        const supplyCost = tInfo.supplyCostPer100 * 3;
        const playerFaction = prev.factions[prev.playerFactionId];

        if (playerFaction.gold < goldCost || playerFaction.supplies < supplyCost) {
          triggerToast(
            {
              en: `Need ${goldCost} Gold & ${supplyCost} Supplies to recruit +300 ${tInfo.name.en}.`,
              th: `ต้องการทอง ${goldCost} และเสบียง ${supplyCost} เพื่อเกณฑ์ ${tInfo.name.th} +300 นาย`,
            },
            'warning'
          );
          return prev;
        }

        soundFX.playSelect();

        const updatedArmies: Army[] = prev.armies.map((a) => {
          if (a.id !== armyId) return a;
          const nextComp: TroopComposition = {
            ...a.composition,
            [troopType]: a.composition[troopType] + 300,
          };
          const nextMorale = Math.min(100, a.morale + 5);
          const stats = calculateArmyStats(
            nextComp,
            a.general,
            a.status,
            nextMorale
          );
          return {
            ...a,
            morale: nextMorale,
            composition: nextComp,
            troopCount: stats.troopCount,
            attackStat: stats.attackStat,
            defenseStat: stats.defenseStat,
          };
        });

        const nextFactions = {
          ...prev.factions,
          [prev.playerFactionId]: {
            ...playerFaction,
            gold: playerFaction.gold - goldCost,
            supplies: playerFaction.supplies - supplyCost,
          },
        };

        const updatedFactions = recalculateFactions(
          nextFactions,
          prev.cities,
          updatedArmies
        );

        const evt: BattleEvent = {
          id: `evt_reinf_${Date.now()}`,
          timestamp: prev.seasonYear.en,
          tick: prev.tickCount,
          type: 'economy',
          factionId: prev.playerFactionId,
          message: {
            en: `Reinforced ${army.name.en} with +300 ${tInfo.name.en}.`,
            th: `เสริมกำลัง ${tInfo.name.th} +300 นาย เข้าสู่ ${army.name.th}`,
          },
        };

        triggerToast(
          {
            en: `+300 ${tInfo.name.en} joined ${army.name.en}.`,
            th: `เสริม ${tInfo.name.th} +300 นาย เข้าสู่ ${army.name.th}`,
          },
          'success'
        );

        return {
          ...prev,
          armies: updatedArmies,
          factions: updatedFactions,
          battleLog: [evt, ...prev.battleLog].slice(0, 50),
        };
      });
    },
    [triggerToast]
  );

  const mobilizeNewArmy = useCallback(
    (cityId: string) => {
      setGameState((prev) => {
        const city = prev.cities.find((c) => c.id === cityId);
        if (!city || city.ownerFactionId !== prev.playerFactionId) return prev;

        const goldCost = 420;
        const supplyCost = 380;
        const playerFaction = prev.factions[prev.playerFactionId];

        if (playerFaction.gold < goldCost || playerFaction.supplies < supplyCost) {
          triggerToast(
            {
              en: `Need ${goldCost} Gold & ${supplyCost} Supplies to mobilize a new field army.`,
              th: `ต้องการทอง ${goldCost} และเสบียง ${supplyCost} เพื่อจัดตั้งกองทัพใหม่`,
            },
            'warning'
          );
          return prev;
        }

        const factionArmies = prev.armies.filter(
          (a) => a.ownerFactionId === prev.playerFactionId
        );
        if (factionArmies.length >= 5) {
          triggerToast(
            {
              en: 'Maximum of 5 active field armies reached for your kingdom.',
              th: 'จำนวนกองทัพสนามสูงสุดเต็ม 5 กองทัพแล้ว',
            },
            'warning'
          );
          return prev;
        }

        const generalPool = Object.values(GENERALS).filter(
          (g) => g.factionId === prev.playerFactionId
        );
        const chosenGeneral =
          generalPool[factionArmies.length % generalPool.length] ||
          Object.values(GENERALS)[0];

        const composition: TroopComposition = {
          spearmen: 700,
          cavalry: 700,
          archers: 600,
          infantry: 700,
        };
        const stats = calculateArmyStats(composition, chosenGeneral, 'idle', 100);

        const newArmy: Army = {
          id: `army_${prev.playerFactionId}_${Date.now()}`,
          name: {
            en: `${city.name.en} Expeditionary Host`,
            th: `ทัพหลวงเคลื่อนที่เร็ว ${city.name.th}`,
          },
          ownerFactionId: prev.playerFactionId,
          position: {
            x: city.position.x + (factionArmies.length % 2 === 0 ? 44 : -44),
            y: city.position.y + 32,
          },
          originCityId: city.id,
          currentCityId: city.id,
          targetCityId: null,
          routeQueue: [],
          movementProgress: 0,
          troopCount: stats.troopCount,
          composition,
          general: chosenGeneral,
          attackStat: stats.attackStat,
          defenseStat: stats.defenseStat,
          morale: 100,
          status: 'idle',
          lastOrderTick: prev.tickCount,
        };

        soundFX.playWarDrum();

        const updatedArmies = [...prev.armies, newArmy];
        const nextFactions = {
          ...prev.factions,
          [prev.playerFactionId]: {
            ...playerFaction,
            gold: playerFaction.gold - goldCost,
            supplies: playerFaction.supplies - supplyCost,
          },
        };
        const updatedFactions = recalculateFactions(
          nextFactions,
          prev.cities,
          updatedArmies
        );

        const evt: BattleEvent = {
          id: `evt_mob_${Date.now()}`,
          timestamp: prev.seasonYear.en,
          tick: prev.tickCount,
          type: 'movement',
          factionId: prev.playerFactionId,
          message: {
            en: `Mobilized ${newArmy.name.en} (2,700 troops) under ${chosenGeneral.name.en} at ${city.name.en}.`,
            th: `จัดตั้ง ${newArmy.name.th} (2,700 นาย) นำโดย ${chosenGeneral.name.th} ณ เมือง ${city.name.th}`,
          },
        };

        triggerToast(
          {
            en: `New army mobilized at ${city.name.en}!`,
            th: `จัดตั้งกองทัพใหม่ที่ ${city.name.th} สำเร็จ!`,
          },
          'success'
        );

        return {
          ...prev,
          armies: updatedArmies,
          factions: updatedFactions,
          selectedArmyId: newArmy.id,
          battleLog: [evt, ...prev.battleLog].slice(0, 50),
        };
      });
    },
    [triggerToast]
  );

  const togglePause = useCallback(() => {
    soundFX.playSelect();
    setGameState((prev) => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  const setSpeed = useCallback((speed: 1 | 2) => {
    soundFX.playSelect();
    setGameState((prev) => ({ ...prev, gameSpeed: speed }));
  }, []);

  const saveGame = useCallback(() => {
    soundFX.playSelect();
    const res = saveGameToStorage(gameState);
    setHasSavedGame(hasSavedGameInStorage());
    triggerToast(res.message, res.success ? 'success' : 'warning');
  }, [gameState, triggerToast]);

  const loadGame = useCallback(() => {
    soundFX.playSelect();
    const res = loadGameFromStorage();
    setHasSavedGame(hasSavedGameInStorage());
    if (res.success && res.state) {
      setGameState(res.state);
      triggerToast(res.message, 'success');
    } else {
      triggerToast(res.message, 'warning');
    }
  }, [triggerToast]);

  return {
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
  };
}
