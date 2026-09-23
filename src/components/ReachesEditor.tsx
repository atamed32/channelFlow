import React, { useRef } from 'react';
import { ReachConfig, SimulationConfig, SectionType } from '../engine/hydraulics';
import { parseKanFile, exportToKan, SAMPLE_CASES } from '../engine/kanParser';
import { Plus, Trash2, Upload, Download, Sparkles, Sliders, ArrowRight } from 'lucide-react';

interface Props {
  config: SimulationConfig;
  onChangeConfig: (newConfig: SimulationConfig) => void;
}

export const ReachesEditor: React.FC<Props> = ({ config, onChangeConfig }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateGlobal = (field: keyof SimulationConfig, value: any) => {
    onChangeConfig({
      ...config,
      [field]: value,
    });
  };

  const handleUpdateReach = (index: number, field: keyof ReachConfig, value: any) => {
    const updated = [...config.reaches];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onChangeConfig({
      ...config,
      reaches: updated,
    });
  };

  const handleAddReach = () => {
    const lastReach = config.reaches[config.reaches.length - 1];
    const newId = config.reaches.length + 1;
    const newReach: ReachConfig = {
      id: newId,
      name: `Bief ${newId}`,
      type: lastReach ? lastReach.type : 'Rec',
      width: lastReach ? lastReach.width : 4.0,
      fruit: lastReach ? lastReach.fruit : 0,
      radius: lastReach ? lastReach.radius : 1.0,
      strickler: lastReach ? lastReach.strickler : 60,
      length: 50.0,
      slope: 0.01,
      zBedUpstream: lastReach ? lastReach.zBedDownstream : 0,
      zBedDownstream: (lastReach ? lastReach.zBedDownstream : 0) - 0.01 * 50.0,
    };

    onChangeConfig({
      ...config,
      reaches: [...config.reaches, newReach],
    });
  };

  const handleRemoveReach = (index: number) => {
    if (config.reaches.length <= 1) return;
    const updated = config.reaches.filter((_, i) => i !== index);
    onChangeConfig({
      ...config,
      reaches: updated,
    });
  };

  const handleLoadSample = (sampleKey: string) => {
    const sample = SAMPLE_CASES[sampleKey];
    if (sample) {
      onChangeConfig(sample.config);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        try {
          const parsed = parseKanFile(text, file.name);
          onChangeConfig(parsed);
        } catch (err) {
          alert('Erreur lors du décodage du fichier .kan');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadKan = () => {
    const text = exportToKan(config);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'etude_canal21.kan');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl backdrop-blur-sm">
      {/* Top Bar with Presets & Import/Export */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Paramètres Hydrauliques & Configuration des Biefs
          </h3>
          <p className="text-xs text-slate-400">
            Définition du débit Q, conditions aux limites et caractéristiques géométriques des biefs successifs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sample Presets Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <select
              onChange={(e) => handleLoadSample(e.target.value)}
              defaultValue=""
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="" disabled>Charger un exemple (.kan)...</option>
              {Object.entries(SAMPLE_CASES).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Import .kan button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".kan,.txt"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
            title="Importer un fichier .kan de canal21"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            Importer .kan
          </button>

          {/* Export .kan button */}
          <button
            onClick={handleDownloadKan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-xs font-medium transition cursor-pointer"
            title="Exporter les biefs au format .kan"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter .kan
          </button>
        </div>
      </div>

      {/* Global Boundary Conditions Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
        <div>
          <label className="text-slate-400 block mb-1 font-medium">Débit Q (m³/s)</label>
          <input
            type="number"
            step="0.1"
            min="0.001"
            value={config.flowRate}
            onChange={(e) => handleUpdateGlobal('flowRate', parseFloat(e.target.value) || 0.1)}
            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="text-slate-400 block mb-1 font-medium">Référence Topo</label>
          <select
            value={config.reference}
            onChange={(e) => handleUpdateGlobal('reference', e.target.value as any)}
            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-medium focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="amont">Amont (Supercritical flow / Chute)</option>
            <option value="aval">Aval (Subcritical backwater / Barrage)</option>
          </select>
        </div>

        <div>
          <label className="text-slate-400 block mb-1 font-medium">
            Tirant Amont Y_amont (m)
          </label>
          <input
            type="number"
            step="0.05"
            placeholder="Auto (Normal)"
            value={config.yUpstream != null ? config.yUpstream : ''}
            onChange={(e) =>
              handleUpdateGlobal('yUpstream', e.target.value !== '' ? parseFloat(e.target.value) : null)
            }
            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-blue-300 font-mono focus:outline-none focus:border-cyan-500 placeholder-slate-600"
          />
        </div>

        <div>
          <label className="text-slate-400 block mb-1 font-medium">
            Tirant Aval Y_aval (m)
          </label>
          <input
            type="number"
            step="0.05"
            placeholder="Auto (Normal)"
            value={config.yDownstream != null ? config.yDownstream : ''}
            onChange={(e) =>
              handleUpdateGlobal('yDownstream', e.target.value !== '' ? parseFloat(e.target.value) : null)
            }
            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-purple-300 font-mono focus:outline-none focus:border-cyan-500 placeholder-slate-600"
          />
        </div>

        <div>
          <label className="text-slate-400 block mb-1 font-medium">Pas de Calcul (NbrePasX)</label>
          <input
            type="number"
            step="10"
            min="10"
            max="1000"
            value={config.stepsPerReach}
            onChange={(e) => handleUpdateGlobal('stepsPerReach', parseInt(e.target.value, 10) || 50)}
            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Reaches Cards List */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Biefs Configurés ({config.reaches.length})
          </span>
          <button
            onClick={handleAddReach}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition cursor-pointer shadow-md shadow-cyan-900/40"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter un Bief
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {config.reaches.map((reach, index) => (
            <div
              key={`reach-${reach.id}-${index}`}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 transition flex flex-col gap-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 flex items-center justify-center font-bold text-xs font-mono">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={reach.name}
                    onChange={(e) => handleUpdateReach(index, 'name', e.target.value)}
                    className="font-semibold text-slate-100 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-500 focus:outline-none px-1 py-0.5 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Type de Section :</span>
                  <select
                    value={reach.type}
                    onChange={(e) => handleUpdateReach(index, 'type', e.target.value as SectionType)}
                    className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="Rec">Rectangulaire (Rec)</option>
                    <option value="Trap">Trapézoïdale (Trap)</option>
                    <option value="Tri">Triangulaire (Tri)</option>
                    <option value="Cir">Circulaire (Cir)</option>
                  </select>

                  {config.reaches.length > 1 && (
                    <button
                      onClick={() => handleRemoveReach(index)}
                      className="p-1.5 rounded hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition cursor-pointer ml-1"
                      title="Supprimer ce bief"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Geometric & Hydraulic inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">
                    {reach.type === 'Cir' ? 'Diamètre D (m)' : 'Largeur fond B (m)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={reach.width}
                    onChange={(e) => handleUpdateReach(index, 'width', parseFloat(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {(reach.type === 'Trap' || reach.type === 'Tri') && (
                  <div>
                    <label className="text-slate-400 block mb-1">Fruit berge m (1V:mH)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={reach.fruit}
                      onChange={(e) => handleUpdateReach(index, 'fruit', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}

                {reach.type === 'Cir' && (
                  <div>
                    <label className="text-slate-400 block mb-1">Rayon r (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={reach.radius}
                      onChange={(e) => handleUpdateReach(index, 'radius', parseFloat(e.target.value) || 1)}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-slate-400 block mb-1">Longueur L (m)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={reach.length}
                    onChange={(e) => handleUpdateReach(index, 'length', parseFloat(e.target.value) || 10)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Pente I (m/m)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={reach.slope}
                    onChange={(e) => handleUpdateReach(index, 'slope', parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Rugosité Strickler K</label>
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="120"
                    value={reach.strickler}
                    onChange={(e) => handleUpdateReach(index, 'strickler', parseFloat(e.target.value) || 60)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Cote Fond Amont (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={reach.zBedUpstream}
                    onChange={(e) => handleUpdateReach(index, 'zBedUpstream', parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
