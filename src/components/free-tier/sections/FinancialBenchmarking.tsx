import React, { useState, useMemo } from 'react';
import SectionCard from '../../../design-system/SectionCard';
import Badge from '../../../design-system/Badge';
import { DRGRow, FinancialSummary, MarginOpportunity } from '../types';
import { formatCurrency, formatNumber } from '../utils';
import { TrendingUp, TrendingDown, ArrowRight, ChevronUp, ChevronDown, Lock } from 'lucide-react';
import CountUp from 'react-countup';

interface FinancialBenchmarkingProps {
  hasUploadedFiles: boolean;
  financialSummary: FinancialSummary[];
  drgData: DRGRow[];
  marginOpportunities: MarginOpportunity[];
}

type SortField = 'code' | 'description' | 'volume' | 'avgLOS' | 'reimbursement' | 'margin';
type SortDirection = 'asc' | 'desc';

interface MarginDetail {
  drivers: string[];
}

const MARGIN_DETAILS: Record<string, MarginDetail> = {
  'HF Readmission Reduction': {
    drivers: [
      'CMS HRRP penalty avoidance: each 1% readmission rate reduction saves ~$340K in penalties',
      'Transitional care management billing (TCM codes 99495/99496) for discharged HF patients',
      'Reduced variable cost per discharge through shorter re-admission stays',
    ],
  },
  'GDMT Protocol Compliance': {
    drivers: [
      'MIPS quality bonus improvement: GDMT composite is worth up to 40 MIPS points',
      'Risk-adjusted outcomes improvement reduces downstream hospitalization costs per patient',
      'Potential ACO shared savings from reduced total cost of care across aligned patients',
    ],
  },
  'Cath Lab Throughput': {
    drivers: [
      'Incremental case volume from improved scheduling efficiency and add-on case capacity',
      'DRG upgrade opportunities through complete documentation of co-morbidities (MCC vs. CC)',
      'Reduction in case cancellations and day-of delays through pre-procedure protocol compliance',
    ],
  },
};

const FinancialBenchmarking: React.FC<FinancialBenchmarkingProps> = ({
  hasUploadedFiles,
  financialSummary,
  drgData,
  marginOpportunities,
}) => {
  const [sortField, setSortField] = useState<SortField>('volume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedOpportunity, setExpandedOpportunity] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedDrgData = useMemo(() => {
    const sorted = [...drgData].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    return sorted;
  }, [drgData, sortField, sortDirection]);

  const SortIndicator: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3 h-3 inline-block ml-0.5" />
    ) : (
      <ChevronDown className="w-3 h-3 inline-block ml-0.5" />
    );
  };

  const getMarginColor = (margin: number): string => {
    if (margin >= 15) return 'text-[#2C4A60]';
    if (margin >= 8) return 'text-[#6B7280]';
    return 'text-arterial-600';
  };

  const columns: { label: string; field: SortField; align: 'left' | 'right' }[] = [
    { label: 'DRG Code', field: 'code', align: 'left' },
    { label: 'Description', field: 'description', align: 'left' },
    { label: 'Volume', field: 'volume', align: 'right' },
    { label: 'Avg LOS', field: 'avgLOS', align: 'right' },
    { label: 'Reimbursement', field: 'reimbursement', align: 'right' },
    { label: 'Margin', field: 'margin', align: 'right' },
  ];

  return (
    <SectionCard
      title="Financial Benchmarking"
      subtitle="Revenue & Margin Analysis"
      headerRight={
        <Badge variant={hasUploadedFiles ? 'verified' : 'estimate'} />
      }
    >
      {/* Sub-section 1: CFO Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {financialSummary.map((item) => {
          const value = hasUploadedFiles ? item.stateBValue : item.stateAValue;
          const isPositive = item.trend.direction === 'up';

          return (
            <div
              key={item.label}
              className="bg-chrome-50 rounded-xl p-4 text-center"
            >
              <div className="font-data text-xl font-bold text-titanium-800">
                {item.unit === 'currency' ? (
                  value >= 1_000_000 ? (
                    <CountUp
                      end={value / 1_000_000}
                      decimals={1}
                      prefix="$"
                      suffix="M"
                      duration={1.5}
                      preserveValue
                    />
                  ) : (
                    <CountUp
                      end={value / 1_000}
                      decimals={0}
                      prefix="$"
                      suffix="K"
                      duration={1.5}
                      preserveValue
                    />
                  )
                ) : (
                  <CountUp
                    end={value}
                    decimals={1}
                    suffix="%"
                    duration={1.5}
                    preserveValue
                  />
                )}
              </div>
              <div className="text-xs font-body text-titanium-500 mt-1">
                {item.label}
              </div>
              <div className="flex items-center justify-center gap-1 mt-1.5">
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 text-[#2C4A60]" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-arterial-600" />
                )}
                <span
                  className={`text-xs font-body font-medium ${
                    isPositive ? 'text-[#2C4A60]' : 'text-arterial-600'
                  }`}
                >
                  {item.trend.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sub-section 1.5: Payer Mix */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-body font-semibold text-titanium-700">Payer Mix</h3>
          <span className="inline-flex items-center gap-1 text-xs text-titanium-400 bg-chrome-50 border border-chrome-200 rounded-full px-2 py-0.5">
            <Lock className="w-3 h-3" />
            Contract performance detail requires Premium
          </span>
        </div>
        <div className="bg-chrome-50 rounded-xl p-4">
          {/* Bar chart */}
          <div className="space-y-2.5">
            {[
              { label: 'Medicare', pct: 48, color: 'bg-chrome-500' },
              { label: 'Medicaid', pct: 22, color: 'bg-[#F0F5FA]' },
              { label: 'Commercial', pct: 24, color: 'bg-[#F0F5FA]' },
              { label: 'Self-Pay / Other', pct: 6, color: 'bg-titanium-300' },
            ].map(({ label, pct, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-28 text-xs text-titanium-600 font-body text-right shrink-0">{label}</div>
                <div className="flex-1 bg-chrome-200 rounded-full h-3">
                  <div className={`${color} h-3 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                </div>
                <div className="w-10 text-xs font-data font-semibold text-titanium-700 text-right">{pct}%</div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-titanium-400 font-body mt-3 text-center">
            CMS estimate · Upgrade to see underpayment analysis, contract variance, and denial rates by payer
          </p>
        </div>
      </div>

      {/* Sub-section 2: DRG Mix Table */}
      <div className="mb-6">
        <h3 className="text-sm font-body font-semibold text-titanium-700 mb-3">
          DRG Volume & Reimbursement
        </h3>
        <div className="w-full rounded-lg overflow-hidden border border-chrome-200">
          <table className="w-full">
            <thead>
              <tr className="bg-chrome-50">
                {columns.map((col) => (
                  <th
                    key={col.field}
                    onClick={() => handleSort(col.field)}
                    className={`text-xs font-body font-semibold uppercase tracking-wider text-titanium-500 px-4 py-3 cursor-pointer select-none hover:text-titanium-700 transition-colors ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.label}
                    <SortIndicator field={col.field} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedDrgData.map((row, index) => (
                <tr
                  key={row.code}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-chrome-50/50'}
                >
                  <td className="text-sm font-data font-semibold text-chrome-700 px-4 py-3">
                    {row.code}
                  </td>
                  <td className="text-sm font-body text-titanium-700 px-4 py-3">
                    {row.description}
                  </td>
                  <td className="text-sm font-data text-right text-titanium-800 px-4 py-3">
                    {formatNumber(row.volume)}
                  </td>
                  <td className="text-sm font-data text-right text-titanium-800 px-4 py-3">
                    {row.avgLOS} days
                  </td>
                  <td className="text-sm font-data text-right text-titanium-800 px-4 py-3">
                    {formatCurrency(row.reimbursement)}
                  </td>
                  <td
                    className={`text-sm font-data text-right px-4 py-3 font-medium ${getMarginColor(
                      row.margin
                    )}`}
                  >
                    {row.margin}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sub-section 3: Margin Opportunity Cards */}
      <div>
        <h3 className="text-sm font-body font-semibold text-titanium-700 mb-3">
          Margin Improvement Opportunities
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {marginOpportunities.map((opp) => {
            const isExpanded = expandedOpportunity === opp.title;
            const detail = MARGIN_DETAILS[opp.title];

            return (
              <div
                key={opp.title}
                className="bg-white rounded-xl border border-chrome-200 p-4 cursor-pointer hover:shadow-md transition-all"
                onClick={() => setExpandedOpportunity(prev => prev === opp.title ? null : opp.title)}
              >
                <div className="text-sm font-body font-semibold text-titanium-800">
                  {opp.title}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-center">
                    <div className="text-xs text-titanium-500">Current</div>
                    <div className="font-data text-lg font-bold text-titanium-700">
                      {opp.currentMargin}%
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-chrome-400" />
                  <div className="text-center">
                    <div className="text-xs text-titanium-500">Target</div>
                    <div className="font-data text-lg font-bold text-[#2C4A60]">
                      {opp.targetMargin}%
                    </div>
                  </div>
                </div>
                <div className="mt-2 bg-[#F0F5FA] rounded-lg px-3 py-1.5 text-center">
                  <span className="text-sm font-data font-semibold text-[#2C4A60]">
                    &uarr; {formatCurrency(opp.potentialUplift)} potential uplift
                  </span>
                </div>

                {/* Expanded detail */}
                {isExpanded && detail && (
                  <div className="border-t border-chrome-100 pt-3 mt-3 text-xs space-y-2">
                    <p className="font-semibold text-titanium-700">Key drivers:</p>
                    <ul className="space-y-1">
                      {detail.drivers.map((driver, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-titanium-500">
                          <span className="text-chrome-400 mt-0.5">•</span>
                          <span>{driver}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="bg-chrome-50 border border-chrome-200 rounded-lg px-3 py-2 flex items-center gap-2 mt-2">
                      <Lock className="w-3.5 h-3.5 text-titanium-400 flex-shrink-0" />
                      <span className="text-titanium-500 flex-1">Connect EHR to verify with your actual cost data</span>
                      <button
                        type="button"
                        className="text-chrome-600 font-semibold text-xs whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Connect →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
};

export default FinancialBenchmarking;
