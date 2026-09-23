import React from 'react';
import { CalculationPoint, ReachConfig, getSectionGeometry } from '../engine/hydraulics';

interface Props {
  reach: ReachConfig;
  point?: CalculationPoint | null;
  flowRate: number;
}

export const CrossSectionViewer: React.FC<Props> = ({ reach, point, flowRate }) => {
  const currentY = point ? point.Y : 1.5;
  const Yc = point ? point.Yc : 1.411;
  const Yn = point && point.Yn != null ? point.Yn : null;

  const geom = {
    type: reach.type,
    width: reach.width,
    fruit: reach.fruit,
    radius: reach.radius,
  };

  const currentProps = getSectionGeometry(geom, currentY);

  // SVG dimensions & coordinate mapping
  const width = 420;
  const height = 260;
  const pad = 40;

  // Max visual height
  const maxVisualY = Math.max(currentY * 1.5, Yc * 1.4, Yn ? Yn * 1.4 : 0, 2.5);
  let maxVisualX = reach.width;
  if (reach.type === 'Trap') {
    maxVisualX = reach.width + 2 * (reach.fruit || 1) * maxVisualY;
  } else if (reach.type === 'Tri') {
    maxVisualX = 2 * (reach.fruit || 1) * maxVisualY;
  } else if (reach.type === 'Cir') {
    maxVisualX = reach.radius * 2;
  }
  maxVisualX = Math.max(maxVisualX, 2);

  const scaleX = (width - 2 * pad) / (maxVisualX * 1.2);
  const scaleY = (height - 2 * pad) / (maxVisualY * 1.2);
  const scale = Math.min(scaleX, scaleY);

  const cx = width / 2;
  const cy = height - pad;

  const toSvgX = (x: number) => cx + x * scale;
  const toSvgY = (y: number) => cy - y * scale;

  let channelPoints = '';
  let waterPoints = '';
  let criticalLine = { x1: 0, x2: 0, y: 0 };
  let normalLine: { x1: number; x2: number; y: number } | null = null;
  let topWidthLine = { x1: 0, x2: 0, y: 0 };

  if (reach.type === 'Rec') {
    const halfB = reach.width / 2;
    const yTop = maxVisualY;
    channelPoints = `
      ${toSvgX(-halfB)},${toSvgY(yTop)}
      ${toSvgX(-halfB)},${toSvgY(0)}
      ${toSvgX(halfB)},${toSvgY(0)}
      ${toSvgX(halfB)},${toSvgY(yTop)}
    `;
    waterPoints = `
      ${toSvgX(-halfB)},${toSvgY(currentY)}
      ${toSvgX(-halfB)},${toSvgY(0)}
      ${toSvgX(halfB)},${toSvgY(0)}
      ${toSvgX(halfB)},${toSvgY(currentY)}
    `;
    topWidthLine = { x1: toSvgX(-halfB), x2: toSvgX(halfB), y: toSvgY(currentY) };
    criticalLine = { x1: toSvgX(-halfB), x2: toSvgX(halfB), y: toSvgY(Yc) };
    if (Yn != null) normalLine = { x1: toSvgX(-halfB), x2: toSvgX(halfB), y: toSvgY(Yn) };
  } else if (reach.type === 'Trap') {
    const halfB = reach.width / 2;
    const m = reach.fruit || 1;
    const yTop = maxVisualY;
    channelPoints = `
      ${toSvgX(-(halfB + m * yTop))},${toSvgY(yTop)}
      ${toSvgX(-halfB)},${toSvgY(0)}
      ${toSvgX(halfB)},${toSvgY(0)}
      ${toSvgX(halfB + m * yTop)},${toSvgY(yTop)}
    `;
    const halfWaterTop = halfB + m * currentY;
    waterPoints = `
      ${toSvgX(-halfWaterTop)},${toSvgY(currentY)}
      ${toSvgX(-halfB)},${toSvgY(0)}
      ${toSvgX(halfB)},${toSvgY(0)}
      ${toSvgX(halfWaterTop)},${toSvgY(currentY)}
    `;
    topWidthLine = { x1: toSvgX(-halfWaterTop), x2: toSvgX(halfWaterTop), y: toSvgY(currentY) };
    criticalLine = { x1: toSvgX(-(halfB + m * Yc)), x2: toSvgX(halfB + m * Yc), y: toSvgY(Yc) };
    if (Yn != null) normalLine = { x1: toSvgX(-(halfB + m * Yn)), x2: toSvgX(halfB + m * Yn), y: toSvgY(Yn) };
  } else if (reach.type === 'Tri') {
    const m = reach.fruit || 1;
    const yTop = maxVisualY;
    channelPoints = `
      ${toSvgX(-m * yTop)},${toSvgY(yTop)}
      ${toSvgX(0)},${toSvgY(0)}
      ${toSvgX(m * yTop)},${toSvgY(yTop)}
    `;
    const halfWaterTop = m * currentY;
    waterPoints = `
      ${toSvgX(-halfWaterTop)},${toSvgY(currentY)}
      ${toSvgX(0)},${toSvgY(0)}
      ${toSvgX(halfWaterTop)},${toSvgY(currentY)}
    `;
    topWidthLine = { x1: toSvgX(-halfWaterTop), x2: toSvgX(halfWaterTop), y: toSvgY(currentY) };
    criticalLine = { x1: toSvgX(-m * Yc), x2: toSvgX(m * Yc), y: toSvgY(Yc) };
    if (Yn != null) normalLine = { x1: toSvgX(-m * Yn), x2: toSvgX(m * Yn), y: toSvgY(Yn) };
  } else {
    // Cir
    const r = reach.radius || 1;
    const D = 2 * r;
    const cirCenterY = toSvgY(r);
    // Draw circular boundary
    channelPoints = '';
    // water chord
    const clampedY = Math.min(Math.max(currentY, 0.01), D * 0.99);
    const halfLm = Math.sqrt(clampedY * (D - clampedY));
    topWidthLine = { x1: toSvgX(-halfLm), x2: toSvgX(halfLm), y: toSvgY(clampedY) };
    criticalLine = { x1: toSvgX(-Math.sqrt(Math.max(0, Yc * (D - Yc)))), x2: toSvgX(Math.sqrt(Math.max(0, Yc * (D - Yc)))), y: toSvgY(Yc) };
    if (Yn != null && Yn < D) {
      normalLine = { x1: toSvgX(-Math.sqrt(Math.max(0, Yn * (D - Yn)))), x2: toSvgX(Math.sqrt(Math.max(0, Yn * (D - Yn)))), y: toSvgY(Yn) };
    }
  }

  const sectionName = {
    Rec: 'Section Rectangulaire',
    Trap: 'Section Trapézoïdale',
    Tri: 'Section Triangulaire',
    Cir: 'Section Circulaire (Galerie)',
  }[reach.type];

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400"></span>
            Section Transversale (Cross-Section)
          </h3>
          <p className="text-xs text-slate-400">{sectionName} - Bief {reach.id} ({reach.name})</p>
        </div>
        <div className="text-xs font-mono px-2.5 py-1 rounded-md bg-cyan-950/60 border border-cyan-800/40 text-cyan-300">
          Q = {flowRate.toFixed(2)} m³/s
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* SVG Drawing */}
        <div className="md:col-span-2 relative flex items-center justify-center rounded-xl bg-slate-950/80 border border-slate-800/80 p-2 overflow-hidden min-h-[220px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[240px]">
            <defs>
              <linearGradient id="secWaterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.5" />
              </linearGradient>
            </defs>

            {/* Grid baseline */}
            <line x1="20" y1={cy} x2={width - 20} y2={cy} stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />

            {/* Circular specific rendering */}
            {reach.type === 'Cir' ? (
              <g>
                <circle
                  cx={cx}
                  cy={toSvgY(reach.radius || 1)}
                  r={(reach.radius || 1) * scale}
                  fill="#0f172a"
                  stroke="#94a3b8"
                  strokeWidth="3"
                />
                {/* Water chord fill */}
                <clipPath id="circleClip">
                  <circle cx={cx} cy={toSvgY(reach.radius || 1)} r={(reach.radius || 1) * scale} />
                </clipPath>
                <rect
                  x="0"
                  y={toSvgY(currentY)}
                  width={width}
                  height={cy - toSvgY(currentY)}
                  fill="url(#secWaterGrad)"
                  clipPath="url(#circleClip)"
                />
              </g>
            ) : (
              <g>
                {/* Water polygon */}
                <polygon points={waterPoints} fill="url(#secWaterGrad)" />
                {/* Channel boundaries */}
                <polyline
                  points={channelPoints}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )}

            {/* Water Surface Line */}
            <line
              x1={topWidthLine.x1}
              y1={topWidthLine.y}
              x2={topWidthLine.x2}
              y2={topWidthLine.y}
              stroke="#38bdf8"
              strokeWidth="2.5"
            />

            {/* Critical Depth Marker */}
            <line
              x1={criticalLine.x1}
              y1={criticalLine.y}
              x2={criticalLine.x2}
              y2={criticalLine.y}
              stroke="#fb7185"
              strokeWidth="1.8"
              strokeDasharray="4 3"
            />
            <text x={criticalLine.x2 + 6} y={criticalLine.y + 4} fill="#fb7185" fontSize="10" fontWeight="600">
              Yc ({Yc.toFixed(2)}m)
            </text>

            {/* Normal Depth Marker */}
            {normalLine && (
              <g>
                <line
                  x1={normalLine.x1}
                  y1={normalLine.y}
                  x2={normalLine.x2}
                  y2={normalLine.y}
                  stroke="#34d399"
                  strokeWidth="1.8"
                  strokeDasharray="5 3"
                />
                <text x={normalLine.x1 - 45} y={normalLine.y + 4} fill="#34d399" fontSize="10" fontWeight="600">
                  Yn ({Yn?.toFixed(2)}m)
                </text>
              </g>
            )}

            {/* Current Water Depth Indicator */}
            <text
              x={cx}
              y={topWidthLine.y - 8}
              textAnchor="middle"
              fill="#38bdf8"
              fontSize="12"
              fontWeight="bold"
              fontFamily="JetBrains Mono, monospace"
            >
              Y = {currentY.toFixed(3)} m (Lm = {currentProps.Lm.toFixed(2)} m)
            </text>
          </svg>
        </div>

        {/* Real-time geometric & hydraulic readouts */}
        <div className="flex flex-col gap-2 rounded-xl bg-slate-950/60 border border-slate-800/80 p-3.5 text-xs font-mono">
          <div className="text-slate-400 font-sans font-semibold text-xs border-b border-slate-800 pb-1.5 text-slate-300">
            Propriétés Hydrauliques de la Section
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
            <span className="text-slate-400">Section mouillée (S):</span>
            <span className="font-bold text-cyan-300">{currentProps.S.toFixed(3)} m²</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
            <span className="text-slate-400">Périmètre mouillé (Pm):</span>
            <span className="font-bold text-slate-200">{currentProps.Pm.toFixed(3)} m</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
            <span className="text-slate-400">Rayon hydraulique (Rh):</span>
            <span className="font-bold text-slate-200">{currentProps.Rh.toFixed(3)} m</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
            <span className="text-slate-400">Largeur miroir (Lm):</span>
            <span className="font-bold text-slate-200">{currentProps.Lm.toFixed(3)} m</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
            <span className="text-slate-400">Tirant critique (Yc):</span>
            <span className="font-bold text-rose-300">{Yc.toFixed(3)} m</span>
          </div>

          {Yn != null && (
            <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
              <span className="text-slate-400">Tirant normal (Yn):</span>
              <span className="font-bold text-emerald-300">{Yn.toFixed(3)} m</span>
            </div>
          )}

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400">Rugosité (Strickler K):</span>
            <span className="font-bold text-amber-300">{reach.strickler} m¹/³/s</span>
          </div>
        </div>
      </div>
    </div>
  );
};
