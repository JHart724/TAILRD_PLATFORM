import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toFixed } from '../../utils/formatters';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  FileDown,
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Award,
  Database,
  Filter,
  Settings,
  Eye,
  Download,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// Mock data for reports
const mockCMSMeasures = [
  {
 id: 'CMS144',
 name: 'Heart Failure (HF): Beta-Blocker Therapy for Left Ventricular Systolic Dysfunction (LVSD)',
 current: { numerator: 287, denominator: 329, rate: 87.3 },
 prior: { numerator: 245, denominator: 298, rate: 82.2 },
 national: { rate: 84.7 },
 target: 85.0,
 category: 'Heart Failure'
  },
  {
 id: 'CMS145',
 name: 'Coronary Artery Disease (CAD): Lipid Therapy',
 current: { numerator: 456, denominator: 495, rate: 92.1 },
 prior: { numerator: 398, denominator: 456, rate: 87.3 },
 national: { rate: 89.2 },
 target: 90.0,
 category: 'Coronary'
  },
  {
 id: 'CMS135',
 name: 'Heart Failure (HF): Angiotensin-Converting Enzyme (ACE) Inhibitor or Angiotensin Receptor Blocker (ARB) or Angiotensin Receptor-Neprilysin Inhibitor (ARNI) Therapy for Left Ventricular Systolic Dysfunction (LVSD)',
 current: { numerator: 234, denominator: 293, rate: 79.8 },
 prior: { numerator: 198, denominator: 267, rate: 74.2 },
 national: { rate: 76.4 },
 target: 80.0,
 category: 'Heart Failure'
  },
  {
 id: 'CMS347',
 name: 'Statin Therapy for the Prevention and Treatment of Cardiovascular Disease',
 current: { numerator: 523, denominator: 555, rate: 94.2 },
 prior: { numerator: 467, denominator: 521, rate: 89.6 },
 national: { rate: 91.3 },
 target: 92.0,
 category: 'Prevention'
  },
  {
 id: 'CMS236',
 name: 'Controlling High Blood Pressure',
 current: { numerator: 1234, denominator: 1456, rate: 84.8 },
 prior: { numerator: 1098, denominator: 1387, rate: 79.2 },
 national: { rate: 82.1 },
 target: 85.0,
 category: 'Hypertension'
  }
];

const mockNCDRData = {
  cathPCI: {
 totalCases: 1247,
 riskAdjustedMortality: 2.1,
 benchmark: 2.8,
 composite: 8.7,
 caseVolume: [
 { month: 'Jul 2023', cases: 98 },
 { month: 'Aug 2023', cases: 112 },
 { month: 'Sep 2023', cases: 104 },
 { month: 'Oct 2023', cases: 126 },
 { month: 'Nov 2023', cases: 119 },
 { month: 'Dec 2023', cases: 108 },
 { month: 'Jan 2024', cases: 134 },
 { month: 'Feb 2024', cases: 118 }
 ]
  },
  stsAdult: {
 totalCases: 234,
 riskAdjustedMortality: 1.8,
 benchmark: 2.2,
 composite: 12.4,
 ssi: 3.2
  }
};

const mockTrendData = [
  { period: 'Q1 2023', cms144: 78.2, cms145: 85.3, cms135: 71.4, cms347: 87.9, cms236: 76.8 },
  { period: 'Q2 2023', cms144: 81.5, cms145: 88.1, cms135: 73.6, cms347: 89.2, cms236: 78.9 },
  { period: 'Q3 2023', cms144: 83.7, cms145: 90.2, cms135: 75.8, cms347: 91.1, cms236: 81.2 },
  { period: 'Q4 2023', cms144: 87.3, cms145: 92.1, cms135: 79.8, cms347: 94.2, cms236: 84.8 }
];

interface QualityReportGeneratorProps {
  className?: string;
}

const QualityReportGenerator: React.FC<QualityReportGeneratorProps> = ({ className = '' }) => {
  const [reportType, setReportType] = useState('cms-ecqm');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-02-11');
  const [comparisonPeriod, setComparisonPeriod] = useState('prior-period');
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>(['all']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportPreview, setReportPreview] = useState<string | null>(null);
  const chartRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleMeasureSelection = (measureId: string) => {
 if (measureId === 'all') {
 setSelectedMeasures(['all']);
 } else {
 const filtered = selectedMeasures.filter(id => id !== 'all');
 if (filtered.includes(measureId)) {
 const newSelection = filtered.filter(id => id !== measureId);
 setSelectedMeasures(newSelection.length ? newSelection : ['all']);
 } else {
 setSelectedMeasures([...filtered, measureId]);
 }
 }
  };

  const getPerformanceStatus = (current: number, target: number, national: number) => {
 if (current >= target && current >= national) return 'exceeding';
 if (current >= target * 0.95) return 'meeting';
 if (current >= target * 0.85) return 'approaching';
 return 'below';
  };

  const getStatusColor = (status: string) => {
 switch (status) {
 case 'exceeding': return 'text-medical-green-600 bg-medical-green-50';
 case 'meeting': return 'text-porsche-600 bg-porsche-50';
 case 'approaching': return 'text-medical-amber-600 bg-medical-amber-50';
 case 'below': return 'text-medical-red-600 bg-medical-red-50';
 default: return 'text-titanium-600 bg-titanium-50';
 }
  };

  const generateCMSReport = async () => {
 const doc = new jsPDF('p', 'mm', 'a4');
 const pageWidth = doc.internal.pageSize.width;
 const margin = 20;
 const contentWidth = pageWidth - 2 * margin;
 
 // Title
 doc.setFontSize(20);
 doc.setTextColor(51, 65, 85); // titanium-700
 doc.text('CMS eCQM Performance Report', margin, 30);
 
 // Date range
 doc.setFontSize(12);
 doc.setTextColor(100, 116, 139); // titanium-500
 doc.text(`Report Period: ${startDate} to ${endDate}`, margin, 45);
 doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 55);
 
 // Summary stats
 doc.setFontSize(14);
 doc.setTextColor(51, 65, 85);
 doc.text('Executive Summary', margin, 75);
 
 const totalMeasures = mockCMSMeasures.length;
 const meetingTarget = mockCMSMeasures.filter(m => m.current.rate >= m.target).length;
 const exceedingNational = mockCMSMeasures.filter(m => m.current.rate >= m.national.rate).length;
 
 doc.setFontSize(11);
 doc.setTextColor(75, 85, 99);
 doc.text(`• Total Measures: ${totalMeasures}`, margin, 90);
 doc.text(`• Meeting Target: ${meetingTarget}/${totalMeasures} (${Math.round(meetingTarget/totalMeasures*100)}%)`, margin, 100);
 doc.text(`• Above National Benchmark: ${exceedingNational}/${totalMeasures} (${Math.round(exceedingNational/totalMeasures*100)}%)`, margin, 110);
 
 // Create table data
 const tableData = mockCMSMeasures.map(measure => [
 measure.id,
 measure.name.substring(0, 50) + '...',
 `${toFixed(measure.current.rate, 1)}%`,
 `${toFixed(measure.target, 1)}%`,
 `${toFixed(measure.national.rate, 1)}%`,
 getPerformanceStatus(measure.current.rate, measure.target, measure.national.rate)
 ]);
 
 // Add table
 (doc as any).autoTable({
 startY: 130,
 head: [['Measure ID', 'Measure Name', 'Current Rate', 'Target', 'National', 'Status']],
 body: tableData,
 theme: 'striped',
 headStyles: { fillColor: [59, 130, 246] }, // porsche-500
 styles: { fontSize: 8, cellPadding: 3 },
 columnStyles: {
 1: { cellWidth: 60 },
 5: { cellWidth: 20 }
 }
 });
 
 return doc;
  };

  const generateNCDRReport = async () => {
 const doc = new jsPDF('p', 'mm', 'a4');
 const margin = 20;
 
 // Title
 doc.setFontSize(20);
 doc.setTextColor(51, 65, 85);
 doc.text('NCDR Registry Submission Report', margin, 30);
 
 // Date range
 doc.setFontSize(12);
 doc.setTextColor(100, 116, 139);
 doc.text(`Report Period: ${startDate} to ${endDate}`, margin, 45);
 doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 55);
 
 // CathPCI Registry
 doc.setFontSize(14);
 doc.setTextColor(51, 65, 85);
 doc.text('CathPCI Registry', margin, 75);
 
 doc.setFontSize(11);
 doc.text(`Total Cases: ${mockNCDRData.cathPCI.totalCases}`, margin, 90);
 doc.text(`Risk-Adjusted Mortality: ${mockNCDRData.cathPCI.riskAdjustedMortality}%`, margin, 100);
 doc.text(`National Benchmark: ${mockNCDRData.cathPCI.benchmark}%`, margin, 110);
 doc.text(`Composite Score: ${mockNCDRData.cathPCI.composite}%`, margin, 120);
 
 // STS Adult Registry
 doc.setFontSize(14);
 doc.text('STS Adult Registry', margin, 140);
 
 doc.setFontSize(11);
 doc.text(`Total Cases: ${mockNCDRData.stsAdult.totalCases}`, margin, 155);
 doc.text(`Risk-Adjusted Mortality: ${mockNCDRData.stsAdult.riskAdjustedMortality}%`, margin, 165);
 doc.text(`National Benchmark: ${mockNCDRData.stsAdult.benchmark}%`, margin, 175);
 doc.text(`SSI Rate: ${mockNCDRData.stsAdult.ssi}%`, margin, 185);
 
 return doc;
  };

  const generateReport = async () => {
 setIsGenerating(true);
 
 try {
 let doc;
 if (reportType === 'cms-ecqm') {
 doc = await generateCMSReport();
 } else {
 doc = await generateNCDRReport();
 }
 
 const pdfBlob = doc.output('blob');
 const pdfUrl = URL.createObjectURL(pdfBlob);
 setReportPreview(pdfUrl);
 } catch (error) {
 console.error('Error generating report:', error);
 } finally {
 setIsGenerating(false);
 }
  };

  const downloadReport = async () => {
 setIsGenerating(true);
 
 try {
 let doc;
 const fileName = `${reportType}-report-${startDate}-to-${endDate}.pdf`;
 
 if (reportType === 'cms-ecqm') {
 doc = await generateCMSReport();
 } else {
 doc = await generateNCDRReport();
 }
 
 doc.save(fileName);
 } catch (error) {
 console.error('Error downloading report:', error);
 } finally {
 setIsGenerating(false);
 }
  };

  const exportTableData = () => {
 const csvContent = [
 ['Measure ID', 'Measure Name', 'Current Rate', 'Target', 'National Benchmark', 'Status'],
 ...mockCMSMeasures.map(measure => [
 measure.id,
 measure.name,
 toFixed(measure.current.rate, 1) + '%',
 toFixed(measure.target, 1) + '%',
 toFixed(measure.national.rate, 1) + '%',
 getPerformanceStatus(measure.current.rate, measure.target, measure.national.rate)
 ])
 ].map(row => row.join(',')).join('\n');
 
 const blob = new Blob([csvContent], { type: 'text/csv' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = `quality-measures-${startDate}-to-${endDate}.csv`;
 link.click();
  };

  return (
 <div className={`space-y-6 ${className}`}>
 {/* Header */}
 <div className="retina-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-gradient-to-br from-medical-green-500 to-medical-green-600 rounded-2xl shadow-lg">
 <FileDown className="w-8 h-8 text-white" />
 </div>
 <div>
 <h1 className="text-2xl font-bold text-titanium-900">Quality Report Generator</h1>
 <p className="text-titanium-600">Generate CMS eCQM and NCDR registry reports</p>
 </div>
 </div>
 
 <div className="flex items-center gap-3">
 <button
 onClick={generateReport}
 disabled={isGenerating}
 className="px-4 py-2 bg-porsche-500 text-white rounded-lg hover:bg-porsche-600 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
 >
 <Eye className="w-4 h-4" />
 {isGenerating ? 'Generating...' : 'Preview Report'}
 </button>
 
 <button
 onClick={downloadReport}
 disabled={isGenerating}
 className="px-4 py-2 bg-medical-green-500 text-white rounded-lg hover:bg-medical-green-600 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
 >
 <Download className="w-4 h-4" />
 Download PDF
 </button>
 </div>
 </div>

 {/* Configuration */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Report Type</label>
 <select
 value={reportType}
 onChange={(e) => setReportType(e.target.value)}
 className="w-full px-3 py-2 bg-white border border-titanium-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-porsche-500/50"
 >
 <option value="cms-ecqm">CMS eCQM Performance</option>
 <option value="ncdr-registry">NCDR Registry Data</option>
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Start Date</label>
 <input
 type="date"
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 className="w-full px-3 py-2 bg-white border border-titanium-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-porsche-500/50"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">End Date</label>
 <input
 type="date"
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 className="w-full px-3 py-2 bg-white border border-titanium-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-porsche-500/50"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Comparison</label>
 <select
 value={comparisonPeriod}
 onChange={(e) => setComparisonPeriod(e.target.value)}
 className="w-full px-3 py-2 bg-white border border-titanium-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-porsche-500/50"
 >
 <option value="prior-period">Prior Period</option>
 <option value="prior-year">Prior Year</option>
 <option value="national-benchmark">National Benchmark</option>
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Actions</label>
 <button
 onClick={exportTableData}
 className="w-full px-3 py-2 bg-medical-amber-500 text-white rounded-lg hover:bg-medical-amber-600 transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
 >
 <Database className="w-4 h-4" />
 Export CSV
 </button>
 </div>
 </div>
 </div>

 {/* Current Performance Overview */}
 <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
 <div className="retina-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-semibold text-titanium-900">Performance Trends</h2>
 <BarChart3 className="w-5 h-5 text-porsche-500" />
 </div>
 
 <ResponsiveContainer width="100%" height={300}>
 <LineChart data={mockTrendData}>
 <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
 <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 12 }} />
 <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
 <Tooltip
 contentStyle={{
 backgroundColor: 'rgba(255, 255, 255, 0.95)',
 border: '1px solid rgba(255, 255, 255, 0.3)',
 borderRadius: '12px',
 backdropFilter: 'blur(20px)'
 }}
 />
 <Line type="monotone" dataKey="cms144" stroke="#3b82f6" strokeWidth={2} name="CMS144" />
 <Line type="monotone" dataKey="cms145" stroke="#10b981" strokeWidth={2} name="CMS145" />
 <Line type="monotone" dataKey="cms135" stroke="#f59e0b" strokeWidth={2} name="CMS135" />
 <Line type="monotone" dataKey="cms347" stroke="#9B2438" strokeWidth={2} name="CMS347" />
 <Line type="monotone" dataKey="cms236" stroke="#ef4444" strokeWidth={2} name="CMS236" />
 </LineChart>
 </ResponsiveContainer>
 </div>

 <div className="retina-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-semibold text-titanium-900">Performance Summary</h2>
 <Award className="w-5 h-5 text-medical-amber-500" />
 </div>
 
 <div className="space-y-4">
 {mockCMSMeasures.slice(0, 3).map((measure) => {
 const status = getPerformanceStatus(measure.current.rate, measure.target, measure.national.rate);
 const trend = measure.current.rate - measure.prior.rate;
 
 return (
 <div key={measure.id} className="p-4 bg-white rounded-lg border border-titanium-200">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <span className="font-medium text-titanium-900">{measure.id}</span>
 <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)}`}>
 {status}
 </div>
 </div>
 <div className="flex items-center gap-2">
 <div className="text-lg font-bold text-titanium-900">
 {toFixed(measure.current.rate, 1)}%
 </div>
 <div className={`flex items-center gap-1 text-sm ${
 trend >= 0 ? 'text-medical-green-600' : 'text-medical-red-600'
 }`}>
 {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
 {toFixed(Math.abs(trend), 1)}%
 </div>
 </div>
 </div>
 
 <div className="grid grid-cols-3 gap-2 text-xs text-titanium-600">
 <div>Target: {toFixed(measure.target, 1)}%</div>
 <div>National: {toFixed(measure.national.rate, 1)}%</div>
 <div>Prior: {toFixed(measure.prior.rate, 1)}%</div>
 </div>
 
 <div className="mt-2">
 <div className="w-full bg-titanium-200 rounded-full h-2">
 <div 
 className={`h-2 rounded-full transition-all duration-500 ${
 status === 'exceeding' ? 'bg-medical-green-500' :
 status === 'meeting' ? 'bg-porsche-500' :
 status === 'approaching' ? 'bg-medical-amber-500' :
 'bg-medical-red-500'
 }`}
 style={{ width: `${Math.min(measure.current.rate, 100)}%` }}
 />
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>

 {/* Detailed Measures Table */}
 <div className="retina-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-semibold text-titanium-900">Quality Measures Detail</h2>
 <div className="flex items-center gap-2">
 <Clock className="w-4 h-4 text-titanium-400" />
 <span className="text-sm text-titanium-600">Current reporting period</span>
 </div>
 </div>
 
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b border-titanium-200">
 <th className="text-left py-3 px-4 font-semibold text-titanium-700">Measure</th>
 <th className="text-left py-3 px-4 font-semibold text-titanium-700">Current Rate</th>
 <th className="text-left py-3 px-4 font-semibold text-titanium-700">Target</th>
 <th className="text-left py-3 px-4 font-semibold text-titanium-700">National</th>
 <th className="text-left py-3 px-4 font-semibold text-titanium-700">Change</th>
 <th className="text-left py-3 px-4 font-semibold text-titanium-700">Status</th>
 </tr>
 </thead>
 <tbody>
 {mockCMSMeasures.map((measure) => {
 const status = getPerformanceStatus(measure.current.rate, measure.target, measure.national.rate);
 const trend = measure.current.rate - measure.prior.rate;
 
 return (
 <tr key={measure.id} className="border-b border-titanium-200 hover:bg-white transition-colors duration-200">
 <td className="py-4 px-4">
 <div>
 <div className="font-medium text-titanium-900">{measure.id}</div>
 <div className="text-sm text-titanium-600">{measure.category}</div>
 </div>
 </td>
 <td className="py-4 px-4">
 <div className="text-lg font-bold text-titanium-900">
 {toFixed(measure.current.rate, 1)}%
 </div>
 <div className="text-xs text-titanium-600">
 {measure.current.numerator}/{measure.current.denominator}
 </div>
 </td>
 <td className="py-4 px-4 text-titanium-700">
 {toFixed(measure.target, 1)}%
 </td>
 <td className="py-4 px-4 text-titanium-700">
 {toFixed(measure.national.rate, 1)}%
 </td>
 <td className="py-4 px-4">
 <div className={`flex items-center gap-1 ${
 trend >= 0 ? 'text-medical-green-600' : 'text-medical-red-600'
 }`}>
 {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
 {trend >= 0 ? '+' : ''}{toFixed(trend, 1)}%
 </div>
 </td>
 <td className="py-4 px-4">
 <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
 {status === 'exceeding' ? <CheckCircle className="w-3 h-3" /> : 
 status === 'below' ? <AlertCircle className="w-3 h-3" /> : 
 <div className="w-3 h-3 rounded-full bg-current" />}
 {status}
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>

 {/* Report Preview */}
 {reportPreview && (
 <div className="retina-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-semibold text-titanium-900">Report Preview</h2>
 <button
 onClick={() => setReportPreview(null)}
 className="px-3 py-1 text-titanium-600 hover:text-titanium-800 transition-colors duration-200"
 >
 Close Preview
 </button>
 </div>
 
 <div className="border border-titanium-200 rounded-lg overflow-hidden">
 <iframe
 src={reportPreview}
 className="w-full h-96"
 title="Report Preview"
 />
 </div>
 </div>
 )}
 </div>
  );
};

export default QualityReportGenerator;