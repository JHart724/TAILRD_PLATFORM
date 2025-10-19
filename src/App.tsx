import React, { useState, useMemo, useCallback, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";

// Lazy load all modules
const HFModule = lazy(() => import("./ui/heartFailure/HFModule"));
const EPModule = lazy(() => import("./ui/electrophysiology/EPModule"));
const StructuralHeartModule = lazy(() => import("./ui/structuralHeart/StructuralHeartModule"));
const CoronaryInterventionModule = lazy(() => import("./ui/coronaryIntervention/CoronaryInterventionModule"));
const ValvularDiseaseModule = lazy(() => import("./ui/valvularDisease/ValvularDiseaseModule"));
const PeripheralVascularModule = lazy(() => import("./ui/peripheralVascular/PeripheralVascularModule"));

// Core Types
type Role = "Executive" | "Service Line" | "Care Team";
type ModuleId = "hf" | "ep" | "structural" | "coronary" | "valvular" | "peripheral";
type ViewMode = "main" | "module";
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

// Icons
const Icons = {
  Users: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197V9a3 3 0 00-6 0v12.01" />
    </svg>
  ),
  Dollar: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  ),
  Target: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Activity: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Heart: () => (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  Zap: () => (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Valve: () => (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8M12 8v8" />
    </svg>
  ),
  Coronary: () => (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 8l8 8M16 8l-8 8" />
    </svg>
  ),
  Peripheral: () => (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 16l8-8M16 16l-8-8" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  Settings: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Alert: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  Brain: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
};

const formatMoney = (amount: number): string => {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
  return `$${amount.toLocaleString()}`;
};

const MODULES: Module[] = [
  {
    id: "hf",
    name: "Heart Failure",
    shortName: "HF",
    description: "GDMT optimization with specialty phenotype detection",
    functional: true,
    patients: 1247,
    procedures: 892,
    revenue: 804780,
    qualityScore: 94,
    icon: Icons.Heart,
    features: ["GDMT Analytics", "Specialty Screening", "Advanced Therapies", "340B Revenue"],
  },
  {
    id: "ep",
    name: "Electrophysiology",
    shortName: "EP",
    description: "AI-powered rhythm management and device optimization",
    functional: true,
    patients: 2156,
    procedures: 1234,
    revenue: 3250000,
    qualityScore: 96,
    icon: Icons.Zap,
    features: ["AI Risk Detection", "Device Management", "LAAC Workflow", "Mount Sinai Algorithms"],
  },
  {
    id: "structural",
    name: "Structural Heart",
    shortName: "Structural",
    description: "TAVR, TEER, and LAAC program management",
    functional: true,
    patients: 1876,
    procedures: 945,
    revenue: 1704220,
    qualityScore: 96,
    icon: Icons.Valve,
    features: ["TAVR Pipeline", "TEER Workflow", "Heart Team Integration", "Risk Stratification"],
  },
  {
    id: "coronary",
    name: "Coronary Revascularization",
    shortName: "Coronary",
    description: "PCI and CABG decision support with imaging guidance",
    functional: true,
    patients: 8234,
    procedures: 4567,
    revenue: 4012440,
    qualityScore: 95,
    icon: Icons.Coronary,
    features: ["SYNTAX Integration", "Imaging Guidance", "Heart Team Workflow", "DAPT Optimization"],
  },
  {
    id: "valvular",
    name: "Valvular Disease",
    shortName: "Valvular",
    description: "Valve disease progression and intervention timing",
    functional: true,
    patients: 2156,
    procedures: 1234,
    revenue: 1908130,
    qualityScore: 93,
    icon: Icons.Activity,
    features: ["Disease Progression", "Intervention Timing", "Multi-valve Tracking", "Echo Integration"],
  },
  {
    id: "peripheral",
    name: "Peripheral Vascular",
    shortName: "Peripheral",
    description: "PAD management and access optimization",
    functional: true,
    patients: 1892,
    procedures: 876,
    revenue: 1055770,
    qualityScore: 91,
    icon: Icons.Peripheral,
    features: ["PAD Management", "Access Optimization", "Risk Stratification", "Wound Care"],
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
      default: "bg-white/70 border-slate-200/70 text-slate-900",
      success: "bg-emerald-50/70 border-emerald-200/70 text-emerald-900",
      warning: "bg-amber-50/70 border-amber-200/70 text-amber-900",
      danger: "bg-rose-50/70 border-rose-200/70 text-rose-900",
      info: "bg-blue-50/70 border-blue-200/70 text-blue-900",
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
          {Icon && (<div className="p-2 rounded-lg bg-steel-50 shadow-retina-1"><Icon /></div>)}
          <span className="text-sm font-semibold text-steel-800">{label}</span>
        </div>
        {trend !== undefined && (<div className={`text-xs font-semibold ${trend > 0 ? "text-medical-green-600" : "text-medical-red-600"}`}>{trend > 0 ? "↗" : "↘"} {Math.abs(trend)}%</div>)}
      </div>
      <div className="text-3xl font-bold text-steel-900 mb-1">{value}</div>
    </div>
  );
};

interface RoleToggleProps { value: Role; onChange: (role: Role) => void; }

const RoleToggle: React.FC<RoleToggleProps> = ({ value, onChange }) => {
  const roles: Array<{ id: Role; label: string; desc: string; color: string; }> = [
    { id: "Executive", label: "Executive", desc: "Financial & ROI", color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
    { id: "Service Line", label: "Service Line", desc: "Operations", color: "text-amber-700 bg-amber-50 border-amber-200" },
    { id: "Care Team", label: "Care Team", desc: "Patient Care", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  ];

  return (
    <div className="flex gap-2 bg-white/80 rounded-xl p-2 border border-slate-200/70 backdrop-blur-sm shadow-lg">
      {roles.map((role) => (
        <button key={role.id} onClick={() => onChange(role.id)} className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${value === role.id ? `${role.color} shadow-sm transform scale-105` : "text-slate-700 hover:text-slate-900 hover:bg-slate-50"}`}>
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
    <button onClick={onClick} className="floating-screen p-8 text-left group cursor-pointer">
      <div className="flex items-start justify-between mb-6">
        <div className="p-4 rounded-2xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-indigo-100 group-hover:from-blue-100 group-hover:to-indigo-200"><Icon /></div>
        <span className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-full font-medium border border-emerald-200">Active</span>
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{module.name}</h3>
      <p className="text-sm text-slate-600 mb-4 leading-relaxed">{module.description}</p>
      <div className="space-y-3 text-sm text-slate-700">
        <div className="flex justify-between items-center"><span className="flex items-center gap-2"><Icons.Users /><span>Patients</span></span><span className="font-bold text-lg">{module.patients.toLocaleString()}</span></div>
        <div className="flex justify-between items-center"><span className="flex items-center gap-2"><Icons.Activity /><span>Procedures</span></span><span className="font-bold text-lg">{module.procedures.toLocaleString()}</span></div>
        <div className="flex justify-between items-center"><span className="flex items-center gap-2"><Icons.Target /><span>Quality Score</span></span><span className="font-bold text-lg text-emerald-600">{module.qualityScore}%</span></div>
        <div className="flex justify-between items-center"><span className="flex items-center gap-2"><Icons.Dollar /><span>Revenue</span></span><span className="font-bold text-lg text-blue-600">{formatMoney(module.revenue)}</span></div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">{module.features.slice(0, 3).map((feature) => (<span key={feature} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">{feature}</span>))}</div>
      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300"><div className="p-2 rounded-full bg-blue-500 text-white"><Icons.ArrowRight /></div></div>
    </button>
  );
};

interface PatientQueueProps { title: string; patients: Patient[]; variant?: PatientQueueVariant; maxItems?: number; }

const PatientQueue: React.FC<PatientQueueProps> = ({ title, patients, variant = "default", maxItems = 6 }) => {
  const getVariantStyle = (variant: PatientQueueVariant): string => {
    switch (variant) {
      case "warning": return "bg-amber-50 border-amber-200";
      case "danger": return "bg-red-50 border-red-200";
      case "success": return "bg-emerald-50 border-emerald-200";
      default: return "bg-blue-50 border-blue-200";
    }
  };

  return (
    <div className="floating-screen p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-steel-900">{title}</h3>
        <span className="text-lg font-bold text-steel-600">{patients.length}</span>
      </div>
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {patients.slice(0, maxItems).map((patient) => (
          <div key={patient.id} className={`flex items-center justify-between p-4 ${getVariantStyle(variant)} rounded-xl border transition-all hover:shadow-md`}>
            <div className="flex-1">
              <div className="font-semibold text-slate-900">{patient.name}</div>
              <div className="text-sm text-slate-600">{patient.age}y • {patient.id} • {patient.physician}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs px-3 py-1.5 rounded-full bg-white/80 text-slate-700 font-medium">{patient.status}</div>
              <Icons.ArrowRight />
            </div>
          </div>
        ))}
        {patients.length > maxItems && (<div className="text-center py-4 text-sm text-slate-500">+{patients.length - maxItems} more patients</div>)}
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
  };
  return kpiData[moduleId]?.[role] ?? [];
};

function MainDashboard(): JSX.Element {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("main");
  const [activeModule, setActiveModule] = useState<ModuleId>("hf");
  const [moduleRole, setModuleRole] = useState<Role>("Executive");
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
    switch (moduleId) {
      case "hf":
        navigate("/hf");
        break;
      case "ep":
        navigate("/ep");
        break;
      case "structural":
        navigate("/structural");
        break;
      case "coronary":
        navigate("/coronary");
        break;
      case "valvular":
        navigate("/valvular");
        break;
      case "peripheral":
        navigate("/peripheral");
        break;
      default:
        setActiveModule(moduleId);
        setViewMode("module");
    }
  }, [navigate]);

  const backToMain = useCallback(() => { setViewMode("main"); }, []);

  if (viewMode === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">TAILRD Healthcare Platform</h1>
              <p className="text-lg text-slate-600">Comprehensive cardiovascular care management</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">Last Updated</div>
              <div className="text-lg font-semibold text-slate-700">{new Date().toLocaleDateString()}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <KpiCard label="Total Patients" value={totalMetrics.totalPatients.toLocaleString()} icon={Icons.Users} variant="default" trend={8.2} />
            <KpiCard label="Total Procedures" value={totalMetrics.totalProcedures.toLocaleString()} icon={Icons.Activity} variant="success" trend={12.4} />
            <KpiCard label="Total Revenue" value={formatMoney(totalMetrics.totalRevenue)} icon={Icons.Dollar} variant="success" trend={15.7} />
            <KpiCard label="Avg Quality Score" value={`${totalMetrics.avgQuality}%`} icon={Icons.Target} variant="success" trend={3.2} />
            <KpiCard label="Active Modules" value={`${totalMetrics.functionalModules}/6`} icon={Icons.Settings} variant="info" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Clinical Modules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {MODULES.map((module) => (<ModuleTile key={module.id} module={module} onClick={() => openModule(module.id)} />))}
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
    <div className="min-h-screen bg-liquid-medical p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={backToMain} className="btn-medical-secondary"><Icons.ArrowLeft /></button>
            <div>
              <h1 className="text-4xl font-bold text-steel-900 mb-2">{currentModule?.name}</h1>
              <p className="text-lg text-steel-600">{currentModule?.description}</p>
            </div>
          </div>
          <RoleToggle value={moduleRole} onChange={setModuleRole} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {moduleKPIs.map((kpi, index) => (<KpiCard key={index} {...kpi} />))}
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

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center"><div className="text-xl font-semibold text-slate-700">Loading...</div></div>}>
        <Routes>
          <Route path="/" element={<MainDashboard />} />
          <Route path="/hf/*" element={<HFModule />} />
          <Route path="/ep/*" element={<EPModule />} />
          <Route path="/structural/*" element={<StructuralHeartModule />} />
          <Route path="/coronary/*" element={<CoronaryInterventionModule />} />
          <Route path="/valvular/*" element={<ValvularDiseaseModule />} />
          <Route path="/peripheral/*" element={<PeripheralVascularModule />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
