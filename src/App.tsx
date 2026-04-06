import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import CountUp from 'react-countup';
import TailrdLogo from './components/TailrdLogo';
import { Heart, Activity, Zap, Stethoscope, GitBranch, CircuitBoard, FlaskConical, DollarSign, Target, Users, AlertTriangle, Brain, BarChart3, ArrowRight, ArrowLeft, TrendingUp } from 'lucide-react';
import { ErrorBoundary } from './components/shared/ErrorFallback';
import { ToastContainer } from './components/shared/Toast';
import { errorHandler } from './utils/ErrorHandler';
import { roundTo } from './utils/formatters';
import { AuthProvider } from './auth/AuthContext';
import { initializeTheme } from './theme';
import AppShell from './design-system/AppShell';


// Custom animations removed � provided by Tailwind config

// Lazy load all modules
const Login = lazy(() => import("./components/Login"));
const Logout = lazy(() => import("./components/Logout"));
const ProtectedRoute = lazy(() => import("./auth/ProtectedRoute"));
const HFModule = lazy(() => import("./ui/heartFailure/HFModule"));
const EPModule = lazy(() => import("./ui/electrophysiology/EPModule"));
const StructuralHeartModule = lazy(() => import("./ui/structuralHeart/StructuralHeartModule"));
const CoronaryInterventionModule = lazy(() => import("./ui/coronaryIntervention/CoronaryInterventionModule"));
const ValvularDiseaseModule = lazy(() => import("./ui/valvularDisease/ValvularDiseaseModule"));
const PeripheralVascularModule = lazy(() => import("./ui/peripheralVascular/PeripheralVascularModule"));
const ResearchModule = lazy(() => import("./ui/research/ResearchModule"));
const DataManagementPortal = lazy(() => import("./ui/dataManagement/DataManagementPortal"));
const SettingsPage = lazy(() => import("./ui/SettingsPage"));
const ProfilePage = lazy(() => import("./ui/ProfilePage"));
const NotFoundPage = lazy(() => import("./ui/NotFoundPage"));
const AcceptInvite = lazy(() => import("./ui/auth/AcceptInvite"));
const SuperAdminLogin = lazy(() => import("./ui/auth/SuperAdminLogin"));
const SuperAdminConsole = lazy(() => import("./ui/admin/SuperAdminConsole"));
const SuperAdminDashboard = lazy(() => import("./ui/admin/SuperAdminDashboard"));
const GodView = lazy(() => import("./ui/admin/GodView/GodView"));
const FreeTierDashboard = lazy(() => import("./components/free-tier/FreeTierDashboard"));

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Core Types
type Role = "Executive" | "Service Line" | "Care Team";
type ModuleId = "hf" | "ep" | "structural" | "coronary" | "valvular" | "peripheral" | "research";
type ViewMode = "main" | "module" | "aggregate";
type IconComponent = () => JSX.Element;
type KpiVariant = "default" | "success" | "warning" | "danger" | "info";
type PatientPriority = "High" | "Medium" | "Low";
type PatientStatus = "Active" | "Review" | "Follow-up";
type PatientQueueVariant = "default" | "warning" | "danger" | "success";

interface Module {
  id: ModuleId;
  name: string;
  shortName: string;
  description: string;
  functional: boolean;
  patients: number;
  procedures: number;
  revenue: number;
  qualityScore: number;
  icon: IconComponent;
  features: string[];
}

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon: IconComponent;
  variant?: KpiVariant;
  trend?: number;
  onClick?: () => void;
}

interface ModuleKpi extends KpiCardProps {
  variant: KpiVariant;
}

interface Patient {
  id: string;
  name: string;
  age: number;
  physician: string;
  priority: PatientPriority;
  status: PatientStatus;
}

type ModuleKpiMap = Record<ModuleId, Record<Role, ModuleKpi[]>>;
type ModulePatients = Record<ModuleId, Patient[]>;

// Icons -- using lucide-react instead of inline SVGs
const Icons = {
  Users: () => <Users className="h-5 w-5" />,
  Dollar: () => <DollarSign className="h-5 w-5" />,
  Target: () => <Target className="h-5 w-5" />,
  Alert: () => <AlertTriangle className="h-5 w-5" />,
  Activity: () => <Activity className="h-5 w-5" />,
  Brain: () => <Brain className="h-5 w-5" />,
  Chart: () => <BarChart3 className="h-5 w-5" />,
  ArrowRight: () => <ArrowRight className="h-4 w-4" />,
  ArrowLeft: () => <ArrowLeft className="h-4 w-4" />,
  Trending: () => <TrendingUp className="h-5 w-5" />,
};

const formatMoney = (amount: number): string => {
  if (amount >= 1000000) return `$${roundTo(amount / 1000000, 1)}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
  return `$${amount.toLocaleString()}`;
};

// DEMO DATA: These values are displayed on the main dashboard in demo mode.
// When backend is deployed, replace with API call to /api/modules/summary.
// Patient counts and revenue are illustrative, not derived from real data.
const MODULES: Module[] = [
  {
 id: "hf",
 name: "Heart Failure",
 shortName: "HF",
 description: "Population screening to individual GDMT optimization across PCP-Cardiology continuum",
 functional: true,
 patients: 7700,
 procedures: 1784,
 revenue: 1609560,
 qualityScore: 94,
 icon: () => <Heart className="w-5 h-5" />,
 features: ["GDMT Analytics", "Specialty Screening", "Advanced Therapies", "340B Revenue"],
  },
  {
 id: "ep",
 name: "Electrophysiology",
 shortName: "EP",
 description: "Enhanced automated AFib screening to LAAC procedures with AI-powered risk assessment",
 functional: true,
 patients: 4312,
 procedures: 3684,
 revenue: 9500000,
 qualityScore: 97,
 icon: () => <Zap className="w-5 h-5" />,
 features: ["Automated LAAC Risk Screening", "Multi-patient Analytics", "2025 WATCHMAN Guidelines", "Enhanced Care Team Dashboard"],
  },
  {
 id: "structural",
 name: "Structural Heart",
 shortName: "Structural",
 description: "Population valve disease detection to complex transcatheter interventions",
 functional: true,
 patients: 2570,
 procedures: 312,
 revenue: 13500000,
 qualityScore: 96,
 icon: () => <Stethoscope className="w-5 h-5" />,
 features: ["TAVR Program", "TEER (MitraClip)", "Balloon Valvuloplasty", "ASD/PFO Closure"],
  },
  {
 id: "coronary",
 name: "Coronary Revascularization",
 shortName: "Coronary",
 description: "Population CAD screening to complex revascularization across PCP-Cardiology-Surgery",
 functional: true,
 patients: 16468,
 procedures: 9134,
 revenue: 8024880,
 qualityScore: 95,
 icon: () => <GitBranch className="w-5 h-5" />,
 features: ["Complex PCI/CTO", "Protected PCI (Impella)", "CABG Program", "SYNTAX Score Integration"],
  },
  {
 id: "valvular",
 name: "Valvular Surgery",
 shortName: "Valvular",
 description: "Enhanced surgical valve analytics with comprehensive forecasting and strategic initiatives",
 functional: true,
 patients: 1642,
 procedures: 234,
 revenue: 10240000,
 qualityScore: 96,
 icon: () => <CircuitBoard className="w-5 h-5" />,
 features: ["Surgical-Only Focus", "AI Market Forecasting", "Ross Procedure Excellence", "Advanced Analytics Dashboard"],
  },
  {
 id: "peripheral",
 name: "Peripheral Vascular",
 shortName: "Peripheral",
 description: "Comprehensive PAD and limb salvage programs with advanced wound care tracking",
 functional: true,
 patients: 3784,
 procedures: 3684,
 revenue: 2560000,
 qualityScore: 94,
 icon: () => <Activity className="w-5 h-5" />,
 features: ["94.3% Limb Salvage Rate", "WIfI Clinical Staging", "Device Performance Analytics", "Multi-tab Care Coordination"],
  },
  {
 id: "research",
 name: "Clinical Research Assist",
 shortName: "CRA",
 description: "Registry pre-population \u00b7 Trial eligibility screening \u00b7 Research workflow automation",
 functional: true,
 patients: 443,
 procedures: 159,
 revenue: 0,
 qualityScore: 80,
 icon: () => <FlaskConical className="w-5 h-5" />,
 features: ["Registry Assist", "Trial Eligibility"],
  },
];

const generateSamplePatients = (moduleId: ModuleId, count = 20): Patient[] => {
  const names = ["John Smith", "Jane Doe", "Maria Garcia", "David Johnson", "Sarah Wilson", "Michael Brown", "Lisa Davis"];
  const physicians = ["Dr. Rivera", "Dr. Chen", "Dr. Patel", "Dr. Lewis", "Dr. Ahmed", "Dr. Thompson"];
  const priorities: PatientPriority[] = ["High", "Medium", "Low"];
  const statuses: PatientStatus[] = ["Active", "Review", "Follow-up"];

  return Array.from({ length: count }, (_, i) => ({
 id: `${moduleId.toUpperCase()}${(i + 1).toString().padStart(4, "0")}`,
 name: names[Math.floor(Math.random() * names.length)],
 age: 50 + Math.floor(Math.random() * 40),
 physician: physicians[Math.floor(Math.random() * physicians.length)],
 priority: priorities[Math.floor(Math.random() * priorities.length)],
 status: statuses[Math.floor(Math.random() * statuses.length)],
  }));
};

const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon: Icon, variant = "default", trend, onClick }) => {
  const getVariantColors = (variant: KpiVariant): string => {
 const variants: Record<KpiVariant, string> = {
 default: "bg-white border-titanium-200",
 success: "bg-[#F0F5FA] border-[#C8D4DC] text-[#1E2D3D]",
 warning: "bg-[#F0F5FA] border-[#C8D4DC] text-[#374151]",
 danger: "bg-arterial-50 border-arterial-200 text-arterial-900",
 info: "bg-chrome-50 border-chrome-200 text-chrome-900",
 };
 return variants[variant];
  };

  return (
 <div 
 className={`retina-card ${getVariantColors(variant)} ${onClick ? "cursor-pointer" : ""}`}
 onClick={onClick}
 >
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-3">
 {Icon && (<div className="p-2 rounded-lg bg-chrome-600 shadow-chrome-card"><Icon /></div>)}
 <span className="text-sm font-semibold text-titanium-500">{label}</span>
 </div>
 {trend !== undefined && (<div className={`text-xs font-semibold ${trend > 0 ? "text-[#2C4A60]" : "text-medical-red-600"}`}>{trend > 0 ? "?" : "?"} {Math.abs(trend)}%</div>)}
 </div>
 <div className="text-3xl font-bold font-data text-titanium-900 mb-1">{value}</div>
 </div>
  );
};

interface RoleToggleProps { value: Role; onChange: (role: Role) => void; }

const RoleToggle: React.FC<RoleToggleProps> = ({ value, onChange }) => {
  const roles: Array<{ id: Role; label: string; desc: string; color: string; }> = [
 { id: "Executive", label: "Executive", desc: "Financial & ROI", color: "text-chrome-700 bg-chrome-50 border-chrome-200" },
 { id: "Service Line", label: "Service Line", desc: "Operations", color: "text-[#8B6914] bg-[#FAF6E8] border-[#C8D4DC]" },
 { id: "Care Team", label: "Care Team", desc: "Patient Care", color: "text-[#2C4A60] bg-[#F0F5FA] border-[#C8D4DC]" },
  ];

  return (
 <div className="flex gap-2 bg-white rounded-xl p-2 border border-titanium-200 shadow-lg">
 {roles.map((role) => (
 <button key={role.id} onClick={() => onChange(role.id)} className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${value === role.id ? `${role.color} shadow-sm transform scale-105` : "text-titanium-700 hover:text-titanium-900 hover:bg-titanium-50"}`}>
 <div className="text-center">
 <div className="font-semibold">{role.label}</div>
 <div className="text-xs opacity-75">{role.desc}</div>
 </div>
 </button>
 ))}
 </div>
  );
};

interface ModuleTileProps { module: Module; onClick: () => void; }

const ModuleTile: React.FC<ModuleTileProps> = ({ module, onClick }) => {
  const Icon = module.icon;
  
  return (
 <button 
 onClick={onClick} 
 className="relative group cursor-pointer w-full h-full"
 >
 {/* Floating glow effect */}
 <div className="absolute -inset-1 bg-white rounded-2xl blur opacity-0 group-hover:opacity-60 transition-all duration-500"></div>
 
 <div className="relative bg-white border border-titanium-200 rounded-2xl p-6 shadow-lg shadow-white/10 transition-all duration-500 group-hover:bg-white group-hover: group-hover:shadow-2xl group-hover:shadow-white/20 group-hover:scale-[1.03] group-hover:border-titanium-200 group-hover:-translate-y-1">
 {/* Enhanced shine effect */}
 <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
 
 <div className="relative space-y-4">
 {/* Icon container */}
 <div className="w-fit">
 <div
   className="p-4 rounded-xl transition-all duration-500 group-hover:shadow-lg"
   style={{
     background: 'rgba(44,74,96,0.08)',
     border: '1px solid rgba(44,74,96,0.15)',
     color: '#2C4A60',
   }}
 >
 <Icon />
 </div>
 </div>
 
 <div className="space-y-2">
 <h3 className="text-xl font-semibold text-titanium-800 transition-colors duration-300 group-hover:text-titanium-900">{module.name}</h3>
 <p className="text-sm text-titanium-600 leading-relaxed group-hover:text-titanium-700 transition-colors duration-300">{module.description}</p>
 </div>
 
 {/* Arrow indicator */}
 <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-2 group-hover:translate-x-0">
 <div className="p-2 rounded-lg bg-white border border-titanium-200 shadow-lg">
 <Icons.ArrowRight />
 </div>
 </div>
 </div>
 </div>
 </button>
  );
};

interface PatientQueueProps { title: string; patients: Patient[]; variant?: PatientQueueVariant; maxItems?: number; }

const PatientQueue: React.FC<PatientQueueProps> = ({ title, patients, variant = "default", maxItems = 6 }) => {
  const getVariantStyle = (variant: PatientQueueVariant): string => {
 switch (variant) {
 case "warning": return "bg-[#F0F5FA] border-[#C8D4DC]";
 case "danger": return "bg-red-50 border-red-200";
 case "success": return "bg-[#F0F5FA] border-[#C8D4DC]";
 default: return "bg-chrome-50 border-chrome-200";
 }
  };

  return (
 <div className="bg-white border border-titanium-200 shadow-chrome-card rounded-xl p-8">
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-xl font-bold text-titanium-900">{title}</h3>
 <span className="text-lg font-bold text-titanium-600">{patients.length}</span>
 </div>
 <div className="space-y-4 max-h-80 overflow-y-auto">
 {patients.slice(0, maxItems).map((patient) => (
 <div key={patient.id} className={`flex items-center justify-between p-4 ${getVariantStyle(variant)} rounded-xl border transition-all hover:shadow-md`}>
 <div className="flex-1">
 <div className="font-semibold text-titanium-900">{patient.name}</div>
 <div className="text-sm text-titanium-600">{patient.age}y � {patient.id} � {patient.physician}</div>
 </div>
 <div className="flex items-center gap-3">
 <div className="text-xs px-3 py-1.5 rounded-full bg-white text-titanium-700 font-medium">{patient.status}</div>
 <Icons.ArrowRight />
 </div>
 </div>
 ))}
 {patients.length > maxItems && (<div className="text-center py-4 text-sm text-titanium-600">+{patients.length - maxItems} more patients</div>)}
 </div>
 </div>
  );
};

const getModuleKPIs = (moduleId: ModuleId, role: Role): ModuleKpi[] => {
  const kpiData: ModuleKpiMap = {
 hf: {
 Executive: [
 { label: "HF Revenue", value: formatMoney(804780), icon: Icons.Dollar, variant: "success", trend: 8.7 },
 { label: "GDMT Opportunity", value: formatMoney(2450000), icon: Icons.Target, variant: "warning", trend: 12.3 },
 { label: "Market Penetration", value: "67.2%", icon: Icons.Users, variant: "default", trend: 5.2 },
 { label: "Quality Bonus", value: formatMoney(125000), icon: Icons.Target, variant: "success", trend: 15.8 },
 ],
 "Service Line": [
 { label: "GDMT Compliance", value: "73.4%", icon: Icons.Target, variant: "warning", trend: 2.1 },
 { label: "Provider Variation", value: "18.2%", icon: Icons.Alert, variant: "danger", trend: -3.4 },
 { label: "Care Coordination", value: "89.1%", icon: Icons.Users, variant: "success", trend: 4.2 },
 { label: "Readmission Rate", value: "8.7%", icon: Icons.Activity, variant: "warning", trend: -2.8 },
 ],
 "Care Team": [
 { label: "Active Alerts", value: "47", icon: Icons.Alert, variant: "warning" },
 { label: "GDMT Gaps", value: "128", icon: Icons.Target, variant: "danger" },
 { label: "Phenotype Flags", value: "23", icon: Icons.Brain, variant: "info" },
 { label: "Panel Size", value: "247", icon: Icons.Users, variant: "default" },
 ],
 },
 ep: { Executive: [], "Service Line": [], "Care Team": [] },
 structural: { Executive: [], "Service Line": [], "Care Team": [] },
 coronary: { Executive: [], "Service Line": [], "Care Team": [] },
 valvular: { Executive: [], "Service Line": [], "Care Team": [] },
 peripheral: { Executive: [], "Service Line": [], "Care Team": [] },
 research: { Executive: [], "Service Line": [], "Care Team": [] },
  };
  return kpiData[moduleId]?.[role] ?? [];
};

function MainDashboard(): JSX.Element {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("main");
  const [activeModule, setActiveModule] = useState<ModuleId>("hf");
  const [moduleRole, setModuleRole] = useState<Role>("Executive");
  const [isLoading, setIsLoading] = useState(false);
  const [modulePatients] = useState<ModulePatients>(() => {
 const data = MODULES.reduce<ModulePatients>((acc, module) => {
 acc[module.id] = generateSamplePatients(module.id, 25);
 return acc;
 }, {} as ModulePatients);
 return data;
  });

  const totalMetrics = useMemo(() => {
 const totals = MODULES.reduce((acc, module) => ({
 patients: acc.patients + module.patients,
 procedures: acc.procedures + module.procedures,
 revenue: acc.revenue + module.revenue,
 }), { patients: 0, procedures: 0, revenue: 0 });
 const avgQuality = MODULES.reduce((sum, m) => sum + m.qualityScore, 0) / MODULES.length;
 return {
 totalPatients: totals.patients,
 totalProcedures: totals.procedures,
 totalRevenue: totals.revenue,
 avgQuality: Math.round(avgQuality),
 functionalModules: MODULES.filter((m) => m.functional).length,
 };
  }, []);

  const openModule = useCallback((moduleId: ModuleId) => {
 const routes: Record<string, string> = {
 hf: '/hf', ep: '/ep', structural: '/structural',
 coronary: '/coronary', valvular: '/valvular',
 peripheral: '/peripheral', research: '/research',
 };
 if (routes[moduleId]) {
 navigate(routes[moduleId]);
 }
  }, [navigate]);

  const backToMain = useCallback(() => { setViewMode("main"); }, []);

  if (viewMode === "main") {
 return (
 <div className="min-h-screen relative overflow-hidden" style={{ background: '#F0F5FA' }}>
 {/* Loading Overlay */}
 {isLoading && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: '#F0F5FA' }}>
 <div className="text-center">
 {/* Loading animation */}
 <div className="mb-8">
 <div className="relative w-16 h-16 mx-auto">
 <div className="absolute inset-0 border-4 border-titanium-200 rounded-full"></div>
 <div className="absolute inset-0 border-4 border-titanium-200 rounded-full border-t-transparent animate-spin"></div>
 </div>
 </div>
 
 {/* Brand */}
 <div className="mb-2">
 <TailrdLogo size="medium" variant="light" />
 </div>
 
 {/* Loading message */}
 <p className="text-lg text-white font-light mb-4" style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)' }}>Processing Analytics...</p>
 
 {/* Animated dots */}
 <div className="flex justify-center space-x-1">
 <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
 <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
 <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
 </div>
 
 {/* Subtitle */}
 <p className="text-sm text-white mt-6" style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)' }}>
 Population � Panel � Patient Analytics
 </p>
 </div>
 </div>
 )}
 
  <div className="relative z-10 min-h-screen p-8">
 <div className="max-w-7xl mx-auto space-y-8">
 {/* Clean Professional Medical Header */}
 <div>
 <TailrdLogo size="large" variant="light" className="mb-3" />
 <p className="text-lg text-titanium-600 font-light">Precision Cardiovascular Care Platform</p>
 </div>
 
 {/* Cardiovascular Service Line - Slightly darker than modules */}
 <div className="flex justify-center mb-8">
 <button
 onClick={() => navigate('/service-line')}
 className="relative group"
 >
 {/* Subtle glow effect */}
 <div className="absolute -inset-1 bg-white rounded-3xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
 
 <div className="relative px-12 py-6 bg-white text-titanium-700 rounded-2xl border border-titanium-200 shadow-xl transition-all duration-300 group-hover:shadow-2xl group-hover:scale-[1.02] group-hover:from-white group-hover:via-white group-hover:to-white">
 {/* Subtle shine */}
 <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
 <div className="relative flex items-center gap-4">
 <div className="p-3 rounded-xl bg-[#C8D4DC] border border-[#C8D4DC]">
 <Icons.Chart />
 </div>
 <div className="text-left">
 <div className="text-2xl font-medium font-display">Cardiovascular Service Line</div>
 <div className="text-sm opacity-80 font-light">Population � Panel � Patient - PCP to Specialty Care</div>
 </div>
 <Icons.ArrowRight />
 </div>
 </div>
 </button>
 </div>
 {/* Clinical Modules */}
 <div>
 <h2 className="text-3xl font-bold font-display text-titanium-800 mb-6">Clinical Modules</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {MODULES.filter(m => m.id !== 'research').map((module) => (<ModuleTile key={module.id} module={module} onClick={() => openModule(module.id)} />))}
 </div>

 {/* Clinical Research Assist � separate tile matching Service Line style */}
 <div className="flex justify-center mt-8">
 <button
 onClick={() => openModule('research' as ModuleId)}
 className="relative group"
 >
 <div className="absolute -inset-1 bg-white rounded-3xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
 <div className="relative px-12 py-6 bg-white text-titanium-700 rounded-2xl border border-titanium-200 shadow-xl transition-all duration-300 group-hover:shadow-2xl group-hover:scale-[1.02]">
 <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
 <div className="relative flex items-center gap-4">
 <div className="p-3 rounded-xl bg-titanium-100 border border-titanium-200">
 <FlaskConical className="w-5 h-5 text-titanium-600" />
 </div>
 <div className="text-left">
 <div className="text-2xl font-medium font-display flex items-center gap-3">Clinical Research Assist <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F0F7F4] text-[#2D6147]">Beta</span></div>
 <div className="text-sm opacity-80 font-light">Registry pre-population � Trial eligibility screening � Research workflow automation</div>
 </div>
 <Icons.ArrowRight />
 </div>
 </div>
 </button>
 </div>

 {/* Last Updated Info - Bottom Right */}
 <div className="flex justify-end mt-8">
 <div className="bg-gradient-to-br from-white to-chrome-50 border border-chrome-200 rounded-xl p-4 shadow-chrome-card">
 <div className="text-xs text-chrome-600 mb-1 font-medium">Last Updated</div>
 <div className="text-lg font-medium text-titanium-700">{new Date().toLocaleDateString()}</div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
  }


  const currentModule = MODULES.find((m) => m.id === activeModule);
  const patients = modulePatients[activeModule];
  const moduleKPIs = getModuleKPIs(activeModule, moduleRole);

  return (
 <div className="min-h-screen bg-liquid-porsche-blue p-8">
 <div className="max-w-7xl mx-auto space-y-8">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <button onClick={backToMain} className="btn-medical-secondary"><Icons.ArrowLeft /></button>
 <div>
 <h1 className="text-4xl font-bold text-titanium-900 mb-2">{currentModule?.name}</h1>
 <p className="text-lg text-titanium-600">{currentModule?.description}</p>
 </div>
 </div>
 <RoleToggle value={moduleRole} onChange={setModuleRole} />
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {moduleKPIs.map((kpi) => (<KpiCard key={kpi.label} {...kpi} />))}
 </div>
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <PatientQueue title="High Priority" patients={patients.filter((p) => p.priority === "High")} variant="danger" />
 <PatientQueue title="Pending Reviews" patients={patients.filter((p) => p.status === "Review")} variant="warning" />
 <PatientQueue title="Follow-up Needed" patients={patients.filter((p) => p.status === "Follow-up")} variant="success" />
 </div>
 </div>
 </div>
  );
}

const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';

function resetDemoState(): void {
  ['tailrd-session-token', 'tailrd-refresh-token', 'tailrd-user', 'tailrd-user-id'].forEach(
    (key) => localStorage.removeItem(key)
  );
  sessionStorage.clear();
  window.location.href = '/';
}

export default function App(): JSX.Element {
  // Initialize theme system
  useEffect(() => {
 initializeTheme();
  }, []);

  // Demo presenter shortcut: Ctrl+Shift+R resets all demo state
  useEffect(() => {
    if (!isDemoMode) return;
    const handleKeyCombo = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        if (window.confirm('Reset all demo state? This will return to the login screen.')) {
          resetDemoState();
        }
      }
    };
    window.addEventListener('keydown', handleKeyCombo);
    return () => window.removeEventListener('keydown', handleKeyCombo);
  }, []);

  return (
 <ErrorBoundary module="Application" component="App">
 <AuthProvider>
 <BrowserRouter>
 <ScrollToTop />
 <ToastContainer position="bottom-right" />
 <Suspense fallback={
 <div className="min-h-screen bg-chrome-50 relative overflow-hidden">
 {/* Background pattern */}
 <div className="absolute inset-0 opacity-[0.04]" style={{
 backgroundImage: `radial-gradient(circle at 30% 20%, #1E3347 2px, transparent 2px), radial-gradient(circle at 70% 80%, #6B8EA8 1px, transparent 1px)`,
 backgroundSize: '60px 60px'
 }}></div>
 
 <div className="relative z-10 flex items-center justify-center min-h-screen">
 <div className="text-center">
 {/* Loading animation */}
 <div className="mb-8">
 <div className="relative w-16 h-16 mx-auto">
 <div className="absolute inset-0 border-4 border-chrome-200 rounded-full"></div>
 <div className="absolute inset-0 border-4 border-chrome-600 rounded-full border-t-transparent animate-spin"></div>
 </div>
 </div>
 
 {/* Brand */}
 <div className="mb-2">
 <TailrdLogo size="medium" variant="light" />
 </div>
 
 {/* Loading message */}
 <p className="text-lg text-titanium-600 font-light mb-4">Processing Analytics...</p>
 
 {/* Animated dots */}
 <div className="flex justify-center space-x-1">
 <div className="w-2 h-2 bg-chrome-400 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
 <div className="w-2 h-2 bg-chrome-500 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
 <div className="w-2 h-2 bg-chrome-600 rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
 </div>
 
 {/* Subtitle */}
 <p className="text-sm text-titanium-600 mt-6">
 Population � Panel � Patient Analytics
 </p>
 </div>
 </div>
 </div>
 }>
 <Routes>
 {/* Public routes */}
 <Route path="/" element={<Login />} />
 <Route path="/login" element={<Login />} />
 <Route path="/logout" element={<Logout />} />
 <Route path="/invite/:token" element={<AcceptInvite />} />
 <Route path="/superadmin-login" element={<SuperAdminLogin />} />
 <Route path="/admin" element={
   <ProtectedRoute requiredPermissions={[{ module: '*', action: 'admin' }]}>
     <SuperAdminConsole />
   </ProtectedRoute>
 } />
 <Route path="/admin/god" element={
   <ProtectedRoute requiredPermissions={[{ module: '*', action: 'admin' }]}>
     <AppShell><GodView /></AppShell>
   </ProtectedRoute>
 } />
 <Route path="/admin/dashboard" element={
   <ProtectedRoute requiredPermissions={[{ module: '*', action: 'admin' }]}>
     <AppShell><SuperAdminDashboard /></AppShell>
   </ProtectedRoute>
 } />

 {/* Protected routes */}
 <Route path="/dashboard" element={
 <ProtectedRoute>
 <AppShell><MainDashboard /></AppShell>
 </ProtectedRoute>
 } />
 <Route path="/hf/*" element={
 <ProtectedRoute>
 <AppShell>
 <ErrorBoundary module="Heart Failure" component="HFModule"><HFModule /></ErrorBoundary>
 </AppShell>
 </ProtectedRoute>
 } />
 <Route path="/ep/*" element={
 <ProtectedRoute>
 <AppShell>
 <ErrorBoundary module="Electrophysiology" component="EPModule"><EPModule /></ErrorBoundary>
 </AppShell>
 </ProtectedRoute>
 } />
 <Route path="/structural/*" element={
 <ProtectedRoute>
 <AppShell>
 <ErrorBoundary module="Structural Heart" component="StructuralHeartModule"><StructuralHeartModule /></ErrorBoundary>
 </AppShell>
 </ProtectedRoute>
 } />
 <Route path="/coronary/*" element={
 <ProtectedRoute>
 <AppShell>
 <ErrorBoundary module="Coronary" component="CoronaryInterventionModule"><CoronaryInterventionModule /></ErrorBoundary>
 </AppShell>
 </ProtectedRoute>
 } />
 <Route path="/valvular/*" element={
 <ProtectedRoute>
 <AppShell>
 <ErrorBoundary module="Valvular" component="ValvularDiseaseModule"><ValvularDiseaseModule /></ErrorBoundary>
 </AppShell>
 </ProtectedRoute>
 } />
 <Route path="/peripheral/*" element={
 <ProtectedRoute>
 <AppShell>
 <ErrorBoundary module="Peripheral Vascular" component="PeripheralVascularModule"><PeripheralVascularModule /></ErrorBoundary>
 </AppShell>
 </ProtectedRoute>
 } />
 <Route path="/research/*" element={
 <ProtectedRoute>
 <AppShell>
 <ErrorBoundary module="Clinical Research Assist" component="ResearchModule"><ResearchModule /></ErrorBoundary>
 </AppShell>
 </ProtectedRoute>
 } />
 <Route path="/service-line" element={
 <ProtectedRoute>
 <AppShell><FreeTierDashboard /></AppShell>
 </ProtectedRoute>
 } />
 <Route path="/data" element={
 <ProtectedRoute>
 <AppShell><DataManagementPortal /></AppShell>
 </ProtectedRoute>
 } />
 <Route path="/settings" element={
 <ProtectedRoute>
 <AppShell><SettingsPage /></AppShell>
 </ProtectedRoute>
 } />
 <Route path="/profile" element={
 <ProtectedRoute>
 <AppShell><ProfilePage /></AppShell>
 </ProtectedRoute>
 } />
 <Route path="*" element={
 <ProtectedRoute>
 <AppShell><NotFoundPage /></AppShell>
 </ProtectedRoute>
 } />
 </Routes>
 </Suspense>
 </BrowserRouter>
 </AuthProvider>
 </ErrorBoundary>
  );
}
