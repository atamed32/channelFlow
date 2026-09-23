import React, { useState, useMemo } from 'react';
import { SimulationConfig, runSimulation, CalculationPoint } from './engine/hydraulics';
import { SAMPLE_CASES, exportToKan, exportToCanal21Excel } from './engine/kanParser';
import { LongitudinalProfileChart } from './components/LongitudinalProfileChart';
import { CrossSectionViewer } from './components/CrossSectionViewer';
import { SpecificEnergyDiagram } from './components/SpecificEnergyDiagram';
import { ResultsTable } from './components/ResultsTable';
import { ReachesEditor } from './components/ReachesEditor';
import { SectionCalculator } from './components/SectionCalculator';
import { HydraulicStructures } from './components/HydraulicStructures';
import { HydraulicJumpCalculator } from './components/HydraulicJumpCalculator';
import { EngineeringReport } from './components/EngineeringReport';
import {
  Waves,
  Activity,
  Sliders,
  Table as TableIcon,
  BookOpen,
  Calculator,
  GitCommit,
  FileText,
  Download,
  Play,
  RotateCcw,
} from 'lucide-react';

export const App: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig>(SAMPLE_CASES.oued_mazouz.config);
  const [activeTab, setActiveTab] = useState<
    'profile' | 'section' | 'jump' | 'structures' | 'table' | 'editor' | 'report' | 'theory'
  >('profile');
  const [selectedPointIndex, setSelectedPointIndex] = useState<number>(0);

  // Run simulation reactively whenever config changes
  const result = useMemo(() => {
    return runSimulation(config);
  }, [config]);

  const selectedPoint = result.points[selectedPointIndex] || result.points[0] || null;
  const currentReach = config.reaches.find((r) => r.id === (selectedPoint?.elem ?? 1)) || config.reaches[0];

  const totalLength = useMemo(() => config.reaches.reduce((acc, r) => acc + r.length, 0), [config.reaches]);
  const avgVelocity = useMemo(() => {
    if (result.points.length === 0) return 0;
    const sum = result.points.reduce((acc, p) => acc + p.V, 0);
    return sum / result.points.length;
  }, [result.points]);
  const maxFroude = useMemo(() => {
    if (result.points.length === 0) return 0;
    return Math.max(...result.points.map((p) => p.F));
  }, [result.points]);

  const handleExportKan = () => {
    const text = exportToKan(config);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'projet_canal21.kan');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Bar strictly conforming to Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-4 lg:px-8 py-3 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          {/* Zone 1: Single text element Brand wordmark */}
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); setActiveTab('profile'); }}
            className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2 hover:text-cyan-400 transition"
          >
            <Waves className="w-5 h-5 text-cyan-400" />
            <span>Canal21 Web</span>
          </a>

          {/* Zone 2: Navigation Links (Single-line controls) */}
          <nav className="hidden lg:flex items-center gap-5 text-xs font-medium text-slate-400">
            <button
              onClick={() => setActiveTab('profile')}
              className={`hover:text-slate-100 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'profile' ? 'text-cyan-400 font-semibold' : ''
              }`}
            >
              Profil en Long
            </button>
            <button
              onClick={() => setActiveTab('section')}
              className={`hover:text-slate-100 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'section' ? 'text-cyan-400 font-semibold' : ''
              }`}
            >
              Calcul de Section
            </button>
            <button
              onClick={() => setActiveTab('jump')}
              className={`hover:text-slate-100 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'jump' ? 'text-cyan-400 font-semibold' : ''
              }`}
            >
              Ressaut Hydraulique
            </button>
            <button
              onClick={() => setActiveTab('structures')}
              className={`hover:text-slate-100 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'structures' ? 'text-cyan-400 font-semibold' : ''
              }`}
            >
              Ouvrages & Seuils
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`hover:text-slate-100 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'table' ? 'text-cyan-400 font-semibold' : ''
              }`}
            >
              Résultats (c_result)
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`hover:text-slate-100 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'editor' ? 'text-cyan-400 font-semibold' : ''
              }`}
            >
              Biefs & Projets
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`hover:text-slate-100 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'report' ? 'text-cyan-400 font-semibold' : ''
              }`}
            >
              Rapport Technique
            </button>
            <button
              onClick={() => setActiveTab('theory')}
              className={`hover:text-slate-100 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'theory' ? 'text-cyan-400 font-semibold' : ''
              }`}
            >
              Théorie & Formules
            </button>
          </nav>

          {/* Zone 3: 1-2 Primary Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportKan}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer whitespace-nowrap"
              title="Exporter l'étude au format .kan Canal21"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Exporter .kan</span>
            </button>

            <button
              onClick={() => setConfig({ ...config })}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition cursor-pointer shadow-md shadow-cyan-950/40 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Recalculer</span>
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Horizontal Navigation Scroll */}
        <div className="lg:hidden flex items-center gap-2 mt-3 pt-2 border-t border-slate-800 overflow-x-auto text-xs pb-1">
          {[
            { id: 'profile', label: 'Profil en Long' },
            { id: 'section', label: 'Calcul de Section' },
            { id: 'jump', label: 'Ressaut Hydraulique' },
            { id: 'structures', label: 'Ouvrages' },
            { id: 'table', label: 'Résultats c_result' },
            { id: 'editor', label: 'Biefs & Projets' },
            { id: 'report', label: 'Rapport' },
            { id: 'theory', label: 'Théorie' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1 rounded-md whitespace-nowrap cursor-pointer transition ${
                activeTab === tab.id
                  ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full p-4 lg:p-8 flex-1 flex flex-col gap-6">
        {/* TAB 1: PROFIL EN LONG & OVERVIEW */}
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-6">
            {/* Telemetry Bar (Unboxed metadata with separators per design constitution) */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 font-mono tabular-nums">
                <span className="font-sans text-slate-500">Débit :</span>
                <span className="text-cyan-300 font-semibold">{config.flowRate.toFixed(2)} m³/s</span>
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span className="font-sans text-slate-500">Longueur :</span>
                <span className="text-slate-200">{totalLength.toFixed(1)} m</span>
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span className="font-sans text-slate-500">Biefs :</span>
                <span className="text-amber-300">{config.reaches.length}</span>
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span className="font-sans text-slate-500">Vitesse moyenne :</span>
                <span className="text-slate-200">{avgVelocity.toFixed(2)} m/s</span>
              </div>

              <div className="flex items-center gap-2 font-mono tabular-nums text-[11px]">
                <span className="font-sans text-slate-500">Froude max :</span>
                <span className={maxFroude > 1 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {maxFroude.toFixed(2)}
                </span>
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span>{result.jumpDetected ? 'Ressaut localisé' : 'Écoulement continu'}</span>
              </div>
            </div>

            {/* Longitudinal Profile Chart */}
            <LongitudinalProfileChart
              points={result.points}
              result={result}
              selectedPointIndex={selectedPointIndex}
              onSelectPoint={(idx) => setSelectedPointIndex(idx)}
            />

            {/* Reaches summary badges */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <span className="font-semibold text-slate-300 mb-2.5 block text-xs uppercase tracking-wider">
                Synthèse Hydraulique des Biefs ({result.reachesSummary.length})
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {result.reachesSummary.map((summary) => (
                  <div
                    key={`sum-${summary.reachIndex}`}
                    className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex flex-col gap-1 font-mono tabular-nums"
                  >
                    <div className="flex justify-between items-center font-sans border-b border-slate-800 pb-1">
                      <span className="font-bold text-slate-200">{summary.reachName}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          summary.slopeType === 'steep'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {summary.regime}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400 pt-1">
                      <span>Tirant critique Yc:</span>
                      <span className="font-bold text-rose-300">{summary.Yc.toFixed(3)} m</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Tirant normal Yn:</span>
                      <span className="font-bold text-emerald-300">
                        {summary.Yn != null ? `${summary.Yn.toFixed(3)} m` : 'Non défini'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Pente critique Ic:</span>
                      <span className="font-bold text-amber-300">{summary.Ic.toFixed(4)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Side by side: Cross Section & Specific Energy Diagram */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CrossSectionViewer
                reach={currentReach}
                point={selectedPoint}
                flowRate={config.flowRate}
              />
              <SpecificEnergyDiagram
                reach={currentReach}
                point={selectedPoint}
                flowRate={config.flowRate}
              />
            </div>
          </div>
        )}

        {/* TAB 2: SECTION CALCULATOR & RATING CURVE */}
        {activeTab === 'section' && <SectionCalculator />}

        {/* TAB 3: HYDRAULIC JUMP CALCULATOR */}
        {activeTab === 'jump' && <HydraulicJumpCalculator />}

        {/* TAB 4: HYDRAULIC STRUCTURES (WEIRS & GATES) */}
        {activeTab === 'structures' && <HydraulicStructures />}

        {/* TAB 5: RESULTS TABLE (CANAL21 c_result.txt format) */}
        {activeTab === 'table' && (
          <ResultsTable
            config={config}
            result={result}
            selectedPointIndex={selectedPointIndex}
            onSelectPoint={(idx) => setSelectedPointIndex(idx)}
          />
        )}

        {/* TAB 6: REACHES & KAN CONFIGURATION EDITOR */}
        {activeTab === 'editor' && (
          <ReachesEditor
            config={config}
            onChangeConfig={(newCfg) => setConfig(newCfg)}
          />
        )}

        {/* TAB 7: ENGINEERING REPORT */}
        {activeTab === 'report' && (
          <EngineeringReport config={config} result={result} />
        )}

        {/* TAB 8: THEORY & REFERENCE */}
        {activeTab === 'theory' && (
          <div className="flex flex-col gap-6 rounded-2xl bg-slate-900/90 border border-slate-800 p-6 text-sm text-slate-300 shadow-xl">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                Documentation Technique & Formules de Canal21
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Fondements mathématiques et hydrauliques régissant l'écoulement graduellement varié dans les canaux découverts
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
                <h3 className="font-bold text-cyan-300 text-base">1. Équation de Manning-Strickler</h3>
                <p className="text-xs leading-relaxed text-slate-300">
                  La vitesse moyenne V en régime uniforme s'exprime selon la formule de Strickler :
                </p>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-cyan-200 text-center">
                  V = K · Rh^(2/3) · J^(1/2)
                </div>
                <p className="text-xs text-slate-400">
                  où K est le coefficient de rugosité de Strickler, Rh = S / Pm est le rayon hydraulique, et J est la pente de la ligne d'énergie (perte de charge linéaire).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
                <h3 className="font-bold text-cyan-300 text-base">2. Nombre de Froude & Régimes</h3>
                <p className="text-xs leading-relaxed text-slate-300">
                  Le nombre sans dimension de Froude F caractérise l'influence relative des forces d'inertie et de gravité :
                </p>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-amber-200 text-center">
                  F = V / √(g · Dh) = √( Q² · Lm / (g · S³) )
                </div>
                <ul className="list-disc pl-4 text-xs space-y-1 text-slate-300">
                  <li><strong className="text-cyan-300">F &lt; 1 (Régime fluvial / subcritical) :</strong> Ondes se propageant vers l'amont, contrôle situé à l'aval.</li>
                  <li><strong className="text-emerald-300">F = 1 (Régime critique) :</strong> Énergie spécifique minimale pour le débit Q.</li>
                  <li><strong className="text-rose-300">F &gt; 1 (Régime torrentiel / supercritical) :</strong> Ondes emportées vers l'aval, contrôle à l'amont.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
                <h3 className="font-bold text-cyan-300 text-base">3. Équation de la Ligne d'Eau (Courbes de Remous)</h3>
                <p className="text-xs leading-relaxed text-slate-300">
                  La variation du tirant d'eau Y selon l'abscisse x est obtenue par intégration de l'équation différentielle de l'écoulement graduellement varié :
                </p>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-blue-200 text-center">
                  dy / dx = (I - J) / (1 - F²)
                </div>
                <p className="text-xs text-slate-400">
                  Intégration numérique par méthode de Runge-Kutta d'ordre 4 (RK4) :
                  Sens amont vers aval pour les branches torrentielles (dx &gt; 0) ; sens aval vers amont pour les branches fluviales (dx &lt; 0).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
                <h3 className="font-bold text-cyan-300 text-base">4. Ressaut Hydraulique (Théorème des Quantités de Mouvement)</h3>
                <p className="text-xs leading-relaxed text-slate-300">
                  Lors de la transition d'un régime torrentiel à un régime fluvial, la force spécifique M (ou momentum) se conserve :
                </p>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-purple-200 text-center">
                  M(Y) = Q² / (g · S) + S · y_bar
                </div>
                <p className="text-xs text-slate-400">
                  Pour une section rectangulaire, les tirants conjugués sont reliés par la formule de Bélanger :
                  Y₂ = (Y₁ / 2) · [ √(1 + 8 F₁²) - 1 ].
                </p>
              </div>
            </div>

            {/* Backwater curves classification table */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <h3 className="font-bold text-slate-200 text-sm mb-3">Classification des 12 Profils de Ligne d'Eau</h3>
              <div className="overflow-x-auto text-xs font-mono">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-sans">
                      <th className="py-2 px-3">Pente du fond I</th>
                      <th className="py-2 px-3">Zone 1 (Y &gt; Yn, Yc)</th>
                      <th className="py-2 px-3">Zone 2 (entre Yn et Yc)</th>
                      <th className="py-2 px-3">Zone 3 (Y &lt; Yn, Yc)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr>
                      <td className="py-2 px-3 font-semibold text-cyan-300">Faible (Mild: I &lt; Ic, Yn &gt; Yc)</td>
                      <td className="py-2 px-3 text-slate-300"><span className="text-cyan-400 font-bold">M1</span> (Exhaussement amont barrage)</td>
                      <td className="py-2 px-3 text-slate-300"><span className="text-blue-400 font-bold">M2</span> (Abaissement chute libre)</td>
                      <td className="py-2 px-3 text-slate-300"><span className="text-rose-400 font-bold">M3</span> (Remontée sous vanne)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-rose-300">Forte (Steep: I &gt; Ic, Yn &lt; Yc)</td>
                      <td className="py-2 px-3 text-slate-300"><span className="text-amber-400 font-bold">S1</span> (Remous avant ressaut)</td>
                      <td className="py-2 px-3 text-slate-300"><span className="text-orange-400 font-bold">S2</span> (Abaissement vers Yn)</td>
                      <td className="py-2 px-3 text-slate-300"><span className="text-rose-400 font-bold">S3</span> (Écoulement très torrentiel)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-emerald-300">Critique (Critical: I = Ic, Yn = Yc)</td>
                      <td className="py-2 px-3 text-slate-300"><span className="text-emerald-400 font-bold">C1</span> (Exhaussement)</td>
                      <td className="py-2 px-3 text-slate-500">—</td>
                      <td className="py-2 px-3 text-slate-300"><span className="text-emerald-400 font-bold">C3</span> (Abaissement)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-300">Horizontale (I = 0)</td>
                      <td className="py-2 px-3 text-slate-500">—</td>
                      <td className="py-2 px-3 text-slate-300"><span className="text-slate-200 font-bold">H2</span></td>
                      <td className="py-2 px-3 text-slate-300"><span className="text-slate-200 font-bold">H3</span></td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-300">Contre-pente (Adverse: I &lt; 0)</td>
                      <td className="py-2 px-3 text-slate-500">—</td>
                      <td className="py-2 px-3 text-slate-300"><span className="text-slate-200 font-bold">A2</span></td>
                      <td className="py-2 px-3 text-slate-300"><span className="text-slate-200 font-bold">A3</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-900/60 px-4 py-4 text-center text-xs text-slate-500 font-mono no-print">
        Canal21 Web • Simulateur Hydraulique des Canaux à Surface Libre & Courbes de Remous
      </footer>
    </div>
  );
};

export default App;
