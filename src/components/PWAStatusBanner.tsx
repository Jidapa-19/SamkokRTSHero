import React, { useState } from 'react';
import { Download, WifiOff, X, Share } from 'lucide-react';
import { Language } from '../game/types';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  lang: Language;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  lang,
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await promptInstall();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`min-h-[38px] sm:min-h-[36px] px-2.5 py-1.5 rounded bg-[#231F1A] hover:bg-[#2F2922] border border-[#D97706]/60 text-xs font-medium text-[#FDE68A] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer`}
        title={
          lang === 'en'
            ? 'Install App for Offline & Fullscreen Play'
            : 'ติดตั้งแอปลงเครื่องเพื่อเล่นแบบเต็มจอและออฟไลน์'
        }
        aria-label={lang === 'en' ? 'Install App' : 'ติดตั้งแอป'}
      >
        <Download className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
        <span className={compact ? 'hidden md:inline' : ''}>
          {lang === 'en'
            ? isIOS
              ? 'Install on iOS'
              : 'Install App'
            : 'ติดตั้งเกม'}
        </span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="max-w-sm w-full bg-[#181613] border border-[#D97706] rounded-md p-5 text-left shadow-2xl text-[#F3ECE0]">
            <div className="flex items-center justify-between border-b border-[#2E271D] pb-2.5 mb-3">
              <div className="flex items-center gap-2 font-display font-bold text-sm text-[#F59E0B]">
                <Download className="w-4 h-4" />
                <h3 id="pwa-install-title">
                  {lang === 'en'
                    ? 'Install Web App (Offline Ready)'
                    : 'วิธีติดตั้งเว็บแอปลงหน้าจอหลัก'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded bg-[#231F1A] hover:bg-[#302A22] text-[#A89F8E] hover:text-[#F3ECE0] cursor-pointer"
                aria-label={lang === 'en' ? 'Close' : 'ปิด'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-2.5 text-xs text-[#C9C0B1] leading-relaxed">
                <p>
                  {lang === 'en'
                    ? 'To install Three Kingdoms: War of Warlords on iPhone or iPad:'
                    : 'สำหรับ iPhone และ iPad (Safari):'}
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-[#F3ECE0]">
                  <li>
                    {lang === 'en' ? (
                      <>
                        Tap the <Share className="w-3.5 h-3.5 inline text-[#60A5FA]" />{' '}
                        <strong>Share</strong> button in Safari.
                      </>
                    ) : (
                      <>
                        แตะปุ่ม <Share className="w-3.5 h-3.5 inline text-[#60A5FA]" />{' '}
                        <strong>แชร์ (Share)</strong> ในแถบ Safari
                      </>
                    )}
                  </li>
                  <li>
                    {lang === 'en' ? (
                      <>
                        Select <strong>Add to Home Screen</strong>.
                      </>
                    ) : (
                      <>
                        เลือกเมนู <strong>เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)</strong>
                      </>
                    )}
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-[#C9C0B1] leading-relaxed">
                <p>
                  {lang === 'en'
                    ? 'Use your browser menu ("Install App" or "Add to Home Screen") to install this game on your device.'
                    : 'เปิดเมนูเบราว์เซอร์ของคุณแล้วเลือก "ติดตั้งแอป (Install App)" หรือ "เพิ่มลงในหน้าจอหลัก"'}
                </p>
              </div>
            )}

            <div className="mt-3 p-2.5 rounded bg-[#12100E] border border-[#2C251C] text-[11px] text-[#A89F8E]">
              {lang === 'en'
                ? 'Offline Note: Once cached, the full campaign map, AI warlords, and browser LocalStorage saves work without an internet connection.'
                : 'หมายเหตุออฟไลน์: ตัวเกม แผนที่ยุทธศาสตร์ บอท AI และระบบเซฟในเบราว์เซอร์สามารถทำงานแบบออฟไลน์ได้ทันทีหลังโหลดเสร็จ'}
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="mt-4 w-full min-h-[44px] py-2 rounded bg-[#D97706] hover:bg-[#B45309] text-[#12100E] font-semibold text-xs cursor-pointer"
            >
              {lang === 'en' ? 'Got It' : 'เข้าใจแล้ว'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineStatusBanner: React.FC<{ lang: Language }> = ({ lang }) => {
  const { isOnline } = usePWAInstall();
  const [dismissed, setDismissed] = useState<boolean>(false);

  if (isOnline || dismissed) return null;

  return (
    <div
      role="status"
      className="bg-[#2D1F0E] border-b border-[#D97706] px-3 py-1.5 text-xs text-[#FDE68A] flex items-center justify-between gap-2 z-30 shrink-0"
    >
      <div className="flex items-center gap-2 min-w-0">
        <WifiOff className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
        <span className="truncate">
          {lang === 'en'
            ? 'Offline Mode — Single-player campaign, AI, and local browser saves remain fully available.'
            : 'โหมดออฟไลน์ — ระบบแผนที่ยุทธศาสตร์ บอท AI และเซฟเกมในเครื่องยังใช้งานได้ตามปกติ'}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1 rounded hover:bg-[#3D2B14] text-[#FDE68A] shrink-0 cursor-pointer"
        aria-label={lang === 'en' ? 'Dismiss offline notice' : 'ปิดการแจ้งเตือนออฟไลน์'}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
