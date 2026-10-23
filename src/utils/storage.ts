import { recalculateFactions } from '../game/initialState';
import { calculateArmyStats, INITIAL_CITIES } from '../game/mapData';
import {
  ActiveBattle,
  Army,
  City,
  FactionId,
  GameState,
  PlayableFactionId,
} from '../game/types';

const STORAGE_KEY = 'three_kingdoms_war_of_warlords_save_v01';

export interface SaveResult {
  success: boolean;
  message: { en: string; th: string };
}

export interface LoadResult {
  success: boolean;
  state?: GameState;
  message: { en: string; th: string };
}

function isValidPlayableFaction(id: unknown): id is PlayableFactionId {
  return id === 'wei' || id === 'shu' || id === 'wu';
}

function isValidFactionId(id: unknown): id is FactionId {
  return id === 'wei' || id === 'shu' || id === 'wu' || id === 'neutral';
}

export function validateSavedGameState(raw: unknown): raw is GameState {
  if (!raw || typeof raw !== 'object') return false;
  const candidate = raw as Record<string, unknown>;

  if (!isValidPlayableFaction(candidate.playerFactionId)) return false;
  if (typeof candidate.tickCount !== 'number' || Number.isNaN(candidate.tickCount)) return false;

  if (!Array.isArray(candidate.cities) || candidate.cities.length < 8) return false;
  for (const city of candidate.cities) {
    if (!city || typeof city !== 'object') return false;
    const c = city as Record<string, unknown>;
    if (typeof c.id !== 'string' || !isValidFactionId(c.ownerFactionId)) return false;
    if (typeof c.garrison !== 'number' || typeof c.wallLevel !== 'number') return false;
    if (!c.position || typeof (c.position as { x?: unknown }).x !== 'number') return false;
  }

  if (!Array.isArray(candidate.armies)) return false;
  for (const army of candidate.armies) {
    if (!army || typeof army !== 'object') return false;
    const a = army as Record<string, unknown>;
    if (typeof a.id !== 'string' || !isValidFactionId(a.ownerFactionId)) return false;
    if (typeof a.troopCount !== 'number' || !a.composition) return false;
  }

  if (!candidate.factions || typeof candidate.factions !== 'object') return false;
  const factions = candidate.factions as Record<string, unknown>;
  if (!factions.wei || !factions.shu || !factions.wu) return false;

  return true;
}

export function saveGameToStorage(state: GameState): SaveResult {
  try {
    const serialized = JSON.stringify({
      ...state,
      version: '0.2.0',
      savedAt: new Date().toISOString(),
    });
    window.localStorage.setItem(STORAGE_KEY, serialized);
    return {
      success: true,
      message: {
        en: 'Campaign progress saved to local storage.',
        th: 'บันทึกข้อมูลสงครามลงในเครื่องเรียบร้อยแล้ว',
      },
    };
  } catch {
    return {
      success: false,
      message: {
        en: 'Unable to save game: LocalStorage is full or restricted.',
        th: 'ไม่สามารถบันทึกเกมได้: พื้นที่จัดเก็บข้อมูลเต็มหรือถูกจำกัด',
      },
    };
  }
}

export function loadGameFromStorage(): LoadResult {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        success: false,
        message: {
          en: 'No saved campaign found in local storage.',
          th: 'ไม่พบข้อมูลเกมที่บันทึกไว้ในเครื่อง',
        },
      };
    }

    const parsed: unknown = JSON.parse(raw);
    if (!validateSavedGameState(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return {
        success: false,
        message: {
          en: 'Saved data was corrupted or incompatible and has been cleared safely.',
          th: 'ไฟล์บันทึกเกมเสียหายหรือไม่สมบูรณ์ ระบบได้ล้างข้อมูลที่ผิดพลาดอย่างปลอดภัยแล้ว',
        },
      };
    }

    // Migrate and normalize V0.1 or V0.2 cities
    const normalizedCities: City[] = parsed.cities.map((c) => {
      const template = INITIAL_CITIES.find((ic) => ic.id === c.id);
      return {
        ...c,
        terrain: c.terrain || template?.terrain || 'plains',
        underSiege: Boolean(c.underSiege),
        siegeProgress: typeof c.siegeProgress === 'number' ? c.siegeProgress : 0,
      };
    });

    // Migrate and normalize V0.1 or V0.2 armies
    const normalizedArmies: Army[] = parsed.armies.map((a) => {
      const morale =
        typeof a.morale === 'number' && !Number.isNaN(a.morale)
          ? Math.max(10, Math.min(100, a.morale))
          : 100;
      const stats = calculateArmyStats(a.composition, a.general, a.status, morale);
      return {
        ...a,
        morale,
        routeQueue: Array.isArray(a.routeQueue) ? a.routeQueue : [],
        lastOrderTick: typeof a.lastOrderTick === 'number' ? a.lastOrderTick : 0,
        troopCount: stats.troopCount,
        attackStat: stats.attackStat,
        defenseStat: stats.defenseStat,
      };
    });

    const activeBattles: ActiveBattle[] = Array.isArray(parsed.activeBattles)
      ? parsed.activeBattles
      : [];

    const sanitizedFactions = recalculateFactions(
      parsed.factions,
      normalizedCities,
      normalizedArmies
    );

    const restoredState: GameState = {
      ...parsed,
      version: '0.2.0',
      screen: 'playing',
      isPaused: true,
      gameSpeed: parsed.gameSpeed === 2 ? 2 : 1,
      commandMode: 'none',
      cities: normalizedCities,
      armies: normalizedArmies,
      activeBattles,
      factions: sanitizedFactions,
      combatEffects: [],
    };

    return {
      success: true,
      state: restoredState,
      message: {
        en: 'Saved campaign loaded successfully (Game Paused).',
        th: 'โหลดข้อมูลสงครามสำเร็จแล้ว (หยุดเวลาชั่วคราว)',
      },
    };
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore cleanup error
    }
    return {
      success: false,
      message: {
        en: 'Corrupted save JSON detected. Reset to safe state.',
        th: 'ตรวจพบข้อมูลบันทึกเกมที่เสียหาย ระบบกู้คืนสู่สถานะปลอดภัยแล้ว',
      },
    };
  }
}

export function hasSavedGameInStorage(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    return validateSavedGameState(parsed);
  } catch {
    return false;
  }
}
