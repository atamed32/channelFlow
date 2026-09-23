import React, { useState, useMemo } from 'react';
import { CalculationPoint, SimulationConfig, SimulationResult } from '../engine/hydraulics';
import { exportToCanal21Excel } from '../engine/kanParser';
import { Download, Copy, Check, Search, Filter } from 'lucide-react';

interface Props {
  config: SimulationConfig;
  result: SimulationResult;
  selectedPointIndex?: number;
  onSelectPoint?: (index: number) => void;
}

export const ResultsTable: React.FC<Props> = ({
  config,
  result,
  selectedPointIndex,
  onSelectPoint,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [regimeFilter, setRegimeFilter] = useState<'all' | 'flu' | 'tor'>('all');
  const [copied, setCopied] = useState(false);

  const filteredPoints = useMemo(() => {
    return result.points.filter((p) => {
      if (regimeFilter !== 'all') {
        if (regimeFilter === 'flu' && !p.reg.startsWith('flu')) return false;
        if (regimeFilter === 'tor' && !p.reg.startsWith('tor')) return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesX = p.x.toString().includes(term);
        const matchesElem = `bief ${p.elem}`.includes(term) || p.elem.toString() === term;
        return matchesX || matchesElem;
      }
      return true;
    });
  }, [result.points, searchTerm, regimeFilter]);

  const handleCopy = () => {
    const text = exportToCanal21Excel(config, result);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadExcel = () => {
    const text = exportToCanal21Excel(config, result);
    const blob = new Blob([text], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'c_result.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    const headers = [
      'no', 'Elem', 'x_m', 'Zf_m', 'Y_m', 'V_ms', 'J_mm', 'H_m', 'Hs_m', 'F',
      'regime', 'Pm_m', 'S_m2', 'Lm_m', 'I_mm', 'dydx', 'Yc_m', 'I_J', 'HsC_m', 'Z_m', 'tau_Pa'
    ];
    const rows = result.points.map((p) => [
      p.no, p.elem, p.x, p.Zf, p.Y, p.V, p.J, p.H, p.Hs, p.F,
      p.reg, p.Pm, p.S, p.Lm, p.I, p.dydx, p.Yc, p.IJ, p.HsC, p.Z, p.tau
    ].join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'canal21_simulation.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            Tableau Détaillé des Résultats (Descriptif de la Ligne d'Eau)
          </h3>
          <p className="text-xs text-slate-400">
            Conforme au format standard canal21 (c_excel.txt / c_result.txt) - {result.points.length} points de calcul
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Chercher x ou bief..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36 sm:w-44"
            />
          </div>

          {/* Regime Filter */}
          <select
            value={regimeFilter}
            onChange={(e) => setRegimeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">Tous régimes</option>
            <option value="flu">Fluvial (flu)</option>
            <option value="tor">Torrentiel (tor)</option>
          </select>

          {/* Actions */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer border border-slate-700"
            title="Copier les résultats dans le presse-papiers"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            {copied ? 'Copié !' : 'Copier'}
          </button>

          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/50 text-cyan-300 text-xs font-medium transition cursor-pointer"
            title="Télécharger au format c_result.txt Canal21"
          >
            <Download className="w-3.5 h-3.5" />
            c_result.txt
          </button>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
            title="Exporter en CSV"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 max-h-[460px] relative">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10 border-b border-slate-800 shadow-sm text-slate-400 text-[11px]">
            <tr>
              <th className="py-2.5 px-3 font-semibold">no</th>
              <th className="py-2.5 px-3 font-semibold">Elem</th>
              <th className="py-2.5 px-3 font-semibold text-right">x (m)</th>
              <th className="py-2.5 px-3 font-semibold text-right">Zf (m)</th>
              <th className="py-2.5 px-3 font-semibold text-right text-cyan-400">Y (m)</th>
              <th className="py-2.5 px-3 font-semibold text-right text-amber-400">V (m/s)</th>
              <th className="py-2.5 px-3 font-semibold text-right">J (m/m)</th>
              <th className="py-2.5 px-3 font-semibold text-right">H (m)</th>
              <th className="py-2.5 px-3 font-semibold text-right">Hs (m)</th>
              <th className="py-2.5 px-3 font-semibold text-right">F</th>
              <th className="py-2.5 px-3 font-semibold text-center">reg</th>
              <th className="py-2.5 px-3 font-semibold text-right">Pm (m)</th>
              <th className="py-2.5 px-3 font-semibold text-right">S (m²)</th>
              <th className="py-2.5 px-3 font-semibold text-right">Lm (m)</th>
              <th className="py-2.5 px-3 font-semibold text-right">I</th>
              <th className="py-2.5 px-3 font-semibold text-right">dy/dx</th>
              <th className="py-2.5 px-3 font-semibold text-right text-rose-400">Yc (m)</th>
              <th className="py-2.5 px-3 font-semibold text-right">I-J</th>
              <th className="py-2.5 px-3 font-semibold text-right">HsC (m)</th>
              <th className="py-2.5 px-3 font-semibold text-right text-blue-300">Z (m)</th>
              <th className="py-2.5 px-3 font-semibold text-right">co (Pa)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredPoints.length === 0 ? (
              <tr>
                <td colSpan={21} className="py-8 text-center text-slate-500 font-sans">
                  Aucun point correspondant aux filtres
                </td>
              </tr>
            ) : (
              filteredPoints.map((p, idx) => {
                const isSelected = selectedPointIndex != null && result.points[selectedPointIndex] === p;
                const isSuper = p.reg.startsWith('tor');
                const isCrit = p.reg === 'fluc' || p.reg === 'torc';

                return (
                  <tr
                    key={`pt-${p.elem}-${p.no}-${idx}`}
                    onClick={() => onSelectPoint && onSelectPoint(result.points.indexOf(p))}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/15 text-cyan-200'
                        : 'hover:bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <td className="py-1.5 px-3 text-slate-500">{p.no}</td>
                    <td className="py-1.5 px-3 font-semibold text-slate-400">{p.elem}</td>
                    <td className="py-1.5 px-3 text-right font-medium text-slate-200">{p.x.toFixed(2)}</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">{p.Zf.toFixed(3)}</td>
                    <td className="py-1.5 px-3 text-right font-bold text-cyan-300">{p.Y.toFixed(3)}</td>
                    <td className="py-1.5 px-3 text-right font-semibold text-amber-300">{p.V.toFixed(3)}</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">{p.J.toFixed(4)}</td>
                    <td className="py-1.5 px-3 text-right text-amber-200">{p.H.toFixed(3)}</td>
                    <td className="py-1.5 px-3 text-right text-slate-300">{p.Hs.toFixed(3)}</td>
                    <td className="py-1.5 px-3 text-right font-medium">
                      <span className={isSuper ? 'text-rose-400' : 'text-emerald-400'}>
                        {p.F.toFixed(3)}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isCrit
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : isSuper
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        }`}
                      >
                        {p.reg}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-400">{p.Pm.toFixed(3)}</td>
                    <td className="py-1.5 px-3 text-right text-slate-300">{p.S.toFixed(3)}</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">{p.Lm.toFixed(3)}</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">{p.I.toFixed(3)}</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">{p.dydx.toFixed(3)}</td>
                    <td className="py-1.5 px-3 text-right text-rose-300">{p.Yc.toFixed(3)}</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">{p.IJ.toFixed(3)}</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">{p.HsC.toFixed(3)}</td>
                    <td className="py-1.5 px-3 text-right font-semibold text-blue-300">{p.Z.toFixed(3)}</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">{p.tau.toFixed(2)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
