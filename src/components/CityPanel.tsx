import React from 'react';
import {
  Castle,
  Shield,
  Users,
  Coins,
  Wheat,
  PlusCircle,
  Hammer,
  Swords,
  MapPin,
  Mountain,
  Flame,
  X,
} from 'lucide-react';
import { TERRAIN_INFO } from '../game/mapData';
import {
  ActiveBattle,
  Army,
  City,
  Faction,
  FactionId,
  Language,
  PlayableFactionId,
} from '../game/types';

interface CityPanelProps {
  city: City | null;
  allCities: City[];
  armiesAtCity: Army[];
  activeBattles: ActiveBattle[];
  factions: Record<FactionId, Faction>;
  playerFactionId: PlayableFactionId;
  lang: Language;
  onRecruitGarrison: (cityId: string) => void;
  onUpgradeWalls: (cityId: string) => void;
  onMobilizeArmy: (cityId: string) => void;
  onSelectCity: (cityId: string) => void;
  onSelectArmy: (armyId: string) => void;
  onClose?: () => void;
}

export const CityPanel: React.FC<CityPanelProps> = ({
  city,
  allCities,
  armiesAtCity,
  activeBattles,
  factions,
  playerFactionId,
  lang,
  onRecruitGarrison,
  onUpgradeWalls,
  onMobilizeArmy,
  onSelectCity,
  onSelectArmy,
  onClose,
}) => {
  if (!city) {
    return (
      <section className="bg-[#181613] border border-[#3D3426] rounded p-3.5 text-xs text-[#A89F8E]">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 font-display font-bold text-sm text-[#E5DEC9]">
            <Castle className="w-4 h-4 text-[#D97706]" />
            <span>{lang === 'en' ? 'City Intelligence' : 'ข้อมูลหัวเมือง'}</span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] -mr-1 -my-1 rounded bg-[#231F1A] hover:bg-[#302A22] text-[#A89F8E] hover:text-[#F3ECE0] flex items-center justify-center cursor-pointer"
              aria-label={lang === 'en' ? 'Close City Panel' : 'ปิดหน้าต่างเมือง'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p>
          {lang === 'en'
            ? 'Tap any city stronghold on the strategic map to inspect its fortifications, terrain, garrison, and connected roads.'
            : 'แตะเลือกหัวเมืองบนแผนที่ยุทธศาสตร์เพื่อตรวจสอบปราการ ภูมิประเทศ กำลังพลรักษาการณ์ และเส้นทางเดินทัพ'}
        </p>
      </section>
    );
  }

  const ownerFaction = factions[city.ownerFactionId] || factions.neutral;
  const isPlayerOwned = city.ownerFactionId === playerFactionId;
  const wallUpgradeCost = city.wallLevel * 220;
  const terrainInfo = TERRAIN_INFO[city.terrain] || TERRAIN_INFO.plains;
  const activeBattle = activeBattles.find((b) => b.cityId === city.id);

  return (
    <section
      aria-label={lang === 'en' ? `City Panel: ${city.name.en}` : `ข้อมูลเมือง ${city.name.th}`}
      className="bg-[#181613] border border-[#3D3426] rounded p-3.5 flex flex-col gap-3 text-xs text-[#F3ECE0] shadow-lg"
    >
      {/* Header: City Name, Owner Faction & Optional Close Button */}
      <div className="flex items-start justify-between gap-2 border-b border-[#2E271D] pb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Castle className="w-4 h-4 text-[#D97706] shrink-0" />
            <h2 className="font-display font-bold text-base text-[#F3ECE0] truncate">
              {city.name[lang]}
            </h2>
            {city.isCapital && (
              <span className="text-[11px] font-semibold text-[#F59E0B] whitespace-nowrap">
                · {lang === 'en' ? 'Capital' : 'ราชธานี'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#A89F8E] mt-0.5 truncate">
            {city.regionName[lang]}
          </p>
        </div>

        <div className="flex items-start gap-2 shrink-0">
          <div className="text-right">
            <div className="flex items-center justify-end gap-1">
              <span
                className="w-4 h-4 rounded-xs flex items-center justify-center font-display font-bold text-[10px] text-white border border-white/25"
                style={{ backgroundColor: ownerFaction.bannerBg }}
              >
                {ownerFaction.dynastySeal}
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: ownerFaction.secondaryColor }}
              >
                {ownerFaction.name[lang]}
              </span>
            </div>
            <div className="text-[11px] text-[#A89F8E]">
              {lang === 'en' ? `City Lv.${city.level}` : `ระดับเมือง ${city.level}`}
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] -mr-1 -mt-1 rounded bg-[#231F1A] hover:bg-[#302A22] border border-[#3D3426] text-[#C9C0B1] hover:text-[#F3ECE0] flex items-center justify-center cursor-pointer"
              aria-label={lang === 'en' ? 'Close City Panel' : 'ปิดหน้าต่างเมือง'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Active Siege / Battle Progress Banner */}
      {(city.underSiege || activeBattle) && (
        <div className="bg-[#451A1A]/75 border border-[#EF4444] rounded p-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[#FCA5A5] font-semibold">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#F87171]" />
              <span>
                {lang === 'en'
                  ? `UNDER SIEGE${activeBattle ? ` · Round ${activeBattle.round}` : ''}`
                  : `กำลังถูกปิดล้อมโจมตี${activeBattle ? ` · รอบที่ ${activeBattle.round}` : ''}`}
              </span>
            </span>
            <span className="font-mono-num text-[11px]">
              {lang === 'en' ? 'Breach' : 'ทลายกำแพง'}: {city.siegeProgress || 0}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#2A1212] rounded overflow-hidden">
            <div
              className="h-full bg-[#EF4444] transition-all duration-300"
              style={{ width: `${Math.min(100, city.siegeProgress || 0)}%` }}
            />
          </div>
          {activeBattle && (
            <div className="flex items-center justify-between text-[10.5px] text-[#FECACA] font-mono-num">
              <span>
                {lang === 'en' ? 'Attacker Loss' : 'ฝ่ายบุกสูญเสีย'}: -
                {activeBattle.lastAttackerCasualties}
              </span>
              <span>
                {lang === 'en' ? 'Defender Loss' : 'ฝ่ายรับสูญเสีย'}: -
                {activeBattle.lastDefenderCasualties}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Lore description */}
      <p className="text-[11.5px] leading-relaxed text-[#C9C0B1]">
        {city.description[lang]}
      </p>

      {/* Terrain Combat Effect Bar */}
      <div className="bg-[#14120F] border border-[#2C251C] rounded px-2.5 py-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#E5DEC9]">
          <Mountain className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
          <span>{terrainInfo.name[lang]}</span>
        </div>
        <span className="text-[10.5px] text-[#A89F8E] truncate">
          {terrainInfo.effectSummary[lang]}
        </span>
      </div>

      {/* Core Statistics Grid */}
      <div className="grid grid-cols-2 gap-2 bg-[#12100E] border border-[#2C251C] rounded p-2.5">
        <div>
          <div className="text-[11px] text-[#A89F8E] flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-[#60A5FA]" />
            <span>{lang === 'en' ? 'Garrison Size' : 'ทหารรักษาการณ์'}</span>
          </div>
          <div className="font-mono-num font-semibold text-sm text-[#F3ECE0] mt-0.5">
            {city.garrison.toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-[#A89F8E] flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-[#D97706]" />
            <span>{lang === 'en' ? 'Wall Defense' : 'ระดับกำแพงเมือง'}</span>
          </div>
          <div className="font-mono-num font-semibold text-sm text-[#F3ECE0] mt-0.5">
            Lv.{city.wallLevel} / {city.maxWallLevel}{' '}
            <span className="text-[11px] text-[#34D399]">
              (+{city.wallLevel * 14}% DEF)
            </span>
          </div>
        </div>

        <div>
          <div className="text-[11px] text-[#A89F8E]">
            {lang === 'en' ? 'Population' : 'ประชากร'}
          </div>
          <div className="font-mono-num font-medium text-xs text-[#E5DEC9] mt-0.5">
            {city.population.toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-[#A89F8E]">
            {lang === 'en' ? 'Gold & Provisions' : 'รายได้ทองคำและเสบียง'}
          </div>
          <div className="font-mono-num font-medium text-xs text-[#E5DEC9] mt-0.5 flex items-center gap-2">
            <span className="flex items-center gap-0.5 text-[#F59E0B]">
              <Coins className="w-3 h-3" />+{city.goldYield}
            </span>
            <span className="flex items-center gap-0.5 text-[#34D399]">
              <Wheat className="w-3 h-3" />+{city.supplyYield}
            </span>
          </div>
        </div>
      </div>

      {/* Connected Roads */}
      <div>
        <div className="text-[11px] font-semibold text-[#A89F8E] mb-1.5 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-[#D97706]" />
          <span>
            {lang === 'en'
              ? 'Connected Strategic Roads'
              : 'เส้นทางเชื่อมต่อยุทธศาสตร์'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {city.connectedCityIds.map((cid) => {
            const target = allCities.find((c) => c.id === cid);
            if (!target) return null;
            const targetFac = factions[target.ownerFactionId] || factions.neutral;
            return (
              <button
                key={cid}
                type="button"
                onClick={() => onSelectCity(cid)}
                className="min-h-[38px] lg:min-h-[32px] px-2.5 py-1 rounded bg-[#221E19] hover:bg-[#2F2922] active:bg-[#3D3426] border border-[#3D3426] text-xs lg:text-[11px] text-[#E5DEC9] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span
                  className="w-2.5 h-2.5 rounded-xs inline-block border border-white/25"
                  style={{ backgroundColor: targetFac.color }}
                />
                <span className="font-display font-bold text-[10px] text-[#A89F8E]">
                  {targetFac.dynastySeal}
                </span>
                <span>{target.name[lang]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Armies Stationed at this City */}
      {armiesAtCity.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-[#A89F8E] mb-1.5">
            {lang === 'en'
              ? `Armies at ${city.name.en} (${armiesAtCity.length})`
              : `กองทัพที่ประจำการ (${armiesAtCity.length})`}
          </div>
          <div className="flex flex-col gap-1.5">
            {armiesAtCity.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelectArmy(a.id)}
                className="w-full min-h-[42px] lg:min-h-[36px] px-3 py-1.5 rounded bg-[#201C17] hover:bg-[#2B251E] active:bg-[#3A3127] border border-[#3D3426] flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <span className="font-medium text-[#F3ECE0] truncate">
                  • {a.general.name[lang]} · {a.name[lang]}
                </span>
                <span className="font-mono-num text-xs text-[#F59E0B] shrink-0 ml-2">
                  {a.troopCount.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Available City Actions */}
      <div className="pt-1 border-t border-[#2E271D]">
        <div className="text-[11px] font-semibold text-[#A89F8E] mb-2">
          {lang === 'en' ? 'Available City Actions' : 'คำสั่งบริหารหัวเมือง'}
        </div>

        {isPlayerOwned ? (
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => onRecruitGarrison(city.id)}
              className="w-full min-h-[44px] lg:min-h-[38px] px-3 py-2 rounded bg-[#231F1A] hover:bg-[#302A22] active:bg-[#3D3426] border border-[#4A3F2F] text-xs font-medium text-[#F3ECE0] flex items-center justify-between transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 whitespace-nowrap">
                <PlusCircle className="w-4 h-4 text-[#34D399] shrink-0" />
                <span>
                  {lang === 'en'
                    ? 'Recruit Garrison (+450)'
                    : 'เกณฑ์ทหารรักษาการณ์ (+450)'}
                </span>
              </span>
              <span className="font-mono-num text-[11px] text-[#A89F8E] whitespace-nowrap ml-2">
                180G · 160S
              </span>
            </button>

            <button
              type="button"
              onClick={() => onUpgradeWalls(city.id)}
              disabled={city.wallLevel >= city.maxWallLevel}
              className="w-full min-h-[44px] lg:min-h-[38px] px-3 py-2 rounded bg-[#231F1A] hover:bg-[#302A22] active:bg-[#3D3426] disabled:opacity-45 border border-[#4A3F2F] text-xs font-medium text-[#F3ECE0] flex items-center justify-between transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2 whitespace-nowrap">
                <Hammer className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>
                  {city.wallLevel >= city.maxWallLevel
                    ? lang === 'en'
                      ? 'Walls at Max Level'
                      : 'กำแพงเมืองระดับสูงสุดแล้ว'
                    : lang === 'en'
                    ? `Fortify Walls (Lv.${city.wallLevel + 1})`
                    : `เสริมกำแพงเมือง (Lv.${city.wallLevel + 1})`}
                </span>
              </span>
              {city.wallLevel < city.maxWallLevel && (
                <span className="font-mono-num text-[11px] text-[#A89F8E] whitespace-nowrap ml-2">
                  {wallUpgradeCost}G
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onMobilizeArmy(city.id)}
              className="w-full min-h-[44px] lg:min-h-[38px] px-3 py-2 rounded bg-[#92400E]/40 hover:bg-[#92400E]/65 active:bg-[#92400E]/80 border border-[#D97706]/70 text-xs font-semibold text-[#FDE68A] flex items-center justify-between transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 whitespace-nowrap">
                <Swords className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>
                  {lang === 'en'
                    ? 'Mobilize Field Army (2,700)'
                    : 'จัดตั้งกองทัพสนามใหม่ (2,700)'}
                </span>
              </span>
              <span className="font-mono-num text-[11px] text-[#FCD34D] whitespace-nowrap ml-2">
                420G · 380S
              </span>
            </button>
          </div>
        ) : (
          <div className="p-2.5 rounded bg-[#14120F] border border-[#2C251C] text-[11.5px] text-[#A89F8E]">
            {lang === 'en'
              ? `Controlled by ${ownerFaction.name.en}. Capture Requirement: Deplete city garrison (${city.garrison.toLocaleString()}) and any defending armies via Siege or Attack.`
              : `อยู่ภายใต้ ${ownerFaction.name.th} เงื่อนไขยึดเมือง: ตีทหารรักษาการณ์ (${city.garrison.toLocaleString()}) และทัพป้องกันให้แตกพ่าย`}
          </div>
        )}
      </div>
    </section>
  );
};
