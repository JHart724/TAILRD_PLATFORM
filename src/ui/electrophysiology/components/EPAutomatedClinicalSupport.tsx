import React, { useState, useMemo } from 'react';
import { Brain, Heart, Shield, Zap, AlertTriangle, CheckCircle, TrendingUp, Users, Target, Calendar, ChevronRight, Eye, Stethoscope, Clock, Plus, ChevronUp, Info } from 'lucide-react';

interface AutomatedPatientAssessment {
  id: string;
  name: string;
  mrn: string;
  age: number;
  gender: 'M' | 'F';
  
  // CHA2DS2-VASc factors
  chf: boolean;
  hypertension: boolean;
  diabetes: boolean;
  stroke: boolean;
  vascularDisease: boolean;
  
  // HAS-BLED factors
  sbpOver160: boolean;
  abnormalRenal: boolean;
  abnormalLiver: boolean;
  bleedingHistory: boolean;
  labileINR: boolean;
  drugAlcoholUse: boolean;
  
  // LAAC specific factors
  anticoagContraindicated: boolean;
  anticoagFailure: boolean;
  fallRisk: boolean;
  cognitiveImpairment: boolean;
  warfarinIntolerance: boolean;
  
  // Ablation factors
  afType: 'paroxysmal' | 'persistent' | 'longstanding';
  symptoms: string[];
  medicationFailures: number;
  
  // Calculated scores
  cha2ds2vasc: number;
  hasbled: number;
  
  // Recommendations
  laacEligibility: 'eligible' | 'consider' | 'not-eligible';
  ablationEligibility: 'eligible' | 'consider' | 'not-eligible';
  laacConfidence: number;
  ablationConfidence: number;
  
  // Clinical status
  lastScan: string;
  provider: string;
  priority: 'high' | 'medium' | 'low';
}

const EPAutomatedClinicalSupport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'laac-candidates' | 'ablation-candidates' | 'risk-analytics'>('overview');
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);
  const [filterEligibility, setFilterEligibility] = useState<'all' | 'eligible' | 'consider'>('all');
  const [expandedPatients, setExpandedPatients] = useState<Record<string, boolean>>({});

  const togglePatientDetails = (patientId: string) => {
    setExpandedPatients(prev => ({
      ...prev,
      [patientId]: !prev[patientId]
    }));
  };

  // Automated patient assessments from EHR scanning
  const automatedAssessments: AutomatedPatientAssessment[] = [
    {
      id: 'AUTO001',
      name: 'Johnson, Michael',
      mrn: 'MRN-A001',
      age: 67,
      gender: 'M',
      chf: true,
      hypertension: true,
      diabetes: false,
      stroke: true,
      vascularDisease: true,
      sbpOver160: false,
      abnormalRenal: true,
      abnormalLiver: false,
      bleedingHistory: true,
      labileINR: false,
      drugAlcoholUse: false,
      anticoagContraindicated: true,
      anticoagFailure: false,
      fallRisk: false,
      cognitiveImpairment: false,
      warfarinIntolerance: true,
      afType: 'persistent',
      symptoms: ['Palpitations', 'Fatigue', 'Dyspnea'],
      medicationFailures: 2,
      cha2ds2vasc: 6,
      hasbled: 3,
      laacEligibility: 'eligible',
      ablationEligibility: 'consider',
      laacConfidence: 92,
      ablationConfidence: 68,
      lastScan: '2024-10-25',
      provider: 'Dr. Martinez',
      priority: 'high'
    },
    {
      id: 'AUTO002',
      name: 'Chen, Patricia',
      mrn: 'MRN-A002',
      age: 74,
      gender: 'F',
      chf: false,
      hypertension: true,
      diabetes: true,
      stroke: false,
      vascularDisease: false,
      sbpOver160: true,
      abnormalRenal: false,
      abnormalLiver: false,
      bleedingHistory: false,
      labileINR: true,
      drugAlcoholUse: false,
      anticoagContraindicated: false,
      anticoagFailure: true,
      fallRisk: true,
      cognitiveImpairment: false,
      warfarinIntolerance: false,
      afType: 'paroxysmal',
      symptoms: ['Palpitations', 'Chest discomfort'],
      medicationFailures: 1,
      cha2ds2vasc: 5,
      hasbled: 3,
      laacEligibility: 'consider',
      ablationEligibility: 'eligible',
      laacConfidence: 78,
      ablationConfidence: 85,
      lastScan: '2024-10-24',
      provider: 'Dr. Chen',
      priority: 'high'
    },
    {
      id: 'AUTO003',
      name: 'Rodriguez, Carlos',
      mrn: 'MRN-A003',
      age: 82,
      gender: 'M',
      chf: true,
      hypertension: true,
      diabetes: true,
      stroke: false,
      vascularDisease: true,
      sbpOver160: false,
      abnormalRenal: true,
      abnormalLiver: false,
      bleedingHistory: true,
      labileINR: false,
      drugAlcoholUse: false,
      anticoagContraindicated: true,
      anticoagFailure: false,
      fallRisk: true,
      cognitiveImpairment: true,
      warfarinIntolerance: true,
      afType: 'longstanding',
      symptoms: ['Fatigue', 'Dyspnea', 'Edema'],
      medicationFailures: 3,
      cha2ds2vasc: 7,
      hasbled: 4,
      laacEligibility: 'eligible',
      ablationEligibility: 'not-eligible',
      laacConfidence: 88,
      ablationConfidence: 25,
      lastScan: '2024-10-25',
      provider: 'Dr. Thompson',
      priority: 'medium'
    },
    {
      id: 'AUTO004',
      name: 'Williams, Sarah',
      mrn: 'MRN-A004',
      age: 58,
      gender: 'F',
      chf: false,
      hypertension: true,
      diabetes: false,
      stroke: false,
      vascularDisease: false,
      sbpOver160: false,
      abnormalRenal: false,
      abnormalLiver: false,
      bleedingHistory: false,
      labileINR: false,
      drugAlcoholUse: false,
      anticoagContraindicated: false,
      anticoagFailure: false,
      fallRisk: false,
      cognitiveImpairment: false,
      warfarinIntolerance: false,
      afType: 'paroxysmal',
      symptoms: ['Palpitations', 'Exercise intolerance'],
      medicationFailures: 2,
      cha2ds2vasc: 2,
      hasbled: 1,
      laacEligibility: 'not-eligible',
      ablationEligibility: 'eligible',
      laacConfidence: 35,
      ablationConfidence: 91,
      lastScan: '2024-10-23',
      provider: 'Dr. Rodriguez',
      priority: 'medium'
    },
    {
      id: 'AUTO005',
      name: 'Brown, David',
      mrn: 'MRN-A005',
      age: 69,
      gender: 'M',
      chf: false,
      hypertension: true,
      diabetes: true,
      stroke: true,
      vascularDisease: false,
      sbpOver160: false,
      abnormalRenal: false,
      abnormalLiver: false,
      bleedingHistory: false,
      labileINR: false,
      drugAlcoholUse: false,
      anticoagContraindicated: false,
      anticoagFailure: true,
      fallRisk: false,
      cognitiveImpairment: false,
      warfarinIntolerance: false,
      afType: 'persistent',
      symptoms: ['Dyspnea', 'Fatigue'],
      medicationFailures: 1,
      cha2ds2vasc: 5,
      hasbled: 1,
      laacEligibility: 'consider',
      ablationEligibility: 'eligible',
      laacConfidence: 72,
      ablationConfidence: 83,
      lastScan: '2024-10-24',
      provider: 'Dr. Martinez',
      priority: 'high'
    },
    {
      id: 'AUTO006',
      name: 'Davis, Eleanor',
      mrn: 'MRN-A006',
      age: 76,
      gender: 'F',
      chf: true,
      hypertension: true,
      diabetes: false,
      stroke: false,
      vascularDisease: false,
      sbpOver160: false,
      abnormalRenal: false,
      abnormalLiver: false,
      bleedingHistory: true,
      labileINR: true,
      drugAlcoholUse: false,
      anticoagContraindicated: true,
      anticoagFailure: false,
      fallRisk: false,
      cognitiveImpairment: false,
      warfarinIntolerance: true,
      afType: 'persistent',
      symptoms: ['Palpitations', 'Dyspnea'],
      medicationFailures: 2,
      cha2ds2vasc: 5,
      hasbled: 3,
      laacEligibility: 'eligible',
      ablationEligibility: 'consider',
      laacConfidence: 86,
      ablationConfidence: 64,
      lastScan: '2024-10-25',
      provider: 'Dr. Chen',
      priority: 'high'
    }
  ];

  const getEligibilityColor = (eligibility: string) => {
    switch (eligibility) {
      case 'eligible': return 'text-medical-green-700 bg-medical-green-100';
      case 'consider': return 'text-medical-amber-700 bg-medical-amber-100';
      case 'not-eligible': return 'text-medical-red-700 bg-medical-red-100';
      default: return 'text-steel-700 bg-steel-100';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-medical-green-600';
    if (confidence >= 60) return 'text-medical-amber-600';
    return 'text-medical-red-600';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-medical-red-600 bg-medical-red-100';
      case 'medium': return 'text-medical-amber-600 bg-medical-amber-100';
      case 'low': return 'text-medical-green-600 bg-medical-green-100';
      default: return 'text-steel-600 bg-steel-100';
    }
  };

  const getFilteredAssessments = () => {
    if (activeTab === 'laac-candidates') {
      let filtered = automatedAssessments.filter(p => p.laacEligibility !== 'not-eligible');
      if (filterEligibility !== 'all') {
        filtered = filtered.filter(p => p.laacEligibility === filterEligibility);
      }
      return filtered.sort((a, b) => b.laacConfidence - a.laacConfidence);
    } else if (activeTab === 'ablation-candidates') {
      let filtered = automatedAssessments.filter(p => p.ablationEligibility !== 'not-eligible');
      if (filterEligibility !== 'all') {
        filtered = filtered.filter(p => p.ablationEligibility === filterEligibility);
      }
      return filtered.sort((a, b) => b.ablationConfidence - a.ablationConfidence);
    }
    return automatedAssessments;
  };

  const getStatsData = () => {
    const total = automatedAssessments.length;
    const laacEligible = automatedAssessments.filter(p => p.laacEligibility === 'eligible').length;
    const laacConsider = automatedAssessments.filter(p => p.laacEligibility === 'consider').length;
    const ablationEligible = automatedAssessments.filter(p => p.ablationEligibility === 'eligible').length;
    const ablationConsider = automatedAssessments.filter(p => p.ablationEligibility === 'consider').length;
    const avgCha2ds2vasc = Math.round((automatedAssessments.reduce((sum, p) => sum + p.cha2ds2vasc, 0) / total) * 10) / 10;
    const avgHasbled = Math.round((automatedAssessments.reduce((sum, p) => sum + p.hasbled, 0) / total) * 10) / 10;
    
    return {
      total,
      laacEligible,
      laacConsider,
      ablationEligible,
      ablationConsider,
      avgCha2ds2vasc,
      avgHasbled
    };
  };

  const stats = getStatsData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="retina-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-8 h-8 text-medical-green-600" />
          <div>
            <h2 className="text-2xl font-bold text-steel-900 font-sf">
              Automated Clinical Decision Support
            </h2>
            <p className="text-steel-600">
              AI-powered risk assessment and treatment recommendations from automated EHR analysis
            </p>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-medical-green-50 to-medical-green-100 rounded-xl p-4 border border-medical-green-200">
            <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-1">
              Patients Scanned
            </div>
            <div className="text-2xl font-bold text-steel-900 font-sf">{stats.total}</div>
            <div className="text-xs text-medical-green-700">Auto-analyzed from EHR</div>
          </div>

          <div className="bg-gradient-to-r from-medical-purple-50 to-medical-purple-100 rounded-xl p-4 border border-medical-purple-200">
            <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-1">
              LAAC Eligible
            </div>
            <div className="text-2xl font-bold text-steel-900 font-sf">{stats.laacEligible}</div>
            <div className="text-xs text-medical-purple-700">+{stats.laacConsider} to consider</div>
          </div>

          <div className="bg-gradient-to-r from-medical-red-50 to-medical-red-100 rounded-xl p-4 border border-medical-red-200">
            <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-1">
              Ablation Eligible
            </div>
            <div className="text-2xl font-bold text-steel-900 font-sf">{stats.ablationEligible}</div>
            <div className="text-xs text-medical-red-700">+{stats.ablationConsider} to consider</div>
          </div>

          <div className="bg-gradient-to-r from-medical-amber-50 to-medical-amber-100 rounded-xl p-4 border border-medical-amber-200">
            <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-1">
              Avg Risk Scores
            </div>
            <div className="text-xl font-bold text-steel-900 font-sf">{stats.avgCha2ds2vasc} / {stats.avgHasbled}</div>
            <div className="text-xs text-medical-amber-700">CHA₂DS₂-VASc / HAS-BLED</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 border-b border-steel-200">
          {[
            { id: 'overview', label: 'Risk Overview', icon: Target },
            { id: 'laac-candidates', label: 'LAAC Candidates', icon: Shield },
            { id: 'ablation-candidates', label: 'Ablation Candidates', icon: Zap },
            { id: 'risk-analytics', label: 'Risk Analytics', icon: TrendingUp }
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 border-b-2 transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-medical-green-500 text-medical-green-600 bg-medical-green-50'
                    : 'border-transparent text-steel-600 hover:text-steel-800 hover:bg-steel-50'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span className="font-semibold text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Risk Distribution */}
          <div className="retina-card p-6">
            <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-medical-green-600" />
              Automated Risk Stratification Overview
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-steel-900">LAAC Eligibility Distribution</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-medical-green-50 rounded-lg border border-medical-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-medical-green-500 rounded-full"></div>
                      <span className="font-medium">Eligible for LAAC</span>
                    </div>
                    <span className="font-bold text-medical-green-700">{stats.laacEligible} patients</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-medical-amber-50 rounded-lg border border-medical-amber-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-medical-amber-500 rounded-full"></div>
                      <span className="font-medium">Consider LAAC</span>
                    </div>
                    <span className="font-bold text-medical-amber-700">{stats.laacConsider} patients</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-medical-red-50 rounded-lg border border-medical-red-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-medical-red-500 rounded-full"></div>
                      <span className="font-medium">Not Eligible</span>
                    </div>
                    <span className="font-bold text-medical-red-700">{stats.total - stats.laacEligible - stats.laacConsider} patients</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-steel-900">Ablation Eligibility Distribution</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-medical-green-50 rounded-lg border border-medical-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-medical-green-500 rounded-full"></div>
                      <span className="font-medium">Eligible for Ablation</span>
                    </div>
                    <span className="font-bold text-medical-green-700">{stats.ablationEligible} patients</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-medical-amber-50 rounded-lg border border-medical-amber-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-medical-amber-500 rounded-full"></div>
                      <span className="font-medium">Consider Ablation</span>
                    </div>
                    <span className="font-bold text-medical-amber-700">{stats.ablationConsider} patients</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-medical-red-50 rounded-lg border border-medical-red-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-medical-red-500 rounded-full"></div>
                      <span className="font-medium">Not Eligible</span>
                    </div>
                    <span className="font-bold text-medical-red-700">{stats.total - stats.ablationEligible - stats.ablationConsider} patients</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Automated Assessments */}
          <div className="retina-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-steel-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-medical-green-600" />
                Recent Automated Assessments
              </h3>
              <div className="text-sm text-steel-600">Last scan: {new Date().toLocaleDateString()}</div>
            </div>

            <div className="space-y-3">
              {automatedAssessments.slice(0, 4).map((assessment) => (
                <div key={assessment.id} className="flex items-center justify-between p-4 bg-steel-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-semibold text-steel-900">{assessment.name}</div>
                      <div className="text-sm text-steel-600">
                        {assessment.mrn} • Age {assessment.age} • {assessment.provider}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-xs text-steel-600">CHA₂DS₂-VASc</div>
                      <div className="text-sm font-bold text-steel-900">{assessment.cha2ds2vasc}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-steel-600">HAS-BLED</div>
                      <div className="text-sm font-bold text-steel-900">{assessment.hasbled}</div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${getEligibilityColor(assessment.laacEligibility)}`}>
                      LAAC: {assessment.laacEligibility.replace('-', ' ')}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${getEligibilityColor(assessment.ablationEligibility)}`}>
                      Ablation: {assessment.ablationEligibility.replace('-', ' ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LAAC Candidates Tab */}
      {(activeTab === 'laac-candidates' || activeTab === 'ablation-candidates') && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="retina-card p-4">
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'All Candidates', count: getFilteredAssessments().length },
                  { id: 'eligible', label: 'Eligible', count: getFilteredAssessments().filter(p => activeTab === 'laac-candidates' ? p.laacEligibility === 'eligible' : p.ablationEligibility === 'eligible').length },
                  { id: 'consider', label: 'Consider', count: getFilteredAssessments().filter(p => activeTab === 'laac-candidates' ? p.laacEligibility === 'consider' : p.ablationEligibility === 'consider').length }
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setFilterEligibility(filter.id as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                      filterEligibility === filter.id
                        ? 'bg-medical-green-500 text-white shadow-md'
                        : 'bg-steel-100 text-steel-700 hover:bg-steel-200'
                    }`}
                  >
                    {filter.label}
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      filterEligibility === filter.id
                        ? 'bg-white/20 text-white'
                        : 'bg-steel-200 text-steel-600'
                    }`}>
                      {filter.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Patient List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {getFilteredAssessments().map((assessment) => (
              <div
                key={assessment.id}
                className="retina-card p-6 border-l-4 border-l-medical-green-400 cursor-pointer transition-all duration-300 hover:shadow-retina-3"
                onClick={() => setSelectedAssessment(selectedAssessment === assessment.id ? null : assessment.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-steel-900">{assessment.name}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePatientDetails(assessment.id);
                        }}
                        className="p-1 rounded-full hover:bg-steel-100 transition-colors"
                      >
                        {expandedPatients[assessment.id] ? (
                          <ChevronUp className="w-4 h-4 text-steel-600" />
                        ) : (
                          <Plus className="w-4 h-4 text-steel-600" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-steel-600">{assessment.mrn} • Age {assessment.age} • {assessment.gender}</p>
                    <p className="text-sm text-steel-600">{assessment.provider} • Scanned: {assessment.lastScan}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(assessment.priority)}`}>
                    {assessment.priority.toUpperCase()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-medical-red-50 rounded-lg">
                    <div className="text-sm text-steel-600 mb-1">CHA₂DS₂-VASc</div>
                    <div className="text-xl font-bold text-medical-red-600">{assessment.cha2ds2vasc}</div>
                  </div>
                  <div className="text-center p-3 bg-medical-amber-50 rounded-lg">
                    <div className="text-sm text-steel-600 mb-1">HAS-BLED</div>
                    <div className="text-xl font-bold text-medical-amber-600">{assessment.hasbled}</div>
                  </div>
                </div>

                {activeTab === 'laac-candidates' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-steel-600">LAAC Eligibility:</span>
                      <div className={`px-2 py-1 rounded text-xs font-semibold ${getEligibilityColor(assessment.laacEligibility)}`}>
                        {assessment.laacEligibility.replace('-', ' ').toUpperCase()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-steel-600">Confidence Score:</span>
                      <span className={`font-bold ${getConfidenceColor(assessment.laacConfidence)}`}>
                        {assessment.laacConfidence}%
                      </span>
                    </div>
                  </div>
                )}

                {activeTab === 'ablation-candidates' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-steel-600">Ablation Eligibility:</span>
                      <div className={`px-2 py-1 rounded text-xs font-semibold ${getEligibilityColor(assessment.ablationEligibility)}`}>
                        {assessment.ablationEligibility.replace('-', ' ').toUpperCase()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-steel-600">Confidence Score:</span>
                      <span className={`font-bold ${getConfidenceColor(assessment.ablationConfidence)}`}>
                        {assessment.ablationConfidence}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-steel-600">AF Type:</span>
                      <span className="font-semibold text-steel-900 capitalize">{assessment.afType}</span>
                    </div>
                  </div>
                )}

                {/* Expanded Details */}
                {expandedPatients[assessment.id] && (
                  <div className="mt-6 pt-6 border-t border-steel-200 space-y-4">
                    {/* Risk Factors */}
                    <div className="bg-medical-green-50/50 rounded-lg p-4">
                      <h4 className="font-semibold text-steel-900 mb-3 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-medical-red-600" />
                        CHA₂DS₂-VASc Risk Factors
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {[
                          { key: 'chf', label: 'CHF', value: assessment.chf },
                          { key: 'hypertension', label: 'Hypertension', value: assessment.hypertension },
                          { key: 'age', label: 'Age ≥65', value: assessment.age >= 65 },
                          { key: 'diabetes', label: 'Diabetes', value: assessment.diabetes },
                          { key: 'stroke', label: 'Stroke/TIA', value: assessment.stroke },
                          { key: 'vascularDisease', label: 'Vascular Disease', value: assessment.vascularDisease }
                        ].map((factor) => (
                          <div key={factor.key} className={`flex items-center gap-2 ${factor.value ? 'text-medical-red-700' : 'text-steel-500'}`}>
                            <div className={`w-2 h-2 rounded-full ${factor.value ? 'bg-medical-red-500' : 'bg-steel-300'}`}></div>
                            <span>{factor.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bleeding Risk Factors */}
                    <div className="bg-medical-amber-50/50 rounded-lg p-4">
                      <h4 className="font-semibold text-steel-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-medical-amber-600" />
                        HAS-BLED Risk Factors
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {[
                          { key: 'sbpOver160', label: 'SBP >160', value: assessment.sbpOver160 },
                          { key: 'abnormalRenal', label: 'Renal dysfunction', value: assessment.abnormalRenal },
                          { key: 'abnormalLiver', label: 'Liver dysfunction', value: assessment.abnormalLiver },
                          { key: 'bleedingHistory', label: 'Bleeding history', value: assessment.bleedingHistory },
                          { key: 'labileINR', label: 'Labile INR', value: assessment.labileINR },
                          { key: 'elderliness', label: 'Age >65', value: assessment.age > 65 }
                        ].map((factor) => (
                          <div key={factor.key} className={`flex items-center gap-2 ${factor.value ? 'text-medical-amber-700' : 'text-steel-500'}`}>
                            <div className={`w-2 h-2 rounded-full ${factor.value ? 'bg-medical-amber-500' : 'bg-steel-300'}`}></div>
                            <span>{factor.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* LAAC Specific Factors */}
                    {activeTab === 'laac-candidates' && (
                      <div className="bg-medical-purple-50/50 rounded-lg p-4">
                        <h4 className="font-semibold text-steel-900 mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-medical-purple-600" />
                          LAAC Specific Factors
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {[
                            { key: 'anticoagContraindicated', label: 'Anticoag contraindicated', value: assessment.anticoagContraindicated },
                            { key: 'anticoagFailure', label: 'Anticoag failure', value: assessment.anticoagFailure },
                            { key: 'fallRisk', label: 'Fall risk', value: assessment.fallRisk },
                            { key: 'warfarinIntolerance', label: 'Warfarin intolerance', value: assessment.warfarinIntolerance }
                          ].map((factor) => (
                            <div key={factor.key} className={`flex items-center gap-2 ${factor.value ? 'text-medical-purple-700' : 'text-steel-500'}`}>
                              <div className={`w-2 h-2 rounded-full ${factor.value ? 'bg-medical-purple-500' : 'bg-steel-300'}`}></div>
                              <span>{factor.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ablation Specific Factors */}
                    {activeTab === 'ablation-candidates' && (
                      <div className="bg-medical-red-50/50 rounded-lg p-4">
                        <h4 className="font-semibold text-steel-900 mb-3 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-medical-red-600" />
                          Ablation Assessment
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-steel-600">AF Type:</span>
                            <span className="font-semibold text-steel-900 capitalize">{assessment.afType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-steel-600">Medication Failures:</span>
                            <span className="font-semibold text-steel-900">{assessment.medicationFailures}</span>
                          </div>
                          <div>
                            <span className="text-steel-600">Symptoms:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {assessment.symptoms.map((symptom, idx) => (
                                <span key={idx} className="px-2 py-1 bg-medical-red-100 text-medical-red-700 text-xs rounded">
                                  {symptom}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-4 flex gap-2">
                  <button 
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-medical-green-600 to-medical-green-700 text-white text-xs rounded-lg hover:from-medical-green-700 hover:to-medical-green-800 transition-all duration-300 flex items-center justify-center gap-1"
                    onClick={() => {
                      console.log(`EP: Viewing detailed assessment for patient ${assessment.name} (${assessment.mrn})`);
                      alert(`Detailed Assessment - ${assessment.name}\n\nPatient: ${assessment.name} (${assessment.mrn})\nAge: ${assessment.age} • Gender: ${assessment.gender}\nProvider: ${assessment.provider}\n\nAutomated Risk Assessment:\n\n• CHA₂DS₂-VASc Score: ${assessment.cha2ds2vasc}\n• HAS-BLED Score: ${assessment.hasbled}\n• LAAC Eligibility: ${assessment.laacEligibility.toUpperCase()} (${assessment.laacConfidence}% confidence)\n• Ablation Eligibility: ${assessment.ablationEligibility.toUpperCase()} (${assessment.ablationConfidence}% confidence)\n\nClinical Factors:\n• AF Type: ${assessment.afType}\n• Medication Failures: ${assessment.medicationFailures}\n• Symptoms: ${assessment.symptoms.join(', ')}\n• Anticoag Contraindicated: ${assessment.anticoagContraindicated ? 'Yes' : 'No'}\n\nRecommendations based on automated EHR analysis and evidence-based guidelines.`);
                      // TODO: Implement detailed patient assessment view with comprehensive clinical data and decision support tools
                    }}
                  >
                    <Eye className="w-3 h-3" />
                    View Details
                  </button>
                  <button 
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-steel-100 to-steel-200 text-steel-800 text-xs rounded-lg hover:from-steel-200 hover:to-steel-300 transition-all duration-300 flex items-center justify-center gap-1"
                    onClick={() => {
                      console.log(`EP: Scheduling consultation for patient ${assessment.name} based on automated assessment`);
                      alert(`Schedule EP Consultation - ${assessment.name}\n\nBased on automated assessment results:\n\n${activeTab === 'laac-candidates' ? 
                        `LAAC Consultation Recommended\n• Eligibility: ${assessment.laacEligibility.toUpperCase()}\n• Confidence: ${assessment.laacConfidence}%\n• CHA₂DS₂-VASc: ${assessment.cha2ds2vasc}\n• HAS-BLED: ${assessment.hasbled}\n\nScheduling:\n• Pre-LAAC evaluation\n• TEE assessment\n• Multidisciplinary consultation\n• Patient education session` :
                        `Ablation Consultation Recommended\n• Eligibility: ${assessment.ablationEligibility.toUpperCase()}\n• Confidence: ${assessment.ablationConfidence}%\n• AF Type: ${assessment.afType}\n• Medication Failures: ${assessment.medicationFailures}\n\nScheduling:\n• Pre-ablation assessment\n• Imaging studies (CT/MRI)\n• Electrophysiology consultation\n• Shared decision-making visit`}\n\nProvider: ${assessment.provider}\nPriority: ${assessment.priority.toUpperCase()}\n\nAutomated scheduling will coordinate optimal timing based on clinical urgency and resource availability.`);
                      // TODO: Implement automated scheduling system with priority-based appointment allocation and clinical workflow integration
                    }}
                  >
                    <Calendar className="w-3 h-3" />
                    Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Analytics Tab */}
      {activeTab === 'risk-analytics' && (
        <div className="space-y-6">
          <div className="retina-card p-6">
            <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-medical-green-600" />
              Population Risk Analytics
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 rounded-xl p-6">
                <h4 className="font-semibold text-medical-red-900 mb-4">High Stroke Risk Patients</h4>
                <div className="text-3xl font-bold text-medical-red-700 mb-2">
                  {automatedAssessments.filter(p => p.cha2ds2vasc >= 4).length}
                </div>
                <div className="text-sm text-medical-red-600">CHA₂DS₂-VASc ≥4</div>
                <div className="text-xs text-medical-red-500 mt-2">
                  {Math.round((automatedAssessments.filter(p => p.cha2ds2vasc >= 4).length / automatedAssessments.length) * 100)}% of total population
                </div>
              </div>

              <div className="bg-gradient-to-br from-medical-amber-50 to-medical-amber-100 rounded-xl p-6">
                <h4 className="font-semibold text-medical-amber-900 mb-4">High Bleeding Risk</h4>
                <div className="text-3xl font-bold text-medical-amber-700 mb-2">
                  {automatedAssessments.filter(p => p.hasbled >= 3).length}
                </div>
                <div className="text-sm text-medical-amber-600">HAS-BLED ≥3</div>
                <div className="text-xs text-medical-amber-500 mt-2">
                  {Math.round((automatedAssessments.filter(p => p.hasbled >= 3).length / automatedAssessments.length) * 100)}% of total population
                </div>
              </div>

              <div className="bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 rounded-xl p-6">
                <h4 className="font-semibold text-medical-purple-900 mb-4">Optimal LAAC Candidates</h4>
                <div className="text-3xl font-bold text-medical-purple-700 mb-2">
                  {automatedAssessments.filter(p => p.cha2ds2vasc >= 3 && p.anticoagContraindicated).length}
                </div>
                <div className="text-sm text-medical-purple-600">High risk + contraindicated</div>
                <div className="text-xs text-medical-purple-500 mt-2">Clear LAAC indication</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EPAutomatedClinicalSupport;