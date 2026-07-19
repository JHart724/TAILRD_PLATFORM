/**
 * AUDIT-303 claims-honesty label render-test.
 *
 * Verification artifact for the AUDIT-303 tranche - it replaces the auth-blocked visual check
 * (every target surface sits behind <ProtectedRoute>, and this branch deliberately requires login,
 * so a live screenshot pass is not possible offline). Instead this mounts the self-contained
 * label-bearing components and asserts the corrected strings RENDER and the false claims do NOT,
 * covering one rendered surface per class (AI/ML, EHR-provenance, Real-time) plus config-value
 * breadth across all six modules.
 *
 * Convention: react-dom/client + react-dom/test-utils act, NO React Testing Library (RTL is
 * intentionally absent from this project - matches primitives.regression.test.tsx / ServiceLineKPIBanner.test.tsx).
 * Heavy view-shells (CareTeamView, *ClinicalGapDetectionDashboard) are impractical to mount standalone
 * (tabbed shells / huge dashboards), so their strings are asserted-at-source (fs read) and noted as such.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

// Rendered surfaces (self-contained, no router/api/recharts/leaflet deps)
import AIInsightCards from '../../components/free-tier/sections/AIInsightCards';
import SAQOutcomesPanel from '../../ui/coronaryIntervention/components/service-line/SAQOutcomesPanel';
import HFCareNetworkVisualization from '../../ui/heartFailure/components/service-line/HFCareNetworkVisualization';
import SHValveCareNetworkVisualization from '../../ui/structuralHeart/components/service-line/SHValveCareNetworkVisualization';
import PCINetworkVisualization from '../../ui/coronaryIntervention/components/PCINetworkVisualization';
import EPDeviceNetworkVisualization from '../../ui/electrophysiology/components/EPDeviceNetworkVisualization';
import HFRiskAlerts from '../../components/heartFailure/HFRiskAlerts';
import EPAlertDashboard from '../../ui/electrophysiology/components/care-team/EPAlertDashboard';

// Config breadth (the tab-description / EHR-tail surfaces, asserted on the imported value)
import { heartFailureServiceLineConfig } from '../../ui/heartFailure/config/serviceLineConfig';
import { electrophysiologyServiceLineConfig } from '../../ui/electrophysiology/config/serviceLineConfig';
import { structuralHeartServiceLineConfig } from '../../ui/structuralHeart/config/serviceLineConfig';
import { coronaryServiceLineConfig } from '../../ui/coronaryIntervention/config/serviceLineConfig';
import { peripheralVascularServiceLineConfig } from '../../ui/peripheralVascular/config/serviceLineConfig';
import { valvularDiseaseServiceLineConfig } from '../../ui/valvularDisease/config/serviceLineConfig';
import { valvularCareTeamConfig } from '../../ui/valvularDisease/config/careTeamConfig';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(el: React.ReactElement): string {
  act(() => { root.render(el); });
  return container.innerHTML;
}

// Recursively collect string values from a config object; skip React element / forwardRef nodes.
function configText(node: unknown, acc: string[] = []): string[] {
  if (typeof node === 'string') acc.push(node);
  else if (Array.isArray(node)) node.forEach((n) => configText(n, acc));
  else if (node && typeof node === 'object' && !(node as Record<string, unknown>).$$typeof) {
    Object.values(node as Record<string, unknown>).forEach((v) => configText(v, acc));
  }
  return acc;
}

// Strip comments before asserting on MECHANISM, so an explanatory comment that NAMES the
// removed construct cannot re-trip the guard. (Same lesson as the coarse `grep @ts-nocheck`
// that false-matched JSDoc prose: a detector that reads prose is a false-positive generator.)
function codeOnly(sourceText: string): string {
  return sourceText
    .replace(/\/\*[\s\S]*?\*\//g, '')   // block comments, incl. {/* jsx */}
    .replace(/^\s*\/\/.*$/gm, '');       // whole-line // comments
}

function src(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
}

const SERVICE_LINE_CONFIGS: Array<[string, unknown]> = [
  ['heartFailure', heartFailureServiceLineConfig],
  ['electrophysiology', electrophysiologyServiceLineConfig],
  ['structuralHeart', structuralHeartServiceLineConfig],
  ['coronaryIntervention', coronaryServiceLineConfig],
  ['peripheralVascular', peripheralVascularServiceLineConfig],
  ['valvularDisease', valvularDiseaseServiceLineConfig],
];

// EHR-tail carriers (the 5 service-line configs that held "via EHR integration ..." + the freemium banner)
const EHR_TAIL_MODULES = ['heartFailure', 'electrophysiology', 'structuralHeart', 'coronaryIntervention', 'peripheralVascular'] as const;

// ------------------------- AI/ML class (rendered) -------------------------
describe('AUDIT-303 AI/ML - free-tier AIInsightCards renders guideline-based, never AI', () => {
  it('renders the corrected AI/ML labels', () => {
    const html = render(<AIInsightCards />);
    expect(html).toContain('Guideline-Based Insights');   // section title
    expect(html).toContain('Guideline-Based');             // badge text (was "AI Powered")
    expect(html).toContain('guideline-based gaps');        // summary line
  });
  it('does NOT render any AI/ML false claim', () => {
    const html = render(<AIInsightCards />);
    expect(html).not.toContain('AI-Detected');
    expect(html).not.toContain('AI Powered');
    expect(html).not.toContain('Machine learning');
    expect(html).not.toContain('AI-detected');
  });
});

// ----------------------- EHR-provenance class (rendered) -----------------------
describe('AUDIT-303 EHR-provenance - CAD SAQOutcomesPanel badge is demo-honest', () => {
  it('renders the demo-honest provenance badge', () => {
    const html = render(<SAQOutcomesPanel />);
    expect(html).toContain('Demo data');
    expect(html).toContain('EHR integration pending');
  });
  it('does NOT render the false "auto-calculated from EHR" provenance claim', () => {
    const html = render(<SAQOutcomesPanel />);
    expect(html).not.toContain('Auto-calculated from EHR');
  });
});

// ------------------------- Real-time class (rendered) -------------------------
describe('AUDIT-303 Real-time - care-network subtitles drop the false real-time claim', () => {
  it('HF care network: corrected subtitle, no "Real-time", clock untouched', () => {
    const html = render(<HFCareNetworkVisualization />);
    expect(html).toContain('Heart failure care pathways and GDMT optimization');
    expect(html).not.toContain('Real-time heart failure care pathways');
    expect(html).toContain('Last updated:'); // the setInterval timestamp (a clock, not a data claim) is intact
  });
  it('SH valve care network: corrected subtitle, no "Real-time"', () => {
    const html = render(<SHValveCareNetworkVisualization />);
    expect(html).toContain('Structural heart care pathways and Valve Therapy optimization');
    expect(html).not.toContain('Real-time structural heart care pathways');
  });
});

// ---------------- Config breadth across all 6 modules (value assertions) ----------------
describe('AUDIT-303 config breadth - deterministic gap-detection wording, all 6 modules', () => {
  SERVICE_LINE_CONFIGS.forEach(([name, cfg]) => {
    it(`${name} serviceLineConfig: guideline-based, never AI-driven/AI-powered`, () => {
      const text = configText(cfg).join(' || ');
      expect(text).not.toContain('AI-driven');
      expect(text).not.toContain('AI-powered');
      expect(text).toContain('Guideline-based');
    });
  });
  it('valvular careTeamConfig: guideline-based, never AI-driven', () => {
    const text = configText(valvularCareTeamConfig).join(' || ');
    expect(text).not.toContain('AI-driven');
    expect(text).toContain('Guideline-based');
  });
});

describe('AUDIT-303 config breadth - no false EHR provenance in the 5 EHR-tail configs', () => {
  EHR_TAIL_MODULES.forEach((name) => {
    it(`${name} serviceLineConfig: demo-honest EHR phrasing only`, () => {
      const cfg = SERVICE_LINE_CONFIGS.find(([n]) => n === name)![1];
      const text = configText(cfg).join(' || ');
      expect(text).not.toContain('via EHR integration');
      expect(text).not.toContain('identified from EHR integration');
      // demo-honest replacement of the EHR-tail ("... structured patient data (live EHR integration pending)")
      expect(text).toContain('live EHR integration pending');
    });
  });
});

// ------------ Asserted-at-source: heavy view shells not mountable standalone ------------
describe('AUDIT-303 asserted-at-source - heavy view shells (tabbed shells / large dashboards)', () => {
  it('HF CareTeamView hospital-alerts tab description drops "Real-time" (item 5)', () => {
    const s = src('../../ui/heartFailure/views/CareTeamView.tsx');
    expect(s).toContain('Heart failure hospital alerts');
    expect(s).not.toContain('Real-time heart failure hospital alerts');
  });
  it('CAD gap-detection dashboard header + tooltip are honest (item 3)', () => {
    const s = src('../../ui/coronaryIntervention/components/clinical/CADClinicalGapDetectionDashboard.tsx');
    expect(s).toContain('Guideline-based detection');
    expect(s).not.toContain('AI-driven detection');
    expect(s).toContain('structured demo data');
    expect(s).not.toContain('Automatically calculated from EHR-sourced');
  });
});

// ------- Real-time class extension - newly-fixed static surfaces (rendered) -------
// NB: PCI/EPDevice retain a flagged VIEW-MODE "Real-time" control (e.g. a "Real-Time Flow" option),
// so these assert the SPECIFIC corrected subtitle string, not blanket absence of "Real-time".
describe('AUDIT-303 Real-time extension - static network-viz + alert surfaces (rendered)', () => {
  it('CAD PCINetworkVisualization: corrected subtitle, no false real-time pathways claim', () => {
    const html = render(<PCINetworkVisualization />);
    expect(html).toContain('Coronary intervention pathways and door-to-balloon optimization');
    expect(html).not.toContain('Real-time coronary intervention pathways');
  });
  it('EP EPDeviceNetworkVisualization: corrected subtitle, no false real-time monitoring claim', () => {
    const html = render(<EPDeviceNetworkVisualization />);
    expect(html).toContain('Device monitoring and care coordination pathways');
    expect(html).not.toContain('Real-time device monitoring');
  });
  it('HF HFRiskAlerts: header drops "Real-Time" (static hardcoded alerts array)', () => {
    const html = render(<HFRiskAlerts />);
    expect(html).toContain('Risk Alerts');
    expect(html).not.toContain('Real-Time Risk Alerts');
  });
  it('EP EPAlertDashboard: header drops "Real-Time" (mock data)', () => {
    const html = render(<EPAlertDashboard />);
    expect(html).toContain('EP Alerts');
    expect(html).not.toContain('EP Real-Time Alerts');
  });
});

// ------- Real-time class extension - heavy / props-required surfaces (asserted-at-source) -------
describe('AUDIT-303 Real-time extension - asserted-at-source (charts / views / props-required)', () => {
  const cases: Array<[string, string, string, string]> = [
    // [label, file, present-string, absent-string]
    ['SH TAVRAnalyticsDashboard subtitle', '../../ui/structuralHeart/components/TAVRAnalyticsDashboard.tsx',
      'Structural heart program analytics with risk stratification and outcomes tracking', 'Real-time structural heart program analytics'],
    ['PV PADReportingSystem', '../../ui/peripheralVascular/components/PADReportingSystem.tsx',
      'Limb preservation outcomes', 'Real-time limb preservation outcomes'],
    ['RC RCOperationsView', '../../ui/revenueCycle/views/RCOperationsView.tsx',
      'Workflow status and bottlenecks', 'Real-time workflow status and bottlenecks'],
    ['CAD CoronaryCareTeamView', '../../ui/coronaryIntervention/views/CoronaryCareTeamView.tsx',
      'Procedure checklist and monitoring for high-risk PCI cases', 'Real-time procedure checklist'],
    ['DRGOptimizationAlert', '../../components/shared/DRGOptimizationAlert.tsx',
      'Identification of coding improvements', 'Real-time identification of coding improvements'],
    // NotificationPanel:276 prose is gated behind activeTab==='orchestration' (conditional render), so asserted-at-source
    ['NotificationPanel orchestration prose', '../../components/notifications/NotificationPanel.tsx',
      'Active care gap orchestrations with status tracking', 'real-time status tracking'],
  ];
  cases.forEach(([label, file, present, absent]) => {
    it(`${label}: corrected static label, no false real-time claim`, () => {
      const s = src(file);
      expect(s).toContain(present);
      expect(s).not.toContain(absent);
    });
  });
});

// ---------------- The guards the 2026-06-27 label sweep LACKED (added 2026-07-19) ----------------
// The sweep recorded "ALL LABEL remediation COMPLETE", but the 2026-07-18 state audit found two
// live claims it had missed. Both were invisible to this suite because it only ever asserted over
// serviceLineConfig / careTeamConfig objects - never over App.tsx's MODULES grid, and never over
// the mechanism behind a "Live" label. These assertions close both blind spots.
describe('AUDIT-303 blind-spot guards - MODULES tile copy + fake-live mechanisms', () => {
  it('App.tsx MODULES descriptions carry no AI/ML capability claim (the EP tile survived the sweep)', () => {
    const s = codeOnly(src('../../App.tsx'));
    expect(s).not.toContain('AI-powered');
    expect(s).not.toContain('AI-driven');
    // the approved replacement copy is in place on the EP tile
    expect(s).toContain('guideline-based risk stratification');
  });

  it('TAVRAnalyticsDashboard synthesizes no motion: no setInterval, no Math.random, no live affordance', () => {
    const s = codeOnly(src('../../ui/structuralHeart/components/TAVRAnalyticsDashboard.tsx'));
    // the mechanism: a 4s interval drifted clinical quality metrics via Math.random()
    expect(s).not.toContain('setInterval');
    expect(s).not.toContain('Math.random');
    // the affordance that advertised it as real
    expect(s).not.toContain('Live Updates');
    expect(s).not.toContain('animate-spin');
    expect(s).not.toContain('isLiveMode');
    // Bare "Live <X>" headings too: the first sweep matched 'Live Updates' and isLiveMode
    // but missed a "Live TAVR Performance Dashboard" <h3>, which the operator's Chrome
    // verify caught. This tier is entirely static demo data, so NO user-facing "Live"
    // claim belongs in it at all - assert the word, not one phrasing of it.
    expect(s).not.toContain('Live');
    // and it states its real provenance instead
    expect(s).toContain('DemoDataBadge');
  });

  it('no UI file pairs setInterval with Math.random (the fake-live class, section-20 invariant)', () => {
    // Class-level: a timer that mutates rendered values through a random-number generator is
    // fabricated motion regardless of which component does it. Asserted over the whole tree so a
    // future reintroduction fails here rather than shipping behind a "Live" pill.
    const root = path.resolve(__dirname, '../..');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { walk(p); continue; }
        if (!/\.tsx?$/.test(e.name)) continue;
        if (/__tests__|\.test\.tsx?$/.test(p)) continue; // this file names both strings
        const t = codeOnly(fs.readFileSync(p, 'utf8'));
        if (t.includes('setInterval') && t.includes('Math.random')) {
          offenders.push(path.relative(root, p));
        }
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});
