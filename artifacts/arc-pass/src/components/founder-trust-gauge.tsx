import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Founder Trust Score gauge — a 240-degree arc scored out of 100.
 *
 * The score is assigned manually by an admin, so this component only renders
 * what it is given; it derives no signal of its own. When the score is null the
 * caller should not render the gauge at all.
 *
 * The readout lives inside the SVG rather than in overlaid HTML so the numerals
 * and the arc scale together — the card renders anywhere from a 360px mobile
 * width up to the 680px desktop one, and the two must never drift apart.
 */

const SWEEP = 240;
const START = -SWEEP / 2;
const RADIUS = 32;
const CENTER = { x: 50, y: 40 };
const TRACK_WIDTH = 7;

/** 0deg points at 12 o'clock, increasing clockwise. */
function polar(radius: number, degrees: number) {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return {
    x: CENTER.x + radius * Math.cos(radians),
    y: CENTER.y + radius * Math.sin(radians),
  };
}

function arcPath(radius: number, startDeg: number, endDeg: number) {
  const start = polar(radius, startDeg);
  const end = polar(radius, endDeg);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

// Four equal segments with a small gap between each, running cold to warm.
const GAP = 4;
const SEGMENT = (SWEEP - GAP * 3) / 4;
const SEGMENTS = [
  { color: "#e5484d" },
  { color: "#f2a33c" },
  { color: "#d8d340" },
  { color: "#46c98b" },
].map((segment, index) => {
  const from = START + index * (SEGMENT + GAP);
  return { ...segment, from, to: from + SEGMENT };
});

const BANDS = [
  { min: 80, label: "Exceptional" },
  { min: 60, label: "Established" },
  { min: 40, label: "Neutral" },
  { min: 20, label: "Developing" },
  { min: 0, label: "Limited" },
] as const;

// Maps a 0-100 score to its band word. Exported and reused server-side intent
// must stay in sync — the NFT metadata trait in the api-server duplicates these
// exact thresholds (see routes/sharing.ts). The user-facing name of this metric
// is "Ecosystem Score"; the internal field stays `trustScore` for continuity.
export function trustScoreLabel(score: number): string {
  return BANDS.find((band) => score >= band.min)?.label ?? "Limited";
}

interface FounderTrustGaugeProps {
  score: number;
  /** Premium cards carry a warmer, gold-leaning frame. */
  isPremium?: boolean;
  /** Set the rendered width here — everything else scales from it. */
  className?: string;
  label?: string;
  /** The caption is fixed-size; hide it when rendering the gauge large. */
  showCaption?: boolean;
  /** Extra glow around the dial, used at the end of the reveal ceremony. */
  glow?: string | null;
}

export function FounderTrustGauge({
  score,
  isPremium = false,
  className,
  // Short by design: the badge caption is ~78px wide on the card, so the full
  // "Ecosystem score" truncated to "ECOSYSTEM SCO…". "Eco score" fits.
  label = "Eco score",
  showCaption = true,
  glow = null,
}: FounderTrustGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const knob = polar(RADIUS, START + (SWEEP * clamped) / 100);
  const band = trustScoreLabel(clamped);

  return (
    <div
      className={cn(
        // Opaque, and deliberately no backdrop-blur: this badge sits on top of
        // the issuer strip, the strip's text must not ghost through it, and a
        // backdrop filter here washes out the metadata row behind it when the
        // card is rasterised for sharing.
        "flex shrink-0 flex-col items-center rounded-xl border px-1.5 py-1.5 shadow-[0_10px_26px_rgba(0,8,40,.45)] sm:rounded-2xl sm:px-2 sm:py-2",
        isPremium
          ? "border-[#e0b768]/45 bg-[#140d07]/95"
          : "border-[#9bb9ff]/38 bg-[#061a54]/95",
        className,
      )}
      style={glow ? { boxShadow: `0 0 34px ${glow}, 0 10px 26px rgba(0,8,40,.45)` } : undefined}
      role="img"
      aria-label={`Founder ecosystem score ${clamped} out of 100, ${band}`}
    >
      <svg viewBox="0 0 100 64" className="w-full" aria-hidden="true">
        {/* Unfilled track under the colour so the ring reads as one dial
            rather than four floating strokes. */}
        <path
          d={arcPath(RADIUS, START, START + SWEEP)}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth={TRACK_WIDTH}
          strokeLinecap="round"
        />
        {SEGMENTS.map((segment) => (
          <path
            key={segment.from}
            d={arcPath(RADIUS, segment.from, segment.to)}
            fill="none"
            stroke={segment.color}
            strokeWidth={TRACK_WIDTH}
            strokeLinecap="round"
          />
        ))}

        <circle cx={knob.x} cy={knob.y} r={5.2} fill="#0b1020" fillOpacity={0.9} />
        <circle cx={knob.x} cy={knob.y} r={3.7} fill="#ffffff" />

        <text
          x={50}
          y={45}
          textAnchor="middle"
          fill="#ffffff"
          fontSize={25}
          fontWeight={600}
          letterSpacing="-0.5"
        >
          {clamped}
        </text>
        <text
          x={50}
          y={58}
          textAnchor="middle"
          fill="rgba(255,255,255,0.5)"
          fontSize={8}
          fontWeight={500}
        >
          {band}
        </text>
      </svg>

      {showCaption && (
        <span
          className={cn(
            "mt-0.5 w-full truncate text-center font-mono text-[5.5px] uppercase leading-none tracking-[0.12em] sm:mt-1 sm:text-[7.5px]",
            isPremium ? "text-[#f6d38a]/70" : "text-[#b7caff]/65",
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
