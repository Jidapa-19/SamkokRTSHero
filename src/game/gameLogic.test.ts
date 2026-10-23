import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateArmyStats,
  computeUnitAndTerrainMultiplier,
  findShortestCityRoute,
  GENERALS,
  INITIAL_CITIES,
} from './mapData';
import {
  createInitialGameState,
  getSeasonYearText,
  recalculateFactions,
} from './initialState';
import { runStrategicAITick } from './aiEngine';
import { validateSavedGameState } from '../utils/storage';

test('calculateArmyStats computes troopCount, attackStat, and defenseStat with stance and morale modifiers', () => {
  const comp = { spearmen: 1000, cavalry: 1000, archers: 500, infantry: 500 };
  const general = GENERALS.zhang_liao;

  const idleStats = calculateArmyStats(comp, general, 'idle', 100);
  assert.equal(idleStats.troopCount, 3000);
  assert.ok(idleStats.attackStat > 0);
  assert.ok(idleStats.defenseStat > 0);

  const defendStats = calculateArmyStats(comp, general, 'defending', 100);
  assert.ok(
    defendStats.defenseStat > idleStats.defenseStat,
    'Defending stance should grant +25% defense bonus'
  );

  const lowMoraleStats = calculateArmyStats(comp, general, 'idle', 30);
  assert.ok(
    lowMoraleStats.attackStat < idleStats.attackStat,
    'Low morale should reduce effective attack'
  );
});

test('computeUnitAndTerrainMultiplier applies rock-paper-scissors counters and terrain bonuses', () => {
  const heavyCavalry = { spearmen: 0, cavalry: 2000, archers: 0, infantry: 0 };
  const heavyArchers = { spearmen: 0, cavalry: 0, archers: 2000, infantry: 0 };
  const heavySpears = { spearmen: 2000, cavalry: 0, archers: 0, infantry: 0 };

  const cavVsArch = computeUnitAndTerrainMultiplier(
    heavyCavalry,
    heavyArchers,
    'plains'
  );
  const cavVsSpear = computeUnitAndTerrainMultiplier(
    heavyCavalry,
    heavySpears,
    'mountains'
  );

  assert.ok(
    cavVsArch.attackerMult > cavVsSpear.attackerMult,
    'Cavalry on plains vs archers should have higher multiplier than cavalry in mountains vs spearmen'
  );
  assert.ok(
    cavVsSpear.defenderMult > cavVsArch.defenderMult,
    'Spearmen in mountains should have stronger defense multiplier against cavalry'
  );
});

test('findShortestCityRoute finds valid connected road paths and rejects invalid cities', () => {
  const directRoute = findShortestCityRoute(INITIAL_CITIES, 'xuchang', 'luoyang');
  assert.deepEqual(directRoute, ['luoyang']);

  const multiHopRoute = findShortestCityRoute(INITIAL_CITIES, 'ye', 'chengdu');
  assert.ok(Array.isArray(multiHopRoute) && multiHopRoute.length >= 2);
  assert.equal(multiHopRoute[multiHopRoute.length - 1], 'chengdu');

  const invalidRoute = findShortestCityRoute(INITIAL_CITIES, 'ye', 'unknown_city');
  assert.equal(invalidRoute, null);
});

test('createInitialGameState initializes bilingual EN/TH state and accurate faction totals', () => {
  const state = createInitialGameState('shu', true);
  assert.equal(state.screen, 'playing');
  assert.equal(state.playerFactionId, 'shu');
  assert.equal(state.cities.length, 8);
  assert.equal(state.factions.shu.ownedCities.length, 3);
  assert.ok(state.factions.shu.totalMilitaryStrength > 0);
  assert.ok(state.seasonYear.en.includes('208 AD'));
  assert.ok(state.seasonYear.th.includes('208'));
});

test('runStrategicAITick executes AI decisions without mutating player faction illegally', () => {
  const state = createInitialGameState('wei', true);
  const events: string[] = [];
  runStrategicAITick({
    tickCount: 8,
    playerFactionId: 'wei',
    factions: state.factions,
    cities: state.cities,
    armies: state.armies,
    pushEvent: (_type, msg) => {
      events.push(msg.en);
    },
  });

  const rec = recalculateFactions(state.factions, state.cities, state.armies);
  assert.equal(rec.wei.ownedCities.length, 3);
  assert.equal(getSeasonYearText(40).en, 'Spring, 209 AD');
});

test('validateSavedGameState accepts valid game states and rejects corrupted schemas', () => {
  const validState = createInitialGameState('wu', true);
  assert.equal(validateSavedGameState(validState), true);
  assert.equal(validateSavedGameState(null), false);
  assert.equal(validateSavedGameState({ playerFactionId: 'invalid' }), false);
  assert.equal(
    validateSavedGameState({ ...validState, cities: [] }),
    false
  );
});
