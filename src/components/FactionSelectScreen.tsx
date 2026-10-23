import React, { useEffect, useState } from 'react';
import {
  Castle,
  Coins,
  Wheat,
  Swords,
  Globe,
  Volume2,
  VolumeX,
  FolderOpen,
} from 'lucide-react';
import { FACTIONS_BASE } from '../game/initialState';
import { GENERALS, INITIAL_CITIES } from '../game/mapData';
import { Language, PlayableFactionId } from '../game/types';
import { PWAInstallButton } from './PWAStatusBanner';

interface FactionSelectScreenProps {
  initialFaction: PlayableFactionId;
  hasSavedGame: boolean;
  lang: Language;
  isMuted: boolean;
  onToggleLang: () => void;
  onToggleMute: () => void;
  onStartCampaign: (factionId: PlayableFactionId) => void;
  onLoadSavedGame: () => void;
}

const PLAYABLE_FACTIONS: PlayableFactionId[] = ['wei', 'shu', 'wu'];

export const FactionSelectScreen: React.FC<FactionSelectScreenProps> = ({
  initialFaction,
  hasSavedGame,
  lang,
  isMuted,
  onToggleLang,
  onToggleMute,
  onStartCampaign,
  onLoadSavedGame,
}) => {
  const [selected, setSelected] = useState<PlayableFactionId>(initialFaction);

  // Bind Enter / Space to start campaign when not focused on another button
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'BUTTON' ||
        document.activeElement?.tagName === 'INPUT'
      ) {
        return;
      }
      if (e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartCampaign(selected);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected, onStartCampaign]);

  return (
    <div className="relative w-full h-full overflow-y-auto bg-[#12100E] text-[#F3ECE0] flex flex-col justify-between pt-safe pb-safe px-safe p-4 sm:p-8 select-none">
      {/* Subtle Parchment & Ink Atmospheric Radial Backdrop */}
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 25%, #8A6D3B 0%, #1F1A14 55%, #0D0B09 100%)',
        }}
      />

      {/* Top Utility Bar */}
      <div className="relative z-10 max-w-6xl w-full mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-[#A89F8E] font-mono-num">
          {lang === 'en' ? 'CHRONICLES OF 208 AD · V0.2' : 'บันทึกศักราช ค.ศ. 208 · V0.2'}
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton lang={lang} />

          <button
            type="button"
            onClick={onToggleLang}
            className="min-h-[40px] px-3 py-1.5 rounded bg-[#1E1A15] hover:bg-[#2C251E] border border-[#3D3426] text-xs font-medium text-[#F3ECE0] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#D97706]" />
            <span>{lang === 'en' ? 'EN / ไทย' : 'ไทย / EN'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="min-h-[40px] min-w-[40px] p-2 rounded bg-[#1E1A15] hover:bg-[#2C251E] border border-[#3D3426] text-[#F3ECE0] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Toggle Mute"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-[#A89F8E]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#D97706]" />
            )}
          </button>
        </div>
      </div>

      {/* Center Title Lockup & Faction Cards */}
      <div className="relative z-10 max-w-6xl w-full mx-auto my-auto py-4 sm:py-6 flex flex-col items-center">
        {/* Bespoke Inline SVG Imperial Dragon & Seal Lockup */}
        <div className="flex flex-col items-center text-center mb-5 sm:mb-8">
          <svg
            viewBox="0 0 120 44"
            className="w-28 h-10 mb-2 text-[#D97706]"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="42"
              y="4"
              width="36"
              height="36"
              rx="4"
              stroke="currentColor"
              strokeWidth="2.2"
              fill="#231B12"
            />
            <rect
              x="46"
              y="8"
              width="28"
              height="28"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 2"
            />
            <path
              d="M6 22H36M84 22H114"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="36" cy="22" r="2.5" fill="currentColor" />
            <circle cx="84" cy="22" r="2.5" fill="currentColor" />
            <text
              x="60"
              y="28"
              textAnchor="middle"
              fill="#F59E0B"
              fontSize="16"
              fontWeight="bold"
              fontFamily="Cinzel, serif"
            >
              III
            </text>
          </svg>

          <h1 className="font-display font-extrabold text-xl sm:text-4xl md:text-5xl tracking-wider text-[#F3ECE0] balance">
            {lang === 'en'
              ? 'THREE KINGDOMS: WAR OF WARLORDS'
              : 'สามก๊ก: สงครามจอมราชันย์'}
          </h1>
          <p className="text-xs sm:text-sm text-[#C9C0B1] max-w-2xl mt-2">
            {lang === 'en'
              ? 'Select your Sovereign Kingdom to command real-time armies, fortify ancient cities, and unite the realm under one banner.'
              : 'เลือกก๊กของท่านเพื่อบัญชาการกองทัพแบบเรียลไทม์ บริหารหัวเมืองยุทธศาสตร์ และรวบรวมแผ่นดินให้เป็นหนึ่งเดียว'}
          </p>
        </div>

        {/* Three Kingdoms Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 w-full">
          {PLAYABLE_FACTIONS.map((fid) => {
            const faction = FACTIONS_BASE[fid];
            const isSelected = selected === fid;
            const startingCities = INITIAL_CITIES.filter(
              (c) => c.ownerFactionId === fid
            );
            const factionGenerals = Object.values(GENERALS).filter(
              (g) => g.factionId === fid
            );

            return (
              <div
                key={fid}
                onClick={() => setSelected(fid)}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected(fid);
                  }
                }}
                className={`rounded-md p-4 sm:p-5 transition-all cursor-pointer flex flex-col justify-between border ${
                  isSelected
                    ? 'bg-[#1F1B16] border-[#F59E0B] shadow-xl ring-1 ring-[#F59E0B]'
                    : 'bg-[#161411]/90 border-[#332B20] hover:border-[#5C4D38]'
                }`}
              >
                <div>
                  {/* Card Top: Seal & Kingdom Name */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded flex items-center justify-center font-display font-bold text-xl text-white border border-white/25 shadow shrink-0"
                        style={{ backgroundColor: faction.bannerBg }}
                      >
                        {faction.dynastySeal}
                      </div>
                      <div>
                        <h2 className="font-display font-bold text-base sm:text-lg text-[#F3ECE0]">
                          {faction.name[lang]}
                        </h2>
                        <div
                          className="text-xs font-semibold"
                          style={{ color: faction.secondaryColor }}
                        >
                          {faction.rulerName[lang]}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-xs font-semibold text-[#F59E0B] shrink-0">
                        {lang === 'en' ? 'Selected' : 'เลือกแล้ว'}
                      </span>
                    )}
                  </div>

                  {/* Motto & Lore */}
                  <div className="text-xs italic text-[#E5DEC9] mb-2">
                    “{faction.motto[lang]}”
                  </div>
                  <p className="text-xs text-[#A89F8E] leading-relaxed mb-4">
                    {faction.description[lang]}
                  </p>
                </div>

                {/* Starting Resources & Roster Summary */}
                <div className="space-y-2.5 pt-3 border-t border-[#2E271D] text-xs">
                  <div className="grid grid-cols-3 gap-2 bg-[#12100E] rounded p-2 border border-[#262019]">
                    <div>
                      <div className="text-[10.5px] text-[#A89F8E] flex items-center gap-1">
                        <Coins className="w-3 h-3 text-[#F59E0B]" />
                        <span>{lang === 'en' ? 'Gold' : 'ทองคำ'}</span>
                      </div>
                      <div className="font-mono-num font-semibold text-[#F3ECE0] mt-0.5">
                        {faction.gold.toLocaleString()}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10.5px] text-[#A89F8E] flex items-center gap-1">
                        <Wheat className="w-3 h-3 text-[#10B981]" />
                        <span>{lang === 'en' ? 'Supplies' : 'เสบียง'}</span>
                      </div>
                      <div className="font-mono-num font-semibold text-[#F3ECE0] mt-0.5">
                        {faction.supplies.toLocaleString()}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10.5px] text-[#A89F8E] flex items-center gap-1">
                        <Castle className="w-3 h-3 text-[#60A5FA]" />
                        <span>{lang === 'en' ? 'Cities' : 'หัวเมือง'}</span>
                      </div>
                      <div className="font-mono-num font-semibold text-[#F3ECE0] mt-0.5">
                        {startingCities.length}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#C9C0B1]">
                    <span className="text-[#A89F8E]">
                      {lang === 'en' ? 'Strongholds: ' : 'เมืองเริ่มต้น: '}
                    </span>
                    {startingCities.map((c) => c.name[lang]).join(' · ')}
                  </div>

                  <div className="text-[11px] text-[#C9C0B1]">
                    <span className="text-[#A89F8E]">
                      {lang === 'en' ? 'Generals: ' : 'ขุนพลเอก: '}
                    </span>
                    {factionGenerals.map((g) => g.name[lang]).join(' · ')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action CTAs */}
        <div className="mt-6 sm:mt-7 flex flex-wrap items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStartCampaign(selected);
            }}
            className="w-full sm:w-auto min-h-[48px] px-6 sm:px-7 py-3 rounded bg-[#D97706] hover:bg-[#B45309] active:bg-[#92400E] text-[#12100E] font-display font-bold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2.5 shadow-lg transition-colors cursor-pointer"
          >
            <Swords className="w-5 h-5 shrink-0" />
            <span>
              {lang === 'en'
                ? `Start Campaign as ${FACTIONS_BASE[selected].name.en}`
                : `เริ่มทำศึกในนาม ${FACTIONS_BASE[selected].name.th}`}
            </span>
          </button>

          {hasSavedGame && (
            <button
              type="button"
              onClick={onLoadSavedGame}
              className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded bg-[#1F1B16] hover:bg-[#2C251E] border border-[#4A3F2F] text-[#F3ECE0] font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-[#60A5FA] shrink-0" />
              <span>
                {lang === 'en' ? 'Continue Saved Campaign' : 'เล่นต่อจากที่บันทึกไว้'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Flat Control Hint Footer */}
      <div className="relative z-10 text-center text-xs text-[#8C8272] pt-2">
        {lang === 'en'
          ? 'Controls: Drag / WASD to Pan Map · Pinch / Scroll to Zoom · Tap City or Army to Command · Space to Pause'
          : 'การควบคุม: ลากนิ้ว/เมาส์หรือกด WASD เพื่อเลื่อนแผนที่ · ถ่างนิ้ว/ลูกกลิ้งเพื่อซูม · แตะเมืองหรือกองทัพเพื่อสั่งการ'}
      </div>
    </div>
  );
};
