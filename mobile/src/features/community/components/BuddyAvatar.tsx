import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

/**
 * Preset Community avatars: a round buddy built from a colour, eyes, a mouth,
 * a hat and an optional extra. Only the id ("b" + one digit per part, e.g.
 * "b32014") is shared; nothing is uploaded. Four-digit ids from before the
 * extra existed still draw the same. An unknown id draws nothing, so callers fall back.
 */
export const BUDDY_COLORS = ['#F97316', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#14B8A6', '#0EA5E9', '#84CC16'];
// New parts only ever go on the end of each list, so a shared id keeps its look.
const PARTS = { color: BUDDY_COLORS.length, eyes: 8, mouth: 6, hat: 10, extra: 4 } as const;
const INK = '#1F2937';
const ID_RE = /^b(\d)(\d)(\d)(\d)(\d)?$/;

/** [color, eyes, mouth, hat, extra] for a valid id, else null. */
function parse(id: string | undefined): [number, number, number, number, number] | null {
  const m = id ? ID_RE.exec(id) : null;
  if (!m) return null;
  const [c, e, mo, h] = m.slice(1, 5).map(Number) as [number, number, number, number];
  const x = m[5] === undefined ? 0 : Number(m[5]);
  if (c >= PARTS.color || e >= PARTS.eyes || mo >= PARTS.mouth || h >= PARTS.hat || x >= PARTS.extra) return null;
  return [c, e, mo, h, x];
}

export const isBuddyId = (id: string | undefined): id is string => parse(id) !== null;

export function randomBuddyId(): string {
  const pick = (n: number) => Math.floor(Math.random() * n);
  return `b${pick(PARTS.color)}${pick(PARTS.eyes)}${pick(PARTS.mouth)}${pick(PARTS.hat)}${pick(PARTS.extra)}`;
}

/** `count` different random ids, starting with `keep` if given. */
export function buddyChoices(count: number, keep?: string): string[] {
  const ids = new Set<string>(keep && isBuddyId(keep) ? [keep] : []);
  while (ids.size < count) ids.add(randomBuddyId());
  return [...ids];
}

const EYES = [
  <G key="e0"><Circle cx={25} cy={36} r={2.6} fill={INK} /><Circle cx={39} cy={36} r={2.6} fill={INK} /></G>,
  <G key="e1" stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round">
    <Path d="M22 37 Q25 33 28 37" /><Path d="M36 37 Q39 33 42 37" />
  </G>,
  <G key="e2">
    <Circle cx={25} cy={35} r={4.5} fill="#FFFFFF" /><Circle cx={39} cy={35} r={4.5} fill="#FFFFFF" />
    <Circle cx={26} cy={36} r={2.2} fill={INK} /><Circle cx={40} cy={36} r={2.2} fill={INK} />
  </G>,
  <G key="e3" stroke={INK} strokeWidth={2.2} strokeLinecap="round"><Path d="M22 36 L28 36" /><Path d="M36 36 L42 36" /></G>,
  <G key="e4" fill={INK}>
    <Rect x={19} y={32} width={11} height={7} rx={3} /><Rect x={34} y={32} width={11} height={7} rx={3} />
    <Path d="M30 34.5 L34 34.5" stroke={INK} strokeWidth={1.6} />
  </G>,
  // Wink.
  <G key="e5"><Circle cx={25} cy={36} r={2.6} fill={INK} />
    <Path d="M36 37 Q39 33 42 37" stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round" /></G>,
  // Round glasses.
  <G key="e6"><Circle cx={25} cy={36} r={2.2} fill={INK} /><Circle cx={39} cy={36} r={2.2} fill={INK} />
    <G stroke={INK} strokeWidth={1.6} fill="none"><Circle cx={25} cy={36} r={5} /><Circle cx={39} cy={36} r={5} />
      <Path d="M30 36 L34 36" /></G></G>,
  // Grumpy brows.
  <G key="e7"><Circle cx={25} cy={37} r={2.4} fill={INK} /><Circle cx={39} cy={37} r={2.4} fill={INK} />
    <G stroke={INK} strokeWidth={2} strokeLinecap="round"><Path d="M21 31 L28 33" /><Path d="M43 31 L36 33" /></G></G>,
];

const MOUTHS = [
  <Path key="m0" d="M27 44 Q32 49 37 44" stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round" />,
  <Path key="m1" d="M26 43 Q32 52 38 43 Z" fill={INK} />,
  <Circle key="m2" cx={32} cy={46} r={2.4} fill={INK} />,
  <Path key="m3" d="M28 46 L36 46" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />,
  // Tongue out.
  <G key="m4"><Path d="M29.5 46 Q32 52 34.5 46 Z" fill="#F43F5E" />
    <Path d="M27 44 Q32 48 37 44" stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round" /></G>,
  // Cat mouth.
  <Path key="m5" d="M26 45 Q29 48 32 45 Q35 48 38 45" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />,
];

const EXTRAS = [
  null,
  // Blush.
  <G key="x1" fill="#F472B6" opacity={0.55}><Circle cx={20} cy={43} r={3} /><Circle cx={44} cy={43} r={3} /></G>,
  // Mustache.
  <Path key="x2" d="M26 41 Q29 38.5 32 40.5 Q35 38.5 38 41 Q35 43 32 42 Q29 43 26 41 Z" fill={INK} />,
  // Freckles.
  <G key="x3" fill="#92400E" opacity={0.6}>
    <Circle cx={19} cy={42} r={0.9} /><Circle cx={22} cy={44} r={0.9} /><Circle cx={18.5} cy={45} r={0.9} />
    <Circle cx={45} cy={42} r={0.9} /><Circle cx={42} cy={44} r={0.9} /><Circle cx={45.5} cy={45} r={0.9} />
  </G>,
];

const hats = (color: string) => [
  null,
  // Toque with a pompom.
  <G key="h1"><Path d="M14 30 Q32 6 50 30 Z" fill="#DC2626" /><Rect x={13} y={26} width={38} height={6} rx={3} fill="#FFFFFF" />
    <Circle cx={32} cy={10} r={4} fill="#FFFFFF" /></G>,
  // Cap.
  <G key="h2" fill={INK}><Path d="M14 30 Q32 10 50 30 Z" /><Rect x={30} y={26} width={24} height={4} rx={2} /></G>,
  // Headphones.
  <G key="h3"><Path d="M14 38 Q14 15 32 15 Q50 15 50 38" stroke={INK} strokeWidth={3.5} fill="none" />
    <Rect x={9} y={33} width={8} height={12} rx={3} fill={INK} /><Rect x={47} y={33} width={8} height={12} rx={3} fill={INK} /></G>,
  // Sprout.
  <G key="h4"><Path d="M32 20 L32 11" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    <Path d="M32 12 Q24 4 21 11 Q27 15 32 12 Z" fill="#16A34A" /><Path d="M32 12 Q40 4 43 11 Q37 15 32 12 Z" fill="#22C55E" /></G>,
  // Crown.
  <G key="h5"><Path d="M19 25 L19 13 L25.5 19 L32 9 L38.5 19 L45 13 L45 25 Z" fill="#FACC15" />
    <Circle cx={32} cy={20} r={1.8} fill="#EF4444" /></G>,
  // Graduation cap.
  <G key="h6"><Path d="M22 22 L22 27 Q32 31 42 27 L42 22 Z" fill={INK} /><Path d="M10 19 L32 10 L54 19 L32 28 Z" fill={INK} />
    <Path d="M51 20 L51 30" stroke="#FACC15" strokeWidth={1.6} /><Circle cx={51} cy={31} r={1.8} fill="#FACC15" /></G>,
  // Bow.
  <G key="h7"><Path d="M44 19 L36 13 L36 25 Z" fill="#DB2777" /><Path d="M44 19 L52 13 L52 25 Z" fill="#DB2777" />
    <Circle cx={44} cy={19} r={2.6} fill="#9D174D" /></G>,
  // Party hat.
  <G key="h8"><Path d="M32 5 L23 22 L41 22 Z" fill="#6366F1" /><Path d="M27.5 13.5 L36.5 13.5 M25.5 18 L38.5 18" stroke="#FACC15" strokeWidth={1.6} />
    <Circle cx={32} cy={5} r={3} fill="#FACC15" /></G>,
  // Halo.
  <Ellipse key="h9" cx={32} cy={11} rx={12} ry={3.5} stroke="#FACC15" strokeWidth={2.6} fill="none" />,
];

export function BuddyAvatar({ id, size }: { id: string; size: number }) {
  const parts = parse(id);
  if (!parts) return null;
  const [c, e, mo, h, x] = parts;
  const color = BUDDY_COLORS[c]!;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx={32} cy={32} r={32} fill={`${color}2E`} />
      <Circle cx={32} cy={38} r={19} fill={color} />
      {/* Features sit a little low so the toque and cap brims clear the eyes. */}
      <G y={2}>
        {EYES[e]}
        {MOUTHS[mo]}
        {EXTRAS[x]}
      </G>
      {hats(color)[h]}
    </Svg>
  );
}
