import React, { useState } from 'react';
import { AlertTriangle, Target, TrendingUp, Clock, CheckCircle, Users, Calendar, ArrowRight } from 'lucide-react';

interface CareGap {
  id: string;
  category: 'GDMT' | 'Device' | 'Screening' | 'Follow-up' | 'Lab' | 'Lifestyle';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  urgency: 'urgent' | 'soon' | 'routine';
  affectedPatients: number;
  potentialOutcome: string;
  actionRequired: string;
  estimatedTimeToClose: string;
  assignedTo?: string;
  dueDate: string;
  evidenceLevel: 'Class I' | 'Class IIa' | 'Class IIb' | 'Class III';
  costSavings?: number;
  qualityMeasure?: string;
  barriers: string[];
  recommendations: {
    action: string;
    timeline: string;
    responsibility: string;
  }[];
}

interface CareGapSummary {
  totalGaps: number;
  highImpact: number;
  urgent: number;
  avgClosureTime: number;
  totalPotentialSavings: number;
  complianceRate: number;
}

const CareGapAnalyzer: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGap, setSelectedGap] = useState<CareGap | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'priority'>('grid');

  const careGaps: CareGap[] = [
    {
      id: 'GAP001',
      category: 'GDMT',
      title: 'SGLT2i Underutilization',
      description: '23 patients with HFrEF not on SGLT2i therapy despite eligibility',
      impact: 'high',
      urgency: 'urgent',
      affectedPatients: 23,
      potentialOutcome: '15% reduction in CV death and HF hospitalization',
      actionRequired: 'Review contraindications, initiate therapy, patient education',
      estimatedTimeToClose: '4-6 weeks',
      assignedTo: 'Dr. Chen',
      dueDate: '2025-11-01',
      evidenceLevel: 'Class I',
      costSavings: 2800000,
      qualityMeasure: 'GDMT 4-Pillar Optimization',
      barriers: ['Concern for genital infections', 'Cost concerns', 'Provider knowledge gaps'],
      recommendations: [
        {
          action: 'Provider education on SGLT2i benefits in HF',
          timeline: '1 week',
          responsibility: 'Clinical Pharmacist',
        },
        {
          action: 'Patient counseling and shared decision making',
          timeline: '2-3 weeks',
          responsibility: 'Care Team',
        },
        {
          action: 'Systematic review of eligible patients',
          timeline: '4 weeks',
          responsibility: 'NP/PA',
        },
      ],
    },
    {
      id: 'GAP002',
      category: 'Device',
      title: 'Delayed CRT Evaluations',
      description: '8 patients meeting CRT criteria without device evaluation',
      impact: 'high',
      urgency: 'urgent',
      affectedPatients: 8,
      potentialOutcome: 'Improved survival, functional status, reduced hospitalizations',
      actionRequired: 'EP consultation, echo review, patient counseling',
      estimatedTimeToClose: '6-8 weeks',
      assignedTo: 'Dr. Rivera',
      dueDate: '2025-10-30',
      evidenceLevel: 'Class I',
      costSavings: 1200000,
      qualityMeasure: 'Appropriate Device Therapy',
      barriers: ['Patient reluctance', 'Insurance authorization', 'EP availability'],
      recommendations: [
        {
          action: 'Fast-track EP referrals for qualified patients',
          timeline: '1 week',
          responsibility: 'Attending Physician',
        },
        {
          action: 'Insurance pre-authorization initiation',
          timeline: '2 weeks',
          responsibility: 'Care Coordinator',
        },
        {
          action: 'Patient education on device benefits',
          timeline: 'Ongoing',
          responsibility: 'Device Nurse',
        },
      ],
    },
    {
      id: 'GAP003',
      category: 'Screening',
      title: 'Cardiac Amyloidosis Screening',
      description: '15 patients with amyloid red flags not screened',
      impact: 'medium',
      urgency: 'soon',
      affectedPatients: 15,
      potentialOutcome: 'Early detection and targeted therapy initiation',
      actionRequired: 'Technetium pyrophosphate scan, TTR genetic testing',
      estimatedTimeToClose: '8-12 weeks',
      assignedTo: 'Dr. Martinez',
      dueDate: '2025-11-15',
      evidenceLevel: 'Class IIa',
      costSavings: 950000,
      qualityMeasure: 'Phenotype Detection Rate',
      barriers: ['Limited scanner availability', 'Cost of testing', 'Subspecialty referral delays'],
      recommendations: [
        {
          action: 'Implement amyloid risk scoring in EHR',
          timeline: '2 weeks',
          responsibility: 'Clinical Informatics',
        },
        {
          action: 'Establish dedicated amyloid clinic pathway',
          timeline: '4 weeks',
          responsibility: 'Advanced HF Team',
        },
        {
          action: 'Provider education on red flag recognition',
          timeline: '3 weeks',
          responsibility: 'Medical Education',
        },
      ],
    },
    {
      id: 'GAP004',
      category: 'Follow-up',
      title: 'Post-Discharge Follow-up Gaps',
      description: '12 patients without 7-day post-discharge contact',
      impact: 'high',
      urgency: 'urgent',
      affectedPatients: 12,
      potentialOutcome: 'Reduced 30-day readmission rate',
      actionRequired: 'Systematic follow-up calls, medication reconciliation',
      estimatedTimeToClose: '2-3 weeks',
      assignedTo: 'Sarah Johnson, NP',
      dueDate: '2025-10-25',
      evidenceLevel: 'Class I',
      qualityMeasure: 'HF Readmission Rate',
      barriers: ['Staffing limitations', 'Patient contact issues', 'Workflow gaps'],
      recommendations: [
        {
          action: 'Automated discharge follow-up system',
          timeline: '1 week',
          responsibility: 'Care Management',
        },
        {
          action: 'Phone tree for patient contact',
          timeline: '3 days',
          responsibility: 'Nursing Staff',
        },
        {
          action: 'Medication adherence assessment',
          timeline: 'Within 7 days',
          responsibility: 'Clinical Pharmacist',
        },
      ],
    },
    {
      id: 'GAP005',
      category: 'Lab',
      title: 'BNP Monitoring Compliance',
      description: '28 patients overdue for BNP trending',
      impact: 'medium',
      urgency: 'soon',
      affectedPatients: 28,
      potentialOutcome: 'Improved therapy optimization and early decompensation detection',
      actionRequired: 'Laboratory orders, result review, therapy adjustment',
      estimatedTimeToClose: '3-4 weeks',
      assignedTo: 'Care Team',
      dueDate: '2025-11-08',
      evidenceLevel: 'Class IIa',
      qualityMeasure: 'Biomarker Monitoring',
      barriers: ['Patient compliance', 'Laboratory scheduling', 'Result follow-up'],
      recommendations: [
        {
          action: 'Automated lab reminders in EHR',
          timeline: '2 weeks',
          responsibility: 'Clinical Informatics',
        },
        {
          action: 'Patient portal lab result notifications',
          timeline: '1 week',
          responsibility: 'IT Support',
        },
        {
          action: 'Nurse navigator lab coordination',
          timeline: 'Ongoing',
          responsibility: 'Nurse Navigator',
        },
      ],
    },
    {
      id: 'GAP006',
      category: 'Lifestyle',
      title: 'Cardiac Rehabilitation Enrollment',
      description: '19 eligible patients not enrolled in cardiac rehab',
      impact: 'medium',
      urgency: 'routine',
      affectedPatients: 19,
      potentialOutcome: 'Improved functional capacity and quality of life',
      actionRequired: 'Referral completion, insurance authorization, patient enrollment',
      estimatedTimeToClose: '6-8 weeks',
      assignedTo: 'Dr. Foster',
      dueDate: '2025-12-01',
      evidenceLevel: 'Class I',
      qualityMeasure: 'Cardiac Rehabilitation Participation',
      barriers: ['Transportation issues', 'Insurance coverage', 'Patient motivation'],
      recommendations: [
        {
          action: 'Transportation assistance program',
          timeline: '4 weeks',
          responsibility: 'Social Services',
        },
        {
          action: 'Virtual cardiac rehab options',
          timeline: '2 weeks',
          responsibility: 'Rehabilitation Services',
        },
        {
          action: 'Patient motivation counseling',
          timeline: 'Ongoing',
          responsibility: 'Care Team',
        },
      ],
    },
  ];

  const filteredGaps = careGaps.filter(gap => 
    selectedCategory === 'all' || gap.category === selectedCategory
  );

  const sortedGaps = [...filteredGaps].sort((a, b) => {
    if (viewMode === 'priority') {
      const urgencyWeight = { urgent: 3, soon: 2, routine: 1 };
      const impactWeight = { high: 3, medium: 2, low: 1 };
      
      const aScore = urgencyWeight[a.urgency] + impactWeight[a.impact];
      const bScore = urgencyWeight[b.urgency] + impactWeight[b.impact];
      
      return bScore - aScore;
    }
    return 0;
  });

  const summary: CareGapSummary = {
    totalGaps: careGaps.length,
    highImpact: careGaps.filter(g => g.impact === 'high').length,
    urgent: careGaps.filter(g => g.urgency === 'urgent').length,
    avgClosureTime: 4.5,
    totalPotentialSavings: careGaps.reduce((sum, g) => sum + (g.costSavings || 0), 0),
    complianceRate: 73.2,
  };

  const getImpactColor = (impact: string) => {
    const colors = {
      high: 'text-medical-red-600 bg-medical-red-100',
      medium: 'text-medical-amber-600 bg-medical-amber-100',
      low: 'text-medical-green-600 bg-medical-green-100',
    };
    return colors[impact as keyof typeof colors];
  };

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      urgent: 'border-l-medical-red-400 bg-medical-red-50/30',
      soon: 'border-l-medical-amber-400 bg-medical-amber-50/30',
      routine: 'border-l-medical-green-400 bg-medical-green-50/30',
    };
    return colors[urgency as keyof typeof colors];
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      GDMT: <Target className="w-5 h-5 text-medical-blue-600" />,
      Device: <TrendingUp className="w-5 h-5 text-medical-green-600" />,
      Screening: <AlertTriangle className="w-5 h-5 text-medical-amber-600" />,
      'Follow-up': <Clock className="w-5 h-5 text-medical-red-600" />,
      Lab: <CheckCircle className="w-5 h-5 text-steel-600" />,
      Lifestyle: <Users className="w-5 h-5 text-medical-green-600" />,
    };
    return icons[category as keyof typeof icons];
  };

  return (
    <div className="retina-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-steel-900 mb-2 font-sf">
            Care Gap Analyzer
          </h2>
          <p className="text-steel-600">
            Identify and prioritize opportunities for care improvement
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-steel-600 mb-1">Total Potential Savings</div>
          <div className="text-3xl font-bold text-medical-green-600 font-sf">
            ${(summary.totalPotentialSavings / 1000000).toFixed(1)}M
          </div>
          <div className="text-sm text-steel-600">Annual opportunity</div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="retina-card p-4 text-center">
          <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">{summary.totalGaps}</div>
          <div className="text-sm text-steel-600">Total Gaps</div>
        </div>
        <div className="retina-card p-4 text-center">
          <div className="text-3xl font-bold text-medical-red-600 mb-1 font-sf">{summary.highImpact}</div>
          <div className="text-sm text-steel-600">High Impact</div>
        </div>
        <div className="retina-card p-4 text-center">
          <div className="text-3xl font-bold text-medical-amber-600 mb-1 font-sf">{summary.urgent}</div>
          <div className="text-sm text-steel-600">Urgent</div>
        </div>
        <div className="retina-card p-4 text-center">
          <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">{summary.avgClosureTime}</div>
          <div className="text-sm text-steel-600">Avg Weeks</div>
        </div>
        <div className="retina-card p-4 text-center">
          <div className="text-3xl font-bold text-medical-green-600 mb-1 font-sf">{summary.complianceRate}%</div>
          <div className="text-sm text-steel-600">Compliance</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6 p-4 bg-steel-50 rounded-xl border border-steel-200">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-steel-700">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-steel-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="GDMT">GDMT</option>
            <option value="Device">Device</option>
            <option value="Screening">Screening</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Lab">Lab</option>
            <option value="Lifestyle">Lifestyle</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-steel-600">View:</span>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'grid' ? 'bg-medical-blue-100 text-medical-blue-800' : 'text-steel-600'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('priority')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'priority' ? 'bg-medical-blue-100 text-medical-blue-800' : 'text-steel-600'
            }`}
          >
            Priority
          </button>
        </div>
      </div>

      {/* Care Gap Cards */}
      <div className="space-y-4">
        {sortedGaps.map((gap) => (
          <div
            key={gap.id}
            className={`retina-card border-l-4 transition-all duration-300 hover:shadow-retina-3 cursor-pointer ${getUrgencyColor(gap.urgency)}`}
            onClick={() => setSelectedGap(selectedGap?.id === gap.id ? null : gap)}
          >
            <div className="p-5">
              {/* Gap Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-white">
                    {getCategoryIcon(gap.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-steel-900">{gap.title}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getImpactColor(gap.impact)}`}>
                        {gap.impact.toUpperCase()} IMPACT
                      </span>
                      <span className="text-xs bg-steel-100 text-steel-700 px-2 py-1 rounded">
                        {gap.evidenceLevel}
                      </span>
                    </div>
                    <div className="text-steel-600">{gap.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-steel-600 mb-1">Affected Patients</div>
                  <div className="text-2xl font-bold text-steel-900 font-sf">{gap.affectedPatients}</div>
                  {gap.costSavings && (
                    <div className="text-sm text-medical-green-600 font-semibold">
                      ${(gap.costSavings / 1000000).toFixed(1)}M savings
                    </div>
                  )}
                </div>
              </div>

              {/* Gap Summary */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-white rounded-lg border border-steel-200">
                <div>
                  <div className="text-xs text-steel-600 mb-1">Expected Outcome</div>
                  <div className="text-sm text-steel-800 font-medium">{gap.potentialOutcome}</div>
                </div>
                <div>
                  <div className="text-xs text-steel-600 mb-1">Action Required</div>
                  <div className="text-sm text-steel-800">{gap.actionRequired}</div>
                </div>
                <div>
                  <div className="text-xs text-steel-600 mb-1">Time to Close</div>
                  <div className="text-sm font-bold text-steel-900">{gap.estimatedTimeToClose}</div>
                </div>
              </div>

              {/* Assignment and Due Date */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-steel-600" />
                    <span className="text-sm text-steel-700">
                      Assigned: <span className="font-medium">{gap.assignedTo || 'Unassigned'}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-steel-600" />
                    <span className="text-sm text-steel-700">
                      Due: <span className="font-medium">{new Date(gap.dueDate).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>
                {gap.qualityMeasure && (
                  <div className="text-sm text-medical-blue-600 font-medium">
                    Quality Measure: {gap.qualityMeasure}
                  </div>
                )}
              </div>

              {/* Expanded Details */}
              {selectedGap?.id === gap.id && (
                <div className="mt-4 p-4 bg-medical-blue-50/50 rounded-xl border border-medical-blue-200">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-steel-900 mb-3">Common Barriers</h4>
                      <div className="space-y-2">
                        {gap.barriers.map((barrier, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-medical-amber-600" />
                            <span className="text-steel-800">{barrier}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-steel-900 mb-3">Recommended Actions</h4>
                      <div className="space-y-3">
                        {gap.recommendations.map((rec, index) => (
                          <div key={index} className="p-3 bg-white rounded border border-steel-200">
                            <div className="text-sm font-medium text-steel-900 mb-1">{rec.action}</div>
                            <div className="flex items-center justify-between text-xs text-steel-600">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{rec.timeline}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{rec.responsibility}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-steel-200">
                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-medical-blue-600 text-white text-sm rounded-lg hover:bg-medical-blue-700 transition-colors">
                    Start Action Plan
                  </button>
                  <button className="px-4 py-2 bg-medical-green-100 text-medical-green-800 text-sm rounded-lg hover:bg-medical-green-200 transition-colors border border-medical-green-300">
                    Assign to Team
                  </button>
                </div>
                <div className="flex items-center gap-2 text-sm text-steel-600">
                  <span>View Details</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CareGapAnalyzer;