/* Düz, tek renkli SVG ikonlar. Emoji yerine bunlar kullanılıyor: emoji
   sistem fontuna göre 3B ve farklı stillerde çiziliyor, arayüzün düz
   görsel diliyle çelişiyordu. */

type P = { size?: number; color?: string };
const box = (size: number) => ({ width: size, height: size, display: 'block' as const });

export const Home = ({ size = 24, color = 'currentColor' }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} fill={color} aria-hidden="true">
    <path d="M12 3.2 2.6 11a1 1 0 0 0 .64 1.77H5v7.2a1 1 0 0 0 1 1h3.6v-5.4h4.8V21H18a1 1 0 0 0 1-1v-7.2h1.76A1 1 0 0 0 21.4 11Z" />
  </svg>
);

export const Repeat = ({ size = 24, color = 'currentColor' }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 11a8 8 0 0 1 13.3-5.9L20 8" />
    <path d="M20 4v4h-4" />
    <path d="M21 13a8 8 0 0 1-13.3 5.9L4 16" />
    <path d="M4 20v-4h4" />
  </svg>
);

export const Person = ({ size = 24, color = 'currentColor' }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} fill={color} aria-hidden="true">
    <circle cx="12" cy="8" r="4.2" />
    <path d="M12 14c-4.4 0-8 2.6-8 5.8 0 .7.5 1.2 1.2 1.2h13.6c.7 0 1.2-.5 1.2-1.2 0-3.2-3.6-5.8-8-5.8Z" />
  </svg>
);

export const Play = ({ size = 26, color = 'currentColor' }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} fill={color} aria-hidden="true">
    <path d="M8 5.2c0-.9 1-1.5 1.8-1l9 6.8c.7.5.7 1.5 0 2l-9 6.8c-.8.5-1.8-.1-1.8-1Z" />
  </svg>
);

export const Lock = ({ size = 24, color = 'currentColor' }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} fill={color} aria-hidden="true">
    <path d="M12 2a5 5 0 0 0-5 5v2.2h2.6V7a2.4 2.4 0 0 1 4.8 0v2.2H17V7a5 5 0 0 0-5-5Z" />
    <rect x="5" y="9.6" width="14" height="11.4" rx="2.4" />
  </svg>
);

export const Star = ({ size = 26, color = 'currentColor' }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} fill={color} aria-hidden="true">
    <path d="m12 2.6 2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95Z" />
  </svg>
);

export const Crown = ({ size = 30, color = 'currentColor' }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} fill={color} aria-hidden="true">
    <path d="M3 8.4 6.2 12 12 4.6 17.8 12 21 8.4l-1.5 10.2a1 1 0 0 1-1 .84H5.5a1 1 0 0 1-1-.84Z" />
  </svg>
);

export const Flame = ({ size = 24, color = 'currentColor' }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} fill={color} aria-hidden="true">
    <path d="M13.1 2c.4 3-1.2 4.6-2.7 6C8.5 9.7 6.5 11.6 6.5 15a6.2 6.2 0 0 0 11 3.9c1-1.3 1.4-2.9 1.1-4.5-.3 1-1 1.7-1.9 2 .6-2.6-.3-5.3-2.3-7.2.2 1.4-.4 2.4-1.3 2.9.5-3.6-1.4-8.2-4-10.1Z" />
  </svg>
);

export const Gem = ({ size = 24, color = 'currentColor' }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} fill={color} aria-hidden="true">
    <path d="M7.4 3h9.2l4.3 5.4L12 21.4 3.1 8.4Z" opacity=".95" />
    <path d="M3.1 8.4h17.8L12 21.4Z" opacity=".55" />
  </svg>
);

export const Heart = ({ size = 24, color = 'currentColor' }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} fill={color} aria-hidden="true">
    <path d="M12 21c-.4 0-.8-.15-1.1-.44l-7-6.6A6 6 0 0 1 12 5.3a6 6 0 0 1 8.1 8.66l-7 6.6c-.3.29-.7.44-1.1.44Z" />
  </svg>
);

export const Speaker = ({ size = 22, color = 'currentColor' }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} fill={color} aria-hidden="true">
    <path d="M11 4.5v15a1 1 0 0 1-1.66.75L5.2 16.5H3a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h2.2l4.14-3.75A1 1 0 0 1 11 4.5Z" />
    <path d="M15.2 8.2a1.1 1.1 0 0 1 1.55.06 5.4 5.4 0 0 1 0 7.48 1.1 1.1 0 1 1-1.6-1.5 3.2 3.2 0 0 0 0-4.48 1.1 1.1 0 0 1 .05-1.56Z" />
    <path d="M18.3 5a1.1 1.1 0 0 1 1.55.05 9.7 9.7 0 0 1 0 13.9 1.1 1.1 0 0 1-1.5-1.6 7.5 7.5 0 0 0 0-10.7A1.1 1.1 0 0 1 18.3 5Z" />
  </svg>
);
