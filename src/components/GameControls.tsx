import React from 'react';
import { Play, Pause, Save, FolderOpen, FastForward } from 'lucide-react';
import { Language } from '../game/types';

interface GameControlsProps {
  isPaused: boolean;
  gameSpeed: 1 | 2;
  hasSavedGame: boolean;
  lang: Language;
  onTogglePause: () => void;
  onSetSpeed: (speed: 1 | 2) => void;
  onSaveGame: () => void;
  onLoadGame: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  isPaused,
  gameSpeed,
  hasSavedGame,
  lang,
  onTogglePause,
  onSetSpeed,
  onSaveGame,
  onLoadGame,
}) => {
  return (
    <section
      aria-label={lang === 'en' ? 'Simulation and Save Controls' : 'ควบคุมเวลาและบันทึกเกม'}
      className="bg-[#181613] border border-[#3D3426] rounded p-1.5 sm:p-2.5 flex items-center justify-between gap-1 sm:gap-2 text-xs text-[#F3ECE0] shadow-lg shrink-0"
    >
      {/* Simulation Loop Controls: Pause / Resume & Speed */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={onTogglePause}
          className={`min-h-[42px] lg:min-h-[36px] px-2 sm:px-3 py-1.5 rounded font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
            isPaused
              ? 'bg-[#059669] hover:bg-[#047857] text-white'
              : 'bg-[#D97706] hover:bg-[#B45309] text-[#12100E]'
          }`}
        >
          {isPaused ? (
            <>
              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>{lang === 'en' ? 'Resume' : 'เดินเวลา'}</span>
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>{lang === 'en' ? 'Pause' : 'หยุด'}</span>
            </>
          )}
        </button>

        <div className="flex items-center rounded bg-[#12100E] border border-[#3D3426] p-0.5">
          <button
            type="button"
            onClick={() => onSetSpeed(1)}
            aria-label={lang === 'en' ? 'Normal Speed 1x' : 'ความเร็วปกติ 1x'}
            className={`min-h-[38px] lg:min-h-[30px] min-w-[32px] sm:min-w-[36px] px-1.5 sm:px-2 py-1 rounded text-[11px] font-mono-num font-semibold transition-colors cursor-pointer ${
              gameSpeed === 1
                ? 'bg-[#3D3426] text-[#F59E0B]'
                : 'text-[#A89F8E] hover:text-[#F3ECE0]'
            }`}
          >
            1x
          </button>
          <button
            type="button"
            onClick={() => onSetSpeed(2)}
            aria-label={lang === 'en' ? 'Fast Speed 2x' : 'ความเร็ว 2x'}
            className={`min-h-[38px] lg:min-h-[30px] min-w-[36px] sm:min-w-[40px] px-1.5 sm:px-2 py-1 rounded text-[11px] font-mono-num font-semibold flex items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              gameSpeed === 2
                ? 'bg-[#3D3426] text-[#F59E0B]'
                : 'text-[#A89F8E] hover:text-[#F3ECE0]'
            }`}
          >
            <FastForward className="w-3 h-3 shrink-0" />
            <span>2x</span>
          </button>
        </div>
      </div>

      {/* Persistence Controls: Save Game & Load Game */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={onSaveGame}
          className="min-h-[42px] lg:min-h-[36px] px-2 sm:px-2.5 py-1.5 rounded bg-[#231F1A] hover:bg-[#302A22] active:bg-[#3D3426] border border-[#4A3F2F] text-xs font-medium text-[#E5DEC9] flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          title={lang === 'en' ? 'Save Game to Browser Storage' : 'บันทึกเกมลงเบราว์เซอร์'}
          aria-label={lang === 'en' ? 'Save Game' : 'บันทึกเกม'}
        >
          <Save className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
          <span>{lang === 'en' ? 'Save' : 'บันทึก'}</span>
        </button>

        <button
          type="button"
          onClick={onLoadGame}
          className={`min-h-[42px] lg:min-h-[36px] px-2 sm:px-2.5 py-1.5 rounded border text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
            hasSavedGame
              ? 'bg-[#231F1A] hover:bg-[#302A22] active:bg-[#3D3426] border-[#4A3F2F] text-[#E5DEC9]'
              : 'bg-[#1A1714] border-[#2C251C] text-[#78716C] hover:text-[#A89F8E]'
          }`}
          title={lang === 'en' ? 'Load Saved Game' : 'โหลดเกมที่บันทึกไว้'}
          aria-label={lang === 'en' ? 'Load Game' : 'โหลดเกม'}
        >
          <FolderOpen className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" />
          <span>{lang === 'en' ? 'Load' : 'โหลด'}</span>
        </button>
      </div>
    </section>
  );
};
