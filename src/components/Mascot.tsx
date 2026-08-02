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

/* Okta - Octaglot's mascot, a purple octopus. Its eight arms map to the eight
   exercise types in the app.

   The artwork comes from Twemoji's octopus emoji (U+1F419), licensed CC-BY 4.0;
   the attribution lives on the profile screen and in the README. What was
   changed: the back and middle arms were split off into separate paths and
   animated independently, and eyes and a mouth were added to carry the mood.

   The idea behind the animation: the arms do not sway together but on a
   staggered delay - that phase difference is what actually sells the "drifting
   underwater" feeling. The body also squashes slightly as it rises and falls
   (breathing). */

const DARK = '#6a3788';
const MID = '#884eaa';
const BODY_COLOR = '#a766cc';
const EYE = '#292F33';

/* Rotation center. Framer Motion automatically sets `transform-box: fill-box`
   on SVG children it transforms; in that mode transform-origin is measured from
   the corner of the element's own bounding box rather than from the viewBox. So
   "18px 21px" is not the middle of the eyes but 18 units right of the bounding
   box - the pivot lands well outside the artwork and the part flew off as it
   rotated. Switching to `view-box` makes the origin a viewBox coordinate again;
   framer does not override what comes from style, it uses it as given. That is
   why the pivots are set here rather than through originX/originY. */
const pivot = (x: number, y: number) => ({
  transformBox: 'view-box' as const,
  originX: `${x}px`,
  originY: `${y}px`,
});

/* Body: drifts at rest, bounces when happy, slumps when sad. */
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
  /* Every mood writes all the animated properties: any property left out is
     inherited from the previous state, so the body squashed while sad would
     have stayed squashed on the way into happy. */
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

/* The sway of a single arm. `phase` offsets the arms from one another; it is
   the only thing that makes the wave travel from one side of the body to the
   other. */
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

/* The artwork fills its own viewBox edge to edge (x 0-36, y 0-35.67); the arm
   tips reach right into the corners. Putting that square box inside a round
   frame therefore clips the corners without fail - to fit a circle, the box has
   to grow.

   `fit="circle"` seats the artwork in the bounding square of the circle that
   encloses all of its movement, including the extreme frames of the animation
   (see `mascotGeometry.ts`). Because the box's **inscribed circle** encloses
   that envelope with margin, `size` can be given directly as the frame's inner
   diameter and the arms will not cut the edge as they sway. The margin is
   essential: it was once sized exactly tangent, which fit at rest but
   overflowed when the animation peaked. */

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
      {/* The body is animated on this group rather than the root <svg>: the root
          element's transform-origin is measured in the box's CSS pixels rather
          than viewBox units, so the pivot drifted as the size changed. */}
      <motion.g animate={bodyAnim[mood]} style={pivot(18, 30)}>
        {/* arka kollar */}
        <Arm d={ARM_BACK_L} fill={DARK} ox={12} oy={13} mood={mood} phase={0} dir={-1} />
        <Arm d={ARM_BACK_R} fill={DARK} ox={24} oy={13} mood={mood} phase={0.25} dir={1} />
        {/* Middle arms - a single path in the source, split apart so they can
            move independently. The pivots are the root point where an arm meets
            the mantle; rotating from the tip tore the arm off the body. */}
        <Arm d={ARM_MID_L} fill={MID} ox={7.8} oy={17} mood={mood} phase={0.5} dir={-1} />
        <Arm d={ARM_MID_R} fill={MID} ox={28.2} oy={17} mood={mood} phase={0.75} dir={1} />

        {/* mantle and front arms */}
        <path d={BODY} fill={BODY_COLOR} />

        {/* eyes - they blink at rest and change shape with the mood */}
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
          /* The highlights sit inside the group too: left outside, they hung in
             place while the eye closed. */
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

        {/* mouth - only in the moods whose expression needs one */}
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
