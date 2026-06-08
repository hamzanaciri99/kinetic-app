import React, { createContext, useContext, useMemo, useState } from 'react';
import { useClearOnReset } from './DataContext';

export type TimelineItem = { id: string; date: string; image: string; featured?: boolean; category?: string };

export const BEFORE_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCTSkse_Sa941Ox_cSeAJcqLUwbmluL_vwE2AWJ9o0yMSNssbZaYtBTpJsMwF9Xzm9O0UdRndX6zCLmJIGtF50HEYbNqaEDmjPfSbbIBvy8U1f2Ay3om7ap0DRJeie1HYZrxw70LYyDNX8vJIDSGhRGwMC3kcxZIL8kS5fyGi2v2UN-Moha_xwTtYTeOhKM9fb8KdctT7Q_W-fCH2qPK4TVxxvgBX3uan5A3FDieuNc7zxDSmAOQKOz4MzND86xx22ZcYBGOn2q5_g6';
export const AFTER_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBdY1S8ekhd5lkMeoVRRteKeELbNN-BKWa-COjlra3HOVIGqExzyP03ps6UgHkdAuFV8t7Dar7Qo6yI-kIhsQEKCXoPsB4BaG-nuiNiVqxlW3bhHsZY8V88HMM3MI3hdfdNIy0yS-P36ztUkkBYg5_6Dl2lcCG5xzB2OBfEegJQyK31aG5SaIKSLhh9qOxuFaNNsumA_bRFRchrDU2igOFeqrCJQdhDfqqI6s7f-_wGxL4K_OWgE55BhuUj-FtudPjLYHII8scw5sPN';

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
}

const initialTimeline: TimelineItem[] = [
  {
    id: 'seed-aug12',
    date: 'AUG 12',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDXbNPC8x4jF5xMBCYaR6teWbxkImWGs2JuuZq1VaR4zMTAr7NOBXIf0d__rb2bz-twis8CgkGWZNnoVMXcCjLlyY0eZaTdAZdxzOnRG3UddKqh5VrBxQu-NPXZtyqaBTDDGlNdc2JyYhiD1tqX05SeckiImzmDr98vyJo9ZyTp1ZqDrSbt39q5ATACC-r_mSl6iSUW5hIIRZ_obA_SgTlDQGKRkXJkoiDqb1Nlgv0bQKl1e1J4XxQqI5hOehdz8Z0v5OVAZ0UBK9fO',
  },
  {
    id: 'seed-aug10',
    date: 'AUG 10',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCtEUbni0g0O5GvObmg_aTJ8-SzLgM0XvrvRE1mv2iK9p0JDqTPH9WRlbeu2loUhqAYYMOPs4sAvYgF-3F8MQrxoIUlV4kypARPNeF6Ov721Zb-QDNYtIJLAOfBuFoDjB-kji5WSdiPRPsTU85TQQL-JV-KXvet3_Zyd0h2evEfp9wLyf6TAcYMAQ-Y6A2TZV3a1et5Pgvlvw7J_vKH0CWj-aqf0XI6Ev3f_1jEtd7Q7CPydizDM3zC764B-uAgYSNnhCOsS_q6sYq8',
  },
  {
    id: 'seed-aug08',
    date: 'AUG 08',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDm5YnJSmnFEr5wRL5XreKROyHvL0gUVK3pDTBRv83hYEyQgCeRM4a_AMp6MJlYZxInmpEeXp238P0zVO8muBmms7leVskWnOSezN_097Lud--4icicOVXmv-OFgUp0A7UMJCZES5SYBVAawaadDjiEGzwjUxooiX2wItxAuXm8NcscgsYisdRwtrFLJpHDuW1QpU1kQHGC9HDimJh2fvmzPKVFYGzdA7Z7g4a2Tc482d6A9ASVr6k2w09ffL6C8Yii-74YmGUXLrqf',
  },
  {
    id: 'seed-aug05',
    date: 'AUG 05',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuADtFz5JACtBrDe7ej6HnQBE6esvg6n12bnAqOPd_c1oyW7VV0QYLHFWobPLNXkoBljudz27MhvGeSe8abd98ovVFypTHZfIWpm8nhbd17Otuftg8xZyGLcWzTjxZ5todfqZ0pJ9k3MCiWxu5dw3PCwV1xqZ1OWcNkDbqlc1SAF5ubXLFabhfE9qvikoJv1UcdwwUF3kneo0rRZQlYC-JaKHEOPLGkUIpfHq3Ol-Vf5LX0ffO4kF_w_OIDoHE7r5bVPWcwDNMYppCzy',
  },
  {
    id: 'seed-aug02',
    date: 'AUG 02',
    featured: true,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCSVcQdUD2XkooYgkLyaknkTk9a7bSd36m9TSYirWLHDmdGi0aT9pfNPld7CDc8xG6lIkveT5-iMArLpe7mPYvbGXzdpJzCnTbSLQlzNhhv43H3CvFVVl6deSCGkre4rg42iDaZzkSKc-fvSSK1H-_u-SpJldcBfaJfa-e2VvPabcPE7SqEn94UniDF47J29EkM3zlJztluNbvBxDOkRSOtQkHRzClInBNZTj2C26HPZB00rcs45NltkGSPoWixz1itHLmsgskvJJX0',
  },
  {
    id: 'seed-jul29',
    date: 'JUL 29',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCoUojIKXz8SKVLhgzHu2hyyzvxyUWMrsRlz2b415AH8_931Zc3Yj6YFajps06a3MCqww_lWGkrHl8gG6sX-SmD2DYS1DG4wdjfrlhlwwKjv6J5zvRzR9LMCCQB7uBCV1QEQnjPDPiIQrHFLl6bXwuX8mSMbdicL7DHJlaRVojmcMQ5DBxz3gXQ56qdgVivlgK2CPKFsTwfrEf3P6ntcDx2mCNXuNCwTAdhoG9APZqROd9dQgslX1pmbn5gV0eLe6lunHbmsT3q2jBT',
  },
  {
    id: 'seed-jul25',
    date: 'JUL 25',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuANpBtSlQv1eIL6Fa7UQwLXBqCUleMXfhyN9ICT7nejtuN7tEfrFgux150da5akJZloZMad1HLKi3a9eOK5stw1HwrQjBQiSRoFEHKLVDdWXlzCVQ0kr7ved38kgUNpn06-AtyNBJvp6PMDtObSz6T3yy92hHLmx8xC6W9CHH4peSwV-fFHNbWyVb_crSkeU4p7AdsSfHA6xs65ac2VPkC2RrKYdx3WsNsOhY-EqIUPENWpTz2ih-VEgBh4ucMiFGs3eSBEcZcoopM7',
  },
  {
    id: 'seed-jul21',
    date: 'JUL 21',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAPVAVVTBvvZyPi6nOMT6NE0elUN5xPnnQwTzVJSX896qO46_3zyGVRZpNVvrnGn8ogL_jQKLolNK8VD8JvKvR8aH6Avtr6nH8r9AGczsla1edrj6C2VLc43MQB4KiswKiO1gzeaLjKPQgD0pc5s2FMJ1SCwK5zVin_Yl4v0JbDuQPDeVCsZCT_r_N7gKyNXEJKvl3wn-RdF-COQ-1K2z_GFHGvwQyQ6mhVMzGe4bHe9hHoV0xiv1qMBryWoYt3N31R_J_clN02FH9E',
  },
  {
    id: 'seed-jul18',
    date: 'JUL 18',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBSjAc2so46763qkRDDxSoBIuGmub6_31tzb1EYtsSls2BH-5IHWBzw2OCgUDeVvvS4fLKIt9h2FHrHTVU6Fp4Ua4yYX98hDzvQIf4qKb_U8qZbd1_MuAnj56cwVN26Ghou9jjmLNQg1572ip-OxjymaNDfl0C3fPE7bJ2-Ck9iV26cF17ArKL9JG9KixVDrrBISdw3f__kzBmsr-i20dEfv2O6v5et5m9UjI7jf0VOWotViHpCankzopqUz5-M5MmXpbQR1kbCstRt',
  },
];

let captureUid = 0;
function nextCaptureId() {
  captureUid += 1;
  return `capture-${captureUid}`;
}

type GalleryContextValue = {
  timeline: TimelineItem[];
  compare: { before: string; after: string };
  addCapture: (image: string, category?: string) => void;
  setCompareImage: (slot: 'before' | 'after', image: string) => void;
  toggleFeatured: (id: string) => void;
};

const GalleryContext = createContext<GalleryContextValue | null>(null);

/** Holds progress-photo timeline + before/after compare state at the provider level so it survives screen unmount/remount and reacts to "Clear Data". */
export function GalleryProvider({ children }: { children: React.ReactNode }) {
  const [timeline, setTimeline] = useState<TimelineItem[]>(initialTimeline);
  const [compare, setCompare] = useState({ before: BEFORE_IMG, after: AFTER_IMG });

  useClearOnReset('gallery', () => {
    setTimeline([]);
    setCompare({ before: BEFORE_IMG, after: AFTER_IMG });
  });

  const value = useMemo<GalleryContextValue>(
    () => ({
      timeline,
      compare,
      addCapture: (image, category) => {
        setTimeline((prev) => [{ id: nextCaptureId(), date: todayLabel(), image, category }, ...prev]);
      },
      setCompareImage: (slot, image) => {
        setCompare((prev) => ({ ...prev, [slot]: image }));
      },
      toggleFeatured: (id) => {
        setTimeline((prev) => prev.map((item) => (item.id === id ? { ...item, featured: !item.featured } : item)));
      },
    }),
    [timeline, compare],
  );

  return <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>;
}

export function useGallery() {
  const ctx = useContext(GalleryContext);
  if (!ctx) throw new Error('useGallery must be used within a GalleryProvider');
  return ctx;
}
