import { describe, it, expect } from 'vitest';
import { envelope, VIEWBOX, CIRCLE_MARGIN, extremePoints } from './mascotGeometry';

/* Maskot yuvarlak çerçevelere `fit="circle"` ile konuyor ve `size` çerçevenin
   iç çapı veriliyor. Bunun doğru olması için kutunun iç teğet dairesinin,
   animasyonun uç kareleri dahil bütün çizimi paylı biçimde çevrelemesi gerek.
   Bir kez tam teğet boyutlandırılmıştı: durgunken sığıyor, kollar salınınca
   çerçeveyi kesiyordu. Bu testler o hatanın sessizce geri gelmesini engelliyor. */

function circleViewBox() {
  const [x, y, w, h] = VIEWBOX.circle.split(' ').map(Number);
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, r: Math.min(w, h) / 2 };
}

describe('maskot zarfı', () => {
  it('kare viewBox, çizimi tam kaplar', () => {
    expect(VIEWBOX.box).toBe('0 0 36 36');
  });

  it('daire viewBox karedir — iç teğet daire tanımlı olsun', () => {
    const vb = circleViewBox();
    expect(vb.w).toBeCloseTo(vb.h, 6);
  });

  it('zarfın merkezi, daire viewBox kutusunun merkezindedir', () => {
    const e = envelope();
    const vb = circleViewBox();
    expect(e.cx).toBeCloseTo(vb.cx, 1);
    expect(e.cy).toBeCloseTo(vb.cy, 1);
  });

  it('kutunun iç teğet dairesi zarfı en az istenen payla çevreler', () => {
    const e = envelope();
    const vb = circleViewBox();
    const pay = vb.r / e.r - 1;
    expect(pay).toBeGreaterThanOrEqual(CIRCLE_MARGIN - 0.005);
  });

  it('animasyonun hiçbir uç karesi iç teğet dairenin dışına taşmaz', () => {
    const vb = circleViewBox();
    let enUzak = 0;
    for (const [x, y] of extremePoints()) {
      const d = Math.hypot(x - vb.cx, y - vb.cy);
      if (d > enUzak) enUzak = d;
    }
    expect(enUzak).toBeLessThanOrEqual(vb.r);
  });

  it('ölçek kareleri hesaba katılıyor — zarf, ölçeksiz hâlden büyüktür', () => {
    /* Bu, atlanan asıl şeydi: gövde 1.06'ya kadar uzuyor. Zarf yalnız
       dönüşlerden hesaplansaydı yarıçap ~25.5 çıkardı. */
    expect(envelope().r).toBeGreaterThan(26);
  });
});
