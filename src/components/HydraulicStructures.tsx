import React, { useState, useMemo } from 'react';
import { G, computeWeirDischarge, computeGateDischarge } from '../engine/hydraulics';
import { GitCommit, ArrowRight, Layers, Gauge, Info, ShieldAlert } from 'lucide-react';

export const HydraulicStructures: React.FC = () => {
  const [activeStructure, setActiveStructure] = useState<'weir' | 'gate' | 'transition'>('weir');

  // Weir State
  const [weirCrest, setWeirCrest] = useState<number>(1.2); // Pelle p (m)
  const [weirWidth, setWeirWidth] = useState<number>(4.0); // b (m)
  const [upstreamDepth, setUpstreamDepth] = useState<number>(2.0); // Y1 (m)
  const [dischargeCoeff, setDischargeCoeff] = useState<number>(0.42); // m

  // Sluice Gate State
  const [gateOpening, setGateOpening] = useState<number>(0.6); // a (m)
  const [gateWidth, setGateWidth] = useState<number>(3.5); // b (m)
  const [gateHead, setGateHead] = useState<number>(3.0); // H1 (m)
  const [contractionCoeff, setContractionCoeff] = useState<number>(0.62); // Cc

  // Transition State
  const [v1, setV1] = useState<number>(3.2); // m/s
  const [v2, setV2] = useState<number>(1.4); // m/s
  const [transitionType, setTransitionType] = useState<'expansion_abrupt' | 'expansion_gradual' | 'contraction'>('expansion_abrupt');

  // Weir calculations
  const weirResult = useMemo(() => {
    return computeWeirDischarge(weirCrest, upstreamDepth, weirWidth, dischargeCoeff);
  }, [weirCrest, upstreamDepth, weirWidth, dischargeCoeff]);

  // Sluice gate calculations
  const gateResult = useMemo(() => {
    return computeGateDischarge(gateOpening, gateHead, gateWidth, contractionCoeff);
  }, [gateOpening, gateHead, gateWidth, contractionCoeff]);

  // Transition loss calculation
  const transitionLoss = useMemo(() => {
    if (transitionType === 'expansion_abrupt') {
      // Borda-Carnot: Delta H = (V1 - V2)^2 / (2g)
      return Math.pow(v1 - v2, 2) / (2 * G);
    }
    if (transitionType === 'expansion_gradual') {
      // Delta H = 0.3 * (V1^2 - V2^2) / (2g)
      return Math.max(0, 0.3 * (v1 * v1 - v2 * v2) / (2 * G));
    }
    // Contraction: Delta H = 0.5 * (1/Cc - 1)^2 * V2^2 / (2g) approx 0.1 * V2^2 / (2g)
    return 0.1 * (v2 * v2) / (2 * G);
  }, [v1, v2, transitionType]);

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-cyan-400" />
            Ouvrages Hydrauliques & Raccordements
          </h2>
          <p className="text-xs text-slate-400">
            Dimensionnement et comportement des seuils déversants, vannes de fond et singularités de profil
          </p>
        </div>

        {/* Structure Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveStructure('weir')}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              activeStructure === 'weir' ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Seuil Déversant (Weir)
          </button>
          <button
            type="button"
            onClick={() => setActiveStructure('gate')}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              activeStructure === 'gate' ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Vanne de Fond (Gate)
          </button>
          <button
            type="button"
            onClick={() => setActiveStructure('transition')}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              activeStructure === 'transition' ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Singularités & Raccords
          </button>
        </div>
      </div>

      {/* WEIR (SEUIL DÉVERSANT) */}
      {activeStructure === 'weir' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="flex flex-col gap-4 rounded-xl bg-slate-900/90 border border-slate-800 p-4 text-xs shadow-md">
            <span className="font-semibold text-slate-200 text-xs border-b border-slate-800 pb-2">
              Paramètres du Seuil Déversant
            </span>

            <div>
              <label className="text-slate-400 block mb-1">Hauteur de pelle p (m)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={weirCrest}
                onChange={(e) => setWeirCrest(Math.max(0.01, parseFloat(e.target.value) || 0.1))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Largeur déversante b (m)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={weirWidth}
                onChange={(e) => setWeirWidth(Math.max(0.5, parseFloat(e.target.value) || 1))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Tirant d'eau amont Y₁ (m)</label>
              <input
                type="number"
                step="0.1"
                min={weirCrest + 0.05}
                value={upstreamDepth}
                onChange={(e) => setUpstreamDepth(Math.max(weirCrest + 0.01, parseFloat(e.target.value) || (weirCrest + 0.1)))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-bold font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Coefficient de débit μ (Poleni / Bazin)</label>
              <input
                type="number"
                step="0.01"
                min="0.30"
                max="0.55"
                value={dischargeCoeff}
                onChange={(e) => setDischargeCoeff(parseFloat(e.target.value) || 0.40)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 font-mono focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 block mt-1">Crête mince : ~0.42 | Seuil épais : ~0.385</span>
            </div>
          </div>

          {/* Results & Visual Schematic */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="relative rounded-xl bg-slate-950/80 border border-slate-800 p-3 overflow-hidden">
              <svg viewBox="0 0 500 200" className="w-full h-auto">
                <defs>
                  <linearGradient id="weirWaterGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.85" />
                    <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.5" />
                  </linearGradient>
                </defs>

                {/* Bed */}
                <line x1="20" y1="170" x2="480" y2="170" stroke="#64748b" strokeWidth="4" />

                {/* Weir Wall */}
                <rect x="230" y="90" width="30" height="80" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />

                {/* Upstream Water */}
                <rect x="30" y="45" width="200" height="125" fill="url(#weirWaterGrad)" />

                {/* Nappe over weir */}
                <path
                  d="M 230,45 C 245,45 255,60 260,90 C 275,135 295,160 380,165 L 480,165 L 480,170 L 260,170 Z"
                  fill="url(#weirWaterGrad)"
                />

                {/* Annotation lines */}
                {/* Crest height p */}
                <line x1="215" y1="170" x2="215" y2="90" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3 2" />
                <text x="210" y="130" fill="#fbbf24" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono">
                  p = {weirCrest.toFixed(2)}m
                </text>

                {/* Head h */}
                <line x1="215" y1="90" x2="215" y2="45" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 2" />
                <text x="210" y="68" fill="#38bdf8" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono">
                  h = {weirResult.head.toFixed(2)}m
                </text>

                {/* Upstream Depth Y1 */}
                <line x1="60" y1="170" x2="60" y2="45" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
                <text x="70" y="105" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono">
                  Y₁ = {upstreamDepth.toFixed(2)}m
                </text>

                {/* Flow arrow */}
                <path d="M 120,80 L 160,80" stroke="#ffffff" strokeWidth="2" />
                <polygon points="160,76 168,80 160,84" fill="#ffffff" />
                <text x="140" y="70" fill="#ffffff" fontSize="10" textAnchor="middle" fontWeight="bold">
                  Q = {weirResult.flowRate.toFixed(2)} m³/s
                </text>
              </svg>
            </div>

            <div className="grid grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Charge sur Crête (h)</span>
                <span className="text-lg font-bold text-cyan-300">{weirResult.head.toFixed(3)} m</span>
                <span className="text-[10px] text-slate-500 font-sans">Y₁ - p</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Débit Déversé (Q)</span>
                <span className="text-lg font-bold text-amber-300">{weirResult.flowRate.toFixed(3)} m³/s</span>
                <span className="text-[10px] text-slate-500 font-sans">Formule Poleni</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Débit Linéaire (q)</span>
                <span className="text-lg font-bold text-slate-200">
                  {(weirResult.flowRate / weirWidth).toFixed(3)} m²/s
                </span>
                <span className="text-[10px] text-slate-500 font-sans">Q / b</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SLUICE GATE (VANNE DE FOND) */}
      {activeStructure === 'gate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="flex flex-col gap-4 rounded-xl bg-slate-900/90 border border-slate-800 p-4 text-xs shadow-md">
            <span className="font-semibold text-slate-200 text-xs border-b border-slate-800 pb-2">
              Paramètres de la Vanne de Fond
            </span>

            <div>
              <label className="text-slate-400 block mb-1">Ouverture de vanne a (m)</label>
              <input
                type="number"
                step="0.05"
                min="0.05"
                value={gateOpening}
                onChange={(e) => setGateOpening(Math.max(0.01, parseFloat(e.target.value) || 0.1))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Charge amont H₁ (m)</label>
              <input
                type="number"
                step="0.2"
                min={gateOpening + 0.1}
                value={gateHead}
                onChange={(e) => setGateHead(Math.max(gateOpening + 0.05, parseFloat(e.target.value) || 1))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-bold font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Largeur de passe b (m)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={gateWidth}
                onChange={(e) => setGateWidth(Math.max(0.5, parseFloat(e.target.value) || 1))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Coefficient de contraction Cc</label>
              <input
                type="number"
                step="0.01"
                min="0.55"
                max="0.75"
                value={contractionCoeff}
                onChange={(e) => setContractionCoeff(parseFloat(e.target.value) || 0.62)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 font-mono focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 block mt-1">Vanne verticale : ~0.61 - 0.62</span>
            </div>
          </div>

          {/* Results & Visual Schematic */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="relative rounded-xl bg-slate-950/80 border border-slate-800 p-3 overflow-hidden">
              <svg viewBox="0 0 500 200" className="w-full h-auto">
                {/* Bed */}
                <line x1="20" y1="170" x2="480" y2="170" stroke="#64748b" strokeWidth="4" />

                {/* Sluice Gate Leaf */}
                <rect x="230" y="20" width="16" height="110" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />

                {/* Upstream Deep Water */}
                <rect x="30" y="40" width="200" height="130" fill="#0284c7" fillOpacity="0.8" />

                {/* Water jet under gate (contracted vein) */}
                <path
                  d="M 230,130 Q 260,145 280,148 L 480,148 L 480,170 L 230,170 Z"
                  fill="#06b6d4"
                  fillOpacity="0.85"
                />

                {/* Annotations */}
                <line x1="215" y1="170" x2="215" y2="40" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3 2" />
                <text x="210" y="90" fill="#fbbf24" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono">
                  H₁ = {gateHead.toFixed(2)}m
                </text>

                {/* Opening a */}
                <line x1="255" y1="170" x2="255" y2="130" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2 2" />
                <text x="260" y="145" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono">
                  a = {gateOpening.toFixed(2)}m
                </text>

                {/* Vena contracta y0 */}
                <line x1="310" y1="170" x2="310" y2="148" stroke="#c084fc" strokeWidth="1.5" strokeDasharray="2 2" />
                <text x="315" y="160" fill="#c084fc" fontSize="10" fontFamily="JetBrains Mono">
                  y₀ = {gateResult.venaContractaDepth.toFixed(2)}m
                </text>

                {/* Torrential regime callout */}
                <text x="360" y="125" fill="#f87171" fontSize="11" fontWeight="bold">
                  Veine torrentielle (F₀ = {gateResult.froudeExit.toFixed(2)})
                </text>
              </svg>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Débit sous vanne (Q)</span>
                <span className="text-lg font-bold text-cyan-300">{gateResult.flowRate.toFixed(2)} m³/s</span>
                <span className="text-[10px] text-slate-500 font-sans">Écoulement dénoyé</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Tirant contracté (y₀)</span>
                <span className="text-lg font-bold text-purple-300">{gateResult.venaContractaDepth.toFixed(3)} m</span>
                <span className="text-[10px] text-slate-500 font-sans">Cc · a</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Vitesse de sortie (V₀)</span>
                <span className="text-lg font-bold text-amber-300">{gateResult.velocity.toFixed(2)} m/s</span>
                <span className="text-[10px] text-slate-500 font-sans">Q / (b · y₀)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Froude en sortie (F₀)</span>
                <span className="text-lg font-bold text-rose-400">{gateResult.froudeExit.toFixed(2)}</span>
                <span className="text-[10px] text-slate-500 font-sans">Régime torrentiel</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TRANSITIONS & SINGULAR LOSSES */}
      {activeStructure === 'transition' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="flex flex-col gap-4 rounded-xl bg-slate-900/90 border border-slate-800 p-4 text-xs shadow-md">
            <span className="font-semibold text-slate-200 text-xs border-b border-slate-800 pb-2">
              Singularités de Profil
            </span>

            <div>
              <label className="text-slate-400 block mb-1">Type de Transition</label>
              <select
                value={transitionType}
                onChange={(e) => setTransitionType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="expansion_abrupt">Élargissement brusque (Borda-Carnot)</option>
                <option value="expansion_gradual">Élargissement progressif (Diffuseur)</option>
                <option value="contraction">Rétrécissement de section</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Vitesse amont V₁ (m/s)</label>
              <input
                type="number"
                step="0.2"
                min="0.1"
                value={v1}
                onChange={(e) => setV1(Math.max(0.1, parseFloat(e.target.value) || 0.5))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Vitesse aval V₂ (m/s)</label>
              <input
                type="number"
                step="0.2"
                min="0.1"
                value={v2}
                onChange={(e) => setV2(Math.max(0.1, parseFloat(e.target.value) || 0.5))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-3">
              <span className="font-semibold text-slate-200 text-sm">
                Perte de Charge Singulière Calculée (ΔH_sing)
              </span>

              <div className="flex items-center gap-4">
                <span className="text-3xl font-mono font-bold text-rose-400">
                  {transitionLoss.toFixed(3)} m
                </span>
                <span className="text-xs text-slate-400">
                  Chute de charge totale entre les sections amont et aval
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 flex flex-col gap-1.5">
                <div className="font-mono text-cyan-300">
                  {transitionType === 'expansion_abrupt' && 'ΔH = (V₁ - V₂)² / (2g) [Théorème de Borda-Carnot]'}
                  {transitionType === 'expansion_gradual' && 'ΔH = 0.3 · (V₁² - V₂²) / (2g)'}
                  {transitionType === 'contraction' && 'ΔH = 0.1 · V₂² / (2g)'}
                </div>
                <p className="text-[11px] text-slate-400">
                  Dans le modèle complet Canal21, cette perte est injectée directement à l'interface de jonction entre les deux biefs adjacents.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
