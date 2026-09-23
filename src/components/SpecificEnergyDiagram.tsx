import React, { useMemo } from 'react';
import { ReachConfig, CalculationPoint, computeHydraulics, calculateCriticalDepth, calculateConjugateDepth } from '../engine/hydraulics';

interface Props {
  reach: ReachConfig;
  point?: CalculationPoint | null;
  flowRate: number;
}

export const SpecificEnergyDiagram: React.FC<Props> = ({ reach, point, flowRate }) => {
  const currentY = point ? point.Y : 1.2;
  const geom = {
    type: reach.type,
    width: reach.width,
    fruit: reach.fruit,
    radius: reach.radius,
  };

  const Yc = useMemo(() => calculateCriticalDepth(geom, flowRate), [geom, flowRate]);
  const hydCrit = useMemo(() => computeHydraulics(geom, Yc, flowRate, reach.strickler, reach.slope, 0), [geom, Yc, flowRate, reach]);
  const Hsc = hydCrit.Hs;

  const currentHyd = useMemo(() => computeHydraulics(geom, currentY, flowRate, reach.strickler, reach.slope, 0), [geom, currentY, flowRate, reach]);
  const currentHs = currentHyd.Hs;

  // Conjugate depth (for hydraulic jump)
  const Yconj = useMemo(() => calculateConjugateDepth(geom, currentY, flowRate), [geom, currentY, flowRate]);
  const conjHyd = useMemo(() => computeHydraulics(geom, Yconj, flowRate, reach.strickler, reach.slope, 0), [geom, Yconj, flowRate, reach]);

  // Generate curve points for Hs(Y)
  const curvePoints = useMemo(() => {
    const pts: { Y: number; Hs: number; moment: number }[] = [];
    const maxY = Math.max(Yc * 3.2, currentY * 2.2, 3.5);
    const minY = Math.max(Yc * 0.15, 0.05);
    const steps = 80;

    for (let i = 0; i <= steps; i++) {
      const y = minY + (maxY - minY) * (i / steps);
      const hyd = computeHydraulics(geom, y, flowRate, reach.strickler, reach.slope, 0);
      if (hyd.Hs < 50) {
        pts.push({ Y: y, Hs: hyd.Hs, moment: hyd.moment });
      }
    }
    return pts;
  }, [geom, flowRate, reach, Yc, currentY]);

  // SVG coordinate transformation
  const width = 450;
  const height = 280;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 45;

  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const maxHs = Math.min(Math.max(...curvePoints.map((p) => p.Hs), currentHs * 1.3, Hsc * 2), 20);
  const minHs = Math.max(Hsc * 0.9, 0);
  const hsSpan = Math.max(maxHs - minHs, 1);

  const maxYVal = Math.max(...curvePoints.map((p) => p.Y), currentY * 1.3);
  const minYVal = 0;
  const ySpan = Math.max(maxYVal - minYVal, 1);

  const mapHs = (hs: number) => padLeft + ((hs - minHs) / hsSpan) * innerW;
  const mapY = (y: number) => padTop + innerH - ((y - minYVal) / ySpan) * innerH;

  const pathD = curvePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapHs(p.Hs).toFixed(1)} ${mapY(p.Y).toFixed(1)}`)
    .join(' ');

  // Asymptote Y = Hs (potential energy line)
  const asympX1 = mapHs(minHs);
  const asympY1 = mapY(minHs);
  const asympX2 = mapHs(maxHs);
  const asympY2 = mapY(maxHs);

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            Diagramme d'Énergie Spécifique Hs(Y)
          </h3>
          <p className="text-xs text-slate-400">
            Énergie minimale Hsc au tirant critique Yc & profondeurs alternées/conjuguées
          </p>
        </div>
        <div className="text-xs px-2.5 py-1 rounded bg-slate-800 font-mono text-amber-300">
          Hsc = {Hsc.toFixed(3)} m
        </div>
      </div>

      <div className="relative rounded-xl bg-slate-950/80 border border-slate-800/80 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Grid lines */}
          <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + innerH} stroke="#334155" strokeWidth="1.5" />
          <line x1={padLeft} y1={padTop + innerH} x2={padLeft + innerW} y2={padTop + innerH} stroke="#334155" strokeWidth="1.5" />

          {/* Asymptote Y = Hs */}
          <line
            x1={asympX1}
            y1={asympY1}
            x2={asympX2}
            y2={asympY2}
            stroke="#475569"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text x={asympX2 - 40} y={asympY2 + 15} fill="#64748b" fontSize="9">
            Asymptote Y = Hs
          </text>

          {/* Critical Depth Horizontal guide */}
          <line
            x1={padLeft}
            y1={mapY(Yc)}
            x2={mapHs(Hsc)}
            y2={mapY(Yc)}
            stroke="#fb7185"
            strokeDasharray="3 3"
            strokeWidth="1.2"
          />
          <line
            x1={mapHs(Hsc)}
            y1={mapY(Yc)}
            x2={mapHs(Hsc)}
            y2={padTop + innerH}
            stroke="#fb7185"
            strokeDasharray="3 3"
            strokeWidth="1.2"
          />

          {/* Specific Energy Curve */}
          <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="2.5" />

          {/* Critical point marker */}
          <circle cx={mapHs(Hsc)} cy={mapY(Yc)} r="5" fill="#fb7185" stroke="#ffffff" strokeWidth="1.5" />
          <text x={mapHs(Hsc) + 8} y={mapY(Yc) + 4} fill="#fb7185" fontSize="11" fontWeight="bold">
            Critique (Yc={Yc.toFixed(2)}m)
          </text>

          {/* Current Operating Point */}
          <line
            x1={padLeft}
            y1={mapY(currentY)}
            x2={mapHs(currentHs)}
            y2={mapY(currentY)}
            stroke="#fbbf24"
            strokeDasharray="2 2"
            strokeWidth="1.2"
          />
          <circle cx={mapHs(currentHs)} cy={mapY(currentY)} r="6" fill="#fbbf24" stroke="#ffffff" strokeWidth="2" />
          <text x={mapHs(currentHs) + 8} y={mapY(currentY) - 5} fill="#fbbf24" fontSize="11" fontWeight="bold">
            Point actuel (Y={currentY.toFixed(2)}m, Hs={currentHs.toFixed(2)}m)
          </text>

          {/* Conjugate Depth Point (Ressaut) */}
          {Yconj > 0 && Math.abs(Yconj - currentY) > 0.05 && (
            <g>
              <circle cx={mapHs(conjHyd.Hs)} cy={mapY(Yconj)} r="5" fill="#c084fc" stroke="#ffffff" strokeWidth="1.5" />
              <text x={mapHs(conjHyd.Hs) + 8} y={mapY(Yconj) + 4} fill="#c084fc" fontSize="10" fontWeight="bold">
                Conjugué Y₂={Yconj.toFixed(2)}m
              </text>
            </g>
          )}

          {/* Subcritical / Supercritical region labels */}
          <text x={padLeft + innerW - 10} y={padTop + 20} textAnchor="end" fill="#34d399" fontSize="10" fontWeight="500">
            Régime Fluvial (Subcritical: F &lt; 1)
          </text>
          <text x={padLeft + innerW - 10} y={padTop + innerH - 15} textAnchor="end" fill="#f87171" fontSize="10" fontWeight="500">
            Régime Torrentiel (Supercritical: F &gt; 1)
          </text>

          {/* Axes labels */}
          <text x={padLeft + innerW / 2} y={padTop + innerH + 34} textAnchor="middle" fill="#94a3b8" fontSize="11">
            Énergie Spécifique Hs (m)
          </text>
          <text x={-(padTop + innerH / 2)} y="20" textAnchor="middle" transform="rotate(-90)" fill="#94a3b8" fontSize="11">
            Tirant d'eau Y (m)
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
          <span className="text-slate-400 block text-[10px] font-sans">Tirant actuel</span>
          <span className="font-bold text-amber-300">{currentY.toFixed(3)} m</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
          <span className="text-slate-400 block text-[10px] font-sans">Critique Yc</span>
          <span className="font-bold text-rose-300">{Yc.toFixed(3)} m</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
          <span className="text-slate-400 block text-[10px] font-sans">Conjugué Ressaut</span>
          <span className="font-bold text-purple-300">{Yconj.toFixed(3)} m</span>
        </div>
      </div>
    </div>
  );
};
