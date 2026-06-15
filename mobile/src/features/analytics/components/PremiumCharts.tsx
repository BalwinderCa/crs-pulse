import { View } from 'react-native';
import Svg, { Path, Circle, Line, Polyline, Polygon, Rect } from 'react-native-svg';

// ─── Semicircle gauge (invitation odds) ──────────────────────────────────────

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

/** Arc from `startDeg` to `endDeg` (degrees, 180=left → 0=right over the top). */
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export function OddsGauge({
  fraction,
  color,
  track,
  width = 220,
}: {
  fraction: number; // 0..1
  color: string;
  track: string;
  width?: number;
}) {
  const f = Math.max(0, Math.min(1, fraction));
  const stroke = 14;
  const r = (width - stroke) / 2;
  const cx = width / 2;
  const cy = r + stroke / 2;
  const height = cy + stroke / 2 + 2;
  const valueEnd = 180 - 180 * f; // sweep left→right

  return (
    <Svg width={width} height={height}>
      <Path d={arcPath(cx, cy, r, 180, 0)} stroke={track} strokeWidth={stroke} strokeLinecap="round" fill="none" />
      {f > 0 && (
        <Path
          d={arcPath(cx, cy, r, 180, valueEnd)}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
        />
      )}
    </Svg>
  );
}

// ─── Forecast: actual line + dashed projection + confidence band ──────────────

export function ForecastBandChart({
  actual,
  forecast,
  band,
  min,
  max,
  lineColor,
  bandColor,
  gridColor,
  width = 280,
  height = 120,
}: {
  actual: number[];
  forecast: number[]; // continues from last actual
  band: { lo: number; hi: number }[]; // aligned to forecast points
  min: number;
  max: number;
  lineColor: string;
  bandColor: string;
  gridColor: string;
  width?: number;
  height?: number;
}) {
  const pad = 6;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const total = actual.length + forecast.length - 1; // forecast[0] overlaps last actual
  const x = (i: number) => pad + (w * i) / (total - 1);
  const y = (v: number) => pad + h - (h * (v - min)) / (max - min);

  const actualPts = actual.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const fStart = actual.length - 1;
  const forecastPts = forecast.map((v, i) => `${x(fStart + i)},${y(v)}`).join(' ');

  // band polygon (hi across, then lo back)
  const hi = band.map((b, i) => `${x(fStart + i)},${y(b.hi)}`);
  const lo = band.map((b, i) => `${x(fStart + i)},${y(b.lo)}`).reverse();
  const bandPoly = [...hi, ...lo].join(' ');

  return (
    <Svg width={width} height={height}>
      {[0.25, 0.5, 0.75].map((g) => (
        <Line key={g} x1={pad} y1={pad + h * g} x2={width - pad} y2={pad + h * g} stroke={gridColor} strokeWidth={0.5} />
      ))}
      <Polygon points={bandPoly} fill={bandColor} />
      <Polyline points={actualPts} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" />
      <Polyline
        points={forecastPts}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeDasharray="4 3"
        strokeLinejoin="round"
      />
      {actual.map((v, i) => (
        <Circle key={i} cx={x(i)} cy={y(v)} r={2} fill={lineColor} />
      ))}
    </Svg>
  );
}

// ─── Mini bar sparkline (cadence / volume) ────────────────────────────────────

export function MiniBars({
  values,
  color,
  track,
  width = 130,
  height = 40,
}: {
  values: number[];
  color: string;
  track: string;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...values, 1);
  const gap = 3;
  const bw = (width - gap * (values.length - 1)) / values.length;
  return (
    <Svg width={width} height={height}>
      {values.map((v, i) => {
        const bh = Math.max(2, (height * v) / max);
        return (
          <Rect
            key={i}
            x={i * (bw + gap)}
            y={height - bh}
            width={bw}
            height={bh}
            rx={2}
            fill={v === max ? color : track}
          />
        );
      })}
    </Svg>
  );
}

// ─── Percentile marker bar ────────────────────────────────────────────────────

export function MarkerBar({ fraction, color, track }: { fraction: number; color: string; track: string }) {
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <View style={{ height: 10, borderRadius: 5, backgroundColor: track, justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          left: `${f * 100}%`,
          width: 14,
          height: 14,
          borderRadius: 7,
          marginLeft: -7,
          backgroundColor: color,
          borderWidth: 2,
          borderColor: '#fff',
        }}
      />
    </View>
  );
}
