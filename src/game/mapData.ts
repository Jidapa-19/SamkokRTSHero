import {
  ArmyStatus,
  City,
  General,
  LocalizedText,
  MountainRange,
  RiverPath,
  StrategicPass,
  TerrainType,
  TroopComposition,
  TroopType,
  TroopTypeInfo,
} from './types';

export const MAP_WIDTH = 1600;
export const MAP_HEIGHT = 1050;

export const TERRAIN_INFO: Record<
  TerrainType,
  {
    name: LocalizedText;
    effectSummary: LocalizedText;
    defenseMultiplier: number;
    marchSpeedMultiplier: number;
  }
> = {
  plains: {
    name: { en: 'Open Plains', th: 'ที่ราบกว้าง' },
    effectSummary: {
      en: 'Cavalry +20% Attack · +15% March Speed',
      th: 'พลม้าโจมตี +20% · เดินทัพไวขึ้น +15%',
    },
    defenseMultiplier: 1.0,
    marchSpeedMultiplier: 1.15,
  },
  mountains: {
    name: { en: 'Mountain Bastion', th: 'เทือกเขาสูงชัน' },
    effectSummary: {
      en: 'Defenders +25% DEF · Infantry/Spears +15% · Cavalry -15%',
      th: 'ฝ่ายตั้งรับ +25% ป้องกัน · ทหารราบ/หอก +15% · พลม้า -15%',
    },
    defenseMultiplier: 1.25,
    marchSpeedMultiplier: 0.82,
  },
  riverlands: {
    name: { en: 'River Basin & Waterways', th: 'ลุ่มแม่น้ำและท่าเรือ' },
    effectSummary: {
      en: 'Archers +25% Attack · Defenders +15% DEF',
      th: 'พลธนูโจมตี +25% · ฝ่ายตั้งรับป้องกัน +15%',
    },
    defenseMultiplier: 1.15,
    marchSpeedMultiplier: 0.95,
  },
  highlands: {
    name: { en: 'Fortified Highlands', th: 'ที่ราบสูงยุทธศาสตร์' },
    effectSummary: {
      en: 'Defenders +15% DEF · Balanced Terrain',
      th: 'ฝ่ายตั้งรับป้องกัน +15% · สมรภูมิสมดุล',
    },
    defenseMultiplier: 1.15,
    marchSpeedMultiplier: 1.0,
  },
};

export const TROOP_TYPES: Record<TroopType, TroopTypeInfo> = {
  spearmen: {
    id: 'spearmen',
    name: { en: 'Spearmen', th: 'พลหอก' },
    description: {
      en: 'Disciplined polearm formations effective at halting cavalry charges.',
      th: 'กองกำลังพลหอกแถวชิด เชี่ยวชาญการสกัดกั้นและทำลายขบวนทัพม้า',
    },
    counterDescription: {
      en: 'Strong vs Cavalry (+40%) · Weak vs Archers',
      th: 'ชนะทาง พลม้า (+40%) · แพ้ทาง พลธนู',
    },
    baseAttack: 12,
    baseDefense: 15,
    speed: 1.0,
    goldCostPer100: 45,
    supplyCostPer100: 50,
    strongAgainst: 'cavalry',
    weakAgainst: 'archers',
  },
  cavalry: {
    id: 'cavalry',
    name: { en: 'Heavy Cavalry', th: 'พลม้าศึก' },
    description: {
      en: 'Swift shock horsemen ideal for rapid marches and flanking ranged lines.',
      th: 'ทหารม้าเกราะหนัก เคลื่อนพลรวดเร็วและโฉบตีโอบแนวพลธนูได้เด็ดขาด',
    },
    counterDescription: {
      en: 'Strong vs Archers (+45%) · Weak vs Spearmen',
      th: 'ชนะทาง พลธนู (+45%) · แพ้ทาง พลหอก',
    },
    baseAttack: 18,
    baseDefense: 11,
    speed: 1.45,
    goldCostPer100: 75,
    supplyCostPer100: 70,
    strongAgainst: 'archers',
    weakAgainst: 'spearmen',
  },
  archers: {
    id: 'archers',
    name: { en: 'Crossbow & Archers', th: 'พลธนูและหน้าไม้' },
    description: {
      en: 'Deadly ranged volleys from afar, but vulnerable in close-quarters combat.',
      th: 'ระดมยิงสังหารจากระยะไกลอย่างรุนแรง แต่เปราะบางเมื่อถูกประชิดตัว',
    },
    counterDescription: {
      en: 'Strong vs Spearmen (+40%) · Weak vs Cavalry',
      th: 'ชนะทาง พลหอก (+40%) · แพ้ทาง พลม้า',
    },
    baseAttack: 17,
    baseDefense: 7,
    speed: 1.05,
    goldCostPer100: 55,
    supplyCostPer100: 45,
    strongAgainst: 'spearmen',
    weakAgainst: 'cavalry',
  },
  infantry: {
    id: 'infantry',
    name: { en: 'Sword & Shield Infantry', th: 'พลดาบโล่เกราะหนัก' },
    description: {
      en: 'Heavily armored frontline vanguard built to absorb arrows and storm city walls.',
      th: 'ทหารราบเกราะหนักถือดาบและโล่ ทนทานต่อห่าธนูและการบุกประชิดกำแพงเมือง',
    },
    counterDescription: {
      en: 'Resists Archers (+25%) · Siege Assault Bonus',
      th: 'ต้านทานพลธนู (+25%) · โบนัสบุกตีเมือง',
    },
    baseAttack: 13,
    baseDefense: 19,
    speed: 0.95,
    goldCostPer100: 50,
    supplyCostPer100: 55,
    strongAgainst: 'archers',
  },
};

export function calculateArmyStats(
  composition: TroopComposition,
  general: General,
  status: ArmyStatus,
  morale: number = 100
): { troopCount: number; attackStat: number; defenseStat: number } {
  const spearmen = Math.max(0, Math.floor(composition.spearmen || 0));
  const cavalry = Math.max(0, Math.floor(composition.cavalry || 0));
  const archers = Math.max(0, Math.floor(composition.archers || 0));
  const infantry = Math.max(0, Math.floor(composition.infantry || 0));

  const troopCount = spearmen + cavalry + archers + infantry;
  if (troopCount === 0) {
    return { troopCount: 0, attackStat: 0, defenseStat: 0 };
  }

  const rawAttack =
    (spearmen * TROOP_TYPES.spearmen.baseAttack +
      cavalry * TROOP_TYPES.cavalry.baseAttack +
      archers * TROOP_TYPES.archers.baseAttack +
      infantry * TROOP_TYPES.infantry.baseAttack) /
    100;

  const rawDefense =
    (spearmen * TROOP_TYPES.spearmen.baseDefense +
      cavalry * TROOP_TYPES.cavalry.baseDefense +
      archers * TROOP_TYPES.archers.baseDefense +
      infantry * TROOP_TYPES.infantry.baseDefense) /
    100;

  const clampedMorale = Math.max(20, Math.min(100, morale));
  const moraleFactor = 0.65 + (clampedMorale / 100) * 0.45; // 0.74 at 20 morale, 1.10 at 100 morale

  const generalAtkMult = 1 + general.attackBonus / 100;
  const generalDefMult = 1 + general.defenseBonus / 100;
  const stanceDefMult = status === 'defending' ? 1.25 : status === 'retreating' ? 0.8 : 1.0;

  return {
    troopCount,
    attackStat: Math.max(1, Math.round(rawAttack * generalAtkMult * moraleFactor)),
    defenseStat: Math.max(
      1,
      Math.round(rawDefense * generalDefMult * stanceDefMult * moraleFactor)
    ),
  };
}

export function computeUnitAndTerrainMultiplier(
  attacker: TroopComposition,
  defender: TroopComposition | undefined,
  terrain: TerrainType
): { attackerMult: number; defenderMult: number } {
  const atkTotal =
    Math.max(1, attacker.spearmen + attacker.cavalry + attacker.archers + attacker.infantry);
  const defComp: TroopComposition = defender || {
    spearmen: 400,
    cavalry: 200,
    archers: 400,
    infantry: 500,
  };
  const defTotal =
    Math.max(1, defComp.spearmen + defComp.cavalry + defComp.archers + defComp.infantry);

  const atkSpearRatio = attacker.spearmen / atkTotal;
  const atkCavRatio = attacker.cavalry / atkTotal;
  const atkArchRatio = attacker.archers / atkTotal;
  const atkInfRatio = attacker.infantry / atkTotal;

  const defSpearRatio = defComp.spearmen / defTotal;
  const defCavRatio = defComp.cavalry / defTotal;
  const defArchRatio = defComp.archers / defTotal;
  const defInfRatio = defComp.infantry / defTotal;

  // Rock-Paper-Scissors + Shield Infantry vs Archers
  const atkCounterBonus =
    atkSpearRatio * defCavRatio * 0.45 +
    atkCavRatio * defArchRatio * 0.5 +
    atkArchRatio * defSpearRatio * 0.45 +
    atkInfRatio * defArchRatio * 0.3;

  const defCounterBonus =
    defSpearRatio * atkCavRatio * 0.45 +
    defCavRatio * atkArchRatio * 0.5 +
    defArchRatio * atkSpearRatio * 0.45 +
    defInfRatio * atkArchRatio * 0.3;

  // Terrain-specific unit modifiers
  let atkTerrainMod = 1.0;
  let defTerrainMod = TERRAIN_INFO[terrain].defenseMultiplier;

  if (terrain === 'plains') {
    atkTerrainMod += atkCavRatio * 0.22;
    defTerrainMod += defCavRatio * 0.15;
  } else if (terrain === 'mountains') {
    atkTerrainMod += (atkInfRatio + atkSpearRatio) * 0.15 - atkCavRatio * 0.15;
    defTerrainMod += (defInfRatio + defSpearRatio) * 0.18;
  } else if (terrain === 'riverlands') {
    atkTerrainMod += atkArchRatio * 0.25;
    defTerrainMod += defArchRatio * 0.25;
  }

  return {
    attackerMult: Math.max(0.65, atkTerrainMod + atkCounterBonus),
    defenderMult: Math.max(0.75, defTerrainMod + defCounterBonus),
  };
}

// Breadth-First Search for shortest route along connected roads
export function findShortestCityRoute(
  cities: City[],
  startCityId: string,
  targetCityId: string
): string[] | null {
  if (startCityId === targetCityId) return [];

  const cityMap = new Map<string, City>();
  for (const c of cities) {
    cityMap.set(c.id, c);
  }

  if (!cityMap.has(startCityId) || !cityMap.has(targetCityId)) {
    return null;
  }

  const visited = new Set<string>([startCityId]);
  const queue: { cityId: string; path: string[] }[] = [
    { cityId: startCityId, path: [] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const cityObj = cityMap.get(current.cityId);
    if (!cityObj) continue;

    for (const neighborId of cityObj.connectedCityIds) {
      if (neighborId === targetCityId) {
        return [...current.path, neighborId];
      }
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push({
          cityId: neighborId,
          path: [...current.path, neighborId],
        });
      }
    }
  }

  return null;
}

export const GENERALS: Record<string, General> = {
  zhang_liao: {
    id: 'zhang_liao',
    name: { en: 'Zhang Liao', th: 'เตียวเลี้ยว' },
    courtesyName: { en: 'Wenyuan · Vanguard of Wei', th: 'เหวินหยวน · ขุนพลแนวหน้าแห่งวุยก๊ก' },
    factionId: 'wei',
    attackBonus: 24,
    defenseBonus: 18,
    speedBonus: 15,
    specialty: { en: 'Shock Cavalry Blitz', th: 'จู่โจมสายฟ้าแลบ' },
  },
  cao_ren: {
    id: 'cao_ren',
    name: { en: 'Cao Ren', th: 'โจหยิน' },
    courtesyName: { en: 'Zixiao · Iron Bastion', th: 'จื่อเซี่ยว · ปราการเหล็กกล้า' },
    factionId: 'wei',
    attackBonus: 14,
    defenseBonus: 28,
    speedBonus: 5,
    specialty: { en: 'Eight Gates Defense', th: 'ค่ายกลแปดประตูทอง' },
  },
  xiahou_dun: {
    id: 'xiahou_dun',
    name: { en: 'Xiahou Dun', th: 'แฮหัวตุ้น' },
    courtesyName: { en: 'Yuanrang · Fierce Marshal', th: 'หยวนหยาง · ขุนพลตาเดียวผู้ดุดัน' },
    factionId: 'wei',
    attackBonus: 22,
    defenseBonus: 16,
    speedBonus: 10,
    specialty: { en: 'Relentless Charge', th: 'บุกทะลวงไม่ถอย' },
  },
  guan_yu: {
    id: 'guan_yu',
    name: { en: 'Guan Yu', th: 'กวนอู' },
    courtesyName: { en: 'Yunchang · God of War', th: 'หยุนฉาง · เทพเจ้าแห่งความภักดี' },
    factionId: 'shu',
    attackBonus: 28,
    defenseBonus: 20,
    speedBonus: 12,
    specialty: { en: 'Green Dragon Crescent Slash', th: 'ง้าวมังกรเขียวผ่าทัพ' },
  },
  zhao_yun: {
    id: 'zhao_yun',
    name: { en: 'Zhao Yun', th: 'จูล่ง' },
    courtesyName: { en: 'Zilong · Dragon of Changshan', th: 'จื่อหลง · มังกรแห่งเสียงสาน' },
    factionId: 'shu',
    attackBonus: 23,
    defenseBonus: 23,
    speedBonus: 18,
    specialty: { en: 'Lone Rider Rescue', th: 'มังกรทะยานฝ่าศึก' },
  },
  zhuge_liang: {
    id: 'zhuge_liang',
    name: { en: 'Zhuge Liang', th: 'จูกัดเหลียง (ขงเบ้ง)' },
    courtesyName: { en: 'Kongming · Sleeping Dragon', th: 'ขงเบ้ง · มังกรหลับแห่งโหลงจง' },
    factionId: 'shu',
    attackBonus: 20,
    defenseBonus: 26,
    speedBonus: 10,
    specialty: { en: 'Repeating Crossbow Formation', th: 'ค่ายกลหน้าไม้กลเกาทัณฑ์' },
  },
  zhou_yu: {
    id: 'zhou_yu',
    name: { en: 'Zhou Yu', th: 'จิวยี่' },
    courtesyName: { en: 'Gongjin · Grand Commander of Wu', th: 'กงจิ่น · แม่ทัพใหญ่แห่งง่อก๊ก' },
    factionId: 'wu',
    attackBonus: 26,
    defenseBonus: 19,
    speedBonus: 14,
    specialty: { en: 'Crimson Fire Volley', th: 'เพลิงพิฆาตผาแดง' },
  },
  gan_ning: {
    id: 'gan_ning',
    name: { en: 'Gan Ning', th: 'กำเหลง' },
    courtesyName: { en: 'Xingba · Silken Sail Raider', th: 'ซิงป้า · จอมโจรผ้าแพร' },
    factionId: 'wu',
    attackBonus: 25,
    defenseBonus: 15,
    speedBonus: 20,
    specialty: { en: 'Hundred Horsemen Night Raid', th: 'ร้อยอัศวินปล้นค่ายยามราตรี' },
  },
  lu_xun: {
    id: 'lu_xun',
    name: { en: 'Lu Xun', th: 'ลกซุน' },
    courtesyName: { en: 'Boyan · Scholar Strategist', th: 'ป้อเหยียน · บัณฑิตพิชิตศึก' },
    factionId: 'wu',
    attackBonus: 21,
    defenseBonus: 25,
    speedBonus: 12,
    specialty: { en: 'Patient Counter-Encirclement', th: 'ล่อเสือออกจากถ้ำ' },
  },
};

export const INITIAL_CITIES: City[] = [
  {
    id: 'ye',
    name: { en: 'Ye', th: 'เย่ (กิจิ๋ว)' },
    regionName: { en: 'Hebei Northern Plains', th: 'ที่ราบภาคเหนือ เหอเป่ย' },
    description: {
      en: 'The heavily fortified northern citadel north of the Yellow River, famed for its rich granaries and warhorses.',
      th: 'นครปราการใหญ่ทางเหนือของแม่น้ำฮวงโห อุดมด้วยเสบียงกรังและม้าศึกชั้นเลิศ',
    },
    terrain: 'plains',
    position: { x: 960, y: 175 },
    ownerFactionId: 'wei',
    level: 3,
    population: 185000,
    garrison: 2400,
    wallLevel: 3,
    maxWallLevel: 5,
    goldYield: 140,
    supplyYield: 165,
    connectedCityIds: ['luoyang', 'xuchang'],
    isCapital: false,
  },
  {
    id: 'luoyang',
    name: { en: 'Luoyang', th: 'ลกเอี๋ยง' },
    regionName: { en: 'Central Imperial Heartland', th: 'ศูนย์กลางราชธานีเก่า จงหยวน' },
    description: {
      en: 'The ancient imperial capital guarded by mountain passes and the Yellow River bends.',
      th: 'อดีตราชธานีศูนย์กลางแผ่นดิน ล้อมรอบด้วยด่านภูเขาและคุ้งน้ำฮวงโห',
    },
    terrain: 'highlands',
    position: { x: 745, y: 335 },
    ownerFactionId: 'wei',
    level: 4,
    population: 240000,
    garrison: 2900,
    wallLevel: 4,
    maxWallLevel: 5,
    goldYield: 180,
    supplyYield: 150,
    connectedCityIds: ['ye', 'xuchang', 'hanzhong', 'xiangyang'],
    isCapital: false,
  },
  {
    id: 'xuchang',
    name: { en: 'Xuchang', th: 'ฮูโต๋' },
    regionName: { en: 'Yingchuan Central Plains', th: 'ที่ราบภาคกลาง อิ่งชวน' },
    description: {
      en: 'Seat of the Imperial Court under Wei control and agricultural heart of the Central Plains.',
      th: 'ฐานที่มั่นหลักของวุยก๊กและที่ประทับองค์จักรพรรดิ อุดมด้วยนาหลวงและกองทัพใหญ่',
    },
    terrain: 'plains',
    position: { x: 1015, y: 410 },
    ownerFactionId: 'wei',
    level: 4,
    population: 265000,
    garrison: 3400,
    wallLevel: 4,
    maxWallLevel: 5,
    goldYield: 210,
    supplyYield: 195,
    connectedCityIds: ['ye', 'luoyang', 'xiangyang', 'jianye'],
    isCapital: true,
  },
  {
    id: 'hanzhong',
    name: { en: 'Hanzhong', th: 'ฮันต๋ง' },
    regionName: { en: 'Qinling Mountain Gateway', th: 'ประตูสู่เสฉวน เทือกเขาฉินหลิ่ง' },
    description: {
      en: 'A vital mountain bastion overlooking the Han River valley; the northern shield of Shu.',
      th: 'ปราการยุทธศาสตร์กลางหุบเขาฮั่นซุย ปราการด่านหน้าสำคัญที่ปกป้องแผ่นดินเสฉวน',
    },
    terrain: 'mountains',
    position: { x: 430, y: 445 },
    ownerFactionId: 'shu',
    level: 3,
    population: 145000,
    garrison: 2600,
    wallLevel: 4,
    maxWallLevel: 5,
    goldYield: 130,
    supplyYield: 155,
    connectedCityIds: ['chengdu', 'luoyang', 'xiangyang'],
    isCapital: false,
  },
  {
    id: 'chengdu',
    name: { en: 'Chengdu', th: 'เฉิงตู' },
    regionName: { en: 'Land of Abundance (Bashu)', th: 'แผ่นดินแห่งความอุดมสมบูรณ์ เสฉวน' },
    description: {
      en: 'Prosperous capital of Shu nestled inside the natural ring of the Bashu mountains.',
      th: 'ราชธานีแห่งจ๊กก๊กในแอ่งกระทะเสฉวน มั่งคั่งด้วยพืชผลและปราการธรรมชาติรอบด้าน',
    },
    terrain: 'mountains',
    position: { x: 265, y: 695 },
    ownerFactionId: 'shu',
    level: 4,
    population: 255000,
    garrison: 3300,
    wallLevel: 4,
    maxWallLevel: 5,
    goldYield: 205,
    supplyYield: 210,
    connectedCityIds: ['hanzhong', 'jingzhou'],
    isCapital: true,
  },
  {
    id: 'xiangyang',
    name: { en: 'Xiangyang', th: 'ซงหยง' },
    regionName: { en: 'Northern Jingzhou Crossroads', th: 'ชุมทางยุทธศาสตร์ เกงจิ๋วเหนือ' },
    description: {
      en: 'A heavily contested river fortress linking the northern plains to the southern waterways.',
      th: 'เมืองหน้าด่านสำคัญริมแม่น้ำฮั่นซุย จุดตัดยุทธศาสตร์ระหว่างภาคเหนือและภาคใต้',
    },
    terrain: 'riverlands',
    position: { x: 785, y: 575 },
    ownerFactionId: 'neutral',
    level: 3,
    population: 175000,
    garrison: 1900,
    wallLevel: 3,
    maxWallLevel: 5,
    goldYield: 155,
    supplyYield: 160,
    connectedCityIds: ['luoyang', 'xuchang', 'hanzhong', 'jingzhou'],
    isCapital: false,
  },
  {
    id: 'jingzhou',
    name: { en: 'Jingzhou', th: 'เกงจิ๋ว (กังเหลง)' },
    regionName: { en: 'Middle Yangtze Basin', th: 'ลุ่มแม่น้ำแยงซีตอนกลาง' },
    description: {
      en: 'The strategic pivot of the realm; whoever holds Jingzhou commands the Yangtze riverways.',
      th: 'หัวใจยุทธศาสตร์แห่งแผ่นดิน ผู้ใดครองเกงจิ๋วผู้นั้นกุมเส้นทางเดินทัพทั้งปวง',
    },
    terrain: 'riverlands',
    position: { x: 755, y: 785 },
    ownerFactionId: 'shu',
    level: 3,
    population: 195000,
    garrison: 2300,
    wallLevel: 3,
    maxWallLevel: 5,
    goldYield: 170,
    supplyYield: 185,
    connectedCityIds: ['chengdu', 'xiangyang', 'jianye'],
    isCapital: false,
  },
  {
    id: 'jianye',
    name: { en: 'Jianye', th: 'เจี้ยนเย่ (กังตั๋ง)' },
    regionName: { en: 'Jiangdong Eastern Delta', th: 'ดินแดนกังตั๋ง ลุ่มน้ำแยงซีตะวันออก' },
    description: {
      en: 'Maritime capital of Eastern Wu, shielded by the wide Yangtze River and flourishing trade ports.',
      th: 'ราชธานีแห่งง่อก๊กริมฝั่งแม่น้ำแยงซี มั่งคั่งด้วยการค้าทางน้ำและกองทัพเรืออันเกรียงไกร',
    },
    terrain: 'riverlands',
    position: { x: 1245, y: 675 },
    ownerFactionId: 'wu',
    level: 4,
    population: 270000,
    garrison: 3500,
    wallLevel: 4,
    maxWallLevel: 5,
    goldYield: 235,
    supplyYield: 190,
    connectedCityIds: ['xuchang', 'jingzhou'],
    isCapital: true,
  },
];

export const RIVERS: RiverPath[] = [
  {
    id: 'yellow_river',
    name: { en: 'Yellow River (Huang He)', th: 'แม่น้ำฮวงโห' },
    width: 16,
    points: [
      { x: 60, y: 240 },
      { x: 260, y: 190 },
      { x: 430, y: 140 },
      { x: 540, y: 295 },
      { x: 710, y: 290 },
      { x: 895, y: 255 },
      { x: 1120, y: 175 },
      { x: 1380, y: 110 },
      { x: 1580, y: 80 },
    ],
  },
  {
    id: 'yangtze_river',
    name: { en: 'Yangtze River (Chang Jiang)', th: 'แม่น้ำแยงซีเกียง' },
    width: 22,
    points: [
      { x: 50, y: 880 },
      { x: 230, y: 835 },
      { x: 455, y: 785 },
      { x: 655, y: 825 },
      { x: 840, y: 830 },
      { x: 1030, y: 745 },
      { x: 1205, y: 635 },
      { x: 1410, y: 590 },
      { x: 1590, y: 560 },
    ],
  },
  {
    id: 'han_river',
    name: { en: 'Han River', th: 'แม่น้ำฮั่นซุย' },
    width: 11,
    points: [
      { x: 365, y: 420 },
      { x: 560, y: 475 },
      { x: 740, y: 545 },
      { x: 865, y: 685 },
      { x: 940, y: 785 },
    ],
  },
];

export const MOUNTAIN_RANGES: MountainRange[] = [
  {
    id: 'qinling',
    name: { en: 'Qinling Range', th: 'เทือกเขาฉินหลิ่ง' },
    peaks: [
      { x: 310, y: 350, scale: 1.3, height: 54 },
      { x: 380, y: 330, scale: 1.5, height: 64 },
      { x: 465, y: 345, scale: 1.4, height: 58 },
      { x: 545, y: 365, scale: 1.25, height: 50 },
      { x: 615, y: 385, scale: 1.1, height: 44 },
    ],
  },
  {
    id: 'bashu_west',
    name: { en: 'Daba & Min Mountains', th: 'เทือกเขาเสฉวน' },
    peaks: [
      { x: 140, y: 530, scale: 1.45, height: 62 },
      { x: 185, y: 610, scale: 1.3, height: 55 },
      { x: 135, y: 705, scale: 1.5, height: 65 },
      { x: 340, y: 565, scale: 1.25, height: 50 },
      { x: 495, y: 640, scale: 1.35, height: 56 },
      { x: 555, y: 710, scale: 1.2, height: 48 },
    ],
  },
  {
    id: 'taihang',
    name: { en: 'Taihang Mountains', th: 'เทือกเขาไท่หาง' },
    peaks: [
      { x: 750, y: 145, scale: 1.35, height: 56 },
      { x: 815, y: 185, scale: 1.25, height: 50 },
      { x: 855, y: 120, scale: 1.4, height: 58 },
    ],
  },
  {
    id: 'dabie',
    name: { en: 'Dabie Mountains', th: 'เทือกเขาต้าเปี๋ย' },
    peaks: [
      { x: 965, y: 585, scale: 1.2, height: 48 },
      { x: 1035, y: 615, scale: 1.3, height: 52 },
      { x: 1095, y: 575, scale: 1.15, height: 44 },
    ],
  },
  {
    id: 'jiangnan_hills',
    name: { en: 'Wuyi Southern Peaks', th: 'ทิวเขาแดนใต้' },
    peaks: [
      { x: 1090, y: 875, scale: 1.3, height: 52 },
      { x: 1175, y: 845, scale: 1.4, height: 58 },
      { x: 1265, y: 880, scale: 1.25, height: 48 },
      { x: 1355, y: 830, scale: 1.3, height: 52 },
    ],
  },
];

export const STRATEGIC_PASSES: StrategicPass[] = [
  {
    id: 'hulao_pass',
    name: { en: 'Hulao Pass', th: 'ด่านเฮาโลก๋วน' },
    position: { x: 865, y: 368 },
    rotation: 0.25,
  },
  {
    id: 'yangping_pass',
    name: { en: 'Yangping Pass', th: 'ด่านหยางผิงก๋วน' },
    position: { x: 355, y: 555 },
    rotation: -0.45,
  },
  {
    id: 'chibi_cliffs',
    name: { en: 'Red Cliffs (Chibi)', th: 'ผาแดง (เซ็กเพ็ก)' },
    position: { x: 965, y: 745 },
    rotation: -0.2,
  },
];
