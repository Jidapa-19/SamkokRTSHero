import { calculateArmyStats, GENERALS, TROOP_TYPES } from './mapData';
import {
  Army,
  BattleEvent,
  City,
  Faction,
  FactionId,
  LocalizedText,
  PlayableFactionId,
  TroopComposition,
  TroopType,
} from './types';

interface AIDecisionInput {
  tickCount: number;
  playerFactionId: PlayableFactionId;
  factions: Record<FactionId, Faction>;
  cities: City[];
  armies: Army[];
  pushEvent: (
    type: BattleEvent['type'],
    message: LocalizedText,
    factionId?: FactionId
  ) => void;
}

const AI_CANDIDATE_FACTIONS: PlayableFactionId[] = ['wei', 'shu', 'wu'];

export function runStrategicAITick({
  tickCount,
  playerFactionId,
  factions,
  cities,
  armies,
  pushEvent,
}: AIDecisionInput): void {
  // Run AI evaluation every 4 simulation ticks so AI actions are paced and deliberate
  if (tickCount % 4 !== 0) return;

  for (const factionId of AI_CANDIDATE_FACTIONS) {
    if (factionId === playerFactionId) continue;

    const aiFaction = factions[factionId];
    const ownedCities = cities.filter((c) => c.ownerFactionId === factionId);
    if (!aiFaction || ownedCities.length === 0) continue;

    const aiArmies = armies.filter((a) => a.ownerFactionId === factionId);

    // 1. THREAT EVALUATION & EMERGENCY DEFENSE
    const threatenedCities = ownedCities.filter((city) => {
      const incomingHostile = armies.some(
        (a) =>
          a.ownerFactionId !== factionId &&
          (a.targetCityId === city.id ||
            (a.currentCityId === city.id && a.status !== 'retreating'))
      );
      return Boolean(city.underSiege || incomingHostile);
    });

    if (threatenedCities.length > 0) {
      // Sort by capital priority, then lowest garrison
      threatenedCities.sort((a, b) => {
        if (a.isCapital && !b.isCapital) return -1;
        if (!a.isCapital && b.isCapital) return 1;
        return a.garrison - b.garrison;
      });

      const priorityCity = threatenedCities[0];

      // Recruit emergency garrison if treasury permits
      if (
        priorityCity.garrison < 3000 &&
        aiFaction.gold >= 180 &&
        aiFaction.supplies >= 160
      ) {
        aiFaction.gold -= 180;
        aiFaction.supplies -= 160;
        priorityCity.garrison += 450;
        pushEvent(
          'economy',
          {
            en: `${aiFaction.name.en} rushed +450 emergency garrison troops to defend ${priorityCity.name.en}!`,
            th: `${aiFaction.name.th} เร่งเกณฑ์ทหารรักษาการณ์ +450 นาย เพื่อป้องกันเมือง ${priorityCity.name.th}!`,
          },
          factionId
        );
      }

      // Check if an army already stationed at the threatened city should enter Defend stance
      const stationedIdleArmy = aiArmies.find(
        (a) =>
          a.currentCityId === priorityCity.id &&
          a.status === 'idle' &&
          tickCount - (a.lastOrderTick || 0) >= 4
      );
      if (stationedIdleArmy) {
        stationedIdleArmy.status = 'defending';
        stationedIdleArmy.lastOrderTick = tickCount;
        const stats = calculateArmyStats(
          stationedIdleArmy.composition,
          stationedIdleArmy.general,
          'defending',
          stationedIdleArmy.morale
        );
        stationedIdleArmy.attackStat = stats.attackStat;
        stationedIdleArmy.defenseStat = stats.defenseStat;

        pushEvent(
          'movement',
          {
            en: `${stationedIdleArmy.general.name.en} fortified defensive lines at ${priorityCity.name.en} (+25% DEF).`,
            th: `${stationedIdleArmy.general.name.th} ตั้งค่ายกลป้องกันหน้าเมือง ${priorityCity.name.th} (+25% ป้องกัน)`,
          },
          factionId
        );
        continue;
      }

      // Or dispatch an idle army from a connected friendly city to relieve the threatened city
      const reliefArmy = aiArmies.find((a) => {
        if (a.status !== 'idle' || !a.currentCityId) return false;
        if (a.currentCityId === priorityCity.id) return false;
        if (tickCount - (a.lastOrderTick || 0) < 6) return false;
        if (a.troopCount < 1600 || a.morale < 55) return false;
        const origin = cities.find((c) => c.id === a.currentCityId);
        return Boolean(origin && origin.connectedCityIds.includes(priorityCity.id));
      });

      if (reliefArmy) {
        reliefArmy.originCityId = reliefArmy.currentCityId;
        reliefArmy.targetCityId = priorityCity.id;
        reliefArmy.routeQueue = [];
        reliefArmy.movementProgress = 0.05;
        reliefArmy.status = 'marching';
        reliefArmy.intendedAction = 'move';
        reliefArmy.lastOrderTick = tickCount;

        pushEvent(
          'movement',
          {
            en: `${aiFaction.name.en} dispatched ${reliefArmy.general.name.en} to reinforce threatened ${priorityCity.name.en}!`,
            th: `${aiFaction.name.th} ส่งทัพของ ${reliefArmy.general.name.th} เร่งรุดไปช่วยป้องกันเมือง ${priorityCity.name.th}!`,
          },
          factionId
        );
        continue;
      }
    }

    // 2. ECONOMIC & MILITARY BUILDUP (Reinforce Armies, Mobilize, or Fortify)
    if (aiFaction.gold >= 480 && aiFaction.supplies >= 440) {
      // If AI has fewer than 2 armies, mobilize a new army at its strongest city
      if (aiArmies.length < 2 && aiFaction.gold >= 620 && aiFaction.supplies >= 560) {
        const spawnCity =
          ownedCities.find((c) => c.isCapital) || ownedCities[0];
        const generalPool = Object.values(GENERALS).filter(
          (g) => g.factionId === factionId
        );
        const chosenGeneral =
          generalPool[aiArmies.length % generalPool.length] ||
          Object.values(GENERALS)[0];

        const comp: TroopComposition = {
          spearmen: 750,
          cavalry: 750,
          archers: 650,
          infantry: 750,
        };
        const stats = calculateArmyStats(comp, chosenGeneral, 'idle', 100);

        aiFaction.gold -= 420;
        aiFaction.supplies -= 380;

        armies.push({
          id: `army_${factionId}_ai_${tickCount}`,
          name: {
            en: `${spawnCity.name.en} Imperial Host`,
            th: `ทัพหลวง ${spawnCity.name.th}`,
          },
          ownerFactionId: factionId,
          position: {
            x: spawnCity.position.x + 38,
            y: spawnCity.position.y - 28,
          },
          originCityId: spawnCity.id,
          currentCityId: spawnCity.id,
          targetCityId: null,
          routeQueue: [],
          movementProgress: 0,
          troopCount: stats.troopCount,
          composition: comp,
          general: { ...chosenGeneral },
          attackStat: stats.attackStat,
          defenseStat: stats.defenseStat,
          morale: 100,
          status: 'idle',
          lastOrderTick: tickCount,
        });

        pushEvent(
          'economy',
          {
            en: `${aiFaction.name.en} mobilized a new field army under ${chosenGeneral.name.en} at ${spawnCity.name.en}.`,
            th: `${aiFaction.name.th} จัดตั้งกองทัพสนามใหม่นำโดย ${chosenGeneral.name.th} ณ เมือง ${spawnCity.name.th}`,
          },
          factionId
        );
        continue;
      }

      // Reinforce an under-strength idle army
      const underStrengthArmy = aiArmies.find(
        (a) =>
          (a.status === 'idle' || a.status === 'defending') &&
          a.troopCount < 3600
      );

      if (underStrengthArmy) {
        const troopRotation: TroopType[] = [
          'cavalry',
          'infantry',
          'archers',
          'spearmen',
        ];
        const chosenType = troopRotation[tickCount % troopRotation.length];
        const tInfo = TROOP_TYPES[chosenType];
        const gCost = tInfo.goldCostPer100 * 3;
        const sCost = tInfo.supplyCostPer100 * 3;

        if (aiFaction.gold >= gCost && aiFaction.supplies >= sCost) {
          aiFaction.gold -= gCost;
          aiFaction.supplies -= sCost;
          underStrengthArmy.composition[chosenType] += 300;
          const stats = calculateArmyStats(
            underStrengthArmy.composition,
            underStrengthArmy.general,
            underStrengthArmy.status,
            underStrengthArmy.morale
          );
          underStrengthArmy.troopCount = stats.troopCount;
          underStrengthArmy.attackStat = stats.attackStat;
          underStrengthArmy.defenseStat = stats.defenseStat;
        }
      }
    }

    // 3. STRATEGIC OFFENSIVE EVALUATION
    // Only consider launching an offensive every 8 ticks so campaigns remain balanced
    if (tickCount % 8 !== 0) continue;

    // Do not launch a new attack if this AI faction already has an army marching/attacking
    const alreadyAttacking = aiArmies.some(
      (a) => a.status === 'attacking' || a.status === 'marching' || a.status === 'capturing'
    );
    if (alreadyAttacking) continue;

    const readyArmies = aiArmies.filter(
      (a) =>
        (a.status === 'idle' || a.status === 'defending') &&
        a.currentCityId &&
        a.troopCount >= 2600 &&
        a.morale >= 75 &&
        tickCount - (a.lastOrderTick || 0) >= 10
    );

    for (const candidateArmy of readyArmies) {
      const originCity = cities.find((c) => c.id === candidateArmy.currentCityId);
      if (!originCity) continue;

      // Do not abandon originCity if its garrison is weak and hostile armies are in adjacent cities
      const adjacentHostileCities = originCity.connectedCityIds
        .map((cid) => cities.find((c) => c.id === cid))
        .filter((c): c is City => Boolean(c && c.ownerFactionId !== factionId));

      if (adjacentHostileCities.length === 0) continue;

      // Score potential targets: prefer neutral cities or lightly garrisoned hostile cities
      let bestTarget: City | null = null;
      let bestRatio = 0;

      for (const targetCity of adjacentHostileCities) {
        const defendingArmies = armies.filter(
          (a) =>
            a.currentCityId === targetCity.id &&
            a.ownerFactionId === targetCity.ownerFactionId &&
            a.status !== 'retreating'
        );
        const defArmyTroops = defendingArmies.reduce(
          (sum, a) => sum + a.troopCount,
          0
        );
        const estimatedDefense =
          (targetCity.garrison + defArmyTroops) *
          (1 + targetCity.wallLevel * 0.12);

        const neutralBonus = targetCity.ownerFactionId === 'neutral' ? 1.25 : 1.0;
        const ratio =
          ((candidateArmy.troopCount * (1 + candidateArmy.general.attackBonus / 100)) /
            Math.max(500, estimatedDefense)) *
          neutralBonus;

        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestTarget = targetCity;
        }
      }

      if (bestTarget && bestRatio >= 0.92) {
        candidateArmy.originCityId = originCity.id;
        candidateArmy.targetCityId = bestTarget.id;
        candidateArmy.routeQueue = [];
        candidateArmy.movementProgress = 0.05;
        candidateArmy.status = 'attacking';
        candidateArmy.intendedAction = 'attack';
        candidateArmy.lastOrderTick = tickCount;

        const stats = calculateArmyStats(
          candidateArmy.composition,
          candidateArmy.general,
          'attacking',
          candidateArmy.morale
        );
        candidateArmy.attackStat = stats.attackStat;
        candidateArmy.defenseStat = stats.defenseStat;

        pushEvent(
          'combat',
          {
            en: `WAR ALERT: ${aiFaction.name.en} ordered ${candidateArmy.general.name.en} (${candidateArmy.troopCount.toLocaleString()} troops) to march from ${originCity.name.en} and assault ${bestTarget.name.en}!`,
            th: `แจ้งเตือนศึก: ${aiFaction.name.th} สั่งการให้ ${candidateArmy.general.name.th} (${candidateArmy.troopCount.toLocaleString()} นาย) ยกทัพจาก ${originCity.name.th} บุกโจมตีเมือง ${bestTarget.name.th}!`,
          },
          factionId
        );
        break;
      }
    }
  }
}
