/**
 * Canal21 Hydraulic Calculation Engine
 * Open Channel Flow & Water Surface Profiles (Écoulement à surface libre & Courbes de remous)
 */

export const G = 9.80665; // Gravity acceleration (m/s²)
export const RHO = 1000;   // Water density (kg/m³)

export type SectionType = 'Rec' | 'Trap' | 'Tri' | 'Cir';

export interface SectionGeometry {
  type: SectionType;
  width: number;       // Largeur b (m)
  fruit?: number;      // Pente des berges m (1V:mH)
  radius?: number;     // Rayon r (m) for circular
  diameter?: number;   // Diamètre D = 2r (m)
}

export interface HydraulicProperties {
  Y: number;           // Depth / Tirant d'eau (m)
  S: number;           // Wetted Area / Section mouillée (m²)
  Pm: number;          // Wetted Perimeter / Périmètre mouillé (m)
  Rh: number;          // Hydraulic Radius / Rayon hydraulique (m)
  Lm: number;          // Top Width / Largeur miroir (m)
  Dh: number;          // Hydraulic Depth Dh = S / Lm (m)
  V: number;           // Velocity (m/s)
  J: number;           // Friction Slope / Perte de charge linéaire (m/m)
  Hs: number;          // Specific Energy / Énergie spécifique (m)
  H: number;           // Total Energy Head (m)
  F: number;           // Froude Number
  reg: 'flu' | 'tor' | 'fluc' | 'torc'; // Flow regime
  dydx: number;        // Surface slope differential dy/dx
  tau: number;         // Bed shear stress / Contrainte de cisaillement (Pa)
  moment: number;      // Specific momentum M = Q^2/(g*S) + A*y_bar (m^3)
}

export interface CalculationPoint extends HydraulicProperties {
  no: number;          // Step index
  elem: number;        // Reach index (1-based)
  x: number;           // Position (m)
  Zf: number;          // Bed elevation / Cote fond (m)
  Z: number;           // Water surface elevation / Cote eau (m)
  I: number;           // Bed slope (m/m)
  Yc: number;          // Critical depth (m)
  HsC: number;         // Critical specific energy (m)
  Yn?: number;         // Normal depth (m)
  IJ: number;          // I - J (m/m)
}

export interface ReachConfig {
  id: number;
  name: string;
  type: SectionType;
  width: number;
  fruit: number;
  radius: number;
  strickler: number;   // K (m^(1/3)/s)
  length: number;      // L (m)
  slope: number;       // I (m/m)
  zBedUpstream: number;// Cote fond amont (m)
  zBedDownstream: number; // Cote fond aval (m)
  xStart?: number;
  xEnd?: number;
  weirCrestUp?: number; // Pelle amont (m)
  weirCrestDown?: number; // Pelle aval (m)
  gateOpening?: number; // Ouverture vanne (m)
  dischargeCoeff?: number; // Mu
}

export interface SimulationConfig {
  reaches: ReachConfig[];
  flowRate: number;    // Q (m³/s)
  stepsPerReach: number; // NbrePasX (e.g. 500)
  reference: 'amont' | 'aval';
  xRef: number;
  zRef: number;
  yUpstream?: number | null;   // Yamont (m) or null for auto
  yDownstream?: number | null; // Yaval (m) or null for auto
}

export interface SimulationResult {
  points: CalculationPoint[];
  reachesSummary: {
    reachIndex: number;
    reachName: string;
    Yc: number;
    Yn: number | null;
    Ic: number;
    slopeType: 'mild' | 'steep' | 'critical' | 'horizontal' | 'adverse';
    F_normal: number | null;
    regime: string;
  }[];
  jumpDetected?: {
    reachIndex: number;
    x: number;
    y1: number;
    y2: number;
    froude1: number;
    energyLoss: number;
  } | null;
}

/**
 * Geometric properties for a given cross section and depth Y
 */
export function getSectionGeometry(geom: SectionGeometry, Y: number): {
  S: number;
  Pm: number;
  Rh: number;
  Lm: number;
  AyBar: number;
} {
  const y = Math.max(Y, 0.0001);

  if (geom.type === 'Rec') {
    const b = Math.max(geom.width, 0.01);
    const S = b * y;
    const Pm = b + 2 * y;
    const Rh = S / Pm;
    const Lm = b;
    const AyBar = 0.5 * b * y * y;
    return { S, Pm, Rh, Lm, AyBar };
  }

  if (geom.type === 'Trap') {
    const b = Math.max(geom.width, 0.01);
    const m = Math.max(geom.fruit ?? 0, 0);
    const S = (b + m * y) * y;
    const Pm = b + 2 * y * Math.sqrt(1 + m * m);
    const Lm = b + 2 * m * y;
    const Rh = S / Pm;
    const AyBar = 0.5 * b * y * y + (1 / 3) * m * y * y * y;
    return { S, Pm, Rh, Lm, AyBar };
  }

  if (geom.type === 'Tri') {
    const m = Math.max(geom.fruit ?? 1, 0.01);
    const S = m * y * y;
    const Pm = 2 * y * Math.sqrt(1 + m * m);
    const Lm = 2 * m * y;
    const Rh = S / Pm;
    const AyBar = (1 / 3) * m * y * y * y;
    return { S, Pm, Rh, Lm, AyBar };
  }

  // Cir
  const r = Math.max(geom.radius ?? (geom.diameter ? geom.diameter / 2 : 1), 0.01);
  const D = 2 * r;
  const clampedY = Math.min(Math.max(y, 0.0001), D * 0.9999);
  const theta = 2 * Math.acos(Math.max(-1, Math.min(1, 1 - (2 * clampedY) / D)));
  const S = (D * D / 8) * (theta - Math.sin(theta));
  const Pm = 0.5 * D * theta;
  const Rh = Pm > 0 ? S / Pm : 0;
  const Lm = Math.max(D * Math.sin(theta / 2), 0.001);
  // AyBar for circular
  const AyBar = (Math.pow(D, 3) / 12) * Math.pow(Math.sin(theta / 2), 3) - S * (r - clampedY);
  return { S, Pm, Rh, Lm, AyBar: Math.max(AyBar, 0.0001) };
}

/**
 * Computes all hydraulic variables at depth Y
 */
export function computeHydraulics(
  geom: SectionGeometry,
  Y: number,
  Q: number,
  K: number,
  I: number,
  Zf: number
): HydraulicProperties {
  const y = Math.max(Y, 0.001);
  const { S, Pm, Rh, Lm, AyBar } = getSectionGeometry(geom, y);

  const V = S > 0 ? Q / S : 0;
  const Dh = Lm > 0 ? S / Lm : y;
  const F = Dh > 0 ? V / Math.sqrt(G * Dh) : 0;

  // Friction slope J from Manning-Strickler: V = K * Rh^(2/3) * J^(1/2) => J = (V / (K * Rh^(2/3)))^2
  const kRh = K * Math.pow(Rh, 2 / 3);
  const J = kRh > 0 ? Math.pow(V / kRh, 2) : 0;

  const Hs = y + Math.pow(V, 2) / (2 * G);
  const H = Zf + Hs;

  // Gradually varied flow: dy/dx = (I - J) / (1 - F^2)
  const denom = 1 - Math.pow(F, 2);
  let dydx = 0;
  if (Math.abs(denom) > 1e-4) {
    dydx = (I - J) / denom;
  } else {
    dydx = (I - J) / (denom < 0 ? -1e-4 : 1e-4);
  }

  // Shear stress tau = rho * g * Rh * J (Pa)
  const tau = RHO * G * Rh * J;

  // Specific momentum (force spécifique) M = Q^2/(g*S) + AyBar
  const moment = (Q * Q) / (G * S) + AyBar;

  let reg: 'flu' | 'tor' | 'fluc' | 'torc' = 'flu';
  if (Math.abs(F - 1) < 0.02) {
    reg = F > 1 ? 'torc' : 'fluc';
  } else if (F > 1) {
    reg = 'tor';
  } else {
    reg = 'flu';
  }

  return {
    Y: y,
    S,
    Pm,
    Rh,
    Lm,
    Dh,
    V,
    J,
    Hs,
    H,
    F,
    reg,
    dydx,
    tau,
    moment,
  };
}

/**
 * Calculates Critical Depth Yc where Froude = 1
 */
export function calculateCriticalDepth(geom: SectionGeometry, Q: number): number {
  if (Q <= 0) return 0.001;

  if (geom.type === 'Rec') {
    const b = geom.width;
    const q = Q / b;
    return Math.pow((q * q) / G, 1 / 3);
  }

  // Numerical solver for F(Y) = 1 => Q^2 * Lm / (g * S^3) = 1
  let low = 0.001;
  let high = 50.0;

  if (geom.type === 'Cir') {
    const D = geom.radius ? 2 * geom.radius : (geom.diameter ?? 2);
    high = D * 0.999;
  }

  for (let iter = 0; iter < 60; iter++) {
    const mid = (low + high) / 2;
    const { S, Lm } = getSectionGeometry(geom, mid);
    const f2 = (Q * Q * Lm) / (G * Math.pow(S, 3));

    if (Math.abs(f2 - 1.0) < 1e-6) return mid;

    // As depth increases, Froude decreases (f2 decreases)
    if (f2 > 1.0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Calculates Normal Depth Yn where friction slope J = bed slope I
 */
export function calculateNormalDepth(
  geom: SectionGeometry,
  Q: number,
  K: number,
  I: number
): number | null {
  if (I <= 0 || Q <= 0) return null;

  // Solve Q_manning(Y) = K * S * Rh^(2/3) * sqrt(I) = Q
  let low = 0.001;
  let high = 50.0;

  if (geom.type === 'Cir') {
    const D = geom.radius ? 2 * geom.radius : (geom.diameter ?? 2);
    high = D * 0.999;
  }

  for (let iter = 0; iter < 70; iter++) {
    const mid = (low + high) / 2;
    const { S, Rh } = getSectionGeometry(geom, mid);
    const qCalc = K * S * Math.pow(Rh, 2 / 3) * Math.sqrt(I);

    if (Math.abs(qCalc - Q) / Q < 1e-6) return mid;

    if (qCalc < Q) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Calculates Critical Slope Ic for a reach
 */
export function calculateCriticalSlope(geom: SectionGeometry, Q: number, K: number): number {
  const Yc = calculateCriticalDepth(geom, Q);
  const { S, Rh } = getSectionGeometry(geom, Yc);
  const kSRh = K * S * Math.pow(Rh, 2 / 3);
  return kSRh > 0 ? Math.pow(Q / kSRh, 2) : 0;
}

/**
 * Calculates Conjugate Depth Y2 after a hydraulic jump for depth Y1
 */
export function calculateConjugateDepth(geom: SectionGeometry, Y1: number, Q: number): number {
  if (geom.type === 'Rec') {
    const b = geom.width;
    const V1 = Q / (b * Y1);
    const F1 = V1 / Math.sqrt(G * Y1);
    return (Y1 / 2) * (Math.sqrt(1 + 8 * F1 * F1) - 1);
  }

  // General case: M(Y2) = M(Y1)
  const hyd1 = computeHydraulics(geom, Y1, Q, 60, 0.01, 0);
  const targetMoment = hyd1.moment;
  const Yc = calculateCriticalDepth(geom, Q);

  // If Y1 is supercritical (Y1 < Yc), search Y2 > Yc
  let low = Yc * 1.001;
  let high = Math.max(Yc * 5, Y1 * 6);

  for (let iter = 0; iter < 60; iter++) {
    const mid = (low + high) / 2;
    const hydMid = computeHydraulics(geom, mid, Q, 60, 0.01, 0);
    if (Math.abs(hydMid.moment - targetMoment) < 1e-4) return mid;
    if (hydMid.moment < targetMoment) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Simulates a single reach with Gradually Varied Flow (Courbe de remous)
 */

export interface RatingCurvePoint {
  Y: number;
  Q: number;
  V: number;
  F: number;
  S: number;
  Rh: number;
  regime: 'flu' | 'tor' | 'crit';
}

/**
 * Computes rating curve Q(Y) and hydraulic properties for a cross section
 */
export function computeRatingCurve(
  geom: SectionGeometry,
  K: number,
  I: number,
  maxY?: number,
  steps = 50
): RatingCurvePoint[] {
  const slope = Math.max(I, 1e-6);
  const roughness = Math.max(K, 1);
  const limitY = maxY || (geom.type === 'Cir' ? (geom.radius ? geom.radius * 2 * 0.98 : 2) : 4.0);
  const pts: RatingCurvePoint[] = [];

  for (let i = 1; i <= steps; i++) {
    const y = (limitY * i) / steps;
    const { S, Rh, Lm } = getSectionGeometry(geom, y);
    if (S <= 0 || Rh <= 0) continue;
    // Manning-Strickler normal discharge Q = K * S * Rh^(2/3) * sqrt(I)
    const Q = roughness * S * Math.pow(Rh, 2 / 3) * Math.sqrt(slope);
    const V = Q / S;
    const Dh = Lm > 0 ? S / Lm : y;
    const F = Dh > 0 ? V / Math.sqrt(G * Dh) : 0;
    const regime = Math.abs(F - 1) < 0.03 ? 'crit' : F > 1 ? 'tor' : 'flu';

    pts.push({
      Y: y,
      Q,
      V,
      F,
      S,
      Rh,
      regime,
    });
  }

  return pts;
}

/**
 * Direct channel sizing solver: calculates required bottom width b or slope I
 */
export function solveSectionDesign(
  geom: SectionGeometry,
  targetQ: number,
  K: number,
  I: number,
  maxV?: number,
  maxY?: number
): {
  requiredWidth?: number;
  requiredSlope?: number;
  Yn: number;
  Yc: number;
  V: number;
  F: number;
} {
  const Yc = calculateCriticalDepth(geom, targetQ);
  let Yn = calculateNormalDepth(geom, targetQ, K, I) || Yc;
  let hyd = computeHydraulics(geom, Yn, targetQ, K, I, 0);

  // If max velocity is specified and exceeded, solve required width for rectangular/trapezoidal
  let requiredWidth = geom.width;
  if (maxV && hyd.V > maxV && (geom.type === 'Rec' || geom.type === 'Trap')) {
    let low = geom.width;
    let high = geom.width * 10;
    for (let iter = 0; iter < 40; iter++) {
      const mid = (low + high) / 2;
      const testGeom = { ...geom, width: mid };
      const testYn = calculateNormalDepth(testGeom, targetQ, K, I) || 1;
      const testHyd = computeHydraulics(testGeom, testYn, targetQ, K, I, 0);
      if (testHyd.V <= maxV) {
        high = mid;
      } else {
        low = mid;
      }
    }
    requiredWidth = high;
  }

  return {
    requiredWidth: requiredWidth !== geom.width ? requiredWidth : undefined,
    Yn,
    Yc,
    V: hyd.V,
    F: hyd.F,
  };
}

/**
 * Weir discharge calculation (Poleni / Bazin formula)
 */
export function computeWeirDischarge(
  crestHeight: number, // Pelle p (m)
  upstreamDepth: number, // Tirant amont Y1 (m)
  crestWidth: number, // Largeur de crête b (m)
  dischargeCoeff = 0.40 // m ou mu (0.38 - 0.45)
): {
  head: number; // Charge h = Y1 - p (m)
  flowRate: number; // Q (m³/s)
  isSubmerged: boolean;
} {
  const head = Math.max(0, upstreamDepth - crestHeight);
  if (head <= 0) return { head: 0, flowRate: 0, isSubmerged: false };
  // Q = m * b * sqrt(2g) * h^(1.5)
  const Q = dischargeCoeff * crestWidth * Math.sqrt(2 * G) * Math.pow(head, 1.5);
  return { head, flowRate: Q, isSubmerged: false };
}

/**
 * Sluice Gate discharge calculation (Vanne de fond)
 */
export function computeGateDischarge(
  opening: number, // Ouverture a (m)
  upstreamHead: number, // Charge amont H1 (m)
  width: number, // Largeur b (m)
  contractionCoeff = 0.62 // Cc
): {
  flowRate: number;
  venaContractaDepth: number; // y0 = Cc * a
  velocity: number;
  froudeExit: number;
} {
  const a = Math.max(opening, 0.01);
  const H1 = Math.max(upstreamHead, a);
  const b = Math.max(width, 0.1);
  const y0 = contractionCoeff * a;
  const mu = contractionCoeff / Math.sqrt(1 + contractionCoeff * (a / H1));
  const Q = mu * b * a * Math.sqrt(2 * G * H1);
  const V0 = Q / (b * y0);
  const F0 = V0 / Math.sqrt(G * y0);

  return {
    flowRate: Q,
    venaContractaDepth: y0,
    velocity: V0,
    froudeExit: F0,
  };
}
export function simulateReach(
  reach: ReachConfig,
  Q: number,
  stepsCount: number,
  xOffset: number,
  initialY?: number | null,
  boundaryType: 'amont' | 'aval' = 'amont'
): { points: CalculationPoint[]; Yc: number; Yn: number | null; Ic: number } {
  const geom: SectionGeometry = {
    type: reach.type,
    width: reach.width,
    fruit: reach.fruit,
    radius: reach.radius,
  };

  const Yc = calculateCriticalDepth(geom, Q);
  const Yn = calculateNormalDepth(geom, Q, reach.strickler, reach.slope);
  const Ic = calculateCriticalSlope(geom, Q, reach.strickler);
  const HsC = Yc + (Q * Q) / (2 * G * Math.pow(getSectionGeometry(geom, Yc).S, 2));

  const L = reach.length;
  const dx = L / stepsCount;
  const slope = reach.slope;

  // Decide initial depth
  let currentY = initialY;
  if (currentY == null || isNaN(currentY) || currentY <= 0) {
    if (boundaryType === 'amont') {
      currentY = Yn != null ? Yn : Yc * 0.9;
    } else {
      currentY = Yn != null ? Yn : Yc * 1.1;
    }
  }

  const points: CalculationPoint[] = [];

  if (boundaryType === 'amont') {
    // Integrate downstream (x = 0 -> L)
    for (let i = 0; i <= stepsCount; i++) {
      const xLocal = i * dx;
      const xGlobal = xOffset + xLocal;
      const Zf = reach.zBedUpstream - slope * xLocal;

      const hyd = computeHydraulics(geom, currentY, Q, reach.strickler, slope, Zf);

      points.push({
        ...hyd,
        no: i,
        elem: reach.id,
        x: Number(xGlobal.toFixed(2)),
        Zf: Number(Zf.toFixed(3)),
        Z: Number((Zf + hyd.Y).toFixed(3)),
        I: slope,
        Yc: Number(Yc.toFixed(3)),
        HsC: Number(HsC.toFixed(3)),
        Yn: Yn ? Number(Yn.toFixed(3)) : undefined,
        IJ: Number((slope - hyd.J).toFixed(4)),
      });

      if (i < stepsCount) {
        // RK4 integration step for dy/dx
        const k1 = hyd.dydx;
        const y_mid1 = Math.max(currentY + 0.5 * dx * k1, 0.05);
        const hyd_mid1 = computeHydraulics(geom, y_mid1, Q, reach.strickler, slope, Zf - 0.5 * slope * dx);
        const k2 = hyd_mid1.dydx;

        const y_mid2 = Math.max(currentY + 0.5 * dx * k2, 0.05);
        const hyd_mid2 = computeHydraulics(geom, y_mid2, Q, reach.strickler, slope, Zf - 0.5 * slope * dx);
        const k3 = hyd_mid2.dydx;

        const y_end = Math.max(currentY + dx * k3, 0.05);
        const hyd_end = computeHydraulics(geom, y_end, Q, reach.strickler, slope, Zf - slope * dx);
        const k4 = hyd_end.dydx;

        let deltaY = (dx / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
        if (isNaN(deltaY) || Math.abs(deltaY) > 5) {
          deltaY = dx * k1; // fallback
        }
        currentY = Math.max(currentY + deltaY, 0.05);
      }
    }
  } else {
    // Integrate upstream (from downstream end x = L to 0)
    const revPoints: CalculationPoint[] = [];
    for (let i = stepsCount; i >= 0; i--) {
      const xLocal = i * dx;
      const xGlobal = xOffset + xLocal;
      const Zf = reach.zBedUpstream - slope * xLocal;

      const hyd = computeHydraulics(geom, currentY, Q, reach.strickler, slope, Zf);

      revPoints.push({
        ...hyd,
        no: i,
        elem: reach.id,
        x: Number(xGlobal.toFixed(2)),
        Zf: Number(Zf.toFixed(3)),
        Z: Number((Zf + hyd.Y).toFixed(3)),
        I: slope,
        Yc: Number(Yc.toFixed(3)),
        HsC: Number(HsC.toFixed(3)),
        Yn: Yn ? Number(Yn.toFixed(3)) : undefined,
        IJ: Number((slope - hyd.J).toFixed(4)),
      });

      if (i > 0) {
        // Step upstream: delta_x is negative
        const k1 = hyd.dydx;
        const y_mid1 = Math.max(currentY - 0.5 * dx * k1, 0.05);
        const hyd_mid1 = computeHydraulics(geom, y_mid1, Q, reach.strickler, slope, Zf + 0.5 * slope * dx);
        const k2 = hyd_mid1.dydx;

        const y_mid2 = Math.max(currentY - 0.5 * dx * k2, 0.05);
        const hyd_mid2 = computeHydraulics(geom, y_mid2, Q, reach.strickler, slope, Zf + 0.5 * slope * dx);
        const k3 = hyd_mid2.dydx;

        const y_end = Math.max(currentY - dx * k3, 0.05);
        const hyd_end = computeHydraulics(geom, y_end, Q, reach.strickler, slope, Zf + slope * dx);
        const k4 = hyd_end.dydx;

        let deltaY = (-dx / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
        if (isNaN(deltaY) || Math.abs(deltaY) > 5) {
          deltaY = -dx * k1;
        }
        currentY = Math.max(currentY + deltaY, 0.05);
      }
    }
    // Reorder from x=0 to x=L
    points.push(...revPoints.reverse());
  }

  return { points, Yc, Yn, Ic };
}

/**
 * Runs complete hydraulic network simulation across all reaches
 */
export function runSimulation(config: SimulationConfig): SimulationResult {
  const allPoints: CalculationPoint[] = [];
  const reachesSummary: SimulationResult['reachesSummary'] = [];
  let jumpDetected: SimulationResult['jumpDetected'] = null;

  let currentX = config.xRef;
  let currentZf = config.zRef;

  // First, compute geometric chain of bed elevations if not pre-linked
  const normalizedReaches = config.reaches.map((reach, idx) => {
    const xStart = currentX;
    const xEnd = currentX + reach.length;
    const zBedUpstream = idx === 0 ? (reach.zBedUpstream ?? currentZf) : currentZf;
    const zBedDownstream = zBedUpstream - reach.slope * reach.length;

    currentX = xEnd;
    currentZf = zBedDownstream;

    return {
      ...reach,
      id: idx + 1,
      xStart,
      xEnd,
      zBedUpstream,
      zBedDownstream,
    };
  });

  // Calculate each reach
  let nextInitialY = config.yUpstream ?? null;

  for (let idx = 0; idx < normalizedReaches.length; idx++) {
    const reach = normalizedReaches[idx];
    const boundaryType = config.reference === 'aval' && idx === normalizedReaches.length - 1 ? 'aval' : 'amont';
    const initY = idx === 0 ? config.yUpstream : nextInitialY;

    const reachSim = simulateReach(
      reach,
      config.flowRate,
      config.stepsPerReach,
      reach.xStart,
      initY,
      boundaryType
    );

    const geom: SectionGeometry = {
      type: reach.type,
      width: reach.width,
      fruit: reach.fruit,
      radius: reach.radius,
    };

    let slopeType: 'mild' | 'steep' | 'critical' | 'horizontal' | 'adverse' = 'mild';
    if (reach.slope <= 0) {
      slopeType = reach.slope === 0 ? 'horizontal' : 'adverse';
    } else if (Math.abs(reach.slope - reachSim.Ic) / reachSim.Ic < 0.05) {
      slopeType = 'critical';
    } else if (reach.slope > reachSim.Ic) {
      slopeType = 'steep';
    } else {
      slopeType = 'mild';
    }

    const fn = reachSim.Yn ? computeHydraulics(geom, reachSim.Yn, config.flowRate, reach.strickler, reach.slope, 0).F : null;

    reachesSummary.push({
      reachIndex: reach.id,
      reachName: reach.name || `Bief ${reach.id}`,
      Yc: reachSim.Yc,
      Yn: reachSim.Yn,
      Ic: reachSim.Ic,
      slopeType,
      F_normal: fn ? Number(fn.toFixed(3)) : null,
      regime: slopeType === 'steep' ? 'Torrentiel (Pente forte)' : slopeType === 'mild' ? 'Fluvial (Pente faible)' : 'Critique',
    });

    allPoints.push(...reachSim.points);

    // Pass depth to next reach
    if (reachSim.points.length > 0) {
      nextInitialY = reachSim.points[reachSim.points.length - 1].Y;
    }
  }

  // Detect hydraulic jump in points (where F crosses 1 or transition from supercritical to subcritical)
  for (let i = 1; i < allPoints.length; i++) {
    const pPrev = allPoints[i - 1];
    const pCurr = allPoints[i];

    if (pPrev.F > 1.05 && pCurr.F < 0.95) {
      const y1 = pPrev.Y;
      const y2 = pCurr.Y;
      jumpDetected = {
        reachIndex: pCurr.elem,
        x: pCurr.x,
        y1: Number(y1.toFixed(3)),
        y2: Number(y2.toFixed(3)),
        froude1: Number(pPrev.F.toFixed(3)),
        energyLoss: Number((pPrev.Hs - pCurr.Hs).toFixed(3)),
      };
      break;
    }
  }

  return {
    points: allPoints,
    reachesSummary,
    jumpDetected,
  };
}
