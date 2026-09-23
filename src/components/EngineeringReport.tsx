import React from 'react';
import { SimulationConfig, SimulationResult } from '../engine/hydraulics';
import { Printer, Download, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Props {
  config: SimulationConfig;
  result: SimulationResult;
}

export const EngineeringReport: React.FC<Props> = ({ config, result }) => {
  const handlePrint = () => {
    window.print();
  };

  const totalLength = config.reaches.reduce((acc, r) => acc + r.length, 0);
  const zStart = config.reaches[0]?.zBedUpstream ?? 0;
  const zEnd = config.reaches[config.reaches.length - 1]?.zBedDownstream ?? 0;
  const totalDrop = zStart - zEnd;
  const maxVelocity = Math.max(...result.points.map((p) => p.V), 0);
  const minDepth = Math.min(...result.points.map((p) => p.Y), 0);
  const maxDepth = Math.max(...result.points.map((p) => p.Y), 0);
  const maxFroude = Math.max(...result.points.map((p) => p.F), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 no-print">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Rapport Technique d'Étude Hydraulique
          </h2>
          <p className="text-xs text-slate-400">
            Document de synthèse pour bureau d'études, dimensionnement et conformité hydraulique
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition cursor-pointer shadow-md shadow-cyan-950/40"
        >
          <Printer className="w-4 h-4" />
          Imprimer / Exporter en PDF
        </button>
      </div>

      {/* Printable Sheet */}
      <div className="rounded-2xl bg-white text-slate-900 p-8 sm:p-12 shadow-2xl border border-slate-200 max-w-5xl mx-auto w-full print:p-0 print:border-none print:shadow-none">
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-6 mb-6 flex flex-wrap justify-between items-start gap-4">
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              Canal21 • Note de Calcul Hydraulique
            </div>
            <div className="text-sm font-semibold text-slate-600 mt-1">
              Simulation d'Écoulement à Surface Libre & Profils de Ligne d'Eau
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Logiciel Canal21 • Modèle Saint-Venant GVF (Gradually Varied Flow)
            </div>
          </div>

          <div className="text-right text-xs font-mono text-slate-600">
            <div>Date : {new Date().toLocaleDateString('fr-FR')}</div>
            <div>Débit de projet : <strong className="text-slate-900">{config.flowRate.toFixed(2)} m³/s</strong></div>
            <div>Biefs analysés : {config.reaches.length}</div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1.5 mb-3">
            1. Synthèse Générale de l'Écoulement
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[10px] font-sans">Longueur Totale</span>
              <span className="text-base font-bold text-slate-900">{totalLength.toFixed(1)} m</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[10px] font-sans">Dénivelée Totale (Chute)</span>
              <span className="text-base font-bold text-slate-900">{totalDrop.toFixed(2)} m</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[10px] font-sans">Vitesse Maximale</span>
              <span className="text-base font-bold text-slate-900">{maxVelocity.toFixed(2)} m/s</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[10px] font-sans">Froude Maximal</span>
              <span className="text-base font-bold text-slate-900">{maxFroude.toFixed(2)}</span>
            </div>
          </div>

          {result.jumpDetected && (
            <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong>Présence d'un Ressaut Hydraulique Localisé :</strong> Transition torrentiel vers fluvial détectée à l'abscisse x = {result.jumpDetected.x.toFixed(1)} m (Tirant amont Y₁ = {result.jumpDetected.y1.toFixed(2)} m, Tirant conjugué Y₂ = {result.jumpDetected.y2.toFixed(2)} m, Perte d'énergie = {result.jumpDetected.energyLoss} m). Un bassin d'amortissement ou enrochement est recommandé.
              </div>
            </div>
          )}
        </div>

        {/* Reaches Specifications Table */}
        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1.5 mb-3">
            2. Caractéristiques Géométriques & Hydrauliques des Biefs
          </h3>
          <div className="overflow-x-auto text-xs font-mono">
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-sans">
                <tr>
                  <th className="p-2 border border-slate-200">Bief</th>
                  <th className="p-2 border border-slate-200">Section</th>
                  <th className="p-2 border border-slate-200 text-right">Largeur B (m)</th>
                  <th className="p-2 border border-slate-200 text-right">Longueur (m)</th>
                  <th className="p-2 border border-slate-200 text-right">Pente I (m/m)</th>
                  <th className="p-2 border border-slate-200 text-right">Strickler K</th>
                  <th className="p-2 border border-slate-200 text-right">Y critique (m)</th>
                  <th className="p-2 border border-slate-200 text-right">Y normal (m)</th>
                  <th className="p-2 border border-slate-200 text-center">Régime</th>
                </tr>
              </thead>
              <tbody>
                {config.reaches.map((r, i) => {
                  const summary = result.reachesSummary[i];
                  return (
                    <tr key={`rep-reach-${r.id}`} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-2 border border-slate-200 font-bold">{r.name}</td>
                      <td className="p-2 border border-slate-200">{r.type}</td>
                      <td className="p-2 border border-slate-200 text-right">{r.width.toFixed(2)}</td>
                      <td className="p-2 border border-slate-200 text-right">{r.length.toFixed(1)}</td>
                      <td className="p-2 border border-slate-200 text-right">{r.slope.toFixed(4)}</td>
                      <td className="p-2 border border-slate-200 text-right">{r.strickler}</td>
                      <td className="p-2 border border-slate-200 text-right font-bold text-rose-700">
                        {summary?.Yc.toFixed(3) ?? '-'}
                      </td>
                      <td className="p-2 border border-slate-200 text-right font-bold text-emerald-700">
                        {summary?.Yn?.toFixed(3) ?? '-'}
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-bold">
                        {summary?.regime ?? '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Critical Points Summary */}
        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1.5 mb-3">
            3. Profil en Long de la Ligne d'Eau (Échantillonnage de Calcul)
          </h3>
          <div className="overflow-x-auto text-xs font-mono">
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-sans">
                <tr>
                  <th className="p-2 border border-slate-200">Point</th>
                  <th className="p-2 border border-slate-200 text-right">x (m)</th>
                  <th className="p-2 border border-slate-200 text-right">Cote Fond Zf (m)</th>
                  <th className="p-2 border border-slate-200 text-right">Tirant Y (m)</th>
                  <th className="p-2 border border-slate-200 text-right">Cote Eau Z (m)</th>
                  <th className="p-2 border border-slate-200 text-right">Vitesse V (m/s)</th>
                  <th className="p-2 border border-slate-200 text-right">Charge H (m)</th>
                  <th className="p-2 border border-slate-200 text-right">Froude F</th>
                  <th className="p-2 border border-slate-200 text-center">Régime</th>
                </tr>
              </thead>
              <tbody>
                {result.points.filter((_, idx) => idx % Math.max(1, Math.floor(result.points.length / 15)) === 0).map((p) => (
                  <tr key={`pt-rep-${p.no}`} className="hover:bg-slate-50">
                    <td className="p-2 border border-slate-200">{p.no}</td>
                    <td className="p-2 border border-slate-200 text-right font-medium">{p.x.toFixed(2)}</td>
                    <td className="p-2 border border-slate-200 text-right">{p.Zf.toFixed(3)}</td>
                    <td className="p-2 border border-slate-200 text-right font-bold text-blue-700">{p.Y.toFixed(3)}</td>
                    <td className="p-2 border border-slate-200 text-right font-bold">{p.Z.toFixed(3)}</td>
                    <td className="p-2 border border-slate-200 text-right">{p.V.toFixed(2)}</td>
                    <td className="p-2 border border-slate-200 text-right">{p.H.toFixed(3)}</td>
                    <td className="p-2 border border-slate-200 text-right">{p.F.toFixed(3)}</td>
                    <td className="p-2 border border-slate-200 text-center font-bold text-slate-800">{p.reg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signature & Disclaimer */}
        <div className="border-t border-slate-300 pt-6 mt-8 flex justify-between items-end text-xs text-slate-500">
          <div>
            <div>Calculé conformément aux principes de l'hydraulique des canaux découverts.</div>
            <div>Équation de Manning-Strickler & Écoulement Graduellement Varié (Saint-Venant).</div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-slate-800 mb-6">Visa de l'Ingénieur Hydraulicien :</div>
            <div className="w-40 border-b border-slate-400"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
