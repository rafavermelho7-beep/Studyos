// Constelação de equilíbrio: os 11 domínios como pontos num círculo; o raio de cada
// ponto é a autoavaliação (0–10). Forma regular e ampla = equilíbrio.
import { DOMAINS } from "@/lib/domains";

export function BalanceConstellation({ scores, size = 260 }: { scores: Partial<Record<string, number>>; size?: number }) {
  const c = size / 2;
  const R = size / 2 - 34;
  const pts = DOMAINS.map((d, i) => {
    const a = (i / DOMAINS.length) * Math.PI * 2 - Math.PI / 2;
    const s = scores[d.key];
    const r = s === undefined ? 0 : (s / 10) * R;
    return {
      d,
      a,
      s,
      x: c + Math.cos(a) * r,
      y: c + Math.sin(a) * r,
      lx: c + Math.cos(a) * (R + 18),
      ly: c + Math.sin(a) * (R + 18),
      ox: c + Math.cos(a) * R,
      oy: c + Math.sin(a) * R,
    };
  });
  const rated = pts.filter((p) => p.s !== undefined);
  const poly = rated.length >= 3 ? rated.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") : null;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full max-w-[300px]" role="img" aria-label="Equilíbrio entre domínios">
      {[0.33, 0.66, 1].map((k) => (
        <circle key={k} cx={c} cy={c} r={R * k} fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray={k === 1 ? "" : "2 4"} />
      ))}
      {pts.map((p) => (
        <line key={p.d.key} x1={c} y1={c} x2={p.ox} y2={p.oy} stroke="rgba(255,255,255,0.04)" />
      ))}
      {poly && <polygon points={poly} fill="hsl(var(--presence-hue) 70% 60% / 0.10)" stroke="hsl(var(--presence-hue) 70% 70% / 0.55)" strokeWidth="1" />}
      {pts.map((p) => (
        <g key={p.d.key}>
          {p.s !== undefined ? (
            <>
              <circle cx={p.x} cy={p.y} r={6} fill={`hsl(${p.d.hue} 70% 65% / 0.18)`} />
              <circle cx={p.x} cy={p.y} r={2.6} fill={`hsl(${p.d.hue} 75% 72%)`}>
                <title>{`${p.d.label}: ${p.s}/10`}</title>
              </circle>
            </>
          ) : (
            <circle cx={p.ox} cy={p.oy} r={2} fill="none" stroke="rgba(255,255,255,0.18)">
              <title>{`${p.d.label}: sem avaliação`}</title>
            </circle>
          )}
          <text
            x={p.lx}
            y={p.ly}
            textAnchor={Math.abs(Math.cos(p.a)) < 0.2 ? "middle" : Math.cos(p.a) > 0 ? "start" : "end"}
            dominantBaseline="middle"
            fontSize="9"
            fill={p.s !== undefined && p.s <= 3 ? "var(--warm)" : "var(--text-3)"}
            fontFamily="var(--font-mono)"
          >
            {p.d.label.slice(0, 5).toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  );
}
