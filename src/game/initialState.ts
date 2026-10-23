import { calculateArmyStats, GENERALS, INITIAL_CITIES } from './mapData';
import {
  Army,
  City,
  Faction,
  FactionId,
  GameState,
  PlayableFactionId,
  TroopComposition,
} from './types';

export const FACTIONS_BASE: Record<FactionId, Faction> = {
  wei: {
    id: 'wei',
    name: { en: 'Kingdom of Wei', th: 'วุยก๊ก (Wei)' },
    dynastySeal: 'W',
    rulerName: { en: 'Cao Cao (Mengde)', th: 'โจโฉ (เมิ่งเต๋อ)' },
    motto: {
      en: 'Command the Mandate · Rule the Central Plains',
      th: 'กุมราชโองการ ครองที่ราบภาคกลาง',
    },
    description: {
      en: 'Dominant across the northern heartland around Xuchang, Luoyang, and Ye. Renowned for heavy shock cavalry and vast imperial tax revenues.',
      th: 'มหาอำนาจแห่งภาคเหนือ ครอบครองฮูโต๋ ลกเอี๋ยง และเย่ โดดเด่นด้วยกองทัพม้าศึกเกราะหนักและคลังหลวงอันมั่งคั่ง',
    },
    color: '#3B82F6',
    secondaryColor: '#93C5FD',
    bannerBg: '#1D4ED8',
    gold: 1650,
    supplies: 1850,
    ownedCities: ['ye', 'luoyang', 'xuchang'],
    totalMilitaryStrength: 0,
  },
  shu: {
    id: 'shu',
    name: { en: 'Kingdom of Shu Han', th: 'จ๊กก๊ก (Shu Han)' },
    dynastySeal: 'S',
    rulerName: { en: 'Liu Bei (Xuande)', th: 'เล่าปี่ (เสวียนเต๋อ)' },
    motto: {
      en: 'Restore the Han · Benevolence & Valor',
      th: 'ฟื้นฟูราชวงศ์ฮั่น คุณธรรมนำแผ่นดิน',
    },
    description: {
      en: 'Fortified within the natural mountain bastions of Chengdu, Hanzhong, and Jingzhou. Led by legendary generals and repeating crossbow formations.',
      th: 'ปราการขุนเขาแห่งเสฉวน ครอบครองเฉิงตู ฮันต๋ง และเกงจิ๋ว เปี่ยมด้วยขุนพลพยัคฆ์และหน้าไม้กลขงเบ้ง',
    },
    color: '#10B981',
    secondaryColor: '#6EE7B7',
    bannerBg: '#047857',
    gold: 1450,
    supplies: 1750,
    ownedCities: ['hanzhong', 'chengdu', 'jingzhou'],
    totalMilitaryStrength: 0,
  },
  wu: {
    id: 'wu',
    name: { en: 'Kingdom of Eastern Wu', th: 'ง่อก๊ก (Eastern Wu)' },
    dynastySeal: 'U',
    rulerName: { en: 'Sun Quan (Zhongmou)', th: 'ซุนกวน (จ้งโหมว)' },
    motto: {
      en: 'Sovereign of the Yangtze · Masters of Fire & Water',
      th: 'เจ้าแห่งลำน้ำแยงซี ปราการเพลิงผาแดง',
    },
    description: {
      en: 'Anchored at the wealthy eastern metropolis of Jianye. Excels in elite archers, disciplined marines, and surging commercial gold.',
      th: 'มั่นคง ณ นครเจี้ยนเย่ริมฝั่งแยงซี เชี่ยวชาญการรบด้วยพลธนูเพลิง กองกำลังทางน้ำ และการค้าอันรุ่งเรือง',
    },
    color: '#EF4444',
    secondaryColor: '#FCA5A5',
    bannerBg: '#B91C1C',
    gold: 1800,
    supplies: 1600,
    ownedCities: ['jianye'],
    totalMilitaryStrength: 0,
  },
  neutral: {
    id: 'neutral',
    name: { en: 'Independent Governors', th: 'ขุนศึกอิสระ' },
    dynastySeal: 'H',
    rulerName: { en: 'Local Garrison Commanders', th: 'เจ้าเมืองอิสระ' },
    motto: {
      en: 'Guard the Borders',
      th: 'รักษาเขตแดน',
    },
    description: {
      en: 'Unaligned regional strongholds awaiting conquest or unification.',
      th: 'หัวเมืองยุทธศาสตร์อิสระที่รอคอยผู้พิชิตเข้ายึดครอง',
    },
    color: '#A8A29E',
    secondaryColor: '#E7E5E4',
    bannerBg: '#57534E',
    gold: 900,
    supplies: 900,
    ownedCities: ['xiangyang'],
    totalMilitaryStrength: 0,
  },
};

function createArmyHelper(
  id: string,
  name: { en: string; th: string },
  ownerFactionId: FactionId,
  cityId: string,
  position: { x: number; y: number },
  generalKey: string,
  composition: TroopComposition
): Army {
  const general = GENERALS[generalKey];
  const stats = calculateArmyStats(composition, general, 'idle', 100);
  return {
    id,
    name,
    ownerFactionId,
    position: { ...position },
    originCityId: cityId,
    currentCityId: cityId,
    targetCityId: null,
    routeQueue: [],
    movementProgress: 0,
    troopCount: stats.troopCount,
    composition: { ...composition },
    general: { ...general },
    attackStat: stats.attackStat,
    defenseStat: stats.defenseStat,
    morale: 100,
    status: 'idle',
    lastOrderTick: 0,
  };
}

export function createInitialArmies(cities: City[]): Army[] {
  const getCityPos = (id: string, offsetX = 0, offsetY = 0) => {
    const city = cities.find((c) => c.id === id);
    if (!city) return { x: 500, y: 500 };
    return { x: city.position.x + offsetX, y: city.position.y + offsetY };
  };

  return [
    createArmyHelper(
      'army_wei_1',
      { en: 'Northern Tiger Vanguard', th: 'ทัพพยัคฆ์อุดร' },
      'wei',
      'xuchang',
      getCityPos('xuchang', -42, 26),
      'zhang_liao',
      { spearmen: 900, cavalry: 1400, archers: 600, infantry: 900 }
    ),
    createArmyHelper(
      'army_wei_2',
      { en: 'Central Plains Guard', th: 'ทัพพิทักษ์จงหยวน' },
      'wei',
      'luoyang',
      getCityPos('luoyang', -38, -28),
      'cao_ren',
      { spearmen: 1100, cavalry: 700, archers: 700, infantry: 1200 }
    ),
    createArmyHelper(
      'army_shu_1',
      { en: 'Green Dragon Host', th: 'ทัพมังกรเขียวเกงจิ๋ว' },
      'shu',
      'jingzhou',
      getCityPos('jingzhou', -42, -26),
      'guan_yu',
      { spearmen: 1200, cavalry: 900, archers: 800, infantry: 1100 }
    ),
    createArmyHelper(
      'army_shu_2',
      { en: 'Feather Fan Northern Corps', th: 'ทัพพยัคฆ์ฮันต๋ง' },
      'shu',
      'hanzhong',
      getCityPos('hanzhong', 42, -22),
      'zhao_yun',
      { spearmen: 1000, cavalry: 1100, archers: 900, infantry: 800 }
    ),
    createArmyHelper(
      'army_wu_1',
      { en: 'Jiangdong Scarlet Armada', th: 'ทัพเพลิงกังตั๋ง' },
      'wu',
      'jianye',
      getCityPos('jianye', -46, -24),
      'zhou_yu',
      { spearmen: 1000, cavalry: 700, archers: 1500, infantry: 1100 }
    ),
    createArmyHelper(
      'army_wu_2',
      { en: 'Silken Sail Raiders', th: 'ทัพอัศวินผ้าแพร' },
      'wu',
      'jianye',
      getCityPos('jianye', 44, 28),
      'gan_ning',
      { spearmen: 800, cavalry: 1100, archers: 900, infantry: 900 }
    ),
  ];
}

export function recalculateFactions(
  factions: Record<FactionId, Faction>,
  cities: City[],
  armies: Army[]
): Record<FactionId, Faction> {
  const updated: Record<FactionId, Faction> = {
    wei: { ...factions.wei, ownedCities: [], totalMilitaryStrength: 0 },
    shu: { ...factions.shu, ownedCities: [], totalMilitaryStrength: 0 },
    wu: { ...factions.wu, ownedCities: [], totalMilitaryStrength: 0 },
    neutral: { ...factions.neutral, ownedCities: [], totalMilitaryStrength: 0 },
  };

  for (const city of cities) {
    const f = updated[city.ownerFactionId];
    if (f) {
      f.ownedCities.push(city.id);
      f.totalMilitaryStrength += city.garrison;
    }
  }

  for (const army of armies) {
    const f = updated[army.ownerFactionId];
    if (f) {
      f.totalMilitaryStrength += army.troopCount;
    }
  }

  return updated;
}

export function getSeasonYearText(tickCount: number): { en: string; th: string } {
  const baseYear = 208;
  const seasonIndex = Math.floor(tickCount / 10) % 4;
  const year = baseYear + Math.floor(tickCount / 40);
  const seasonsEn = ['Spring', 'Summer', 'Autumn', 'Winter'];
  const seasonsTh = ['ฤดูใบไม้ผลิ', 'ฤดูร้อน', 'ฤดูใบไม้ร่วง', 'ฤดูหนาว'];

  return {
    en: `${seasonsEn[seasonIndex]}, ${year} AD`,
    th: `${seasonsTh[seasonIndex]} ค.ศ. ${year}`,
  };
}

export function createInitialGameState(
  playerFactionId: PlayableFactionId = 'wei',
  startPlaying = false
): GameState {
  const cities: City[] = INITIAL_CITIES.map((c) => ({
    ...c,
    position: { ...c.position },
    connectedCityIds: [...c.connectedCityIds],
    underSiege: false,
    siegeProgress: 0,
  }));

  const armies = createInitialArmies(cities);

  const rawFactions: Record<FactionId, Faction> = {
    wei: { ...FACTIONS_BASE.wei },
    shu: { ...FACTIONS_BASE.shu },
    wu: { ...FACTIONS_BASE.wu },
    neutral: { ...FACTIONS_BASE.neutral },
  };

  const factions = recalculateFactions(rawFactions, cities, armies);

  const defaultCityByFaction: Record<PlayableFactionId, string> = {
    wei: 'xuchang',
    shu: 'chengdu',
    wu: 'jianye',
  };

  const defaultArmy = armies.find((a) => a.ownerFactionId === playerFactionId) || armies[0];

  return {
    version: '0.2.0',
    screen: startPlaying ? 'playing' : 'faction_select',
    playerFactionId,
    isPaused: false,
    gameSpeed: 1,
    tickCount: 0,
    seasonYear: getSeasonYearText(0),
    factions,
    cities,
    armies,
    activeBattles: [],
    selectedCityId: defaultCityByFaction[playerFactionId],
    selectedArmyId: defaultArmy ? defaultArmy.id : null,
    commandMode: 'none',
    battleLog: [
      {
        id: 'evt_init_1',
        timestamp: '208 AD',
        tick: 0,
        type: 'system',
        factionId: playerFactionId,
        message: {
          en: `War drums echo across the Central Plains. ${factions[playerFactionId].name.en} prepares to march.`,
          th: `เสียงกลองศึกกึกก้องทั่วแผ่นดิน ${factions[playerFactionId].name.th} เตรียมเคลื่อนทัพชิงความเป็นใหญ่`,
        },
      },
      {
        id: 'evt_init_2',
        timestamp: '208 AD',
        tick: 0,
        type: 'movement',
        message: {
          en: 'V0.2 Campaign Active: Enemy warlords now evaluate threats, reinforce cities, and launch real-time offensives along connected roads.',
          th: 'อัปเดต V0.2: กองทัพศัตรูสามารถประเมินภัยคุกคาม เสริมปราการ และเคลื่อนทัพบุกโจมตีตามเส้นทางยุทธศาสตร์แบบเรียลไทม์',
        },
      },
    ],
    combatEffects: [],
  };
}
