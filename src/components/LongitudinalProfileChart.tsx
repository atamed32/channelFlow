import React, { useState, useRef } from 'react';
import { CalculationPoint, SimulationResult } from '../engine/hydraulics';
import { ZoomIn, ZoomOut, RotateCcw, Info } from 'lucide-react';

interface Props {
  points: CalculationPoint[];
  result: SimulationResult;
  selectedPointIndex?: number;
  onSelectPoint?: (index: number) => void;
}

export const LongitudinalProfileChart: React.FC<Props> = ({
  points,
  result,
  selectedPointIndex,
  onSelectPoint,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showEnergyLine, setShowEnergyLine] = useState(true);
  const [showCriticalLine, setShowCriticalLine] = useState(true);
  const [showNormalLine, setShowNormalLine] = useState(true);

  if (!points || points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
        Aucune donnée de simulation disponible
      </div>
    );
  }

  // Calculate bounding box for SVG
  const minX = points[0].x;
  const maxX = points[points.length - 1].x;
  const xSpan = Math.max(maxX - minX, 1);

  let minZ = Infinity;
  let maxZ = -Infinity;

  points.forEach((p) => {
    minZ = Math.min(minZ, p.Zf);
    maxZ = Math.max(maxZ, p.Z, showEnergyLine ? p.H : p.Z);
    if (showCriticalLine) maxZ = Math.max(maxZ, p.Zf + p.Yc);
    if (showNormalLine && p.Yn != null) maxZ = Math.max(maxZ, p.Zf + p.Yn);
  });

  const zMargin = (maxZ - minZ) * 0.15 || 0.5;
  const plotMinZ = minZ - zMargin * 0.5;
  const plotMaxZ = maxZ + zMargin;
  const zSpan = Math.max(plotMaxZ - plotMinZ, 0.5);

  const svgWidth = 900;
  const svgHeight = 380;
  const padLeft = 70;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 50;

  const innerW = svgWidth - padLeft - padRight;
  const innerH = svgHeight - padTop - padBottom;

  const mapX = (x: number) => padLeft + ((x - minX) / xSpan) * innerW;
  const mapZ = (z: number) => padTop + innerH - ((z - plotMinZ) / zSpan) * innerH;

  // Build SVG paths
  const bedPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.x).toFixed(1)} ${mapZ(p.Zf).toFixed(1)}`).join(' ');
  const waterSurfacePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.x).toFixed(1)} ${mapZ(p.Z).toFixed(1)}`).join(' ');
  const energyPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.x).toFixed(1)} ${mapZ(p.H).toFixed(1)}`).join(' ');
  const criticalPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.x).toFixed(1)} ${mapZ(p.Zf + p.Yc).toFixed(1)}`).join(' ');

  // Water fill polygon: from water surface to bed and back
  const waterFillPoints = [
    ...points.map((p) => `${mapX(p.x).toFixed(1)},${mapZ(p.Z).toFixed(1)}`),
    ...[...points].reverse().map((p) => `${mapX(p.x).toFixed(1)},${mapZ(p.Zf).toFixed(1)}`),
  ].join(' ');

  // Ground fill polygon
  const groundFillPoints = [
    ...points.map((p) => `${mapX(p.x).toFixed(1)},${mapZ(p.Zf).toFixed(1)}`),
    `${mapX(maxX).toFixed(1)},${(padTop + innerH).toFixed(1)}`,
    `${mapX(minX).toFixed(1)},${(padTop + innerH).toFixed(1)}`,
  ].join(' ');

  // Normal line path
  const normalPoints = points.filter((p) => p.Yn != null);
  const normalPath = normalPoints.length > 0
    ? normalPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.x).toFixed(1)} ${mapZ(p.Zf + (p.Yn || 0)).toFixed(1)}`).join(' ')
    : '';

  // X ticks
  const numXTicks = 8;
  const xTicks = Array.from({ length: numXTicks + 1 }, (_, i) => minX + (xSpan * i) / numXTicks);

  // Z ticks
  const numZTicks = 6;
  const zTicks = Array.from({ length: numZTicks + 1 }, (_, i) => plotMinZ + (zSpan * i) / numZTicks);

  const activeIndex = hoveredIndex ?? selectedPointIndex ?? null;
  const activePoint = activeIndex != null && points[activeIndex] ? points[activeIndex] : null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            Profil en Long (Longitudinal Profile)
          </h3>
          <p className="text-xs text-slate-400">
            Cotes altimétriques du fond, de la ligne d'eau, de la charge totale et des lignes caractéristiques
          </p>
        </div>

        {/* Legend toggles */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-cyan-300 select-none">
            <span className="w-3 h-1 bg-cyan-400 rounded-full inline-block"></span>
            <input
              type="checkbox"
              checked={true}
              disabled
              className="sr-only"
            />
            Surface de l'eau Z
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-amber-300 hover:text-amber-200 select-none">
            <input
              type="checkbox"
              checked={showEnergyLine}
              onChange={(e) => setShowEnergyLine(e.target.checked)}
              className="accent-amber-500 rounded"
            />
            <span className="w-3 h-0.5 bg-amber-400 border-t border-dashed border-amber-400 inline-block"></span>
            Charge totale H
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-rose-300 hover:text-rose-200 select-none">
            <input
              type="checkbox"
              checked={showCriticalLine}
              onChange={(e) => setShowCriticalLine(e.target.checked)}
              className="accent-rose-500 rounded"
            />
            <span className="w-3 h-0.5 bg-rose-400 border-t border-dotted border-rose-400 inline-block"></span>
            Ligne critique Zc
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-emerald-300 hover:text-emerald-200 select-none">
            <input
              type="checkbox"
              checked={showNormalLine}
              onChange={(e) => setShowNormalLine(e.target.checked)}
              className="accent-emerald-500 rounded"
            />
            <span className="w-3 h-0.5 bg-emerald-400 border-t border-dashed border-emerald-400 inline-block"></span>
            Ligne normale Zn
          </label>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden rounded-xl bg-slate-950/70 border border-slate-800/80">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto block select-none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {/* Water gradient */}
            <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.65" />
              <stop offset="70%" stopColor="#0284c7" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.25" />
            </linearGradient>

            {/* Ground gradient */}
            <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </linearGradient>

            <pattern id="groundHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#475569" strokeWidth="1" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Grid lines */}
          {xTicks.map((xVal, i) => (
            <line
              key={`xgrid-${i}`}
              x1={mapX(xVal)}
              y1={padTop}
              x2={mapX(xVal)}
              y2={padTop + innerH}
              stroke="#1e293b"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          ))}

          {zTicks.map((zVal, i) => (
            <line
              key={`zgrid-${i}`}
              x1={padLeft}
              y1={mapZ(zVal)}
              x2={padLeft + innerW}
              y2={mapZ(zVal)}
              stroke="#1e293b"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          ))}

          {/* Ground body */}
          <polygon points={groundFillPoints} fill="url(#groundGrad)" />
          <polygon points={groundFillPoints} fill="url(#groundHatch)" />

          {/* Water body */}
          <polygon points={waterFillPoints} fill="url(#waterGrad)" />

          {/* Critical Depth Line */}
          {showCriticalLine && (
            <path
              d={criticalPath}
              fill="none"
              stroke="#fb7185"
              strokeWidth="1.8"
              strokeDasharray="4 4"
            />
          )}

          {/* Normal Depth Line */}
          {showNormalLine && normalPath && (
            <path
              d={normalPath}
              fill="none"
              stroke="#34d399"
              strokeWidth="1.8"
              strokeDasharray="6 3"
            />
          )}

          {/* Bed Line (Fond) */}
          <path
            d={bedPath}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Water Surface Line */}
          <path
            d={waterSurfacePath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Total Energy Line (Charge) */}
          {showEnergyLine && (
            <path
              d={energyPath}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.8"
              strokeDasharray="5 3"
            />
          )}

          {/* Hydraulic Jump indicator if detected */}
          {result.jumpDetected && (
            <g transform={`translate(${mapX(result.jumpDetected.x)}, ${mapZ(points[0].Zf)})`}>
              <line
                x1="0"
                y1="-80"
                x2="0"
                y2="20"
                stroke="#f43f5e"
                strokeWidth="2"
                strokeDasharray="2 2"
              />
              <rect x="-42" y="-105" width="84" height="22" rx="4" fill="#881337" stroke="#f43f5e" strokeWidth="1" />
              <text x="0" y="-90" textAnchor="middle" fill="#ffe4e6" fontSize="10" fontWeight="bold">
                Ressaut (Jump)
              </text>
            </g>
          )}

          {/* Interactive vertical hover indicator */}
          {activePoint && (
            <g>
              <line
                x1={mapX(activePoint.x)}
                y1={padTop}
                x2={mapX(activePoint.x)}
                y2={padTop + innerH}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <circle
                cx={mapX(activePoint.x)}
                cy={mapZ(activePoint.Z)}
                r="5"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <circle
                cx={mapX(activePoint.x)}
                cy={mapZ(activePoint.Zf)}
                r="4"
                fill="#94a3b8"
                stroke="#0f172a"
                strokeWidth="1"
              />
              {showEnergyLine && (
                <circle
                  cx={mapX(activePoint.x)}
                  cy={mapZ(activePoint.H)}
                  r="3.5"
                  fill="#fbbf24"
                  stroke="#0f172a"
                  strokeWidth="1"
                />
              )}
            </g>
          )}

          {/* Invisible interactive hover rects */}
          {points.map((p, i) => {
            const xLeft = i === 0 ? mapX(p.x) : (mapX(points[i - 1].x) + mapX(p.x)) / 2;
            const xRight = i === points.length - 1 ? mapX(p.x) : (mapX(p.x) + mapX(points[i + 1].x)) / 2;
            return (
              <rect
                key={`hit-${i}`}
                x={xLeft}
                y={padTop}
                width={Math.max(xRight - xLeft, 2)}
                height={innerH}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIndex(i)}
                onClick={() => onSelectPoint && onSelectPoint(i)}
              />
            );
          })}

          {/* Axes */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft}
            y2={padTop + innerH}
            stroke="#475569"
            strokeWidth="1.5"
          />
          <line
            x1={padLeft}
            y1={padTop + innerH}
            x2={padLeft + innerW}
            y2={padTop + innerH}
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* X Axis labels */}
          {xTicks.map((xVal, i) => (
            <text
              key={`xtick-${i}`}
              x={mapX(xVal)}
              y={padTop + innerH + 18}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="11"
              fontFamily="JetBrains Mono, monospace"
            >
              {xVal.toFixed(1)}
            </text>
          ))}
          <text
            x={padLeft + innerW / 2}
            y={padTop + innerH + 36}
            textAnchor="middle"
            fill="#cbd5e1"
            fontSize="12"
            fontWeight="500"
          >
            Abscisse x (m)
          </text>

          {/* Z Axis labels */}
          {zTicks.map((zVal, i) => (
            <text
              key={`ztick-${i}`}
              x={padLeft - 10}
              y={mapZ(zVal) + 4}
              textAnchor="end"
              fill="#94a3b8"
              fontSize="11"
              fontFamily="JetBrains Mono, monospace"
            >
              {zVal.toFixed(2)}
            </text>
          ))}
          <text
            x={-(padTop + innerH / 2)}
            y="20"
            textAnchor="middle"
            transform="rotate(-90)"
            fill="#cbd5e1"
            fontSize="12"
            fontWeight="500"
          >
            Cote Z (m)
          </text>
        </svg>

        {/* Live Hover Info Floating Overlay */}
        {activePoint && (
          <div className="absolute top-3 right-3 bg-slate-900/95 border border-cyan-500/30 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 pointer-events-none">
            <div>
              <span className="text-slate-400">Section x:</span>{' '}
              <span className="font-mono font-bold text-cyan-300">{activePoint.x.toFixed(2)} m</span>
            </div>
            <div>
              <span className="text-slate-400">Tirant Y:</span>{' '}
              <span className="font-mono font-bold text-blue-300">{activePoint.Y.toFixed(3)} m</span>
            </div>
            <div>
              <span className="text-slate-400">Vitesse V:</span>{' '}
              <span className="font-mono font-bold text-amber-300">{activePoint.V.toFixed(2)} m/s</span>
            </div>
            <div>
              <span className="text-slate-400">Froude F:</span>{' '}
              <span className={`font-mono font-bold ${activePoint.F > 1 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {activePoint.F.toFixed(3)} ({activePoint.reg})
              </span>
            </div>

            <div>
              <span className="text-slate-400">Cote Eau Z:</span>{' '}
              <span className="font-mono text-slate-200">{activePoint.Z.toFixed(3)} m</span>
            </div>
            <div>
              <span className="text-slate-400">Cote Fond Zf:</span>{' '}
              <span className="font-mono text-slate-200">{activePoint.Zf.toFixed(3)} m</span>
            </div>
            <div>
              <span className="text-slate-400">Critique Yc:</span>{' '}
              <span className="font-mono text-rose-300">{activePoint.Yc.toFixed(3)} m</span>
            </div>
            <div>
              <span className="text-slate-400">Charge H:</span>{' '}
              <span className="font-mono text-amber-300">{activePoint.H.toFixed(3)} m</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
