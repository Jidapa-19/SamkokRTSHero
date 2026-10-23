import React from 'react';
import {
  Swords,
  Shield,
  Navigation,
  Flag,
  UserCheck,
  Plus,
  Crosshair,
  RotateCcw,
  Wheat,
  X,
} from 'lucide-react';
import { TROOP_TYPES } from '../game/mapData';
import {
  Army,
  City,
  CommandMode,
  Faction,
  FactionId,
  Language,
  PlayableFactionId,
  TroopType,
} from '../game/types';

interface ArmyPanelProps {
  army: Army | null;
  playerArmies: Army[];
  cities: City[];
  factions: Record<FactionId, Faction>;
  playerFactionId: PlayableFactionId;
  commandMode: CommandMode;
  lang: Language;
  onSelectArmy: (armyId: string) => void;
  onSetCommandMode: (mode: CommandMode) => void;
  onOrderArmyToCity: (
    armyId: string,
    targetCityId: string,
    mode: 'move' | 'attack'
  ) => void;
  onRetreat: (armyId: string) => void;
  onDefend: (armyId: string) => void;
  onCaptureCity: (armyId: string) => void;
  onReinforceTroop: (armyId: string, troopType: TroopType) => void;
  onClose?: () => void;
}

const STATUS_LABELS: Record<Army['status'], { en: string; th: string }> = {
  idle: { en: 'Stationed · Ready', th: 'ประจำการ · พร้อมรบ' },
  marching: { en: 'Marching on Road', th: 'กำลังเดินทัพตามเส้นทาง' },
  attacking: { en: 'Advancing to Assault', th: 'กำลังเคลื่อนทัพบุกโจมตี' },
  defending: { en: 'Fortified Defense (+25% DEF)', th: 'ตั้งค่ายกลป้องกัน (+25% DEF)' },
  capturing: { en: 'Besieging Hostile City', th: 'กำลังปิดล้อมโจมตีเมือง' },
  retreating: { en: 'Retreating to Safety', th: 'กำลังถอยทัพกลับแนวหลัง' },
};

export const ArmyPanel: React.FC<ArmyPanelProps> = ({
  army,
  playerArmies,
  cities,
  factions,
  playerFactionId,
  commandMode,
  lang,
  onSelectArmy,
  onSetCommandMode,
  onOrderArmyToCity,
  onRetreat,
  onDefend,
  onCaptureCity,
  onReinforceTroop,
  onClose,
}) => {
  if (!army) {
    return (
      <section className="bg-[#181613] border border-[#3D3426] rounded p-3.5 text-xs text-[#A89F8E]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 font-display font-bold text-sm text-[#E5DEC9]">
            <Swords className="w-4 h-4 text-[#D97706]" />
            <span>
              {lang === 'en' ? 'Army & Command Panel' : 'ข้อมูลกองทัพและคำสั่งรบ'}
            </span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] -mr-1 -my-1 rounded bg-[#231F1A] hover:bg-[#302A22] text-[#A89F8E] hover:text-[#F3ECE0] flex items-center justify-center cursor-pointer"
              aria-label={lang === 'en' ? 'Close Army Panel' : 'ปิดหน้าต่างกองทัพ'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="mb-2.5">
          {lang === 'en'
            ? 'Tap an army banner on the map or choose one of your active field armies below:'
            : 'แตะเลือกธงกองทัพบนแผนที่ หรือเลือกกองทัพสนามของท่านจากรายการด้านล่าง:'}
        </p>
        {playerArmies.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {playerArmies.map((pa) => (
              <button
                key={pa.id}
                type="button"
                onClick={() => onSelectArmy(pa.id)}
                className="w-full min-h-[44px] lg:min-h-[36px] px-3 py-2 rounded bg-[#221E19] hover:bg-[#2F2922] border border-[#3D3426] flex items-center justify-between text-left text-[#F3ECE0] cursor-pointer"
              >
                <span className="truncate">
                  • {pa.general.name[lang]} · {pa.name[lang]}
                </span>
                <span className="font-mono-num text-[#F59E0B] ml-2 shrink-0">
                  {pa.troopCount.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

  const ownerFaction = factions[army.ownerFactionId] || factions.neutral;
  const isPlayerArmy = army.ownerFactionId === playerFactionId;
  const currentCity = cities.find((c) => c.id === army.currentCityId);
  const targetCity = cities.find((c) => c.id === army.targetCityId);
  const connectedCities = currentCity
    ? cities.filter((c) => currentCity.connectedCityIds.includes(c.id))
    : [];
  const supplyUpkeepPerMarchStep = Math.max(4, Math.round(army.troopCount / 450));
  const hasSupplies = ownerFaction.supplies > 0;

  return (
    <section
      aria-label={lang === 'en' ? `Army Panel: ${army.name.en}` : `ข้อมูลทัพ ${army.name.th}`}
      className="bg-[#181613] border border-[#3D3426] rounded p-3 sm:p-3.5 flex flex-col gap-2.5 text-xs text-[#F3ECE0] shadow-lg"
    >
      {/* Quick Army Switcher Roster & Optional Close Button */}
      <div className="flex items-center justify-between gap-2 border-b border-[#2E271D] pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 min-w-0">
          {playerArmies.map((pa) => {
            const active = pa.id === army.id;
            return (
              <button
                key={pa.id}
                type="button"
                onClick={() => onSelectArmy(pa.id)}
                className={`min-h-[36px] lg:min-h-[30px] px-2.5 py-1 rounded text-xs lg:text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#D97706] text-[#12100E] font-semibold'
                    : 'bg-[#221E19] text-[#C9C0B1] hover:bg-[#2F2922]'
                }`}
              >
                {pa.general.name[lang]}
              </button>
            );
          })}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] -mr-1 -my-1 rounded bg-[#231F1A] hover:bg-[#302A22] border border-[#3D3426] text-[#C9C0B1] hover:text-[#F3ECE0] flex items-center justify-center shrink-0 cursor-pointer"
            aria-label={lang === 'en' ? 'Close Army Panel' : 'ปิดหน้าต่างกองทัพ'}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Army Name & Owner Header */}
      <div className="flex items-start justify-between gap-2 border-b border-[#2E271D] pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-[#D97706] shrink-0" />
            <h2 className="font-display font-bold text-sm sm:text-base text-[#F3ECE0] truncate">
              {army.name[lang]}
            </h2>
          </div>
          <div className="text-[11px] text-[#A89F8E] mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span
              className="w-4 h-4 rounded-xs inline-flex items-center justify-center font-display font-bold text-[10px] text-white border border-white/25"
              style={{ backgroundColor: ownerFaction.bannerBg }}
            >
              {ownerFaction.dynastySeal}
            </span>
            <span
              className="font-semibold"
              style={{ color: ownerFaction.secondaryColor }}
            >
              {ownerFaction.name[lang]}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {currentCity
                ? lang === 'en'
                  ? `At ${currentCity.name.en}`
                  : `ประจำที่ ${currentCity.name.th}`
                : lang === 'en'
                ? 'In Field'
                : 'กลางสมรภูมิ'}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="font-mono-num font-bold text-sm text-[#F59E0B]">
            {army.troopCount.toLocaleString()}
          </div>
          <div className="text-[10.5px] text-[#A89F8E]">
            {lang === 'en' ? 'Total Troops' : 'กำลังพลรวม'}
          </div>
        </div>
      </div>

      {/* Assigned General, Morale & Supply Status Card */}
      <div className="bg-[#12100E] border border-[#2C251C] rounded p-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F3ECE0]">
              <UserCheck className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
              <span className="truncate">{army.general.name[lang]}</span>
            </div>
            <div className="text-[11px] text-[#A89F8E] truncate mt-0.5">
              {army.general.courtesyName[lang]}
            </div>
            <div className="text-[11px] text-[#F59E0B] mt-0.5 truncate">
              * {army.general.specialty[lang]}
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0 font-mono-num text-[11px]">
            <span className="text-[#F87171]">
              ATK {army.attackStat} (+{army.general.attackBonus}%)
            </span>
            <span className="text-[#60A5FA] mt-0.5">
              DEF {army.defenseStat} (+{army.general.defenseBonus}%)
            </span>
          </div>
        </div>

        {/* Morale & Supply Status Meter */}
        <div className="pt-1.5 border-t border-[#221D16] space-y-1.5">
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[#A89F8E]">
                {lang === 'en' ? 'Army Morale' : 'ขวัญกำลังใจทหาร'}:
              </span>
              <span
                className={`font-mono-num font-semibold ${
                  army.morale >= 70
                    ? 'text-[#34D399]'
                    : army.morale >= 40
                    ? 'text-[#FBBF24]'
                    : 'text-[#F87171]'
                }`}
              >
                {army.morale}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#241F18] rounded overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  army.morale >= 70
                    ? 'bg-[#10B981]'
                    : army.morale >= 40
                    ? 'bg-[#F59E0B]'
                    : 'bg-[#EF4444]'
                }`}
                style={{ width: `${Math.max(5, Math.min(100, army.morale))}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <span className="text-[#A89F8E] flex items-center gap-1">
              <Wheat className="w-3 h-3 text-[#10B981]" />
              <span>{lang === 'en' ? 'Supply Status' : 'สถานะเสบียงทัพ'}:</span>
            </span>
            <span
              className={`font-mono-num font-medium ${
                hasSupplies ? 'text-[#34D399]' : 'text-[#F87171]'
              }`}
            >
              {hasSupplies
                ? lang === 'en'
                  ? `Supplied (-${supplyUpkeepPerMarchStep}/march)`
                  : `เสบียงเพียงพอ (-${supplyUpkeepPerMarchStep}/ก้าว)`
                : lang === 'en'
                ? 'Depleted! (-Morale)'
                : 'ขาดแคลนเสบียง! (-ขวัญ)'}
            </span>
          </div>
        </div>
      </div>

      {/* Movement Status & Progress Bar */}
      <div className="bg-[#14120F] border border-[#2C251C] rounded px-2.5 py-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#A89F8E]">
            {lang === 'en' ? 'Status' : 'สถานะการเดินทัพ'}:
          </span>
          <span className="font-semibold text-[#E5DEC9]">
            {STATUS_LABELS[army.status][lang]}
          </span>
        </div>
        {targetCity && (
          <div className="mt-1.5">
            <div className="flex items-center justify-between text-[10.5px] text-[#F59E0B] mb-1">
              <span>
                {lang === 'en'
                  ? `Destination: ${targetCity.name.en}`
                  : `เป้าหมาย: ${targetCity.name.th}`}
              </span>
              <span className="font-mono-num">
                {Math.round(army.movementProgress * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#262019] rounded overflow-hidden">
              <div
                className="h-full bg-[#D97706] transition-all duration-300"
                style={{ width: `${Math.round(army.movementProgress * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Command Panel Placed Above Unit Breakdown for Immediate Mobile Thumb Access */}
      <div>
        <div className="text-[11px] font-semibold text-[#A89F8E] mb-1.5">
          {lang === 'en' ? 'Tactical Command Panel' : 'แผงคำสั่งยุทธการ'}
        </div>

        {isPlayerArmy ? (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onSetCommandMode('move')}
                className={`min-h-[44px] lg:min-h-[38px] px-2.5 py-2 rounded border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  commandMode === 'move'
                    ? 'bg-[#D97706] border-[#F59E0B] text-[#12100E]'
                    : 'bg-[#231F1A] hover:bg-[#302A22] active:bg-[#3D3426] border-[#4A3F2F] text-[#F3ECE0]'
                }`}
              >
                <Navigation className="w-4 h-4 shrink-0" />
                <span>{lang === 'en' ? 'Move Army' : 'เดินทัพ'}</span>
              </button>

              <button
                type="button"
                onClick={() => onSetCommandMode('attack')}
                className={`min-h-[44px] lg:min-h-[38px] px-2.5 py-2 rounded border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  commandMode === 'attack'
                    ? 'bg-[#DC2626] border-[#F87171] text-white'
                    : 'bg-[#231F1A] hover:bg-[#302A22] active:bg-[#3D3426] border-[#4A3F2F] text-[#FCA5A5]'
                }`}
              >
                <Crosshair className="w-4 h-4 shrink-0" />
                <span>{lang === 'en' ? 'Attack' : 'บุกโจมตี'}</span>
              </button>

              <button
                type="button"
                onClick={() => onDefend(army.id)}
                className={`min-h-[44px] lg:min-h-[38px] px-2.5 py-2 rounded border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  army.status === 'defending'
                    ? 'bg-[#1D4ED8] border-[#60A5FA] text-white'
                    : 'bg-[#231F1A] hover:bg-[#302A22] active:bg-[#3D3426] border-[#4A3F2F] text-[#93C5FD]'
                }`}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span>{lang === 'en' ? 'Defend' : 'ตั้งรับ'}</span>
              </button>

              <button
                type="button"
                onClick={() => onCaptureCity(army.id)}
                className="min-h-[44px] lg:min-h-[38px] px-2.5 py-2 rounded bg-[#065F46]/60 hover:bg-[#065F46] active:bg-[#047857] border border-[#10B981]/60 text-xs font-semibold text-[#A7F3D0] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Flag className="w-4 h-4 shrink-0" />
                <span>{lang === 'en' ? 'Capture City' : 'ยึดเมือง'}</span>
              </button>
            </div>

            {/* Direct Connected Destination Quick-Dispatch Bar when Move or Attack is active */}
            {(commandMode === 'move' || commandMode === 'attack') &&
              connectedCities.length > 0 && (
                <div className="mt-2 p-2.5 rounded bg-[#12100E] border border-[#D97706]/70">
                  <div className="text-[11px] text-[#F59E0B] font-medium mb-2">
                    {commandMode === 'attack'
                      ? lang === 'en'
                        ? 'Tap target city to assault (or tap directly on map):'
                        : 'แตะเลือกเมืองเป้าหมายเพื่อบุกโจมตี (หรือแตะบนแผนที่):'
                      : lang === 'en'
                      ? 'Tap destination city to march (or tap directly on map):'
                      : 'แตะเลือกเมืองปลายทางเพื่อเคลื่อนพล (หรือแตะบนแผนที่):'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {connectedCities.map((dest) => {
                      const isEnemy = dest.ownerFactionId !== playerFactionId;
                      return (
                        <button
                          key={dest.id}
                          type="button"
                          onClick={() =>
                            onOrderArmyToCity(army.id, dest.id, commandMode)
                          }
                          className={`min-h-[40px] lg:min-h-[32px] px-3 py-1.5 rounded text-xs lg:text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                            isEnemy
                              ? 'bg-[#7F1D1D]/70 hover:bg-[#991B1B] text-[#FECACA] border border-[#EF4444]/60'
                              : 'bg-[#1E293B] hover:bg-[#334155] text-[#E2E8F0] border border-[#60A5FA]/50'
                          }`}
                        >
                          <span>{isEnemy ? '!' : '->'}</span>
                          <span>{dest.name[lang]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Separated High-Impact / Retreat Action */}
            {army.status === 'capturing' && (
              <div className="mt-2.5 pt-2 border-t border-[#2E271D]">
                <button
                  type="button"
                  onClick={() => onRetreat(army.id)}
                  className="w-full min-h-[44px] lg:min-h-[38px] px-3 py-2 rounded bg-[#3A2010] hover:bg-[#522D16] border border-[#D97706]/60 text-xs font-semibold text-[#FCD34D] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  <span>
                    {lang === 'en'
                      ? 'Break Siege & Retreat to Friendly City'
                      : 'ถอนทัพจากการปิดล้อมกลับสู่เมืองฝ่ายเรา'}
                  </span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="p-2.5 rounded bg-[#14120F] border border-[#2C251C] text-[11px] text-[#A89F8E]">
            {lang === 'en'
              ? `Rival army under ${ownerFaction.name.en}. Select one of your own armies to issue tactical orders.`
              : `กองทัพต่างก๊ก (${ownerFaction.name.th}) เลือกกองทัพฝ่ายท่านเพื่อออกคำสั่งยุทธการ`}
          </div>
        )}
      </div>

      {/* Troop Composition (4 Troop Types + Touch-Friendly Reinforce Buttons) */}
      <div className="pt-2 border-t border-[#2E271D]">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[#A89F8E] mb-1.5">
          <span>
            {lang === 'en'
              ? 'Troop Composition & Unit Counters'
              : 'สัดส่วนทัพและประเภททหาร (4 เหล่า)'}
          </span>
          {isPlayerArmy && (
            <span className="text-[10.5px] text-[#D97706]">
              {lang === 'en' ? 'Tap + to reinforce' : 'แตะ + เพื่อเสริมพล'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {(['spearmen', 'cavalry', 'archers', 'infantry'] as TroopType[]).map(
            (tKey) => {
              const tInfo = TROOP_TYPES[tKey];
              const count = army.composition[tKey] || 0;
              return (
                <div
                  key={tKey}
                  className="bg-[#12100E] border border-[#2C251C] rounded p-2 flex flex-col justify-between"
                  title={tInfo.description[lang]}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-medium text-[11.5px] text-[#E5DEC9] leading-tight">
                      {tInfo.name[lang]}
                    </span>
                    {isPlayerArmy && (
                      <button
                        type="button"
                        onClick={() => onReinforceTroop(army.id, tKey)}
                        className="min-w-[36px] min-h-[36px] lg:min-w-[28px] lg:min-h-[28px] p-1 rounded bg-[#262019] hover:bg-[#D97706] active:bg-[#F59E0B] hover:text-[#12100E] text-[#F59E0B] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        title={
                          lang === 'en'
                            ? `Reinforce +300 ${tInfo.name.en} (${tInfo.goldCostPer100 * 3}G / ${tInfo.supplyCostPer100 * 3}S)`
                            : `เสริมทัพ +300 ${tInfo.name.th} (${tInfo.goldCostPer100 * 3} ทอง / ${tInfo.supplyCostPer100 * 3} เสบียง)`
                        }
                        aria-label={
                          lang === 'en'
                            ? `Reinforce +300 ${tInfo.name.en}`
                            : `เสริมทัพ +300 ${tInfo.name.th}`
                        }
                      >
                        <Plus className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="font-mono-num font-semibold text-xs text-[#F3ECE0] mt-1">
                    {count.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#A89F8E] mt-0.5 truncate">
                    {tInfo.counterDescription[lang]}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
    </section>
  );
};
