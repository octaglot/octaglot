import { describe, it, expect } from 'vitest';
import { envelope, VIEWBOX, CIRCLE_MARGIN, extremePoints } from './mascotGeometry';

/* The mascot is placed into round frames with `fit="circle"` and `size` is
   given as the frame's inner diameter. For that to hold, the box's inscribed
   circle must enclose the entire artwork - including the extreme frames of the
   animation - with margin to spare. It was once sized exactly tangent: it fit
   at rest and cut the frame once the arms swung. These tests keep that bug
   from creeping back in silently. */

function circleViewBox() {
  const [x, y, w, h] = VIEWBOX.circle.split(' ').map(Number);
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, r: Math.min(w, h) / 2 };
}

describe('mascot envelope', () => {
  it('square viewBox covers the artwork exactly', () => {
    expect(VIEWBOX.box).toBe('0 0 36 36');
  });

  it('circle viewBox is square so the inscribed circle is defined', () => {
    const vb = circleViewBox();
    expect(vb.w).toBeCloseTo(vb.h, 6);
  });

  it('envelope center sits at the center of the circle viewBox', () => {
    const e = envelope();
    const vb = circleViewBox();
    expect(e.cx).toBeCloseTo(vb.cx, 1);
    expect(e.cy).toBeCloseTo(vb.cy, 1);
  });

  it('inscribed circle encloses the envelope with at least the required margin', () => {
    const e = envelope();
    const vb = circleViewBox();
    const pay = vb.r / e.r - 1;
    expect(pay).toBeGreaterThanOrEqual(CIRCLE_MARGIN - 0.005);
  });

  it('no extreme animation frame crosses the inscribed circle', () => {
    const vb = circleViewBox();
    let enUzak = 0;
    for (const [x, y] of extremePoints()) {
      const d = Math.hypot(x - vb.cx, y - vb.cy);
      if (d > enUzak) enUzak = d;
    }
    expect(enUzak).toBeLessThanOrEqual(vb.r);
  });

  it('scale keyframes are accounted for, so the envelope beats the unscaled one', () => {
    /* This was the thing that got missed: the body stretches to 1.06. Computing
       the envelope from rotations alone would give a radius of ~25.5. */
    expect(envelope().r).toBeGreaterThan(26);
  });
});
