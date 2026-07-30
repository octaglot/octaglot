import { motion, type TargetAndTransition } from 'framer-motion';
import {
  ARM_BACK_L,
  ARM_BACK_R,
  ARM_MID_L,
  ARM_MID_R,
  BODY,
  VIEWBOX,
} from './mascotGeometry';

export type Mood = 'idle' | 'happy' | 'sad' | 'cheer' | 'think';

/* Okta — Octaglot'nun maskotu, mor bir ahtapot. Sekiz kolu uygulamadaki sekiz
   alıştırma tipine denk geliyor.

   Çizim Twemoji'nin ahtapot emojisinden (U+1F419) alındı, CC-BY 4.0 ile
   lisanslı; atıf profil ekranında ve README'de duruyor. Üzerinde yapılan
   değişiklikler: arka ve orta kollar tek yoldan ayrılıp bağımsız
   canlandırıldı, ruh haline göre göz ve ağız eklendi.

   Animasyon fikri: ahtapotun kolları aynı anda değil, kaydırmalı gecikmeyle
   salınır — asıl "suda süzülme" hissini veren bu faz farkı. Gövde ayrıca
   yavaşça yükselip alçalırken hafifçe eziliyor (nefes). */

const DARK = '#6a3788';
const MID = '#884eaa';
const BODY_COLOR = '#a766cc';
const EYE = '#292F33';

/* Dönme merkezi. Framer Motion, transform verilen SVG çocuklarına kendiliğinden
   `transform-box: fill-box` koyuyor; o kipte transform-origin elemanın kendi
   sınır kutusunun köşesinden ölçülür, viewBox'tan değil. Yani "18px 21px"
   gözlerin ortası değil, sınır kutusunun 18 birim sağı oluyor — pivot çizimin
   epey dışına düşüyor ve parça dönerken savruluyordu. `view-box` geçince origin
   yeniden viewBox koordinatı olur; framer style'dan geleni eziyor değil,
   olduğu gibi kullanıyor. Pivotları bu yüzden originX/originY ile değil
   buradan veriyoruz. */
const pivot = (x: number, y: number) => ({
  transformBox: 'view-box' as const,
  originX: `${x}px`,
  originY: `${y}px`,
});

/* Gövde: durgunken süzülür, sevinçte zıplar, üzülünce çöker. */
const bodyAnim: Record<Mood, TargetAndTransition> = {
  idle: {
    y: [0, -1.6, 0],
    scaleY: [1, 1.035, 1],
    scaleX: [1, 0.975, 1],
    rotate: 0,
    transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
  },
  think: {
    rotate: [-4, 4, -4],
    y: 0,
    scaleY: 1,
    scaleX: 1,
    transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' },
  },
  /* Her ruh hali animasyonun bütün özelliklerini yazıyor: eksik bırakılan
     özellik önceki halden olduğu gibi devralınır, üzgünken sıkışan gövde
     sevince geçince sıkışık kalırdı. */
  happy: {
    y: [0, -4.5, 0],
    scaleY: [1, 1.06, 1],
    scaleX: 1,
    rotate: 0,
    transition: { duration: 0.45, repeat: 2, ease: 'easeOut' },
  },
  cheer: {
    y: [0, -6, 0],
    rotate: [0, -7, 7, 0],
    scaleY: 1,
    scaleX: 1,
    transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
  },
  sad: { y: 2, rotate: 0, scaleY: 0.94, scaleX: 1.04, transition: { duration: 0.35 } },
};

/* Bir kolun salınımı. `phase` kolları birbirinden geciktirir; dalganın
   gövdenin bir yanından ötekine yürümesini sağlayan tek şey bu. */
function armAnim(mood: Mood, phase: number, dir: 1 | -1): TargetAndTransition {
  const wave = (deg: number, duration: number): TargetAndTransition => ({
    rotate: [0, deg * dir, 0, -deg * dir * 0.6, 0],
    transition: { duration, repeat: Infinity, ease: 'easeInOut', delay: phase },
  });
  switch (mood) {
    case 'idle':
      return wave(6, 3.4);
    case 'think':
      return wave(3.5, 4.6);
    case 'happy':
      return {
        rotate: [0, -12 * dir, 0],
        transition: { duration: 0.45, repeat: 2, ease: 'easeOut', delay: phase * 0.4 },
      };
    case 'cheer':
      return wave(14, 1.1);
    case 'sad':
      return { rotate: 7 * dir, transition: { duration: 0.35 } };
  }
}

type ArmProps = { d: string; fill: string; ox: number; oy: number; mood: Mood; phase: number; dir: 1 | -1 };

function Arm({ d, fill, ox, oy, mood, phase, dir }: ArmProps) {
  return <motion.path d={d} fill={fill} animate={armAnim(mood, phase, dir)} style={pivot(ox, oy)} />;
}

/* Çizim kendi viewBox'ını boşluksuz doldurur (x 0→36, y 0→35.67); kolların
   uçları tam köşelere dayanır. Bu yüzden kare kutu yuvarlak bir çerçeveye
   konduğunda köşeler kaçınılmaz olarak kırpılır — daireye sığması için kutuyu
   büyütmek gerekir.

   `fit="circle"` çizimi, animasyonun uç kareleri dahil bütün hareketi
   çevreleyen dairenin çevrel karesine oturtur (bkz. `mascotGeometry.ts`).
   Kutunun **iç teğet dairesi** o zarfı payla çevrelediği için `size`
   doğrudan çerçevenin iç çapı verilebilir; kollar salınırken de kenarı
   kesmez. Pay şart: bir kez tam teğet boyutlandırılmıştı, durgunken sığıyor
   ama animasyon tepe yapınca taşıyordu. */

export function Mascot({
  mood = 'idle',
  size = 140,
  fit = 'box',
}: {
  mood?: Mood;
  size?: number;
  fit?: keyof typeof VIEWBOX;
}) {
  const sad = mood === 'sad';
  const joy = mood === 'happy' || mood === 'cheer';

  return (
    <svg width={size} height={size} viewBox={VIEWBOX[fit]} style={{ overflow: 'visible' }} aria-hidden="true">
      {/* Gövde kök <svg> yerine bu grupta canlandırılıyor: kök elemanın
          transform-origin'i viewBox birimiyle değil kutunun CSS pikseliyle
          ölçülüyor, yani boyut değiştikçe pivot da kayıyordu. */}
      <motion.g animate={bodyAnim[mood]} style={pivot(18, 30)}>
        {/* arka kollar */}
        <Arm d={ARM_BACK_L} fill={DARK} ox={12} oy={13} mood={mood} phase={0} dir={-1} />
        <Arm d={ARM_BACK_R} fill={DARK} ox={24} oy={13} mood={mood} phase={0.25} dir={1} />
        {/* orta kollar — kaynakta tek yoldu, bağımsız oynasın diye ayrıldı.
            Pivotlar kolun mantoya girdiği kök nokta; ucundan döndürülünce kol
            gövdeden kopuyordu. */}
        <Arm d={ARM_MID_L} fill={MID} ox={7.8} oy={17} mood={mood} phase={0.5} dir={-1} />
        <Arm d={ARM_MID_R} fill={MID} ox={28.2} oy={17} mood={mood} phase={0.75} dir={1} />

        {/* manto ve ön kollar */}
        <path d={BODY} fill={BODY_COLOR} />

        {/* gözler — durgunken kırpar, ruh haline göre biçim değiştirir */}
        {sad ? (
          <>
            <path d="M12 22a2 2 0 0 1 4 0" stroke={EYE} strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path d="M20 22a2 2 0 0 1 4 0" stroke={EYE} strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </>
        ) : joy ? (
          <>
            <path d="M12 22c1-2.2 3-2.2 4 0" stroke={EYE} strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path d="M20 22c1-2.2 3-2.2 4 0" stroke={EYE} strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </>
        ) : (
          /* Parlamalar da grubun içinde: dışarıda kalınca göz kapanırken
             yerlerinde asılı duruyorlardı. */
          <motion.g
            animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
            transition={{ duration: 4.5, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1] }}
            style={pivot(18, 21)}
          >
            <circle fill={EYE} cx="14" cy="21" r="2" />
            <circle fill={EYE} cx="22" cy="21" r="2" />
            <circle fill="#fff" cx="14.8" cy="20.2" r="0.6" />
            <circle fill="#fff" cx="22.8" cy="20.2" r="0.6" />
          </motion.g>
        )}

        {/* ağız — yalnızca ifadenin gerektiği hâllerde */}
        {joy && (
          <path d="M16 25.4c1 1.4 3 1.4 4 0" stroke={EYE} strokeWidth="1.2" strokeLinecap="round" fill="none" />
        )}
        {sad && (
          <path d="M16.4 26.2c.9-1.1 2.3-1.1 3.2 0" stroke={EYE} strokeWidth="1.2" strokeLinecap="round" fill="none" />
        )}
      </motion.g>
    </svg>
  );
}
