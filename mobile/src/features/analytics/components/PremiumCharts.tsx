import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Path, Circle, Line, Polyline, Polygon, Rect, Text as SvgText } from 'react-native-svg';

/**
 * Wraps an otherwise screen-reader-invisible SVG chart in a single accessible
 * node carrying a text summary of the data, so VoiceOver/TalkBack announce the
 * chart's meaning instead of skipping it (WCAG 1.1.1). The inner SVG is hidden
 * from assistive tech to avoid duplicate/empty announcements. No label → the
 * chart renders exactly as before (backward compatible).
 */
function ChartA11y({ label, children }: { label: string | undefined; children: React.ReactNode }) {
  if (!label) return <>{children}</>;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      importantForAccessibility="yes"
    >
      <View importantForAccessibility="no-hide-descendants">{children}</View>
    </View>
  );
}

// ─── Multi-series line trend (area fill, reference line, axis labels) ─────────

export type TrendSeries = { points: number[]; color: string; dashed?: boolean; fill?: string };

export function TrendLineChart({
  series,
  min,
  max,
  gridColor,
  axisColor,
  refLine,
  width = 300,
  height = 140,
  accessibilityLabel,
}: {
  series: TrendSeries[];
  min: number;
  max: number;
  gridColor: string;
  axisColor: string;
  refLine?: { value: number; color: string; label?: string };
  width?: number;
  height?: number;
  accessibilityLabel?: string;
}) {
  const padL = 34, padR = 8, padT = 10, padB = 8;
  const w = width - padL - padR;
  const h = height - padT - padB;
  const span = Math.max(1, max - min);
  const xAt = (i: number, n: number) => padL + (n <= 1 ? w / 2 : (w * i) / (n - 1));
  const yAt = (v: number) => padT + h - (h * (v - min)) / span;

  return (
    <ChartA11y label={accessibilityLabel}>
    <Svg width={width} height={height}>
      {/* gridlines + y labels */}
      {[0, 0.5, 1].map((g) => {
        const yv = max - g * span;
        return (
          <React.Fragment key={g}>
            <Line x1={padL} y1={padT + h * g} x2={width - padR} y2={padT + h * g} stroke={gridColor} strokeWidth={0.5} />
            <SvgText x={padL - 5} y={padT + h * g + 3} fontSize={9} fill={axisColor} textAnchor="end">{Math.round(yv)}</SvgText>
          </React.Fragment>
        );
      })}

      {/* reference line (e.g. user score) */}
      {refLine && refLine.value >= min && refLine.value <= max && (
        <>
          <Line x1={padL} y1={yAt(refLine.value)} x2={width - padR} y2={yAt(refLine.value)}
            stroke={refLine.color} strokeWidth={1} strokeDasharray="3 3" />
          {refLine.label && (
            <SvgText x={width - padR} y={yAt(refLine.value) - 3} fontSize={9} fill={refLine.color} textAnchor="end">{refLine.label}</SvgText>
          )}
        </>
      )}

      {series.map((sr, si) => {
        const n = sr.points.length;
        if (n === 0) return null;
        const pts = sr.points.map((v, i) => `${xAt(i, n)},${yAt(v)}`).join(' ');
        const area = sr.fill
          ? `${xAt(0, n)},${padT + h} ${pts} ${xAt(n - 1, n)},${padT + h}`
          : null;
        return (
          <React.Fragment key={si}>
            {area && sr.fill && <Polygon points={area} fill={sr.fill} />}
            <Polyline points={pts} fill="none" stroke={sr.color} strokeWidth={2} strokeLinejoin="round"
              {...(sr.dashed ? { strokeDasharray: '4 3' } : {})} />
          </React.Fragment>
        );
      })}
    </Svg>
    </ChartA11y>
  );
}

// ─── Horizontal labeled bars (category comparison, distribution) ──────────────

export function HorizontalBars({
  items,
  track,
  labelColor,
  valueColor,
  fontSize = 12,
}: {
  items: { label: string; value: number; max: number; color: string; suffix?: string; highlight?: boolean }[];
  track: string;
  labelColor: string;
  valueColor: string;
  fontSize?: number;
}) {
  return (
    <View style={{ gap: 8 }}>
      {items.map((it) => (
        <View key={it.label} style={{ gap: 3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize, color: it.highlight ? it.color : labelColor, fontWeight: it.highlight ? '700' : '500' }}>
              {it.label}
            </Text>
            <Text style={{ fontSize, color: valueColor, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {it.value}{it.suffix ?? ''}
            </Text>
          </View>
          <View style={{ height: 7, borderRadius: 4, backgroundColor: track, overflow: 'hidden' }}>
            <View style={{ height: '100%', borderRadius: 4, backgroundColor: it.color,
              width: `${Math.max(2, Math.min(100, (it.value / it.max) * 100))}%` }} />
          </View>
        </View>
      ))}
    </View>
  );
}

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
  accessibilityLabel,
}: {
  fraction: number; // 0..1
  color: string;
  track: string;
  width?: number;
  accessibilityLabel?: string;
}) {
  const f = Math.max(0, Math.min(1, fraction));
  const stroke = 14;
  const r = (width - stroke) / 2;
  const cx = width / 2;
  const cy = r + stroke / 2;
  const height = cy + stroke / 2 + 2;
  const valueEnd = 180 - 180 * f; // sweep left→right

  return (
    <ChartA11y label={accessibilityLabel}>
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
    </ChartA11y>
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
  accessibilityLabel,
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
  accessibilityLabel?: string;
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
    <ChartA11y label={accessibilityLabel}>
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
    </ChartA11y>
  );
}

// ─── Mini bar sparkline (cadence / volume) ────────────────────────────────────

export function MiniBars({
  values,
  color,
  track,
  width = 130,
  height = 40,
  accessibilityLabel,
}: {
  values: number[];
  color: string;
  track: string;
  width?: number;
  height?: number;
  accessibilityLabel?: string;
}) {
  const max = Math.max(...values, 1);
  const gap = 3;
  const bw = (width - gap * (values.length - 1)) / values.length;
  return (
    <ChartA11y label={accessibilityLabel}>
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
    </ChartA11y>
  );
}

// ─── Percentile marker bar ────────────────────────────────────────────────────

export function MarkerBar({
  fraction,
  color,
  track,
  accessibilityLabel,
}: {
  fraction: number;
  color: string;
  track: string;
  accessibilityLabel?: string;
}) {
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <View
      style={{ height: 10, borderRadius: 5, backgroundColor: track, justifyContent: 'center' }}
      {...(accessibilityLabel ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel } : {})}
    >
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
