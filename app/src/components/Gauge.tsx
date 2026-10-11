import { useTween } from "./useTween";

// Semicircle risk gauge. Needle overshoots slightly (physical feel); the arc fills with the band colour.
type Props = { p: number; band: string; bands: { high: number; medium: number } };

const R = 120, CX = 150, CY = 150, LEN = Math.PI * R;
const pt = (f: number, r = R) => [CX - r * Math.cos(Math.PI * f), CY - r * Math.sin(Math.PI * f)];

export default function Gauge({ p, band, bands }: Props) {
  const shown = useTween(p * 100);
  const tick = (f: number, label: string) => {
    const [x1, y1] = pt(f, R + 14), [x2, y2] = pt(f, R + 24), [tx, ty] = pt(f, R + 38);
    return (
      <g key={label}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} className="g-tick" />
        <text x={tx} y={ty} className="g-tick-label" textAnchor="middle" dominantBaseline="middle">{label}</text>
      </g>
    );
  };
  return (
    <div className={`gauge ${band}`}>
      <svg viewBox="0 -12 300 182" role="img" aria-label={`Risk ${Math.round(p * 100)} percent, ${band}`}>
        <defs>
          <linearGradient id="g-zones" x1="0" x2="1">
            <stop offset="0" stopColor="#2f9a6d" />
            <stop offset="0.35" stopColor="#e3a72f" />
            <stop offset="1" stopColor="#d64545" />
          </linearGradient>
        </defs>
        <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} className="g-track" />
        <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} className="g-zones" stroke="url(#g-zones)" />
        <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} className="g-fill"
          style={{ strokeDasharray: LEN, strokeDashoffset: LEN * (1 - Math.max(p, 0.004)) }} />
        {tick(bands.medium, `${Math.round(bands.medium * 100)}%`)}
        {tick(bands.high, `${Math.round(bands.high * 100)}%`)}
        <g className="g-needle" style={{ transform: `rotate(${-90 + 180 * p}deg)` }}>
          <path d={`M ${CX - 5} ${CY} L ${CX} ${CY - R + 18} L ${CX + 5} ${CY} Z`} />
          <circle cx={CX} cy={CY} r={11} />
        </g>
      </svg>
      <div className="g-readout">
        <span className="num">{Math.round(shown)}%</span>
        <span className={`band-pill ${band}`}>{band}</span>
      </div>
    </div>
  );
}
