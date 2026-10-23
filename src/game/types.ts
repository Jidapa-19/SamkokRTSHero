export type Language = 'en' | 'th';

export interface LocalizedText {
  en: string;
  th: string;
}

export type FactionId = 'wei' | 'shu' | 'wu' | 'neutral';

export type PlayableFactionId = 'wei' | 'shu' | 'wu';

export type TroopType = 'spearmen' | 'cavalry' | 'archers' | 'infantry';

export type TroopComposition = Record<TroopType, number>;

export type TerrainType = 'plains' | 'mountains' | 'riverlands' | 'highlands';

export interface TroopTypeInfo {
  id: TroopType;
  name: LocalizedText;
  description: LocalizedText;
  counterDescription: LocalizedText;
  baseAttack: number;
  baseDefense: number;
  speed: number;
  goldCostPer100: number;
  supplyCostPer100: number;
  strongAgainst?: TroopType;
  weakAgainst?: TroopType;
}

export interface General {
  id: string;
  name: LocalizedText;
  courtesyName: LocalizedText;
  factionId: FactionId;
  attackBonus: number; // Percentage bonus e.g. 20 = +20%
  defenseBonus: number; // Percentage bonus e.g. 15 = +15%
  speedBonus: number; // Movement speed multiplier bonus
  specialty: LocalizedText;
}

export interface Position {
  x: number;
  y: number;
}

export interface City {
  id: string;
  name: LocalizedText;
  regionName: LocalizedText;
  description: LocalizedText;
  terrain: TerrainType;
  position: Position;
  ownerFactionId: FactionId;
  level: number;
  population: number;
  garrison: number;
  wallLevel: number;
  maxWallLevel: number;
  goldYield: number;
  supplyYield: number;
  connectedCityIds: string[];
  isCapital?: boolean;
  underSiege?: boolean;
  siegeProgress?: number; // 0 to 100
}

export type ArmyStatus =
  | 'idle'
  | 'marching'
  | 'attacking'
  | 'defending'
  | 'capturing'
  | 'retreating';

export interface Army {
  id: string;
  name: LocalizedText;
  ownerFactionId: FactionId;
  position: Position;
  originCityId: string | null;
  currentCityId: string | null;
  targetCityId: string | null;
  routeQueue?: string[];
  movementProgress: number; // 0 to 1 when marching between cities
  troopCount: number;
  composition: TroopComposition;
  general: General;
  attackStat: number;
  defenseStat: number;
  morale: number; // 0 to 100
  status: ArmyStatus;
  intendedAction?: 'move' | 'attack';
  lastOrderTick?: number;
}

export interface ActiveBattle {
  id: string;
  cityId: string;
  attackerArmyId: string;
  attackerFactionId: FactionId;
  defenderFactionId: FactionId;
  defenderArmyId: string | null;
  round: number;
  attackerInitialTroops: number;
  defenderInitialTroops: number;
  lastAttackerCasualties: number;
  lastDefenderCasualties: number;
  siegeProgress: number; // 0 to 100
  terrain: TerrainType;
}

export interface Faction {
  id: FactionId;
  name: LocalizedText;
  dynastySeal: string;
  rulerName: LocalizedText;
  motto: LocalizedText;
  description: LocalizedText;
  color: string;
  secondaryColor: string;
  bannerBg: string;
  gold: number;
  supplies: number;
  ownedCities: string[];
  totalMilitaryStrength: number;
}

export type BattleEventType = 'movement' | 'combat' | 'capture' | 'economy' | 'system';

export interface BattleEvent {
  id: string;
  timestamp: string;
  tick: number;
  type: BattleEventType;
  factionId?: FactionId;
  message: LocalizedText;
}

export type CommandMode = 'none' | 'move' | 'attack';

export interface CombatEffect {
  id: string;
  position: Position;
  createdAt: number;
  type: 'clash' | 'capture' | 'recruit';
  color: string;
}

export interface GameState {
  version: string;
  screen: 'faction_select' | 'playing' | 'victory';
  playerFactionId: PlayableFactionId;
  isPaused: boolean;
  gameSpeed: 1 | 2;
  tickCount: number;
  seasonYear: LocalizedText;
  factions: Record<FactionId, Faction>;
  cities: City[];
  armies: Army[];
  activeBattles: ActiveBattle[];
  selectedCityId: string | null;
  selectedArmyId: string | null;
  commandMode: CommandMode;
  battleLog: BattleEvent[];
  combatEffects: CombatEffect[];
}

export interface RiverPath {
  id: string;
  name: LocalizedText;
  width: number;
  points: Position[];
}

export interface MountainRange {
  id: string;
  name: LocalizedText;
  peaks: { x: number; y: number; scale: number; height: number }[];
}

export interface StrategicPass {
  id: string;
  name: LocalizedText;
  position: Position;
  rotation: number;
}
