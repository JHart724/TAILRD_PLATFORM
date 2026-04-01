import React from 'react';
import { DollarSign, Users, TrendingUp, Target, Activity } from 'lucide-react';
import KPICard from './KPICard';
import DRGOptimizationAlert, { DRGOpportunity } from './DRGOptimizationAlert';

export interface ProSummaryCard {
  title: string;
  metrics: Array<{ label: string; value: string; isPositive?: boolean }>;
}

export interface ExecutiveViewConfig {
  moduleName: string;
  description: string;
  kpiData: {
    totalOpportunity: string;
    totalOpportunitySub: string;
    totalPatients: string;
    totalPatientsSub: string;
    gdmtOptimization: string;
    gdmtOptimizationSub: string;
    avgRoi: string;
    avgRoiSub: string;
  };
  drgTitle: string;
  drgDescription: string;
  drgOpportunities: DRGOpportunity[];
  drgMetrics: {
    currentCMI: string;
    monthlyOpportunity: string;
    documentationRate: string;
    avgLOS: string;
    losBenchmark: string;
  };
  drgPerformanceCards: Array<{
    title: string;
    value: string;
    caseCount: string;
    variance: string;
    isPositive: boolean;
  }>;
  proSummary?: ProSummaryCard;
}

interface BaseExecutiveViewProps {
  config: ExecutiveViewConfig;
}

const BaseExecutiveView: React.FC<BaseExecutiveViewProps> = ({ config }) => {
  const {
    kpiData,
    drgTitle,
    drgDescription,
    drgOpportunities,
    drgMetrics,
    drgPerformanceCards,
    proSummary,
  } = config;

  return (
    <div
      className="min-h-screen p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #EAEFF4 0%, #F2F5F8 50%, #ECF0F4 100%)' }}
    >
      <div className="max-w-[1800px] mx-auto space-y-6 relative z-10">

        {/* KPI Overview */}
        <div className="grid grid-cols-4 gap-6 relative z-10">
          {/* Patient Population → Chrome Blue */}
          <KPICard
            label="Patient Population"
            value={kpiData.totalPatients}
            subvalue={kpiData.totalPatientsSub}
            icon={Users}
            trend={{ direction: 'up', value: '+10%', label: 'vs last quarter' }}
            accentColor="#2C4A60"
            accentBg="#EFF4F8"
            accentBorder="#B8C9D9"
          />
          {/* Revenue Opportunity → Metallic Gold */}
          <KPICard
            label="Total Revenue Opportunity"
            value={kpiData.totalOpportunity}
            subvalue={kpiData.totalOpportunitySub}
            status="optimal"
            icon={DollarSign}
            trend={{ direction: 'up', value: '+15%', label: 'vs last quarter' }}
            accentColor="#8B6914"
            accentBg="#FAF6E8"
            accentBorder="#D4B85C"
          />
          {/* Clinical Quality → Racing Green */}
          <KPICard
            label="Clinical Quality Optimization"
            value={kpiData.gdmtOptimization}
            subvalue={kpiData.gdmtOptimizationSub}
            status="optimal"
            icon={Target}
            trend={{ direction: 'up', value: '+12%', label: 'vs last quarter' }}
            accentColor="#2D6147"
            accentBg="#EEF6F2"
            accentBorder="#A8D0BC"
          />
          {/* Revenue per Patient → Copper Bronze */}
          <KPICard
            label="Revenue per Patient"
            value={kpiData.avgRoi}
            subvalue={kpiData.avgRoiSub}
            status="optimal"
            icon={TrendingUp}
            trend={{ direction: 'up', value: '+18%', label: 'vs last quarter' }}
            accentColor="#8B5A2B"
            accentBg="#FAF3EC"
            accentBorder="#DDBA98"
          />
        </div>

        {/* Immediate Revenue Opportunities */}
        <DRGOptimizationAlert
          opportunities={drgOpportunities}
          title="Immediate Revenue Opportunities"
          maxVisible={3}
          showPatientInfo={true}
        />

        {/* DRG Financial Performance */}
        <div className="metal-card relative z-10">
          <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
            <h3 className="text-lg font-semibold text-titanium-900 mb-2">{drgTitle}</h3>
            <p className="text-sm text-titanium-600">{drgDescription}</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {drgPerformanceCards.map((card, index) => {
                // DRG 0 (MCC, highest) → Metallic Gold; DRG 1 (CC, mid) → Chrome Blue mid; DRG 2 (lowest) → Carmona Red
                const drgColors = [
                  { value: '#C4982A', bg: '#FAF6E8', border: '#D4B85C' },
                  { value: '#4A6880', bg: '#F0F5FA', border: '#C8D4DC' },
                  { value: '#9B2438', bg: '#FDF2F3', border: '#F5C0C8' },
                ];
                const dc = drgColors[index] || drgColors[0];
                return (
                  <div
                    key={card.title}
                    className="rounded-xl p-4 border shadow-lg hover:shadow-xl transition-all duration-300"
                    style={{ background: `linear-gradient(to right, white, ${dc.bg})`, borderColor: dc.border }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <DollarSign className="w-8 h-8" style={{ color: dc.value }} />
                      <div>
                        <div className="font-semibold text-[#1e293b]">{card.title}</div>
                        <div className="text-2xl font-bold" style={{ color: dc.value }}>{card.value}</div>
                      </div>
                    </div>
                    <div className="text-sm text-[#4A6880] mb-2">{card.caseCount}</div>
                    <div className="text-sm" style={{ color: card.isPositive ? '#2C4A60' : '#9B2438' }}>{card.variance}</div>
                  </div>
                );
              })}
            </div>

            {/* Case Mix Index */}
            <div className="bg-white rounded-xl p-4 border border-titanium-200 shadow-lg">
              <h4 className="font-semibold text-titanium-900 mb-4">Case Mix Index (CMI) Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  {/* Current CMI → Chrome Blue */}
                  <div className="text-2xl font-bold" style={{ color: '#2C4A60' }}>{drgMetrics.currentCMI}</div>
                  <div className="text-sm text-titanium-600">Current CMI</div>
                  <div className="text-xs text-[#2C4A60]">+0.28 vs target</div>
                </div>
                <div className="text-center">
                  {/* Monthly Opportunity → Metallic Gold */}
                  <div className="text-2xl font-bold" style={{ color: '#8B6914' }}>{drgMetrics.monthlyOpportunity}</div>
                  <div className="text-sm text-titanium-600">Monthly Opportunity</div>
                  <div className="text-xs text-titanium-500">From DRG optimization</div>
                </div>
                <div className="text-center">
                  {/* Documentation Rate → Racing Green */}
                  <div className="text-2xl font-bold" style={{ color: '#2D6147' }}>{drgMetrics.documentationRate}</div>
                  <div className="text-sm text-titanium-600">Documentation Rate</div>
                  <div className="text-xs text-titanium-500">CC/MCC capture</div>
                </div>
                <div className="text-center">
                  {/* Avg LOS → Steel Teal */}
                  <div className="text-2xl font-bold" style={{ color: '#1A6878' }}>{drgMetrics.avgLOS}</div>
                  <div className="text-sm text-titanium-600">Avg LOS</div>
                  <div className="text-xs text-[#2C4A60]">{drgMetrics.losBenchmark}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PRO Summary Card (optional) */}
        {proSummary && (
          <div className="metal-card relative z-10">
            <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
              <h3 className="text-lg font-semibold text-titanium-900 mb-1 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#2C4A60]" />
                {proSummary.title}
              </h3>
              <p className="text-sm text-titanium-600">
                Patient-reported outcomes - population-level quality indicators
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {proSummary.metrics.map((metric) => {
                  const valueColor =
                    metric.isPositive === false
                      ? 'text-xl font-bold mb-1 text-medical-red-700'
                      : 'text-xl font-bold mb-1 text-[#2C4A60]';
                  return (
                    <div
                      key={metric.label}
                      className="bg-white/80 rounded-xl p-4 border border-titanium-200 shadow-md text-center"
                    >
                      <div className={valueColor}>{metric.value}</div>
                      <div className="text-xs text-titanium-600">{metric.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default BaseExecutiveView;
