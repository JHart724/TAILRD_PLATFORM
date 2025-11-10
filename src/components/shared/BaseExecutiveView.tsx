import React from 'react';
import { DollarSign, Users, TrendingUp, Target } from 'lucide-react';
import KPICard from './KPICard';
import DRGOptimizationAlert, { DRGOpportunity } from './DRGOptimizationAlert';

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
}

interface BaseExecutiveViewProps {
  config: ExecutiveViewConfig;
}

const BaseExecutiveView: React.FC<BaseExecutiveViewProps> = ({ config }) => {
  const {
    moduleName,
    description,
    kpiData,
    drgTitle,
    drgDescription,
    drgOpportunities,
    drgMetrics,
    drgPerformanceCards
  } = config;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/20 p-6 relative overflow-hidden">
      {/* Web 3.0 Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-400/10 to-cyan-400/10 rounded-full blur-2xl animate-float" />
      
      <div className="max-w-[1800px] mx-auto space-y-6 relative z-10">
        {/* Strategic KPI Overview - Big Picture First */}
        <div className="grid grid-cols-4 gap-6 relative z-10">
          <KPICard
            label="Patient Population"
            value={kpiData.totalPatients}
            subvalue={kpiData.totalPatientsSub}
            icon={Users}
            trend={{
              direction: 'up',
              value: '+10%',
              label: 'vs last quarter',
            }}
          />
          
          <KPICard
            label="Total Revenue Opportunity"
            value={kpiData.totalOpportunity}
            subvalue={kpiData.totalOpportunitySub}
            status="optimal"
            icon={DollarSign}
            trend={{
              direction: 'up',
              value: '+15%',
              label: 'vs last quarter',
            }}
          />
          
          <KPICard
            label="Clinical Quality Optimization"
            value={kpiData.gdmtOptimization}
            subvalue={kpiData.gdmtOptimizationSub}
            status="optimal"
            icon={Target}
            trend={{
              direction: 'up',
              value: '+12%',
              label: 'vs last quarter',
            }}
          />
          
          <KPICard
            label="Revenue per Patient"
            value={kpiData.avgRoi}
            subvalue={kpiData.avgRoiSub}
            status="optimal"
            icon={TrendingUp}
            trend={{
              direction: 'up',
              value: '+18%',
              label: 'vs last quarter',
            }}
          />
        </div>

        {/* Immediate Revenue Opportunities - Highest Priority */}
        <DRGOptimizationAlert 
          opportunities={drgOpportunities}
          title={`${moduleName} Immediate Revenue Opportunities`}
          maxVisible={3}
          showPatientInfo={true}
        />

        {/* DRG Financial Performance Analytics - Supporting Context */}
        <div className="retina-card card-web3-hover relative z-10">
          <div className="px-6 py-4 border-b border-white/30 bg-gradient-to-r from-white/60 to-blue-50/40 backdrop-blur-md">
            <h3 className="text-lg font-semibold text-steel-900 mb-2">{drgTitle}</h3>
            <p className="text-sm text-steel-600">{drgDescription}</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {drgPerformanceCards.map((card, index) => (
                <div key={index} className="bg-gradient-to-r from-white/60 to-emerald-50/60 backdrop-blur-md rounded-xl p-4 border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <DollarSign className="w-8 h-8 text-medical-green-600" />
                    <div>
                      <div className="font-semibold text-medical-green-900">{card.title}</div>
                      <div className="text-2xl font-bold text-medical-green-800">{card.value}</div>
                    </div>
                  </div>
                  <div className="text-sm text-medical-green-700 mb-2">
                    {card.caseCount}
                  </div>
                  <div className={`text-sm ${card.isPositive ? 'text-medical-green-600' : 'text-medical-red-600'}`}>
                    {card.variance}
                  </div>
                </div>
              ))}
            </div>

            {/* Case Mix Index Performance */}
            <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/40 shadow-lg">
              <h4 className="font-semibold text-steel-900 mb-4">{moduleName} Case Mix Index (CMI) Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-steel-900">{drgMetrics.currentCMI}</div>
                  <div className="text-sm text-steel-600">Current CMI</div>
                  <div className="text-xs text-medical-green-600">+0.28 vs target</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-medical-green-700">{drgMetrics.monthlyOpportunity}</div>
                  <div className="text-sm text-steel-600">Monthly Opportunity</div>
                  <div className="text-xs text-steel-500">From DRG optimization</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-medical-amber-700">{drgMetrics.documentationRate}</div>
                  <div className="text-sm text-steel-600">Documentation Rate</div>
                  <div className="text-xs text-steel-500">CC/MCC capture</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-steel-900">{drgMetrics.avgLOS}</div>
                  <div className="text-sm text-steel-600">Avg LOS</div>
                  <div className="text-xs text-medical-green-600">{drgMetrics.losBenchmark}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseExecutiveView;