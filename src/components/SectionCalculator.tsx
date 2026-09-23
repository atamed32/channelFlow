import React, { useState, useMemo } from 'react';
import {
  SectionType,
  SectionGeometry,
  getSectionGeometry,
  computeHydraulics,
  calculateCriticalDepth,
  calculateNormalDepth,
  calculateCriticalSlope,
  computeRatingCurve,
  solveSectionDesign,
} from '../engine/hydraulics';
import { CrossSectionViewer } from './CrossSectionViewer';
import { Calculator, ArrowRight, Check, Sliders, TrendingUp, Maximize2 } from 'lucide-react';

export const SectionCalculator: React.FC = () => {
  const [sectionType, setSectionType] = useState<SectionType>('Trap');
  const [width, setWidth] = useState<number>(3.0);
  const [fruit, setFruit] = useState<number>(1.0);
  const [diameter, setDiameter] = useState<number>(2.0);
  const [strickler, setStrickler] = useState<number>(60);
  const [slope, setSlope] = useState<number>(0.002);
  const [flowRate, setFlowRate] = useState<number>(12.0);
  const [userDepth, setUserDepth] = useState<number | null>(null);

  // Dimensioning assistant state
  const [targetMaxV, setTargetMaxV] = useState<number>(2.5);
  const [suggestedWidth, setSuggestedWidth] = useState<number | null>(null);

  const geom: SectionGeometry = useMemo(() => ({
    type: sectionType,
    width: sectionType === 'Cir' ? diameter : width,
    fruit,
    radius: diameter / 2,
    diameter,
  }), [sectionType, width, fruit, diameter]);

  // Critical Depth
  const Yc = useMemo(() => calculateCriticalDepth(geom, flowRate), [geom, flowRate]);
  const Ic = useMemo(() => calculateCriticalSlope(geom, flowRate, strickler), [geom, flowRate, strickler]);

  // Normal Depth
  const Yn = useMemo(() => calculateNormalDepth(geom, flowRate, strickler, slope), [geom, flowRate, strickler, slope]);

  // Active evaluation depth (user specified or normal depth or critical)
  const activeY = userDepth ?? (Yn ?? Yc);

  const hyd = useMemo(() => {
    return computeHydraulics(geom, activeY, flowRate, strickler, slope, 0);
  }, [geom, activeY, flowRate, strickler, slope]);

  // Bankfull / max discharge for circular or rectangular with freeboard
  const fullCapacity = useMemo(() => {
    if (sectionType === 'Cir') {
      const { S, Rh } = getSectionGeometry(geom, diameter * 0.95);
      return strickler * S * Math.pow(Rh, 2 / 3) * Math.sqrt(Math.max(slope, 1e-6));
    }
    // For open channel assuming 3m height
    const { S, Rh } = getSectionGeometry(geom, 3.0);
    return strickler * S * Math.pow(Rh, 2 / 3) * Math.sqrt(Math.max(slope, 1e-6));
  }, [geom, sectionType, diameter, strickler, slope]);

  // Rating curve data points
  const ratingPoints = useMemo(() => {
    const maxY = Math.max(activeY * 1.6, Yc * 1.5, sectionType === 'Cir' ? diameter * 0.98 : 3.5);
    return computeRatingCurve(geom, strickler, slope, maxY, 40);
  }, [geom, strickler, slope, activeY, Yc, sectionType, diameter]);

  const handleRunDimensioning = () => {
    const res = solveSectionDesign(geom, flowRate, strickler, slope, targetMaxV);
    if (res.requiredWidth) {
      setSuggestedWidth(parseFloat(res.requiredWidth.toFixed(2)));
    } else {
      setSuggestedWidth(width);
    }
  };

  const handleApplySuggestedWidth = () => {
    if (suggestedWidth) {
      setWidth(suggestedWidth);
      setSuggestedWidth(null);
    }
  };

  // SVG dimensions for rating curve
  const svgW = 460;
  const svgH = 260;
  const padL = 55;
  const padR = 25;
  const padT = 25;
  const padB = 40;
  const inW = svgW - padL - padR;
  const inH = svgH - padT - padB;

  const maxQ = Math.max(...ratingPoints.map((p) => p.Q), flowRate * 1.2, 1);
  const maxY = Math.max(...ratingPoints.map((p) => p.Y), activeY * 1.2, 1);

  const mapQ = (q: number) => padL + (q / maxQ) * inW;
  const mapY = (y: number) => padT + inH - (y / maxY) * inH;

  const ratingPath = ratingPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapQ(p.Q).toFixed(1)} ${mapY(p.Y).toFixed(1)}`).join(' ');

  return (
    <div className="flex flex-col gap-6">
      {/* Title & Introduction */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-cyan-400" />
            Calculateur de Section Hydraulique & Courbe de Tarage
          </h2>
          <p className="text-xs text-slate-400">
            Calcul instantané des hauteurs normale et critique, propriétés géométriques, régime d'écoulement et dimensionnement
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Régime actuel :</span>
          <span
            className={`px-2.5 py-1 rounded-md font-bold uppercase tracking-wider text-[11px] ${
              hyd.F > 1.02
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : hyd.F < 0.98
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}
          >
            {hyd.F > 1.02 ? 'Torrentiel (Supercritique)' : hyd.F < 0.98 ? 'Fluvial (Subcritique)' : 'Critique'} (F = {hyd.F.toFixed(2)})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Geometric & Hydraulic Inputs */}
        <div className="flex flex-col gap-4 rounded-xl bg-slate-900/90 border border-slate-800 p-4 text-xs shadow-md">
          <span className="font-semibold text-slate-200 text-xs border-b border-slate-800 pb-2 flex items-center justify-between">
            <span>Paramètres de la Section</span>
            <span className="text-cyan-400 font-mono text-[11px]">Canal21 Solver</span>
          </span>

          {/* Section Type Buttons */}
          <div>
            <label className="text-slate-400 block mb-1.5 font-medium">Type de Section</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSectionType('Rec')}
                className={`py-1.5 px-2.5 rounded-lg border text-xs font-medium cursor-pointer transition ${
                  sectionType === 'Rec'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Rectangulaire
              </button>
              <button
                type="button"
                onClick={() => setSectionType('Trap')}
                className={`py-1.5 px-2.5 rounded-lg border text-xs font-medium cursor-pointer transition ${
                  sectionType === 'Trap'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Trapézoïdale
              </button>
              <button
                type="button"
                onClick={() => setSectionType('Tri')}
                className={`py-1.5 px-2.5 rounded-lg border text-xs font-medium cursor-pointer transition ${
                  sectionType === 'Tri'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Triangulaire
              </button>
              <button
                type="button"
                onClick={() => setSectionType('Cir')}
                className={`py-1.5 px-2.5 rounded-lg border text-xs font-medium cursor-pointer transition ${
                  sectionType === 'Cir'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Circulaire (Buse)
              </button>
            </div>
          </div>

          {/* Sizing inputs */}
          {sectionType !== 'Cir' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Largeur fond B (m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={width}
                  onChange={(e) => setWidth(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {(sectionType === 'Trap' || sectionType === 'Tri') && (
                <div>
                  <label className="text-slate-400 block mb-1">Fruit berge m (1V:mH)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={fruit}
                    onChange={(e) => setFruit(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="text-slate-400 block mb-1">Diamètre intérieur D (m)</label>
              <input
                type="number"
                step="0.1"
                min="0.2"
                value={diameter}
                onChange={(e) => setDiameter(Math.max(0.2, parseFloat(e.target.value) || 0.2))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {/* Hydraulic parameters: Q, Strickler, Slope */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Débit Q (m³/s)</label>
              <input
                type="number"
                step="0.5"
                min="0.01"
                value={flowRate}
                onChange={(e) => setFlowRate(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-bold font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Rugosité Strickler K</label>
              <input
                type="number"
                step="1"
                min="10"
                max="120"
                value={strickler}
                onChange={(e) => setStrickler(Math.max(10, parseFloat(e.target.value) || 10))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Pente longitudinale I (m/m)</label>
            <input
              type="number"
              step="0.0005"
              min="0.00001"
              value={slope}
              onChange={(e) => setSlope(Math.max(0.00001, parseFloat(e.target.value) || 0.0001))}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Interactive Depth Slider */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-300 font-medium">Tirant d'eau d'évaluation Y (m)</label>
              <button
                type="button"
                onClick={() => setUserDepth(null)}
                className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
              >
                Réinitialiser (Yn)
              </button>
            </div>
            <input
              type="range"
              min="0.1"
              max={Math.max((Yn || Yc) * 2, sectionType === 'Cir' ? diameter : 3.5)}
              step="0.05"
              value={activeY}
              onChange={(e) => setUserDepth(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between items-center font-mono text-[11px] mt-1">
              <span className="text-slate-400">Y critique : {Yc.toFixed(3)} m</span>
              <span className="font-bold text-cyan-300">{activeY.toFixed(3)} m</span>
              <span className="text-slate-400">Y normal : {Yn ? `${Yn.toFixed(3)} m` : 'N/A'}</span>
            </div>
          </div>

          {/* Sizing Assistant Box */}
          <div className="mt-2 p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
            <span className="text-slate-300 font-semibold text-[11px] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Dimensionnement Automatique
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Vitesse max admissible :</span>
              <input
                type="number"
                step="0.1"
                min="0.5"
                value={targetMaxV}
                onChange={(e) => setTargetMaxV(parseFloat(e.target.value) || 1.5)}
                className="w-16 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-slate-200 text-center"
              />
              <span className="text-slate-400">m/s</span>
            </div>

            <button
              type="button"
              onClick={handleRunDimensioning}
              className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              Calculer largeur minimale
            </button>

            {suggestedWidth && (
              <div className="flex items-center justify-between p-2 rounded bg-cyan-950/70 border border-cyan-800 text-[11px]">
                <span className="text-cyan-200">Largeur suggérée: <strong>{suggestedWidth} m</strong></span>
                <button
                  onClick={handleApplySuggestedWidth}
                  className="px-2 py-0.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition cursor-pointer"
                >
                  Appliquer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Middle & Right: Visual Cross Section & Rating Curve */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Hydraulic KPIs Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 font-mono">
              <span className="text-[11px] text-slate-400 block font-sans">Hauteur Normale Yn</span>
              <span className="text-lg font-bold text-emerald-400">
                {Yn ? `${Yn.toFixed(3)} m` : 'Indéfini'}
              </span>
              <span className="text-[10px] text-slate-500 block font-sans">Écoulement uniforme</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 font-mono">
              <span className="text-[11px] text-slate-400 block font-sans">Hauteur Critique Yc</span>
              <span className="text-lg font-bold text-rose-400">{Yc.toFixed(3)} m</span>
              <span className="text-[10px] text-slate-500 block font-sans">Froude = 1.0</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 font-mono">
              <span className="text-[11px] text-slate-400 block font-sans">Vitesse moyenne V</span>
              <span className="text-lg font-bold text-amber-300">{hyd.V.toFixed(2)} m/s</span>
              <span className="text-[10px] text-slate-500 block font-sans">Section S = {hyd.S.toFixed(2)} m²</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 font-mono">
              <span className="text-[11px] text-slate-400 block font-sans">Pente critique Ic</span>
              <span className="text-lg font-bold text-cyan-300">{Ic.toFixed(5)}</span>
              <span className="text-[10px] text-slate-500 block font-sans">
                {slope > Ic ? 'Pente forte (Steep)' : 'Pente faible (Mild)'}
              </span>
            </div>
          </div>

          {/* Interactive Rating Curve (Courbe de Tarage Q(Y)) */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 shadow-md flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  Courbe de Tarage Q = f(Y)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Débit normal en fonction de la hauteur d'eau pour la pente I = {(slope * 1000).toFixed(2)} ‰
                </p>
              </div>
              <div className="text-xs font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                Capacité max : <strong className="text-cyan-300">{fullCapacity.toFixed(1)} m³/s</strong>
              </div>
            </div>

            <div className="relative rounded-lg bg-slate-950/80 border border-slate-800 p-2">
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto select-none">
                {/* Axes */}
                <line x1={padL} y1={padT} x2={padL} y2={padT + inH} stroke="#334155" strokeWidth="1.5" />
                <line x1={padL} y1={padT + inH} x2={padL + inW} y2={padT + inH} stroke="#334155" strokeWidth="1.5" />

                {/* Grid */}
                {[0.25, 0.5, 0.75, 1].map((pct, i) => (
                  <g key={`grid-${i}`}>
                    <line
                      x1={padL}
                      y1={padT + inH * (1 - pct)}
                      x2={padL + inW}
                      y2={padT + inH * (1 - pct)}
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padL - 8}
                      y={padT + inH * (1 - pct) + 4}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                      textAnchor="end"
                    >
                      {(maxY * pct).toFixed(2)}
                    </text>
                  </g>
                ))}

                {[0.25, 0.5, 0.75, 1].map((pct, i) => (
                  <g key={`xgrid-${i}`}>
                    <line
                      x1={padL + inW * pct}
                      y1={padT}
                      x2={padL + inW * pct}
                      y2={padT + inH}
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padL + inW * pct}
                      y={padT + inH + 15}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                    >
                      {(maxQ * pct).toFixed(1)}
                    </text>
                  </g>
                ))}

                {/* Rating curve */}
                <path d={ratingPath} fill="none" stroke="#06b6d4" strokeWidth="2.5" />

                {/* Critical depth line */}
                <line
                  x1={padL}
                  y1={mapY(Yc)}
                  x2={padL + inW}
                  y2={mapY(Yc)}
                  stroke="#fb7185"
                  strokeDasharray="4 3"
                  strokeWidth="1.2"
                />
                <text x={padL + inW - 5} y={mapY(Yc) - 4} fill="#fb7185" fontSize="10" textAnchor="end" fontWeight="600">
                  Yc = {Yc.toFixed(2)} m
                </text>

                {/* Current operating point marker */}
                <line
                  x1={padL}
                  y1={mapY(activeY)}
                  x2={mapQ(flowRate)}
                  y2={mapY(activeY)}
                  stroke="#fbbf24"
                  strokeDasharray="2 2"
                  strokeWidth="1.2"
                />
                <line
                  x1={mapQ(flowRate)}
                  y1={mapY(activeY)}
                  x2={mapQ(flowRate)}
                  y2={padT + inH}
                  stroke="#fbbf24"
                  strokeDasharray="2 2"
                  strokeWidth="1.2"
                />
                <circle cx={mapQ(flowRate)} cy={mapY(activeY)} r="5.5" fill="#fbbf24" stroke="#ffffff" strokeWidth="2" />

                {/* Axis Labels */}
                <text x={padL + inW / 2} y={padT + inH + 32} fill="#94a3b8" fontSize="11" textAnchor="middle">
                  Débit Q (m³/s)
                </text>
                <text x={-(padT + inH / 2)} y="18" fill="#94a3b8" fontSize="11" textAnchor="middle" transform="rotate(-90)">
                  Tirant d'eau Y (m)
                </text>
              </svg>
            </div>
          </div>

          {/* Full Hydraulic Properties Detailed Grid */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 shadow-md text-xs font-mono grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block text-[10px] font-sans">Section Mouillée (S)</span>
              <span className="font-bold text-cyan-300 text-sm">{hyd.S.toFixed(3)} m²</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block text-[10px] font-sans">Périmètre Mouillé (Pm)</span>
              <span className="font-bold text-slate-200 text-sm">{hyd.Pm.toFixed(3)} m</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block text-[10px] font-sans">Rayon Hydraulique (Rh)</span>
              <span className="font-bold text-slate-200 text-sm">{hyd.Rh.toFixed(3)} m</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block text-[10px] font-sans">Largeur au Miroir (Lm)</span>
              <span className="font-bold text-slate-200 text-sm">{hyd.Lm.toFixed(3)} m</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block text-[10px] font-sans">Énergie Spécifique (Hs)</span>
              <span className="font-bold text-amber-300 text-sm">{hyd.Hs.toFixed(3)} m</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block text-[10px] font-sans">Pente de Frottement (J)</span>
              <span className="font-bold text-slate-200 text-sm">{hyd.J.toFixed(5)} m/m</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block text-[10px] font-sans">Cisaillement du Fond (τ)</span>
              <span className="font-bold text-rose-300 text-sm">{hyd.tau.toFixed(2)} Pa</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block text-[10px] font-sans">Profondeur Hydr. (Dh)</span>
              <span className="font-bold text-slate-200 text-sm">{hyd.Dh.toFixed(3)} m</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
