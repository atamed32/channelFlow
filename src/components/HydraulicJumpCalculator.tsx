import React, { useState, useMemo } from 'react';
import { SectionType, computeHydraulics, calculateCriticalDepth, calculateConjugateDepth } from '../engine/hydraulics';
import { Waves, Zap, ShieldCheck, HelpCircle, Layers, Sliders } from 'lucide-react';

export const HydraulicJumpCalculator: React.FC = () => {
  const [sectionType, setSectionType] = useState<SectionType>('Rec');
  const [width, setWidth] = useState(4.0);
  const [fruit, setFruit] = useState(0.5);
  const [flowRate, setFlowRate] = useState(20.0);
  const [y1, setY1] = useState(0.8);

  const geom = useMemo(() => ({
    type: sectionType,
    width,
    fruit,
  }), [sectionType, width, fruit]);

  const Yc = useMemo(() => calculateCriticalDepth(geom, flowRate), [geom, flowRate]);

  // Initial upstream hydraulic state
  const hyd1 = useMemo(() => computeHydraulics(geom, y1, flowRate, 60, 0.01, 0), [geom, y1, flowRate]);

  // Downstream conjugate depth
  const y2 = useMemo(() => calculateConjugateDepth(geom, y1, flowRate), [geom, y1, flowRate]);
  const hyd2 = useMemo(() => computeHydraulics(geom, y2, flowRate, 60, 0.01, 0), [geom, y2, flowRate]);

  // Energy loss
  const deltaHs = Math.max(0, hyd1.Hs - hyd2.Hs);
  const efficiency = hyd1.Hs > 0 ? (hyd2.Hs / hyd1.Hs) * 100 : 0;
  const powerDissipated = (1000 * 9.80665 * flowRate * deltaHs) / 1000; // kW

  // Jump length empirical formulas
  // 1. Smetana: Lj = 6 * (Y2 - Y1)
  const lSmetana = Math.max(0, 6 * (y2 - y1));
  // 2. USBR (Bureau of Reclamation): Lj ~ 5 * Y2 for F1 > 4.5
  const lUsbr = Math.max(0, 5.2 * y2);
  // 3. Chertoussov: Lj = 10.3 * Y1 * (F1 - 1)^0.81
  const lChertoussov = hyd1.F > 1 ? 10.3 * y1 * Math.pow(hyd1.F - 1, 0.81) : 0;

  // Stilling basin design parameters
  const freeboard = Math.max(0.3, 0.15 * y2);
  const wallHeight = y2 + freeboard;
  const recommendedBasinLength = Math.max(lSmetana, lUsbr);

  // Jump classification based on F1
  const jumpClassification = useMemo(() => {
    const f1 = hyd1.F;
    if (f1 < 1.0) return { type: 'Pas de ressaut (Écoulement fluvial)', desc: 'Le régime amont est déjà fluvial (F1 < 1).', color: 'text-slate-400', badge: 'bg-slate-800' };
    if (f1 < 1.7) return { type: 'Ressaut ondulaire (Undular Jump)', desc: 'Surface présentant des ondulations régulières sans rouleau violent. Très peu de dissipation d\'énergie.', color: 'text-cyan-400', badge: 'bg-cyan-950 border border-cyan-800' };
    if (f1 < 2.5) return { type: 'Ressaut faible (Weak Jump)', desc: 'Petits rouleaux en surface, vitesse quasi uniforme en aval. Dissipation modérée (< 15%).', color: 'text-blue-400', badge: 'bg-blue-950 border border-blue-800' };
    if (f1 < 4.5) return { type: 'Ressaut oscillant (Oscillating Jump)', desc: 'Jet oscillant du fond vers la surface générant des vagues résiduelles sur de grandes distances.', color: 'text-amber-400', badge: 'bg-amber-950 border border-amber-800' };
    if (f1 < 9.0) return { type: 'Ressaut stable / bien formé (Steady Jump)', desc: 'Excellente dissipation d\'énergie (45% à 70%), rouleau bien calé. Régime optimal pour bassin d\'amortissement.', color: 'text-emerald-400', badge: 'bg-emerald-950 border border-emerald-800' };
    return { type: 'Ressaut fort (Strong Jump)', desc: 'Ressaut très agité avec fortes turbulences et vagues déferlantes. Dissipation > 70% mais risque d\'érosion des berges.', color: 'text-rose-400', badge: 'bg-rose-950 border border-rose-800' };
  }, [hyd1.F]);

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Waves className="w-5 h-5 text-cyan-400" />
            Calculateur de Ressaut Hydraulique & Bassin d'Amortissement
          </h2>
          <p className="text-xs text-slate-400">
            Résolution exacte des tirants conjugués Y₁ / Y₂, énergie dissipée et pré-dimensionnement de la cuvette de dissipation
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Froude amont F₁ :</span>
          <span className={`px-2.5 py-1 rounded font-bold ${hyd1.F > 1 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-300'}`}>
            {hyd1.F.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="flex flex-col gap-4 rounded-xl bg-slate-900/90 border border-slate-800 p-4 text-xs shadow-md">
          <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-2">
            Données Hydrauliques d'Entrée
          </span>

          <div>
            <label className="text-slate-400 block mb-1">Forme de la Section</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSectionType('Rec')}
                className={`py-1.5 px-3 rounded-lg border font-medium cursor-pointer transition ${
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
                className={`py-1.5 px-3 rounded-lg border font-medium cursor-pointer transition ${
                  sectionType === 'Trap'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Trapézoïdale
              </button>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Débit Q (m³/s)</label>
            <input
              type="number"
              step="0.5"
              min="0.1"
              value={flowRate}
              onChange={(e) => setFlowRate(parseFloat(e.target.value) || 0.1)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Largeur au fond B (m)</label>
            <input
              type="number"
              step="0.2"
              min="0.2"
              value={width}
              onChange={(e) => setWidth(parseFloat(e.target.value) || 1)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          {sectionType === 'Trap' && (
            <div>
              <label className="text-slate-400 block mb-1">Fruit berge m (1V:mH)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={fruit}
                onChange={(e) => setFruit(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-300 font-medium">Tirant d'eau amont Y₁ (m)</label>
              <span className="text-[11px] text-rose-400 font-mono">Critique Yc : {Yc.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min="0.1"
              max={Math.max(Yc * 1.5, 2)}
              step="0.02"
              value={y1}
              onChange={(e) => setY1(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between items-center text-xs font-mono mt-1">
              <span className="text-slate-500">0.10 m</span>
              <span className="font-bold text-cyan-300">{y1.toFixed(3)} m</span>
              <span className="text-slate-500">{(Yc * 1.5).toFixed(2)} m</span>
            </div>
          </div>
        </div>

        {/* Results & Visual Schema */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Visual Schematic of Hydraulic Jump */}
          <div className="relative rounded-xl bg-slate-950/80 border border-slate-800 p-3 overflow-hidden">
            <svg viewBox="0 0 500 200" className="w-full h-auto">
              <defs>
                <linearGradient id="jumpWater" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.85" />
                  <stop offset="35%" stopColor="#06b6d4" stopOpacity="0.75" />
                  <stop offset="65%" stopColor="#38bdf8" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.9" />
                </linearGradient>

                <linearGradient id="rollerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              {/* Canal Bed */}
              <line x1="20" y1="160" x2="480" y2="160" stroke="#64748b" strokeWidth="4" />

              {/* Scaled coordinates */}
              {(() => {
                const bedY = 160;
                const scaleY = 45;
                const h1 = Math.min(y1 * scaleY, 70);
                const h2 = Math.min(y2 * scaleY, 130);
                const jumpStart = 150;
                const jumpEnd = 330;

                const waterPath = `
                  M 20,${bedY}
                  L 20,${bedY - h1}
                  L ${jumpStart},${bedY - h1}
                  C ${jumpStart + 70},${bedY - h1} ${jumpEnd - 70},${bedY - h2} ${jumpEnd},${bedY - h2}
                  L 480,${bedY - h2}
                  L 480,${bedY}
                  Z
                `;

                return (
                  <g>
                    <path d={waterPath} fill="url(#jumpWater)" />

                    {/* Roller zone */}
                    <path
                      d={`M ${jumpStart + 30},${bedY - h1 - 5} Q ${(jumpStart + jumpEnd) / 2},${bedY - h2 - 15} ${jumpEnd - 20},${bedY - h2} Q ${(jumpStart + jumpEnd) / 2},${bedY - h1 - 2} ${jumpStart + 30},${bedY - h1 - 5}`}
                      fill="url(#rollerGrad)"
                    />

                    {/* Velocity arrows */}
                    <text x="75" y={bedY - h1 / 2 - 8} fill="#ffffff" fontSize="10" textAnchor="middle" fontWeight="bold">
                      V₁ = {hyd1.V.toFixed(2)} m/s
                    </text>
                    <text x="410" y={bedY - h2 / 2 - 8} fill="#ffffff" fontSize="10" textAnchor="middle" fontWeight="bold">
                      V₂ = {hyd2.V.toFixed(2)} m/s
                    </text>

                    {/* Height indicators */}
                    <line x1="40" y1={bedY} x2="40" y2={bedY - h1} stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3 2" />
                    <text x="35" y={bedY - h1 / 2 + 3} fill="#fbbf24" fontSize="11" textAnchor="end" fontWeight="bold" fontFamily="JetBrains Mono">
                      Y₁ = {y1.toFixed(2)} m
                    </text>

                    <line x1="460" y1={bedY} x2="460" y2={bedY - h2} stroke="#c084fc" strokeWidth="1.5" strokeDasharray="3 2" />
                    <text x="465" y={bedY - h2 / 2 + 3} fill="#c084fc" fontSize="11" textAnchor="start" fontWeight="bold" fontFamily="JetBrains Mono">
                      Y₂ = {y2.toFixed(2)} m
                    </text>

                    {/* Froude numbers */}
                    <text x="75" y="40" fill="#f87171" fontSize="11" fontWeight="bold" textAnchor="middle">
                      F₁ = {hyd1.F.toFixed(2)} (Torrentiel)
                    </text>
                    <text x="410" y="40" fill="#34d399" fontSize="11" fontWeight="bold" textAnchor="middle">
                      F₂ = {hyd2.F.toFixed(2)} (Fluvial)
                    </text>

                    {/* Jump length callout */}
                    <line x1={jumpStart} y1="180" x2={jumpEnd} y2="180" stroke="#94a3b8" strokeWidth="1.5" />
                    <line x1={jumpStart} y1="175" x2={jumpStart} y2="185" stroke="#94a3b8" strokeWidth="1.5" />
                    <line x1={jumpEnd} y1="175" x2={jumpEnd} y2="185" stroke="#94a3b8" strokeWidth="1.5" />
                    <text x={(jumpStart + jumpEnd) / 2} y="195" fill="#94a3b8" fontSize="10" textAnchor="middle">
                      Longueur estimée Lj ≈ {lSmetana.toFixed(1)} m
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Jump Classification Banner */}
          <div className={`p-3 rounded-xl ${jumpClassification.badge} flex items-start gap-3`}>
            <ShieldCheck className={`w-5 h-5 shrink-0 ${jumpClassification.color} mt-0.5`} />
            <div>
              <div className={`font-bold text-xs ${jumpClassification.color}`}>
                {jumpClassification.type} (F₁ = {hyd1.F.toFixed(2)})
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">{jumpClassification.desc}</p>
            </div>
          </div>

          {/* Stilling Basin Dimensioning Card */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-3">
            <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              Dimensionnement du Bassin de Dissipation (Stilling Basin)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Longueur Smetana</span>
                <span className="text-base font-bold text-cyan-300">{lSmetana.toFixed(2)} m</span>
                <span className="text-[10px] text-slate-500 font-sans block">6 · (Y₂ - Y₁)</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Longueur USBR</span>
                <span className="text-base font-bold text-purple-300">{lUsbr.toFixed(2)} m</span>
                <span className="text-[10px] text-slate-500 font-sans block">5.2 · Y₂</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Hauteur des Murs</span>
                <span className="text-base font-bold text-amber-300">{wallHeight.toFixed(2)} m</span>
                <span className="text-[10px] text-slate-500 font-sans block">Y₂ + revanche</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Puissance Dissipée</span>
                <span className="text-base font-bold text-rose-400">{powerDissipated.toFixed(1)} kW</span>
                <span className="text-[10px] text-slate-500 font-sans block">γ · Q · ΔH</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
