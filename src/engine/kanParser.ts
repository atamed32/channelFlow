import { ReachConfig, SimulationConfig, SimulationResult, SectionType } from './hydraulics';

export function parseKanFile(content: string, fileName = 'imported.kan'): SimulationConfig {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const reaches: ReachConfig[] = [];
  let currentReach: Partial<ReachConfig> | null = null;

  let flowRate = 21.0;
  let reference: 'amont' | 'aval' = 'amont';
  let stepsPerReach = 500;
  let xRef = 0;
  let zRef = 0;
  let yUpstream: number | null = null;
  let yDownstream: number | null = null;

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;

    const val = parts[1].trim();
    const key = parts[2].trim();

    // Check for reach header
    if (key === 'ipos') {
      if (currentReach && currentReach.width != null) {
        reaches.push(finalizeReach(currentReach, reaches.length + 1));
      }
      currentReach = {
        id: parseInt(val, 10) || (reaches.length + 1),
        type: 'Rec',
        width: 4,
        fruit: 0,
        radius: 1,
        strickler: 60,
        length: 50,
        slope: 0.01,
        zBedUpstream: 0,
        zBedDownstream: 0,
        name: `Bief ${val}`,
      };
      continue;
    }

    if (currentReach) {
      switch (key) {
        case 'TypeElem':
          if (val === 'Rec' || val === 'Trap' || val === 'Tri' || val === 'Cir') {
            currentReach.type = val as SectionType;
          } else {
            currentReach.type = 'Rec';
          }
          break;
        case 'Nom':
          currentReach.name = val;
          break;
        case 'Largeur':
          if (val !== 'nodef') currentReach.width = parseFloat(val) || 4;
          break;
        case 'Fruit':
          if (val !== 'nodef') currentReach.fruit = parseFloat(val) || 0;
          break;
        case 'Rayon':
          if (val !== 'nodef') currentReach.radius = parseFloat(val) || 1;
          break;
        case 'Strickler':
          if (val !== 'nodef') currentReach.strickler = parseFloat(val) || 60;
          break;
        case 'Longueur':
          if (val !== 'nodef') currentReach.length = parseFloat(val) || 50;
          break;
        case 'Pente':
          if (val !== 'nodef') currentReach.slope = parseFloat(val) || 0.01;
          break;
        case 'CoteFondAmont':
          if (val !== 'nodef') currentReach.zBedUpstream = parseFloat(val) || 0;
          break;
        case 'CoteFondAval':
          if (val !== 'nodef') currentReach.zBedDownstream = parseFloat(val) || 0;
          break;
        case 'PelleAmont':
          if (val !== 'nodef') currentReach.weirCrestUp = parseFloat(val);
          break;
        case 'PelleAval':
          if (val !== 'nodef') currentReach.weirCrestDown = parseFloat(val);
          break;
        case 'Ouverture':
          if (val !== 'nodef') currentReach.gateOpening = parseFloat(val);
          break;
        case 'MuDenoye':
        case 'MuEquivOuCoefBorda':
          if (val !== 'nodef') currentReach.dischargeCoeff = parseFloat(val);
          break;
      }
    }

    // Global parameters (often tagged around line 90+)
    switch (key) {
      case 'choixtopo':
        reference = val === 'aval' ? 'aval' : 'amont';
        break;
      case 'Xref':
        if (val !== 'nodef') xRef = parseFloat(val) || 0;
        break;
      case 'Zref':
        if (val !== 'nodef') zRef = parseFloat(val) || 0;
        break;
      case 'Qamont':
      case 'Debit':
        if (val !== 'nodef' && parseFloat(val) > 0) flowRate = parseFloat(val);
        break;
      case 'Yamont':
        if (val !== 'nodef') yUpstream = parseFloat(val);
        break;
      case 'Yaval':
        if (val !== 'nodef') yDownstream = parseFloat(val);
        break;
      case 'NbrePasX':
        if (val !== 'nodef') stepsPerReach = parseInt(val, 10) || 500;
        break;
    }
  }

  if (currentReach && currentReach.width != null) {
    reaches.push(finalizeReach(currentReach, reaches.length + 1));
  }

  // If no reaches parsed, provide standard default
  if (reaches.length === 0) {
    reaches.push({
      id: 1,
      name: 'Bief 1',
      type: 'Rec',
      width: 4,
      fruit: 0,
      radius: 1,
      strickler: 60,
      length: 69,
      slope: 0.05,
      zBedUpstream: 0,
      zBedDownstream: -3.45,
    });
  }

  return {
    reaches,
    flowRate,
    stepsPerReach,
    reference,
    xRef,
    zRef,
    yUpstream,
    yDownstream,
  };
}

function finalizeReach(r: Partial<ReachConfig>, fallbackId: number): ReachConfig {
  return {
    id: r.id ?? fallbackId,
    name: r.name || `Bief ${fallbackId}`,
    type: r.type || 'Rec',
    width: r.width ?? 4,
    fruit: r.fruit ?? 0,
    radius: r.radius ?? 1,
    strickler: r.strickler ?? 60,
    length: r.length ?? 50,
    slope: r.slope ?? 0.01,
    zBedUpstream: r.zBedUpstream ?? 0,
    zBedDownstream: r.zBedDownstream ?? (r.zBedUpstream ?? 0) - (r.slope ?? 0.01) * (r.length ?? 50),
    weirCrestUp: r.weirCrestUp,
    weirCrestDown: r.weirCrestDown,
    gateOpening: r.gateOpening,
    dischargeCoeff: r.dischargeCoeff,
  };
}

/**
 * Serializes configuration to .kan file format
 */
export function exportToKan(config: SimulationConfig): string {
  const lines: string[] = [];

  config.reaches.forEach((r, idx) => {
    const reachNum = idx + 1;
    lines.push(`1\t${reachNum}\tipos`);
    lines.push(`2\t${r.type}\tTypeElem`);
    lines.push(`3\t${r.name}\tNom`);
    lines.push(`4\t0\tStatut1`);
    lines.push(`5\t0\tStatut2`);
    lines.push(`6\t0\tStatut3`);
    lines.push(`7\t0\tStatut4`);
    lines.push(`8\t${r.width.toFixed(2)}\tLargeur`);
    lines.push(`9\t${r.fruit ? r.fruit.toFixed(2) : 'nodef'}\tFruit`);
    lines.push(`10\tnodef\tProfondeurEnUnPoint`);
    lines.push(`11\tnodef\tExposant`);
    lines.push(`12\t${r.radius ? r.radius.toFixed(2) : 'nodef'}\tRayon`);
    lines.push(`13\t${r.weirCrestUp != null ? r.weirCrestUp.toFixed(2) : '0'}\tPelleAmont`);
    lines.push(`14\t${r.weirCrestDown != null ? r.weirCrestDown.toFixed(2) : '0'}\tPelleAval`);
    lines.push(`15\t${r.gateOpening != null ? r.gateOpening.toFixed(2) : 'nodef'}\tOuverture`);
    lines.push(`16\t0\tNombre`);
    lines.push(`17\t${r.dischargeCoeff != null ? r.dischargeCoeff.toFixed(2) : 'nodef'}\tMuDenoye`);
    lines.push(`18\t0\tAlpha`);
    lines.push(`19\t${r.strickler.toFixed(2)}\tStrickler`);
    lines.push(`20\t0\tAbscisseAmont`);
    lines.push(`21\t${r.length.toFixed(2)}\tAbscisseAval`);
    lines.push(`22\t${r.length.toFixed(2)}\tLongueur`);
    lines.push(`23\t${r.zBedUpstream.toFixed(4)}\tCoteFondAmont`);
    lines.push(`24\t${r.zBedDownstream.toFixed(4)}\tCoteFondAval`);
    lines.push(`25\t${r.slope >= 0 ? '+' : ''}${r.slope.toFixed(4)}\tPente`);
    lines.push(`26\tnodef\tHauteurDebordement`);
    lines.push(`27\t0\tDebit`);
    lines.push(`28\t0\tHauteurEauAval`);
    lines.push(`29\t0\tHauteurEauAmont`);
    lines.push(`30\t1\tMuEquivOuCoefBorda`);
    lines.push(`31\t0\tRegime1`);
    lines.push(`32\tnodef\tRegime2`);
  });

  lines.push(`90\t1\tJeu`);
  lines.push(`91\t${config.xRef.toFixed(2)}\tXref`);
  lines.push(`92\t${config.zRef.toFixed(2)}\tZref`);
  lines.push(`93\t${config.reference}\tchoixtopo`);
  lines.push(`94\t${config.flowRate.toFixed(2)}\tQamont`);
  lines.push(`95\t${config.yDownstream != null ? config.yDownstream.toFixed(3) : 'nodef'}\tYaval`);
  lines.push(`96\t${config.yUpstream != null ? config.yUpstream.toFixed(3) : 'nodef'}\tYamont`);
  lines.push(`97\t${config.stepsPerReach}\tNbrePasX`);

  return lines.join('\n');
}

/**
 * Exports calculation table in Canal21 c_excel.txt tab-delimited format
 */
export function exportToCanal21Excel(config: SimulationConfig, result: SimulationResult): string {
  const lines: string[] = [];
  lines.push(`canal21:\trésultats`);
  lines.push(`abcisse =\t${config.xRef.toFixed(1)}\tm`);
  lines.push(`cote =\t${config.zRef.toFixed(1)}\tm`);
  lines.push(`nombre de pas =\t${config.stepsPerReach}`);
  lines.push(`débit =\t${config.flowRate.toFixed(1)}\tm3/s`);
  lines.push(`choixtopo =\t${config.reference}`);
  lines.push(`aval =\t${config.yDownstream != null ? config.yDownstream.toFixed(4) : 'nodef'}\tm`);
  lines.push(`amont =\t${config.yUpstream != null ? config.yUpstream.toFixed(4) : 'nodef'}\tm`);
  lines.push(``);
  lines.push(`Descriptif de la ligne d'eau`);
  lines.push(`no\tElem\tx\tZf\tY\tV\tJ\tH\tHs\tF\treg.\tPm\tS\tLm\tI\tdy/dx\tYc\tI-J\tHsC\tZ\tco`);
  lines.push(`.\t.\tm\tm\tm\tm/s\tm/m\tm\tm\t.\t.\tm\tm2\tm\tm/m\tm/m\tm\tm/m\tm\tm\tPa`);

  for (const p of result.points) {
    lines.push([
      p.no,
      p.elem,
      p.x.toFixed(2),
      p.Zf.toFixed(3),
      p.Y.toFixed(3),
      p.V.toFixed(3),
      p.J.toFixed(4),
      p.H.toFixed(3),
      p.Hs.toFixed(3),
      p.F.toFixed(3),
      p.reg,
      p.Pm.toFixed(3),
      p.S.toFixed(3),
      p.Lm.toFixed(3),
      p.I.toFixed(3),
      p.dydx.toFixed(3),
      p.Yc.toFixed(3),
      p.IJ.toFixed(3),
      p.HsC.toFixed(3),
      p.Z.toFixed(3),
      p.tau.toFixed(3),
    ].join('\t'));
  }

  return lines.join('\n');
}

/**
 * Pre-packaged sample cases corresponding to repository files
 */
export const SAMPLE_CASES: Record<string, { name: string; description: string; config: SimulationConfig }> = {
  oued_mazouz: {
    name: 'Oued Mazouz (OUED MAZOUZ.kan)',
    description: 'Rectangular steep channel, Q = 21.0 m³/s, B = 4 m, K = 60, L = 69 m, slope I = 0.05, torrential S2/M3 profile.',
    config: {
      flowRate: 21.0,
      stepsPerReach: 50,
      reference: 'amont',
      xRef: 0,
      zRef: 0,
      yUpstream: 1.198,
      yDownstream: null,
      reaches: [
        {
          id: 1,
          name: 'Oued Mazouz',
          type: 'Rec',
          width: 4.0,
          fruit: 0,
          radius: 1,
          strickler: 60,
          length: 69,
          slope: 0.05,
          zBedUpstream: 0,
          zBedDownstream: -3.45,
        },
      ],
    },
  },
  multi_reach_5: {
    name: '5 Cascading Reaches (5.kan)',
    description: 'Multi-reach system from original 5.kan with variable slopes (0.09, 0.06, 0.03, 0.025, 0.074) and Q = 57.6 m³/s, B = 6 m.',
    config: {
      flowRate: 57.6,
      stepsPerReach: 40,
      reference: 'amont',
      xRef: 0,
      zRef: 0,
      yUpstream: null,
      yDownstream: null,
      reaches: [
        { id: 1, name: 'Bief 1 (Chute)', type: 'Rec', width: 6.0, fruit: 0, radius: 1, strickler: 60, length: 142, slope: 0.09, zBedUpstream: 0, zBedDownstream: -12.78 },
        { id: 2, name: 'Bief 2', type: 'Rec', width: 6.0, fruit: 0, radius: 1, strickler: 60, length: 48, slope: 0.06, zBedUpstream: -12.78, zBedDownstream: -15.66 },
        { id: 3, name: 'Bief 3', type: 'Rec', width: 6.0, fruit: 0, radius: 1, strickler: 60, length: 107.01, slope: 0.03, zBedUpstream: -15.66, zBedDownstream: -18.87 },
        { id: 4, name: 'Bief 4', type: 'Rec', width: 6.0, fruit: 0, radius: 1, strickler: 60, length: 94, slope: 0.025, zBedUpstream: -18.87, zBedDownstream: -21.22 },
        { id: 5, name: 'Bief 5', type: 'Rec', width: 6.0, fruit: 0, radius: 1, strickler: 60, length: 45.09, slope: 0.074, zBedUpstream: -21.22, zBedDownstream: -24.56 },
      ],
    },
  },
  mild_subcritical: {
    name: 'Mild Slope Backwater Curve (M1/M2)',
    description: 'Subcritical flow with downstream water level control above normal depth, generating an M1 backwater curve.',
    config: {
      flowRate: 35.0,
      stepsPerReach: 50,
      reference: 'aval',
      xRef: 0,
      zRef: 100,
      yUpstream: null,
      yDownstream: 3.5,
      reaches: [
        {
          id: 1,
          name: 'Canal Principal',
          type: 'Rec',
          width: 8.0,
          fruit: 0,
          radius: 1,
          strickler: 65,
          length: 500,
          slope: 0.001,
          zBedUpstream: 100,
          zBedDownstream: 99.5,
        },
      ],
    },
  },
  hydraulic_jump_case: {
    name: 'Hydraulic Jump in Channel (Ressaut)',
    description: 'Supercritical flow meeting downstream backwater resulting in a hydraulic jump with energy dissipation.',
    config: {
      flowRate: 15.0,
      stepsPerReach: 60,
      reference: 'amont',
      xRef: 0,
      zRef: 50,
      yUpstream: 0.55,
      yDownstream: 2.2,
      reaches: [
        {
          id: 1,
          name: 'Bief Torrentiel vers Fluvial',
          type: 'Trap',
          width: 3.5,
          fruit: 1.0,
          radius: 1,
          strickler: 55,
          length: 120,
          slope: 0.008,
          zBedUpstream: 50,
          zBedDownstream: 49.04,
        },
      ],
    },
  },
  circular_culvert: {
    name: 'Circular Conduit / Pipe Culvert',
    description: 'Circular pipe gallery D = 2.5 m under gravity free surface flow.',
    config: {
      flowRate: 6.5,
      stepsPerReach: 50,
      reference: 'amont',
      xRef: 0,
      zRef: 20,
      yUpstream: 1.2,
      yDownstream: null,
      reaches: [
        {
          id: 1,
          name: 'Galerie Circulaire',
          type: 'Cir',
          width: 2.5,
          fruit: 0,
          radius: 1.25,
          strickler: 75,
          length: 200,
          slope: 0.004,
          zBedUpstream: 20,
          zBedDownstream: 19.2,
        },
      ],
    },
  },
};
