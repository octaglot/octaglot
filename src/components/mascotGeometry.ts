/* Okta'nın geometrisi ve zarfı.
 *
 * Ayrı dosya olmasının sebebi: bu değerler testten doğrulanabilmeli, ama
 * `Mascot.tsx` React ve framer-motion çekiyor. Burada React yok — saf sayı.
 *
 * Buradaki asıl iş `envelope()`: maskotun BÜTÜN ruh hâllerinde ve animasyonun
 * uç karelerinde kapladığı en küçük daire. Yuvarlak çerçevelere sığdırma bu
 * daireye göre yapılıyor; `mascot.test.ts` de VIEWBOX'ın bu daireyi paylı
 * biçimde çevrelediğini bekliyor. */

export const ARM_BACK_L = 'M10 12c3 5 0 10.692-3 9.692s-4 2-1 3 9.465-.465 13-4c1-1 2-1 2-1L10 12z';
export const ARM_BACK_R = 'M26 12c-3 5 0 10.692 3 9.692s4 2 1 3-9.465-.465-13-4c-1-1-2-1-2-1L26 12z';
export const ARM_MID_R = 'M30.188 16c-3 5 0 10.692 3 9.692s4 2 1 3-9.465-.465-13-4c-1-1-2-1-2-1l11-7.692z';
export const ARM_MID_L = 'M5.812 16c3 5 0 10.692-3 9.692s-4 2-1 3 9.465-.465 13-4c1-1 2-1 2-1L5.812 16z';
export const BODY =
  'M33.188 31.375c-2.729.91-6.425-5.626-4.812-10.578C30.022 17.554 31 13.94 31 11c0-7.18-5.82-11-13-11S5 3.82 5 11c0 2.94.978 6.554 2.624 9.797 1.613 4.952-2.083 11.488-4.812 10.578-3-1-4 3-1 4s8.31-.627 12-4c2.189-2 4.189-2 4.189-2s2 0 4.188 2c3.69 3.373 9 5 12 4s1.999-5-1.001-4z';

/** Kolların döndüğü kök noktalar (kolun mantoya girdiği yer). */
export const ARM_PIVOTS = {
  ARM_BACK_L: [12, 13],
  ARM_BACK_R: [24, 13],
  ARM_MID_L: [7.8, 17],
  ARM_MID_R: [28.2, 17],
} as const;

/** Gövdenin dönme/ölçek merkezi. */
export const BODY_PIVOT: [number, number] = [18, 30];

/* Animasyonun uç değerleri — `Mascot.tsx`'teki bütün ruh hâllerinin en geniş
   hâli. Bir ruh hâline daha geniş bir hareket eklenirse buraya da yazılmalı;
   yoksa zarf küçük kalır ve maskot çerçeveyi taşar (bir kez oldu). */
export const EXTREMES = {
  armRotate: [-14, 0, 14],
  bodyRotate: [-7, 0, 7],
  bodyShiftY: [-6, 0, 2],
  bodyScaleX: [0.975, 1, 1.04],
  bodyScaleY: [0.94, 1, 1.06],
} as const;

/* ---------------- yol örnekleme ---------------- */

type Pt = [number, number];

const tokenize = (d: string) => d.match(/[MmLlCcSsZz]|-?\d*\.?\d+/g) ?? [];

/** SVG yolunu noktalara açar. Yalnız bu çizimde geçen komutları destekler. */
export function samplePath(d: string, perCurve = 16): Pt[] {
  const t = tokenize(d);
  const pts: Pt[] = [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, px = 0, py = 0;
  const num = () => parseFloat(t[i++]);
  const cubic = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    for (let s = 0; s <= perCurve; s++) {
      const u = s / perCurve, m = 1 - u;
      pts.push([
        m * m * m * x + 3 * m * m * u * x1 + 3 * m * u * u * x2 + u * u * u * x3,
        m * m * m * y + 3 * m * m * u * y1 + 3 * m * u * u * y2 + u * u * u * y3,
      ]);
    }
    px = x2; py = y2; x = x3; y = y3;
  };
  while (i < t.length) {
    if (/[A-Za-z]/.test(t[i])) cmd = t[i++];
    if (cmd === 'M' || cmd === 'm') {
      const r = cmd === 'm';
      x = r ? x + num() : num(); y = r ? y + num() : num();
      sx = x; sy = y; pts.push([x, y]); px = x; py = y;
      cmd = r ? 'l' : 'L';
    } else if (cmd === 'L' || cmd === 'l') {
      const r = cmd === 'l';
      x = r ? x + num() : num(); y = r ? y + num() : num();
      pts.push([x, y]); px = x; py = y;
    } else if (cmd === 'C' || cmd === 'c') {
      const r = cmd === 'c', bx = r ? x : 0, by = r ? y : 0;
      cubic(bx + num(), by + num(), bx + num(), by + num(), bx + num(), by + num());
    } else if (cmd === 'S' || cmd === 's') {
      const r = cmd === 's', bx = r ? x : 0, by = r ? y : 0;
      cubic(2 * x - px, 2 * y - py, bx + num(), by + num(), bx + num(), by + num());
    } else if (cmd === 'Z' || cmd === 'z') {
      x = sx; y = sy; i++;
    } else i++;
  }
  return pts;
}

const rotate = ([x, y]: Pt, [cx, cy]: readonly [number, number], deg: number): Pt => {
  const a = (deg * Math.PI) / 180, dx = x - cx, dy = y - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
};

/** Animasyonun bütün uç bileşimlerinde çizimin ulaştığı noktalar. */
export function extremePoints(): Pt[] {
  const parts: [string, readonly [number, number] | null][] = [
    [ARM_BACK_L, ARM_PIVOTS.ARM_BACK_L],
    [ARM_BACK_R, ARM_PIVOTS.ARM_BACK_R],
    [ARM_MID_L, ARM_PIVOTS.ARM_MID_L],
    [ARM_MID_R, ARM_PIVOTS.ARM_MID_R],
    [BODY, null],
  ];
  const out: Pt[] = [];
  const [bx, by] = BODY_PIVOT;
  for (const [d, pivot] of parts) {
    for (const p of samplePath(d)) {
      for (const ar of pivot ? EXTREMES.armRotate : [0]) {
        const a = pivot ? rotate(p, pivot, ar) : p;
        for (const sx of EXTREMES.bodyScaleX) {
          for (const sy of EXTREMES.bodyScaleY) {
            const s: Pt = [bx + (a[0] - bx) * sx, by + (a[1] - by) * sy];
            for (const br of EXTREMES.bodyRotate) {
              const r = rotate(s, BODY_PIVOT, br);
              for (const dy of EXTREMES.bodyShiftY) out.push([r[0], r[1] + dy]);
            }
          }
        }
      }
    }
  }
  return out;
}

/** Noktaları çevreleyen (yaklaşık) en küçük daire — kaba aramadan inceye. */
export function envelope(): { cx: number; cy: number; r: number } {
  const pts = extremePoints();
  const farthest = (cx: number, cy: number) => {
    let m = 0;
    for (const [x, y] of pts) { const d = Math.hypot(x - cx, y - cy); if (d > m) m = d; }
    return m;
  };
  let best = { cx: 18, cy: 20, r: farthest(18, 20) };
  for (const step of [0.5, 0.1, 0.02]) {
    const { cx, cy } = best;
    for (let gx = cx - step * 10; gx <= cx + step * 10; gx += step) {
      for (let gy = cy - step * 10; gy <= cy + step * 10; gy += step) {
        const r = farthest(gx, gy);
        if (r < best.r) best = { cx: gx, cy: gy, r };
      }
    }
  }
  return best;
}

/* ---------------- viewBox'lar ---------------- */

/** Zarfın çevresine bırakılan pay. Tam teğet boyutlandırma bir kez taşmaya
    yol açtı: durgunken sığıyor, animasyon tepe yapınca kenarı kesiyordu. */
export const CIRCLE_MARGIN = 0.08;

export const VIEWBOX = {
  /* Serbest duran kullanım: çizim kutuyu doldurur. */
  box: '0 0 36 36',
  /* Yuvarlak çerçeve içi: kutunun İÇ TEĞET dairesi zarfı paylı çevreler,
     böylece `size` doğrudan çerçevenin iç çapı verilebilir.
     envelope() → merkez (18.00, 18.82), yarıçap 26.69; %8 pay ile 28.82. */
  circle: '-10.82 -10.00 57.64 57.64',
} as const;
