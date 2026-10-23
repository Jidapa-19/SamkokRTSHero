import React from 'react';
import { ScrollText, X } from 'lucide-react';
import { BattleEvent, Language } from '../game/types';

interface BattleLogProps {
  events: BattleEvent[];
  lang: Language;
  onClose?: () => void;
}

const EVENT_TYPE_COLOR: Record<BattleEvent['type'], string> = {
  combat: 'text-[#F87171]',
  capture: 'text-[#FBBF24]',
  movement: 'text-[#93C5FD]',
  economy: 'text-[#6EE7B7]',
  system: 'text-[#D6CEBF]',
};

const EVENT_TYPE_SYMBOL: Record<BattleEvent['type'], string> = {
  combat: '×',
  capture: '◆',
  movement: '→',
  economy: '+',
  system: '•',
};

export const BattleLog: React.FC<BattleLogProps> = ({ events, lang, onClose }) => {
  return (
    <section
      aria-label={lang === 'en' ? 'Imperial War Chronicles' : 'บันทึกเหตุการณ์สงคราม'}
      className="bg-[#181613] border border-[#3D3426] rounded p-3 flex flex-col gap-2 text-xs text-[#F3ECE0] shadow-lg h-44 sm:h-40"
    >
      <div className="flex items-center justify-between border-b border-[#2E271D] pb-1.5 shrink-0">
        <div className="flex items-center gap-2 font-display font-bold text-xs sm:text-sm text-[#E5DEC9]">
          <ScrollText className="w-4 h-4 text-[#D97706]" />
          <span>
            {lang === 'en' ? 'Imperial War Chronicles' : 'บันทึกเหตุการณ์สงคราม'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono-num text-[11px] text-[#A89F8E]">
            {events.length} {lang === 'en' ? 'entries' : 'รายการ'}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="min-w-[36px] min-h-[36px] -mr-1 -my-1 rounded bg-[#231F1A] hover:bg-[#302A22] border border-[#3D3426] text-[#C9C0B1] hover:text-[#F3ECE0] flex items-center justify-center cursor-pointer"
              aria-label={lang === 'en' ? 'Close Chronicles' : 'ปิดบันทึกสงคราม'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
        {events.length === 0 ? (
          <div className="text-[#A89F8E] text-[11px] py-2">
            {lang === 'en'
              ? 'No strategic events recorded yet.'
              : 'ยังไม่มีบันทึกเหตุการณ์ยุทธศาสตร์'}
          </div>
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              className="text-[11.5px] leading-snug flex items-baseline gap-2 border-b border-[#241F19] pb-1 last:border-b-0"
            >
              <span className="font-mono-num text-[10px] text-[#8C8272] shrink-0">
                [{ev.timestamp}]
              </span>
              <span
                className="font-mono-num text-[10px] text-[#A89F8E] shrink-0"
                aria-hidden="true"
              >
                {EVENT_TYPE_SYMBOL[ev.type]}
              </span>
              <span className={EVENT_TYPE_COLOR[ev.type] || 'text-[#F3ECE0]'}>
                {ev.message[lang]}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
