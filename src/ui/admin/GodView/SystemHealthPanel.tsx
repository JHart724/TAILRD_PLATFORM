/**
 * System Health Panel Component
 * 
 * Displays overall system health metrics and quality indicators
 * including quality scores and system-wide gap analysis.
 */

import React from 'react';
import { 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Target,
  Activity
} from 'lucide-react';
import { useTheme } from '../../../theme';

interface SystemHealthPanelProps {
  qualityMetrics: {
 overallScore: number;
 codeCompliance: number;
 documentationQuality: number;
 careCoordination: number;
 patientSafety: number;
  };
  systemWideGaps: Array<{
 category: string;
 count: number;
 impact: 'high' | 'medium' | 'low';
  }>;
}

export const SystemHealthPanel: React.FC<SystemHealthPanelProps> = ({ 
  qualityMetrics, 
  systemWideGaps 
}) => {
  const { semantic } = useTheme();

  const getScoreColor = (score: number) => {
 if (score >= 0.9) return semantic['status.success'];
 if (score >= 0.8) return semantic['status.warning'];
 return semantic['status.danger'];
  };

  const getScoreIcon = (score: number) => {
 if (score >= 0.9) return CheckCircle;
 if (score >= 0.8) return AlertTriangle;
 return XCircle;
  };

  const qualityItems = [
 { key: 'overallScore', label: 'Overall Quality', icon: Target },
 { key: 'codeCompliance', label: 'Code Compliance', icon: Shield },
 { key: 'documentationQuality', label: 'Documentation', icon: Activity },
 { key: 'careCoordination', label: 'Care Coordination', icon: TrendingUp },
 { key: 'patientSafety', label: 'Patient Safety', icon: Shield }
  ];

  const highImpactGaps = systemWideGaps.filter(gap => gap.impact === 'high');
  const totalGaps = systemWideGaps.reduce((sum, gap) => sum + gap.count, 0);

  return (
 <div 
 className="rounded-xl p-6 border"
 style={{ 
 backgroundColor: semantic['surface.primary'],
 borderColor: semantic['border.default']
 }}
 >
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-semibold" style={{ color: semantic['text.primary'] }}>
 System Health & Quality
 </h2>
 <div className="flex items-center gap-2">
 <div 
 className={`px-3 py-1 rounded-full text-sm font-medium ${
 qualityMetrics.overallScore >= 0.9 ? 'bg-[#F0F7F4] text-[#2D6147]' :
 qualityMetrics.overallScore >= 0.8 ? 'bg-[#FAF6E8] text-[#8B6914]' :
 'bg-red-100 text-red-800'
 }`}
 >
 {qualityMetrics.overallScore >= 0.9 ? 'Excellent' :
 qualityMetrics.overallScore >= 0.8 ? 'Good' : 'Needs Attention'}
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 {/* Quality Metrics */}
 <div>
 <h3 className="font-medium mb-4" style={{ color: semantic['text.primary'] }}>
 Quality Metrics
 </h3>
 <div className="space-y-4">
 {qualityItems.map(({ key, label, icon: Icon }) => {
 const score = qualityMetrics[key as keyof typeof qualityMetrics];
 const scorePercent = Math.round(score * 100);
 const scoreColor = getScoreColor(score);
 const ScoreIcon = getScoreIcon(score);
 
 return (
 <div key={key} className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div 
 className="p-2 rounded-lg"
 style={{ 
 backgroundColor: `${scoreColor}15`,
 }}
 >
 <Icon className="w-4 h-4" style={{ color: scoreColor }} />
 </div>
 <span className="font-medium" style={{ color: semantic['text.primary'] }}>
 {label}
 </span>
 </div>
 
 <div className="flex items-center gap-3">
 {/* Progress Bar */}
 <div 
 className="w-24 h-2 rounded-full"
 style={{ backgroundColor: semantic['surface.tertiary'] }}
 >
 <div 
 className="h-full rounded-full transition-all duration-500"
 style={{ 
 width: `${scorePercent}%`,
 backgroundColor: scoreColor
 }}
 />
 </div>
 
 {/* Score */}
 <div className="flex items-center gap-2 min-w-0">
 <span className="font-semibold" style={{ color: scoreColor }}>
 {scorePercent}%
 </span>
 <ScoreIcon className="w-4 h-4" style={{ color: scoreColor }} />
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Gap Analysis */}
 <div>
 <h3 className="font-medium mb-4" style={{ color: semantic['text.primary'] }}>
 System-Wide Gaps
 </h3>
 
 {/* Gap Summary */}
 <div className="grid grid-cols-2 gap-4 mb-4">
 <div 
 className="p-4 rounded-lg"
 style={{ backgroundColor: semantic['surface.tertiary'] }}
 >
 <div className="text-2xl font-bold mb-1" style={{ color: semantic['text.primary'] }}>
 {totalGaps.toLocaleString()}
 </div>
 <div className="text-sm" style={{ color: semantic['text.muted'] }}>
 Total Gaps
 </div>
 </div>
 <div 
 className="p-4 rounded-lg"
 style={{ backgroundColor: semantic['surface.tertiary'] }}
 >
 <div className="text-2xl font-bold mb-1" style={{ color: semantic['status.danger'] }}>
 {highImpactGaps.reduce((sum, gap) => sum + gap.count, 0).toLocaleString()}
 </div>
 <div className="text-sm" style={{ color: semantic['text.muted'] }}>
 High Impact
 </div>
 </div>
 </div>

 {/* Gap Details */}
 <div className="space-y-3">
 {systemWideGaps
 .sort((a, b) => {
 const impactOrder = { high: 3, medium: 2, low: 1 };
 return impactOrder[b.impact] - impactOrder[a.impact];
 })
 .map((gap, index) => {
 const impactColor = 
 gap.impact === 'high' ? semantic['risk.high'] :
 gap.impact === 'medium' ? semantic['risk.moderate'] :
 semantic['risk.low'];

 return (
 <div 
 key={gap.category} 
 className="flex items-center justify-between p-3 rounded-lg"
 style={{ backgroundColor: semantic['surface.tertiary'] }}
 >
 <div className="flex items-center gap-3">
 <div 
 className="w-3 h-3 rounded-full"
 style={{ backgroundColor: impactColor }}
 />
 <span className="font-medium" style={{ color: semantic['text.primary'] }}>
 {gap.category}
 </span>
 </div>
 
 <div className="text-right">
 <div className="font-semibold" style={{ color: semantic['text.primary'] }}>
 {gap.count.toLocaleString()}
 </div>
 <div 
 className="text-xs font-medium uppercase tracking-wide"
 style={{ color: impactColor }}
 >
 {gap.impact}
 </div>
 </div>
 </div>
 );
 })}
 </div>

 {/* Recommendations */}
 <div 
 className="mt-4 p-4 rounded-lg border-l-4"
 style={{ 
 backgroundColor: `${semantic['status.info']}10`,
 borderLeftColor: semantic['status.info']
 }}
 >
 <h4 className="font-medium mb-2" style={{ color: semantic['text.primary'] }}>
 Recommendations
 </h4>
 <div className="text-sm space-y-1" style={{ color: semantic['text.secondary'] }}>
 {highImpactGaps.length > 0 && (
 <div>• Focus on {highImpactGaps[0].category} - highest impact opportunity</div>
 )}
 <div>• Target quality metrics below 90% for improvement</div>
 <div>• Review care coordination workflows</div>
 </div>
 </div>
 </div>
 </div>
 </div>
  );
};