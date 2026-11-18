import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

/**
 * Preset Community avatars: a round buddy built from a colour, eyes, a mouth
 * and a hat. Only the id ("b" + one digit per part, e.g. "b3201") is shared;
 * nothing is uploaded. An unknown id draws nothing, so callers fall back.
 */
export const BUDDY_COLORS = ['#F97316', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#14B8A6'];
const PARTS = { color: BUDDY_COLORS.length, eyes: 5, mouth: 4, hat: 5 };
const INK = '#1F2937';
const ID_RE = /^b([0-7])([0-4])([0-3])([0-4])$/;

export const isBuddyId = (id: string | undefined): id is string => !!id && ID_RE.test(id);

export function randomBuddyId(): string {
  const pick = (n: number) => Math.floor(Math.random() * n);
  return `b${pick(PARTS.color)}${pick(PARTS.eyes)}${pick(PARTS.mouth)}${pick(PARTS.hat)}`;
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
];

const MOUTHS = [
  <Path key="m0" d="M27 44 Q32 49 37 44" stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round" />,
  <Path key="m1" d="M26 43 Q32 52 38 43 Z" fill={INK} />,
  <Circle key="m2" cx={32} cy={46} r={2.4} fill={INK} />,
  <Path key="m3" d="M28 46 L36 46" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />,
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
];

export function BuddyAvatar({ id, size }: { id: string; size: number }) {
  const m = ID_RE.exec(id);
  if (!m) return null;
  const [c, e, mo, h] = m.slice(1).map(Number) as [number, number, number, number];
  const color = BUDDY_COLORS[c]!;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx={32} cy={32} r={32} fill={`${color}2E`} />
      <Circle cx={32} cy={38} r={19} fill={color} />
      {/* Features sit a little low so the toque and cap brims clear the eyes. */}
      <G y={2}>
        {EYES[e]}
        {MOUTHS[mo]}
      </G>
      {hats(color)[h]}
    </Svg>
  );
}
