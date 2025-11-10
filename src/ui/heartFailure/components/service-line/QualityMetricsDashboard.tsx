import React, { useState } from 'react';
import { Target, TrendingUp, Award, AlertTriangle, Users, Calendar, ChevronDown, ChevronRight, Eye, FileText, Activity, Clock } from 'lucide-react';

interface QualityMetric {
  id: string;
  name: string;
  category: 'Core' | 'Supplemental' | 'Composite';
  currentValue: number;
  targetValue: number;
  benchmark: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  unit: '%' | 'days' | 'ratio';
  riskAdjusted: boolean;
  patientCount: number;
  lastUpdated: string;
  description: string;
  opportunities: {
    description: string;
    impact: number;
    difficulty: 'Low' | 'Medium' | 'High';
  }[];
  patientCohorts?: {
    name: string;
    count: number;
    percentage: number;
    riskLevel: 'high' | 'medium' | 'low';
  }[];
  trendData?: {
    period: string;
    value: number;
    change: number;
  }[];
}

const QualityMetricsDashboard: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<QualityMetric['category']>('Core');
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [showDetailedView, setShowDetailedView] = useState<string | null>(null);

  // Mock quality metrics data - will be replaced with real API data
  const qualityMetrics: QualityMetric[] = [
    {
      id: 'gdmt-4pillar',
      name: 'GDMT 4-Pillar Optimization',
      category: 'Core',
      currentValue: 68.4,
      targetValue: 85.0,
      benchmark: 72.1,
      trend: 'up',
      trendValue: 5.2,
      unit: '%',
      riskAdjusted: true,
      patientCount: 2494,
      lastUpdated: '2024-01-15',
      description: 'Percentage of eligible HFrEF patients on optimal GDMT across all 4 pillars',
      opportunities: [
        { description: 'SGLT2i initiation in eligible patients', impact: 23, difficulty: 'Low' },
        { description: 'MRA optimization in stable patients', impact: 18, difficulty: 'Medium' },
        { description: 'ARNi transition from ACEi/ARB', impact: 15, difficulty: 'Medium' },
      ],
      patientCohorts: [
        { name: 'HFrEF patients on optimal ARNi', count: 1042, percentage: 41.8, riskLevel: 'low' },
        { name: 'HFrEF patients missing SGLT2i', count: 734, percentage: 29.4, riskLevel: 'high' },
        { name: 'Suboptimal beta-blocker dosing', count: 468, percentage: 18.8, riskLevel: 'medium' },
        { name: 'MRA contraindicated/intolerant', count: 250, percentage: 10.0, riskLevel: 'medium' },
      ],
      trendData: [
        { period: 'Q1 2024', value: 58.2, change: -2.1 },
        { period: 'Q2 2024', value: 61.4, change: 3.2 },
        { period: 'Q3 2024', value: 65.1, change: 3.7 },
        { period: 'Q4 2024', value: 68.4, change: 3.3 },
      ],
    },
    {
      id: 'readmission-30day',
      name: '30-Day Readmission Rate',
      category: 'Core',
      currentValue: 18.7,
      targetValue: 15.0,
      benchmark: 16.2,
      trend: 'down',
      trendValue: -2.3,
      unit: '%',
      riskAdjusted: true,
      patientCount: 1784,
      lastUpdated: '2024-01-15',
      description: 'Risk-adjusted 30-day all-cause readmission rate for HF patients',
      opportunities: [
        { description: 'Enhanced discharge planning', impact: 12, difficulty: 'Medium' },
        { description: 'Post-discharge follow-up within 7 days', impact: 8, difficulty: 'Low' },
        { description: 'Medication reconciliation improvements', impact: 6, difficulty: 'Low' },
      ],
    },
    {
      id: 'mortality-1year',
      name: '1-Year Mortality Rate',
      category: 'Core',
      currentValue: 12.4,
      targetValue: 10.0,
      benchmark: 11.8,
      trend: 'stable',
      trendValue: 0.1,
      unit: '%',
      riskAdjusted: true,
      patientCount: 4268,
      lastUpdated: '2024-01-15',
      description: 'Risk-adjusted 1-year mortality rate for HF patients',
      opportunities: [
        { description: 'Advanced HF therapy evaluation', impact: 15, difficulty: 'High' },
        { description: 'Device therapy optimization', impact: 10, difficulty: 'Medium' },
        { description: 'Palliative care integration', impact: 8, difficulty: 'Medium' },
      ],
    },
    {
      id: 'lvef-improvement',
      name: 'LVEF Improvement ≥5%',
      category: 'Supplemental',
      currentValue: 42.8,
      targetValue: 50.0,
      benchmark: 38.9,
      trend: 'up',
      trendValue: 3.4,
      unit: '%',
      riskAdjusted: false,
      patientCount: 1752,
      lastUpdated: '2024-01-15',
      description: 'Percentage of patients achieving ≥5% LVEF improvement at 6 months',
      opportunities: [
        { description: 'Optimal GDMT titration protocols', impact: 18, difficulty: 'Medium' },
        { description: 'CardioMEMS guided therapy', impact: 12, difficulty: 'High' },
        { description: 'Exercise prescription programs', impact: 8, difficulty: 'Low' },
      ],
    },
    {
      id: 'qol-improvement',
      name: 'Quality of Life Score',
      category: 'Supplemental',
      currentValue: 67.3,
      targetValue: 75.0,
      benchmark: 64.1,
      trend: 'up',
      trendValue: 4.1,
      unit: '%',
      riskAdjusted: false,
      patientCount: 1486,
      lastUpdated: '2024-01-15',
      description: 'Kansas City Cardiomyopathy Questionnaire (KCCQ) improvement',
      opportunities: [
        { description: 'Shared decision making tools', impact: 15, difficulty: 'Low' },
        { description: 'Patient education programs', impact: 12, difficulty: 'Low' },
        { description: 'Depression screening and treatment', impact: 10, difficulty: 'Medium' },
      ],
    },
    {
      id: 'cost-per-patient',
      name: 'Cost Per Patient Year',
      category: 'Supplemental',
      currentValue: 47800,
      targetValue: 42000,
      benchmark: 51200,
      trend: 'down',
      trendValue: -8.7,
      unit: 'ratio',
      riskAdjusted: true,
      patientCount: 2912,
      lastUpdated: '2024-01-15',
      description: 'Risk-adjusted total cost of care per patient per year',
      opportunities: [
        { description: 'Reduce emergency department visits', impact: 2400, difficulty: 'Medium' },
        { description: 'Optimize medication costs', impact: 1800, difficulty: 'Low' },
        { description: 'Prevent avoidable hospitalizations', impact: 3200, difficulty: 'High' },
      ],
    },
    {
      id: 'composite-score',
      name: 'HF Care Composite Score',
      category: 'Composite',
      currentValue: 78.2,
      targetValue: 85.0,
      benchmark: 74.6,
      trend: 'up',
      trendValue: 6.8,
      unit: '%',
      riskAdjusted: true,
      patientCount: 4912,
      lastUpdated: '2024-01-15',
      description: 'Weighted composite of all core and supplemental quality metrics',
      opportunities: [
        { description: 'Focus on GDMT optimization', impact: 25, difficulty: 'Medium' },
        { description: 'Enhanced care coordination', impact: 18, difficulty: 'Medium' },
        { description: 'Technology-enabled monitoring', impact: 15, difficulty: 'High' },
      ],
    },
  ];

  const filteredMetrics = qualityMetrics.filter(metric => metric.category === selectedCategory);
  const selectedMetricData = qualityMetrics.find(m => m.id === selectedMetric);

  const getPerformanceColor = (current: number, target: number, unit: string) => {
    let performance;
    if (unit === '%' && current <= target) {
      performance = (current / target) * 100;
    } else if (unit === '%' && current > target) {
      performance = (target / current) * 100;
    } else if (unit === 'ratio') {
      performance = (target / current) * 100;
    } else {
      performance = (current / target) * 100;
    }

    if (performance >= 90) return 'text-medical-green-600 bg-medical-green-50';
    if (performance >= 75) return 'text-medical-amber-600 bg-medical-amber-50';
    return 'text-medical-red-600 bg-medical-red-50';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-medical-green-600" />;
      case 'down':
        return <TrendingUp className="w-4 h-4 text-medical-red-600 transform rotate-180" />;
      default:
        return <div className="w-4 h-4 bg-steel-400 rounded-full"></div>;
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit === 'days') return `${value.toFixed(0)} days`;
    if (unit === 'ratio') return `$${value.toLocaleString()}`;
    return value.toString();
  };

  const getCategoryColor = (category: QualityMetric['category']) => {
    const colors = {
      'Core': 'medical-red',
      'Supplemental': 'medical-blue',
      'Composite': 'medical-green',
    };
    return colors[category];
  };

  return (
    <div className="retina-card p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-steel-900 mb-2 font-sf">
            Quality Metrics Dashboard
          </h2>
          <p className="text-steel-600">
            Heart failure care quality indicators and improvement opportunities
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-steel-600 mb-1">Overall Performance</div>
          <div className="text-3xl font-bold text-steel-900 font-sf">
            {(filteredMetrics.reduce((sum, m) => sum + ((m.currentValue / m.targetValue) * 100), 0) / filteredMetrics.length).toFixed(0)}%
          </div>
          <div className="text-sm text-steel-600">
            Vs target goals
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6">
        {['Core', 'Supplemental', 'Composite'].map((category) => {
          const colorClass = getCategoryColor(category as QualityMetric['category']);
          const categoryMetrics = qualityMetrics.filter(m => m.category === category);
          return (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category as QualityMetric['category']);
                setSelectedMetric(null);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                selectedCategory === category
                  ? `border-${colorClass}-400 bg-${colorClass}-50 shadow-retina-3`
                  : 'border-steel-200 hover:border-steel-300 bg-white'
              }`}
            >
              <Target className={`w-5 h-5 text-${colorClass}-600`} />
              <span className="font-semibold text-steel-900">{category}</span>
              <div className="text-sm text-steel-600">
                {categoryMetrics.length} metrics
              </div>
            </button>
          );
        })}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {filteredMetrics.map((metric) => (
          <button
            key={metric.id}
            onClick={() => setSelectedMetric(selectedMetric === metric.id ? null : metric.id)}
            className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
              selectedMetric === metric.id
                ? `border-${getCategoryColor(metric.category)}-400 shadow-retina-3 bg-${getCategoryColor(metric.category)}-50/30`
                : 'border-steel-200 hover:border-steel-300 hover:shadow-retina-2'
            }`}
          >
            {/* Metric Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-steel-900">{metric.name}</span>
                  {metric.riskAdjusted && (
                    <span className="px-2 py-1 text-xs bg-steel-100 text-steel-700 rounded-full">
                      Risk-Adj
                    </span>
                  )}
                </div>
                <div className="text-xs text-steel-600">{metric.description}</div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {getTrendIcon(metric.trend)}
                <span className={`text-sm font-semibold ${
                  metric.trend === 'up' ? 'text-medical-green-600' :
                  metric.trend === 'down' ? 'text-medical-red-600' : 'text-steel-600'
                }`}>
                  {metric.trend !== 'stable' && (metric.trendValue > 0 ? '+' : '')}{metric.trendValue}%
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetailedView(showDetailedView === metric.id ? null : metric.id);
                  }}
                  className="ml-2 p-1 rounded-lg hover:bg-steel-100 transition-colors"
                  title="View detailed breakdown"
                >
                  {showDetailedView === metric.id ? (
                    <ChevronDown className="w-4 h-4 text-steel-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-steel-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Current vs Target */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className={`text-center p-2 rounded-lg ${getPerformanceColor(metric.currentValue, metric.targetValue, metric.unit)}`}>
                <div className="text-2xl font-bold">
                  {formatValue(metric.currentValue, metric.unit)}
                </div>
                <div className="text-xs">Current</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-steel-50">
                <div className="text-2xl font-bold text-steel-900">
                  {formatValue(metric.targetValue, metric.unit)}
                </div>
                <div className="text-xs text-steel-600">Target</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-steel-50">
                <div className="text-2xl font-bold text-steel-900">
                  {formatValue(metric.benchmark, metric.unit)}
                </div>
                <div className="text-xs text-steel-600">Benchmark</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-steel-100 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full ${
                  (metric.currentValue / metric.targetValue) >= 0.9 ? 'bg-medical-green-500' :
                  (metric.currentValue / metric.targetValue) >= 0.75 ? 'bg-medical-amber-500' :
                  'bg-medical-red-500'
                }`}
                style={{ 
                  width: `${Math.min((metric.currentValue / metric.targetValue) * 100, 100)}%` 
                }}
              ></div>
            </div>

            {/* Detailed Breakdown - Expandable */}
            {showDetailedView === metric.id && metric.patientCohorts && (
              <div className="mt-4 p-4 bg-steel-50 rounded-lg border border-steel-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Patient Cohorts */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-medical-blue-600" />
                      <h4 className="font-semibold text-steel-900">Patient Cohorts</h4>
                    </div>
                    <div className="space-y-2">
                      {metric.patientCohorts.map((cohort, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              cohort.riskLevel === 'high' ? 'bg-medical-red-500' :
                              cohort.riskLevel === 'medium' ? 'bg-medical-amber-500' :
                              'bg-medical-green-500'
                            }`}></div>
                            <span className="text-sm text-steel-800">{cohort.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-steel-900">{cohort.count}</div>
                            <div className="text-xs text-steel-600">{cohort.percentage}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Trend Data */}
                  {metric.trendData && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-4 h-4 text-medical-green-600" />
                        <h4 className="font-semibold text-steel-900">Quarterly Trends</h4>
                      </div>
                      <div className="space-y-2">
                        {metric.trendData.map((trend, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                            <span className="text-sm text-steel-800">{trend.period}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-steel-900">
                                {formatValue(trend.value, metric.unit)}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                trend.change > 0 ? 'bg-medical-green-100 text-medical-green-700' :
                                trend.change < 0 ? 'bg-medical-red-100 text-medical-red-700' :
                                'bg-steel-100 text-steel-600'
                              }`}>
                                {trend.change > 0 ? '+' : ''}{trend.change}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 pt-3 border-t border-steel-200">
                  <button 
                    onClick={() => {
                      console.log('Viewing patient list for metric:', metric.name, 'Patient count:', metric.patientCount);
                      alert('View Patient List\n\nThis would display a detailed patient list for the ' + metric.name + ' metric.\n\n• ' + metric.patientCount.toLocaleString() + ' patients included\n• Filterable by performance status\n• Sortable by risk factors\n• Clickable for individual charts\n• Exportable patient cohorts\n\nTODO: Implement patient list view with advanced filtering and drill-down capabilities');
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-medical-blue-600 text-white text-xs rounded-lg hover:bg-medical-blue-700 transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    View Patient List
                  </button>
                  <button 
                    onClick={() => {
                      console.log('Exporting report for metric:', metric.name, 'Category:', metric.category);
                      alert('Export Quality Report\n\nThis would generate a comprehensive report for the ' + metric.name + ' metric.\n\n• Performance trend analysis\n• Benchmark comparisons\n• Patient cohort breakdowns\n• Improvement opportunities\n• Actionable recommendations\n• Executive summary\n\nTODO: Implement report generation with PDF/Excel export options');
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-steel-600 text-white text-xs rounded-lg hover:bg-steel-700 transition-colors"
                  >
                    <FileText className="w-3 h-3" />
                    Export Report
                  </button>
                  <button 
                    onClick={() => {
                      console.log('Setting alert for metric:', metric.name, 'Current value:', metric.currentValue, 'Target:', metric.targetValue);
                      alert('Set Quality Alert\n\nThis would configure monitoring alerts for the ' + metric.name + ' metric.\n\n• Performance threshold alerts\n• Trend deviation notifications\n• Target achievement milestones\n• Care team notifications\n• Automated reporting triggers\n\nTODO: Implement alert configuration system with customizable thresholds and notification preferences');
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-medical-green-600 text-white text-xs rounded-lg hover:bg-medical-green-700 transition-colors"
                  >
                    <Clock className="w-3 h-3" />
                    Set Alert
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-steel-600">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{metric.patientCount.toLocaleString()} patients</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Updated {metric.lastUpdated}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Metric Detailed View */}
      {selectedMetricData && (
        <div className={`p-6 rounded-xl border-2 border-${getCategoryColor(selectedMetricData.category)}-200 bg-${getCategoryColor(selectedMetricData.category)}-50/50`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-steel-900 font-sf">
                {selectedMetricData.name}
              </h3>
              <p className="text-steel-600">{selectedMetricData.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Award className={`w-5 h-5 text-${getCategoryColor(selectedMetricData.category)}-600`} />
              <span className={`text-lg font-bold text-${getCategoryColor(selectedMetricData.category)}-600`}>
                {selectedMetricData.category} Metric
              </span>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-medical-amber-600" />
              <h4 className="font-semibold text-steel-900">Improvement Opportunities</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {selectedMetricData.opportunities.map((opportunity, index) => (
                <div key={index} className="p-3 bg-white rounded-lg border border-steel-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      opportunity.difficulty === 'Low' ? 'bg-medical-green-100 text-medical-green-700' :
                      opportunity.difficulty === 'Medium' ? 'bg-medical-amber-100 text-medical-amber-700' :
                      'bg-medical-red-100 text-medical-red-700'
                    }`}>
                      {opportunity.difficulty}
                    </span>
                    <span className="text-sm font-bold text-medical-blue-600">
                      +{opportunity.impact}{selectedMetricData.unit === 'ratio' ? '' : '%'}
                    </span>
                  </div>
                  <div className="text-sm text-steel-800">{opportunity.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-steel-200">
        <div>
          <div className="text-sm text-steel-600 mb-1">Top Performer</div>
          <div className="text-lg font-bold text-medical-green-600">
            {filteredMetrics.sort((a, b) => (b.currentValue / b.targetValue) - (a.currentValue / a.targetValue))[0]?.name.split(' ')[0]}
          </div>
          <div className="text-sm text-steel-600">
            {formatValue(filteredMetrics.sort((a, b) => (b.currentValue / b.targetValue) - (a.currentValue / a.targetValue))[0]?.currentValue || 0, 
                       filteredMetrics.sort((a, b) => (b.currentValue / b.targetValue) - (a.currentValue / a.targetValue))[0]?.unit || '%')}
          </div>
        </div>

        <div>
          <div className="text-sm text-steel-600 mb-1">Needs Attention</div>
          <div className="text-lg font-bold text-medical-red-600">
            {filteredMetrics.sort((a, b) => (a.currentValue / a.targetValue) - (b.currentValue / b.targetValue))[0]?.name.split(' ')[0]}
          </div>
          <div className="text-sm text-steel-600">
            {((filteredMetrics.sort((a, b) => (a.currentValue / a.targetValue) - (b.currentValue / b.targetValue))[0]?.currentValue || 0) / 
              (filteredMetrics.sort((a, b) => (a.currentValue / a.targetValue) - (b.currentValue / b.targetValue))[0]?.targetValue || 1) * 100).toFixed(0)}% to target
          </div>
        </div>

        <div>
          <div className="text-sm text-steel-600 mb-1">Trending Up</div>
          <div className="text-lg font-bold text-medical-green-600">
            {filteredMetrics.filter(m => m.trend === 'up').length}
          </div>
          <div className="text-sm text-steel-600">
            of {filteredMetrics.length} metrics
          </div>
        </div>

        <div>
          <div className="text-sm text-steel-600 mb-1">Total Patients</div>
          <div className="text-lg font-bold text-medical-blue-600">
            {Math.max(...filteredMetrics.map(m => m.patientCount)).toLocaleString()}
          </div>
          <div className="text-sm text-steel-600">
            Largest cohort
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualityMetricsDashboard;