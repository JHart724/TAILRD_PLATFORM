/**
 * ChartTheme - the single locked chart theme (UI_CANON section 6 / UI_DESIGN_DECISIONS section 8).
 * Every chart consumes this through the <Chart> wrapper. A color means ONE thing across ALL charts:
 * the data ramp is navy-primary then chrome (never a rainbow); threshold colors are the --sem tokens.
 *
 * Concrete hexes (not CSS vars) so recharts renders them reliably in SVG; they mirror the --sem-* tokens.
 * v2.0 UI foundation (gate-zero).
 */

export const ChartTheme = {
  /** Data-series ramp: primary navy, then progressively lighter chrome. NOT categorical hues. */
  series: ['#2C4A60', '#5A8AB0', '#A8C5DD'] as const,

  /** Threshold / semantic fills - a color means ONE thing across every chart (ties to section 4.2). */
  threshold: {
    critical: '#9B2438', // alarm / negative-threshold ONLY
    success: '#0F6E56',
    warning: '#854F0B',
  },

  /** Axes - always labeled, with units; tick text titanium-500 at 11px. */
  axis: {
    tickColor: '#636D80', // titanium-500
    tickFontSize: 11,
    labelColor: '#2C4A60',
    labelFontSize: 12,
  },

  /** Gridline - 0.5px dashed border-tertiary; horizontal only unless the chart needs vertical. */
  grid: {
    stroke: '#D4E4F0',
    strokeWidth: 0.5,
    strokeDasharray: '3 3',
  },

  /** Tooltip - one branded style: white glass raised, 12px radius, titanium-200 border, navy ink. */
  tooltip: {
    background: '#FFFFFF',
    border: '1px solid #D8DDE6', // titanium-200
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(44,74,96,0.08), 0 1px 2px rgba(44,74,96,0.04)',
    color: '#2C4A60',
    fontSize: 12,
    padding: '8px 12px',
  },

  /** Zero-baseline rule: any magnitude axis starts its domain at 0. */
  zeroBaselineDomain: [0, 'auto'] as [number, string],
} as const;

export type ChartSeriesType = 'line' | 'bar' | 'area';

export interface ChartSeries {
  /** Data key in each row. */
  dataKey: string;
  /** Display name (legend / tooltip). */
  name?: string;
  /** Render type for this series. */
  type?: ChartSeriesType;
  /** Series color; defaults to the canonical ramp by index. */
  color?: string;
}

export default ChartTheme;
