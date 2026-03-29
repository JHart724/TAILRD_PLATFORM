import React, { useState, useMemo } from 'react';
import { X, ChevronUp, ChevronDown, Info, Lock, FlaskConical, ClipboardList } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ModuleDetailData } from '../types';
import { formatCurrency, formatNumber, formatPercent } from '../utils';
import { toFixed } from '../../../utils/formatters';

// ---------- Types ----------

interface ModuleDetailPanelProps {
  moduleId: string;
  moduleName: string;
  data: ModuleDetailData;
  onClose: () => void;
}

type ProcedureSortField = 'cptCode' | 'name' | 'volume' | 'reimbursement' | 'averageCost' | 'margin';
type DRGSortField = 'code' | 'name' | 'category' | 'cases' | 'reimbursement' | 'cost' | 'margin' | 'varianceVsBenchmark';
type SortDirection = 'asc' | 'desc';

// ---------- Helpers ----------

const getMarginColor = (margin: number): string => {
  if (margin >= 50) return 'text-[#2C4A60]';
  if (margin >= 30) return 'text-[#6B7280]';
  return 'text-arterial-600';
};

const getVarianceDisplay = (variance: number): { text: string; className: string } => {
  if (variance > 0) {
    return { text: `+${formatCurrency(variance)}`, className: 'text-[#2C4A60]' };
  }
  if (variance < 0) {
    return { text: `\u2212${formatCurrency(Math.abs(variance))}`, className: 'text-arterial-600' };
  }
  return { text: formatCurrency(0), className: 'text-titanium-600' };
};

const getStatusStyles = (status: 'Recruiting' | 'Active' | 'Completed'): string => {
  switch (status) {
    case 'Recruiting':
      return 'bg-[#F0F5FA] text-[#2C4A60]';
    case 'Active':
      return 'bg-chrome-100 text-chrome-700';
    case 'Completed':
      return 'bg-titanium-100 text-titanium-600';
    default:
      return 'bg-chrome-100 text-chrome-700';
  }
};

const getRegistryBodyColor = (body: string): string => {
  const normalized = body.toUpperCase();
  if (normalized.includes('AHA')) return 'text-[#2C4A60]';
  if (normalized.includes('ACC')) return 'text-chrome-600';
  if (normalized.includes('STS')) return 'text-[#6B7280]';
  if (normalized.includes('SVS')) return 'text-arterial-600';
  return 'text-titanium-600';
};

// ---------- Custom Tooltip for Range Charts ----------

interface RangeTooltipPayloadEntry {
  dataKey: string;
  value: number;
}

interface RangeTooltipProps {
  active?: boolean;
  payload?: RangeTooltipPayloadEntry[];
  label?: string;
  formatValue: (v: number) => string;
  sourceData: { drg: string; min: number; avg: number; max: number }[];
}

const RangeTooltip: React.FC<RangeTooltipProps> = ({ active, label, formatValue, sourceData }) => {
  if (!active || !label) return null;
  const entry = sourceData.find((d) => d.drg === label);
  if (!entry) return null;
  return (
    <div className="bg-white border border-chrome-200 rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs font-body font-semibold text-titanium-800 mb-1">{entry.drg}</p>
      <p className="text-xs font-data text-titanium-600">
        Min {formatValue(entry.min)} &mdash; Avg {formatValue(entry.avg)} &mdash; Max {formatValue(entry.max)}
      </p>
    </div>
  );
};

// ---------- Component ----------

const ModuleDetailPanel: React.FC<ModuleDetailPanelProps> = ({
  moduleId,
  moduleName,
  data,
  onClose,
}) => {
  // -- Procedure sort state --
  const [procSortField, setProcSortField] = useState<ProcedureSortField>('volume');
  const [procSortDir, setProcSortDir] = useState<SortDirection>('desc');

  const handleProcSort = (field: ProcedureSortField) => {
    if (procSortField === field) {
      setProcSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setProcSortField(field);
      setProcSortDir('desc');
    }
  };

  const sortedProcedures = useMemo(() => {
    const sorted = [...data.procedures].sort((a, b) => {
      const aVal = a[procSortField];
      const bVal = b[procSortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return procSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return procSortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    return sorted;
  }, [data.procedures, procSortField, procSortDir]);

  // -- DRG sort state --
  const [drgSortField, setDrgSortField] = useState<DRGSortField>('cases');
  const [drgSortDir, setDrgSortDir] = useState<SortDirection>('desc');

  const handleDrgSort = (field: DRGSortField) => {
    if (drgSortField === field) {
      setDrgSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setDrgSortField(field);
      setDrgSortDir('desc');
    }
  };

  const sortedDrgs = useMemo(() => {
    const sorted = [...data.drgs].sort((a, b) => {
      const aVal = a[drgSortField];
      const bVal = b[drgSortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return drgSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return drgSortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    return sorted;
  }, [data.drgs, drgSortField, drgSortDir]);

  // -- Chart data preparation --
  const losChartData = useMemo(() => {
    return data.losRange.map((d) => ({
      drg: d.drg,
      spacer: d.minLOS,
      range: d.maxLOS - d.minLOS,
      avg: d.avgLOS,
    }));
  }, [data.losRange]);

  const losSourceData = useMemo(() => {
    return data.losRange.map((d) => ({
      drg: d.drg,
      min: d.minLOS,
      avg: d.avgLOS,
      max: d.maxLOS,
    }));
  }, [data.losRange]);

  const costChartData = useMemo(() => {
    return data.costRange.map((d) => ({
      drg: d.drg,
      spacer: d.minCost,
      range: d.maxCost - d.minCost,
      avg: d.avgCost,
    }));
  }, [data.costRange]);

  const costSourceData = useMemo(() => {
    return data.costRange.map((d) => ({
      drg: d.drg,
      min: d.minCost,
      avg: d.avgCost,
      max: d.maxCost,
    }));
  }, [data.costRange]);

  // -- Sort indicator sub-component --
  const ProcSortIndicator: React.FC<{ field: ProcedureSortField }> = ({ field }) => {
    if (procSortField !== field) return null;
    return procSortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 inline-block ml-0.5" />
    ) : (
      <ChevronDown className="w-3 h-3 inline-block ml-0.5" />
    );
  };

  const DrgSortIndicator: React.FC<{ field: DRGSortField }> = ({ field }) => {
    if (drgSortField !== field) return null;
    return drgSortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 inline-block ml-0.5" />
    ) : (
      <ChevronDown className="w-3 h-3 inline-block ml-0.5" />
    );
  };

  // -- Column definitions --
  const procedureColumns: { label: string; field: ProcedureSortField; align: 'left' | 'right' }[] = [
    { label: 'CPT Code', field: 'cptCode', align: 'left' },
    { label: 'Procedure', field: 'name', align: 'left' },
    { label: 'Volume', field: 'volume', align: 'right' },
    { label: 'Reimbursement', field: 'reimbursement', align: 'right' },
    { label: 'Avg Cost', field: 'averageCost', align: 'right' },
    { label: 'Margin', field: 'margin', align: 'right' },
  ];

  const drgColumns: { label: string; field: DRGSortField; align: 'left' | 'right' }[] = [
    { label: 'DRG', field: 'code', align: 'left' },
    { label: 'Name', field: 'name', align: 'left' },
    { label: 'Category', field: 'category', align: 'left' },
    { label: 'Cases', field: 'cases', align: 'right' },
    { label: 'Reimb', field: 'reimbursement', align: 'right' },
    { label: 'Cost', field: 'cost', align: 'right' },
    { label: 'Margin', field: 'margin', align: 'right' },
    { label: 'Vs Benchmark', field: 'varianceVsBenchmark', align: 'right' },
  ];

  // -- Custom average label for range charts --
  const renderAvgLabel = (props: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    value?: number;
    index?: number;
  }, sourceData: { avg: number }[]) => {
    const { x = 0, y = 0, height = 0, index = 0 } = props;
    const avgVal = sourceData[index]?.avg;
    if (avgVal === undefined) return null;
    return (
      <text
        x={x + 4}
        y={y + height / 2 + 4}
        fontSize={10}
        fontFamily="IBM Plex Mono"
        fill="#3B4455"
        fontWeight={600}
      >
        avg {typeof avgVal === 'number' && avgVal >= 1000 ? formatCurrency(avgVal) : avgVal}
      </text>
    );
  };

  return (
    <div className="bg-chrome-50/30 border border-chrome-200 rounded-xl p-6 mt-4 transition-all duration-300">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-display font-bold text-titanium-800">
          {moduleName} <span className="text-titanium-500 font-body font-normal">&mdash; Detail View</span>
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-chrome-100 transition-colors text-titanium-500 hover:text-titanium-700"
          aria-label="Close detail panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ---- Section 1: Key Procedures Table ---- */}
      <div className="mb-6">
        <h3 className="text-sm font-body font-semibold text-titanium-700 mb-3">
          Key Procedures
        </h3>
        <div className="w-full rounded-lg overflow-hidden border border-chrome-200">
          <table className="w-full">
            <thead>
              <tr className="bg-chrome-50">
                {procedureColumns.map((col) => (
                  <th
                    key={col.field}
                    onClick={() => handleProcSort(col.field)}
                    className={`text-xs font-body font-semibold uppercase tracking-wider text-titanium-500 px-4 py-3 cursor-pointer select-none hover:text-titanium-700 transition-colors ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.label}
                    <ProcSortIndicator field={col.field} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedProcedures.map((row, index) => (
                <tr
                  key={row.cptCode}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-chrome-50/50'}
                >
                  <td className="text-sm font-data font-semibold text-chrome-700 px-4 py-3">
                    {row.cptCode}
                  </td>
                  <td className="text-sm font-body text-titanium-700 px-4 py-3">
                    {row.name}
                  </td>
                  <td className="text-sm font-data text-right text-titanium-800 px-4 py-3">
                    {formatNumber(row.volume)}
                  </td>
                  <td className="text-sm font-data text-right text-titanium-800 px-4 py-3">
                    {formatCurrency(row.reimbursement)}
                  </td>
                  <td className="text-sm font-data text-right text-titanium-800 px-4 py-3">
                    {formatCurrency(row.averageCost)}
                  </td>
                  <td
                    className={`text-sm font-data text-right px-4 py-3 font-medium ${getMarginColor(row.margin)}`}
                  >
                    {toFixed(row.margin, 1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Section 2: DRG Mix Table ---- */}
      <div className="mb-6">
        <h3 className="text-sm font-body font-semibold text-titanium-700 mb-3">
          DRG Mix
        </h3>
        <div className="w-full rounded-lg overflow-hidden border border-chrome-200 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-chrome-50">
                {drgColumns.map((col) => (
                  <th
                    key={col.field}
                    onClick={() => handleDrgSort(col.field)}
                    className={`text-xs font-body font-semibold uppercase tracking-wider text-titanium-500 px-4 py-3 cursor-pointer select-none hover:text-titanium-700 transition-colors whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.label}
                    <DrgSortIndicator field={col.field} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedDrgs.map((row, index) => {
                const variance = getVarianceDisplay(row.varianceVsBenchmark);
                return (
                  <tr
                    key={row.code}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-chrome-50/50'}
                  >
                    <td className="text-sm font-data font-semibold text-chrome-700 px-4 py-3">
                      {row.code}
                    </td>
                    <td className="text-sm font-body text-titanium-700 px-4 py-3">
                      {row.name}
                    </td>
                    <td className="text-sm font-body text-titanium-600 px-4 py-3">
                      {row.category}
                    </td>
                    <td className="text-sm font-data text-right text-titanium-800 px-4 py-3">
                      {formatNumber(row.cases)}
                    </td>
                    <td className="text-sm font-data text-right text-titanium-800 px-4 py-3">
                      {formatCurrency(row.reimbursement)}
                    </td>
                    <td className="text-sm font-data text-right text-titanium-800 px-4 py-3">
                      {formatCurrency(row.cost)}
                    </td>
                    <td
                      className={`text-sm font-data text-right px-4 py-3 font-medium ${getMarginColor(row.margin)}`}
                    >
                      {toFixed(row.margin, 1)}%
                    </td>
                    <td
                      className={`text-sm font-data text-right px-4 py-3 font-medium ${variance.className}`}
                    >
                      {variance.text}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Sections 3 & 4: Range Charts (2-column layout) ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Section 3: LOS Range Chart */}
        <div>
          <h3 className="text-sm font-body font-semibold text-titanium-700 mb-1">
            Length of Stay Variation
          </h3>
          <p className="text-xs font-body text-titanium-400 mb-3">
            Internal range (min &rarr; max) by DRG
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={losChartData}
              layout="vertical"
              margin={{ top: 5, right: 30, bottom: 5, left: 70 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#D8DDE6" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#636D80', fontFamily: 'IBM Plex Mono' }}
                label={{
                  value: 'Days',
                  position: 'bottom',
                  offset: -5,
                  style: { fontSize: 10, fill: '#8D96A8' },
                }}
              />
              <YAxis
                type="category"
                dataKey="drg"
                tick={{ fontSize: 10, fill: '#636D80', fontFamily: 'DM Sans' }}
                width={70}
              />
              <Tooltip
                content={
                  <RangeTooltip
                    formatValue={(v) => `${v} days`}
                    sourceData={losSourceData}
                  />
                }
              />
              <Bar
                dataKey="spacer"
                stackId="a"
                fill="transparent"
                barSize={18}
              />
              <Bar
                dataKey="range"
                stackId="a"
                fill="#3D6F94"
                fillOpacity={0.5}
                radius={[0, 4, 4, 0]}
                barSize={18}
                label={(props: any) => renderAvgLabel(props, losChartData)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Section 4: Cost Range Chart */}
        <div>
          <h3 className="text-sm font-body font-semibold text-titanium-700 mb-1">
            Cost Variation
          </h3>
          <p className="text-xs font-body text-titanium-400 mb-3">
            Internal range (min &rarr; max) by DRG
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={costChartData}
              layout="vertical"
              margin={{ top: 5, right: 30, bottom: 5, left: 70 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#D8DDE6" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#636D80', fontFamily: 'IBM Plex Mono' }}
                tickFormatter={(value: number) => formatCurrency(value)}
              />
              <YAxis
                type="category"
                dataKey="drg"
                tick={{ fontSize: 10, fill: '#636D80', fontFamily: 'DM Sans' }}
                width={70}
              />
              <Tooltip
                content={
                  <RangeTooltip
                    formatValue={formatCurrency}
                    sourceData={costSourceData}
                  />
                }
              />
              <Bar
                dataKey="spacer"
                stackId="a"
                fill="transparent"
                barSize={18}
              />
              <Bar
                dataKey="range"
                stackId="a"
                fill="#DC6B6B"
                fillOpacity={0.5}
                radius={[0, 4, 4, 0]}
                barSize={18}
                label={(props: any) => renderAvgLabel(props, costChartData)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ---- Section 5: Clinical Trial Enrollment Potential ---- */}
      <div className="mb-6">
        <h3 className="text-sm font-body font-semibold text-titanium-700 mb-3">
          <FlaskConical className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-chrome-500" />
          Clinical Trial Enrollment Potential
        </h3>
        <div className="w-full rounded-lg overflow-hidden border border-chrome-200">
          <table className="w-full">
            <thead>
              <tr className="bg-chrome-50">
                <th className="text-xs font-body font-semibold uppercase tracking-wider text-titanium-500 px-4 py-3 text-left">
                  Trial Name
                </th>
                <th className="text-xs font-body font-semibold uppercase tracking-wider text-titanium-500 px-4 py-3 text-left">
                  Phase
                </th>
                <th className="text-xs font-body font-semibold uppercase tracking-wider text-titanium-500 px-4 py-3 text-left">
                  Sponsor
                </th>
                <th className="text-xs font-body font-semibold uppercase tracking-wider text-titanium-500 px-4 py-3 text-left">
                  Condition
                </th>
                <th className="text-xs font-body font-semibold uppercase tracking-wider text-titanium-500 px-4 py-3 text-right">
                  Eligible Patients
                </th>
                <th className="text-xs font-body font-semibold uppercase tracking-wider text-titanium-500 px-4 py-3 text-left">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {data.trialEligibility.map((trial, index) => (
                <tr
                  key={trial.trialName}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-chrome-50/50'}
                >
                  <td className="text-sm font-body text-titanium-700 px-4 py-3 max-w-[220px] truncate">
                    {trial.trialName}
                  </td>
                  <td className="text-sm font-data text-chrome-600 px-4 py-3">
                    {trial.phase}
                  </td>
                  <td className="text-sm font-body text-titanium-600 px-4 py-3 max-w-[140px] truncate">
                    {trial.sponsor}
                  </td>
                  <td className="text-sm font-body text-titanium-600 px-4 py-3">
                    {trial.condition}
                  </td>
                  <td className="text-right px-4 py-3">
                    <span className="text-base font-data font-semibold text-titanium-800">
                      {formatNumber(trial.eligiblePatients)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-body font-medium ${getStatusStyles(trial.status)}`}
                    >
                      {trial.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-1.5 mt-2 px-1">
          <Info className="w-3.5 h-3.5 text-titanium-400 flex-shrink-0" />
          <span className="text-xs font-body text-titanium-400">
            Aggregate counts only &mdash; upgrade to Premium for patient-level enrollment lists
          </span>
        </div>
      </div>

      {/* ---- Section 6: Registry Eligibility ---- */}
      <div>
        <h3 className="text-sm font-body font-semibold text-titanium-700 mb-3">
          <ClipboardList className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-chrome-500" />
          Registry Eligibility
        </h3>
        <div className="w-full rounded-lg overflow-hidden border border-chrome-200">
          <table className="w-full">
            <thead>
              <tr className="bg-chrome-50">
                <th className="text-xs font-body font-semibold uppercase tracking-wider text-titanium-500 px-4 py-3 text-left">
                  Registry
                </th>
                <th className="text-xs font-body font-semibold uppercase tracking-wider text-titanium-500 px-4 py-3 text-left">
                  Governing Body
                </th>
                <th className="text-xs font-body font-semibold uppercase tracking-wider text-titanium-500 px-4 py-3 text-right">
                  Eligible Patients
                </th>
                <th className="text-xs font-body font-semibold uppercase tracking-wider text-titanium-500 px-4 py-3 text-left">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {data.registryEligibility.map((reg, index) => (
                <tr
                  key={reg.registryName}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-chrome-50/50'}
                >
                  <td className="text-sm font-body text-titanium-700 px-4 py-3 font-medium">
                    {reg.registryName}
                  </td>
                  <td className={`text-sm font-body px-4 py-3 font-medium ${getRegistryBodyColor(reg.registryBody)}`}>
                    {reg.registryBody}
                  </td>
                  <td className="text-right px-4 py-3">
                    <span className="text-base font-data font-semibold text-titanium-800">
                      {formatNumber(reg.eligiblePatients)}
                    </span>
                  </td>
                  <td className="text-sm font-body text-titanium-600 px-4 py-3 max-w-[300px]">
                    {reg.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-1.5 mt-2 px-1">
          <Info className="w-3.5 h-3.5 text-titanium-400 flex-shrink-0" />
          <span className="text-xs font-body text-titanium-400">
            Aggregate counts only &mdash; upgrade to Premium for patient matching and submission
          </span>
        </div>
      </div>
    </div>
  );
};

export default ModuleDetailPanel;
