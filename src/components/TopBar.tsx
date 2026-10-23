import React from 'react';
import { Coins, Wheat, Users, Castle, Volume2, VolumeX, Globe, Flag } from 'lucide-react';
import { City, Faction, Language } from '../game/types';
import { PWAInstallButton } from './PWAStatusBanner';

interface TopBarProps {
  playerFaction: Faction;
  cities: City[];
  seasonYear: { en: string; th: string };
  lang: Language;
  onToggleLang: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenFactionSelect: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  playerFaction,
  cities,
  seasonYear,
  lang,
  onToggleLang,
  isMuted,
  onToggleMute,
  onOpenFactionSelect,
}) => {
  const ownedCities = cities.filter((c) => c.ownerFactionId === playerFaction.id);
  const goldIncome = ownedCities.reduce((sum, c) => sum + c.goldYield, 0);
  const supplyIncome = ownedCities.reduce((sum, c) => sum + c.supplyYield, 0);

  return (
    <header className="w-full bg-[#161411] border-b border-[#3D3426] pt-safe px-safe px-2.5 sm:px-5 py-1.5 sm:py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 md:gap-4 z-20 select-none shrink-0">
      {/* Top Row on Mobile / Left+Right Zones on Desktop */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        {/* Zone 1: Brand Title & Active Faction Seal */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded flex items-center justify-center font-display font-bold text-base text-[#F3ECE0] border border-[#D97706]/60 shrink-0 shadow-inner"
            style={{ backgroundColor: playerFaction.bannerBg }}
            title={playerFaction.name[lang]}
          >
            {playerFaction.dynastySeal}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display font-bold text-xs sm:text-base tracking-wide text-[#F3ECE0] truncate">
                {lang === 'en'
                  ? 'Three Kingdoms: War of Warlords'
                  : 'สามก๊ก: สงครามจอมราชันย์'}
              </h1>
              <span className="hidden xl:inline text-xs text-[#A89F8E] whitespace-nowrap">
                · {seasonYear[lang]}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#A89F8E] truncate">
              <span
                className="font-semibold truncate"
                style={{ color: playerFaction.secondaryColor }}
              >
                {playerFaction.name[lang]}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate hidden xs:inline sm:inline">
                {playerFaction.rulerName[lang]}
              </span>
              <span className="xl:hidden font-mono-num text-[10.5px] text-[#C9C0B1] truncate">
                {seasonYear[lang]}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Quick Utility Controls (shown on < md in top row so resources fit cleanly below) */}
        <div className="flex md:hidden items-center gap-1 shrink-0">
          <PWAInstallButton lang={lang} compact />
          <button
            type="button"
            onClick={onToggleLang}
            className="min-h-[38px] min-w-[40px] px-2 py-1 rounded bg-[#231F1A] hover:bg-[#2F2922] border border-[#3D3426] text-[11px] font-medium text-[#F3ECE0] flex items-center justify-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title={lang === 'en' ? 'Switch to Thai language' : 'เปลี่ยนเป็นภาษาอังกฤษ'}
            aria-label={lang === 'en' ? 'Switch Language' : 'เปลี่ยนภาษา'}
          >
            <Globe className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
            <span>{lang === 'en' ? 'TH' : 'EN'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="min-h-[38px] min-w-[38px] p-1.5 rounded bg-[#231F1A] hover:bg-[#2F2922] border border-[#3D3426] text-[#F3ECE0] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title={
              isMuted
                ? lang === 'en'
                  ? 'Unmute Audio'
                  : 'เปิดเสียง'
                : lang === 'en'
                ? 'Mute Audio'
                : 'ปิดเสียง'
            }
            aria-label={lang === 'en' ? 'Toggle Audio' : 'เปิด/ปิดเสียง'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-[#A89F8E]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#D97706]" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenFactionSelect}
            className="min-h-[38px] min-w-[38px] px-2 py-1 rounded bg-[#231F1A] hover:bg-[#2F2922] border border-[#3D3426] text-xs font-medium text-[#E5DEC9] flex items-center justify-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title={lang === 'en' ? 'Change Faction / Title Screen' : 'เลือกก๊กใหม่ / หน้าแรก'}
            aria-label={lang === 'en' ? 'Factions Menu' : 'เมนูเลือกก๊ก'}
          >
            <Flag className="w-3.5 h-3.5 text-[#D97706]" />
          </button>
        </div>
      </div>

      {/* Zone 2: Strategic Resource Readouts (Gold, Supplies, Total Troops, Cities) */}
      <div className="flex items-center justify-between md:justify-center gap-1 sm:gap-5 text-[10.5px] xs:text-xs sm:text-sm border-t border-[#2A231A] md:border-t-0 pt-1 md:pt-0">
        {/* Gold */}
        <div
          className="flex items-center gap-1 sm:gap-2 whitespace-nowrap shrink-0"
          title={lang === 'en' ? 'Imperial Gold Treasury' : 'คลังทองคำหลวง'}
        >
          <Coins className="w-3 h-3 sm:w-4 sm:h-4 text-[#F59E0B] shrink-0" />
          <div>
            <span className="text-[#A89F8E] mr-1 hidden lg:inline">
              {lang === 'en' ? 'Gold' : 'ทองคำ'}:
            </span>
            <span className="font-mono-num font-semibold text-[#F3ECE0]">
              {playerFaction.gold.toLocaleString()}
            </span>
            <span className="font-mono-num text-[9.5px] sm:text-[11px] text-[#34D399] ml-0.5">
              +{goldIncome}
            </span>
          </div>
        </div>

        <span className="text-[#3D3426]" aria-hidden="true">
          |
        </span>

        {/* Supplies */}
        <div
          className="flex items-center gap-1 sm:gap-2 whitespace-nowrap shrink-0"
          title={lang === 'en' ? 'Military Grain & Supplies' : 'เสบียงกรังกองทัพ'}
        >
          <Wheat className="w-3 h-3 sm:w-4 sm:h-4 text-[#10B981] shrink-0" />
          <div>
            <span className="text-[#A89F8E] mr-1 hidden lg:inline">
              {lang === 'en' ? 'Supplies' : 'เสบียง'}:
            </span>
            <span className="font-mono-num font-semibold text-[#F3ECE0]">
              {playerFaction.supplies.toLocaleString()}
            </span>
            <span className="font-mono-num text-[9.5px] sm:text-[11px] text-[#34D399] ml-0.5">
              +{supplyIncome}
            </span>
          </div>
        </div>

        <span className="text-[#3D3426]" aria-hidden="true">
          |
        </span>

        {/* Total Troops */}
        <div
          className="flex items-center gap-1 sm:gap-2 whitespace-nowrap shrink-0"
          title={
            lang === 'en'
              ? 'Total Military Strength (Armies + City Garrisons)'
              : 'กำลังทหารรวมทั้งหมด (กองทัพสนาม + ทหารรักษาการณ์)'
          }
        >
          <Users className="w-3 h-3 sm:w-4 sm:h-4 text-[#60A5FA] shrink-0" />
          <div>
            <span className="text-[#A89F8E] mr-1 hidden lg:inline">
              {lang === 'en' ? 'Troops' : 'กำลังพลรวม'}:
            </span>
            <span className="font-mono-num font-semibold text-[#F3ECE0]">
              {playerFaction.totalMilitaryStrength.toLocaleString()}
            </span>
          </div>
        </div>

        <span className="text-[#3D3426]" aria-hidden="true">
          |
        </span>

        {/* Owned Cities (Visible on all viewports including mobile!) */}
        <div
          className="flex items-center gap-1 sm:gap-2 whitespace-nowrap shrink-0"
          title={lang === 'en' ? 'Controlled Cities' : 'หัวเมืองในปกครอง'}
        >
          <Castle className="w-3 h-3 sm:w-4 sm:h-4 text-[#D97706] shrink-0" />
          <div>
            <span className="text-[#A89F8E] mr-1 hidden lg:inline">
              {lang === 'en' ? 'Cities' : 'เมือง'}:
            </span>
            <span className="font-mono-num font-semibold text-[#F3ECE0]">
              {ownedCities.length}/{cities.length}
            </span>
          </div>
        </div>
      </div>

      {/* Zone 3: Desktop & Tablet Utility Controls (>= md) */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        <PWAInstallButton lang={lang} compact />

        <button
          type="button"
          onClick={onToggleLang}
          className="min-h-[36px] px-2.5 py-1.5 rounded bg-[#231F1A] hover:bg-[#2F2922] border border-[#3D3426] text-xs font-medium text-[#F3ECE0] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title={lang === 'en' ? 'Switch to Thai language' : 'เปลี่ยนเป็นภาษาอังกฤษ'}
        >
          <Globe className="w-3.5 h-3.5 text-[#D97706]" />
          <span>{lang === 'en' ? 'EN / ไทย' : 'ไทย / EN'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          className="min-h-[36px] min-w-[36px] p-1.5 rounded bg-[#231F1A] hover:bg-[#2F2922] border border-[#3D3426] text-[#F3ECE0] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          title={
            isMuted
              ? lang === 'en'
                ? 'Unmute Audio'
                : 'เปิดเสียง'
              : lang === 'en'
              ? 'Mute Audio'
              : 'ปิดเสียง'
          }
          aria-label={lang === 'en' ? 'Toggle Audio' : 'เปิด/ปิดเสียง'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-[#A89F8E]" />
          ) : (
            <Volume2 className="w-4 h-4 text-[#D97706]" />
          )}
        </button>

        <button
          type="button"
          onClick={onOpenFactionSelect}
          className="min-h-[36px] px-2.5 py-1.5 rounded bg-[#231F1A] hover:bg-[#2F2922] border border-[#3D3426] text-xs font-medium text-[#E5DEC9] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Flag className="w-3.5 h-3.5 text-[#D97706]" />
          <span className="hidden lg:inline">
            {lang === 'en' ? 'Factions' : 'เลือกก๊ก'}
          </span>
        </button>
      </div>
    </header>
  );
};
