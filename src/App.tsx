import React, { useState, useMemo, useCallback, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import CountUp from 'react-countup';
import TailrdLogo from './components/TailrdLogo';

// Add custom animations for Web3Background effects
const customStyles = `
  @keyframes float {
    0%, 100% {
      transform: translateY(0px) rotate(45deg);
    }
    50% {
      transform: translateY(-30px) rotate(45deg);
    }
  }
  @keyframes pulse {
    0%, 100% {
      opacity: 0.2;
      transform: scale(1);
    }
    50% {
      opacity: 0.3;
      transform: scale(1.1);
    }
  }
  @keyframes shimmer {
    0% { background-position: 0% 0%; }
    50% { background-position: 100% 100%; }
    100% { background-position: 0% 0%; }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = customStyles;
  document.head.appendChild(styleSheet);
}

// Lazy load all modules
const Login = lazy(() => import("./components/Login"));
const HFModule = lazy(() => import("./ui/heartFailure/HFModule"));
const EPModule = lazy(() => import("./ui/electrophysiology/EPModule"));
const StructuralHeartModule = lazy(() => import("./ui/structuralHeart/StructuralHeartModule"));
const CoronaryInterventionModule = lazy(() => import("./ui/coronaryIntervention/CoronaryInterventionModule"));
const ValvularDiseaseModule = lazy(() => import("./ui/valvularDisease/ValvularDiseaseModule"));
const PeripheralVascularModule = lazy(() => import("./ui/peripheralVascular/PeripheralVascularModule"));

// Core Types
type Role = "Executive" | "Service Line" | "Care Team";
type ModuleId = "hf" | "ep" | "structural" | "coronary" | "valvular" | "peripheral";
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
    <svg className="h-8 w-8 text-medical-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  Monitor: () => (
    <svg className="h-8 w-8 text-medical-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <g strokeWidth={2}>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 21h8M12 16v5" />
        <path strokeLinecap="round" d="M7 10h10M7 12h8" />
      </g>
    </svg>
  ),
  Heart: () => (
    <svg className="h-8 w-8 text-medical-blue-800" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ),
  Zap: () => (
    <svg className="h-8 w-8 text-medical-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  Valve: () => (
    <svg className="h-8 w-8 text-medical-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v10M7 12h10" />
      <circle cx="12" cy="12" r="3" strokeWidth={2} fill="currentColor" fillOpacity="0.3" />
    </svg>
  ),
  Coronary: () => (
    <svg className="h-8 w-8 text-medical-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <g strokeWidth={2}>
        <path d="M12 3v9M8 8l4 4 4-4" />
        <circle cx="8" cy="16" r="3" />
        <circle cx="16" cy="16" r="3" />
        <path d="M12 12v1c0 2-2 3-4 3M12 12v1c0 2 2 3 4 3" />
      </g>
    </svg>
  ),
  Peripheral: () => (
    <svg className="h-8 w-8 text-medical-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <g strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M12 2c0 0-4 2-4 6s4 6 4 6M12 2c0 0 4 2 4 6s-4 6-4 6M12 14c0 0-3 2-3 5s3 3 3 3M12 14c0 0 3 2 3 5s-3 3-3 3" />
      </g>
    </svg>
  ),
  ArrowRight: () => (
    <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  Chart: () => (
    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Database: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  DollarChart: () => (
    <svg className="h-8 w-8 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l3-3 3 3 5-5" />
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
    description: "Population screening to individual GDMT optimization across PCP-Cardiology continuum",
    functional: true,
    patients: 1247,
    procedures: 892,
    revenue: 804780,
    qualityScore: 94,
    icon: Icons.Monitor,
    features: ["GDMT Analytics", "Specialty Screening", "Advanced Therapies", "340B Revenue"],
  },
  {
    id: "ep",
    name: "Electrophysiology",
    shortName: "EP",
    description: "Population AFib screening to complex EP procedures across all care settings",
    functional: true,
    patients: 2156,
    procedures: 1234,
    revenue: 3250000,
    qualityScore: 96,
    icon: Icons.Zap,
    features: ["Ablation Procedures", "Device Management", "LAAC (Watchman/Amulet)", "AI Risk Stratification"],
  },
  {
    id: "structural",
    name: "Structural Heart",
    shortName: "Structural",
    description: "Population valve disease detection to complex transcatheter interventions",
    functional: true,
    patients: 1876,
    procedures: 945,
    revenue: 1704220,
    qualityScore: 96,
    icon: Icons.Valve,
    features: ["TAVR Program", "TEER (MitraClip)", "Balloon Valvuloplasty", "ASD/PFO Closure"],
  },
  {
    id: "coronary",
    name: "Coronary Revascularization",
    shortName: "Coronary",
    description: "Population CAD screening to complex revascularization across PCP-Cardiology-Surgery",
    functional: true,
    patients: 8234,
    procedures: 4567,
    revenue: 4012440,
    qualityScore: 95,
    icon: Icons.Coronary,
    features: ["Complex PCI/CTO", "Protected PCI (Impella)", "CABG Program", "SYNTAX Score Integration"],
  },
  {
    id: "valvular",
    name: "Valvular Surgery",
    shortName: "Valvular",
    description: "Population valve screening to complex surgical repair across care continuum",
    functional: true,
    patients: 2156,
    procedures: 1234,
    revenue: 1908130,
    qualityScore: 93,
    icon: Icons.Activity,
    features: ["Ross Procedure", "Mitral Valve Repair", "Bicuspid Aortic Repair", "Complex Valve Surgery"],
  },
  {
    id: "peripheral",
    name: "Peripheral Vascular",
    shortName: "Peripheral",
    description: "Population PAD screening to complex interventions across PCP-Cardiology continuum",
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
      default: "bg-white border-steel-200",
      success: "bg-emerald-50 border-emerald-200 text-emerald-900",
      warning: "bg-amber-50 border-amber-200 text-amber-900",
      danger: "bg-rose-50 border-rose-200 text-rose-900",
      info: "bg-blue-50 border-blue-200 text-blue-900",
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
          {Icon && (<div className="p-2 rounded-lg bg-slate-600 shadow-retina-1"><Icon /></div>)}
          <span className="text-sm font-semibold text-slate-300">{label}</span>
        </div>
        {trend !== undefined && (<div className={`text-xs font-semibold ${trend > 0 ? "text-medical-green-600" : "text-medical-red-600"}`}>{trend > 0 ? "↗" : "↘"} {Math.abs(trend)}%</div>)}
      </div>
      <div className="text-3xl font-bold text-slate-100 mb-1">{value}</div>
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
        <button key={role.id} onClick={() => onChange(role.id)} className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${value === role.id ? `${role.color} shadow-sm transform scale-105` : "text-steel-700 hover:text-steel-900 hover:bg-steel-50"}`}>
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
      <div className="absolute -inset-1 bg-gradient-to-br from-white/30 via-white/20 to-white/15 rounded-2xl blur opacity-0 group-hover:opacity-60 transition-all duration-500"></div>
      
      <div className="relative bg-white/60 backdrop-blur-lg border border-white/30 rounded-2xl p-6 shadow-lg shadow-white/10 transition-all duration-500 group-hover:bg-white/70 group-hover:backdrop-blur-xl group-hover:shadow-2xl group-hover:shadow-white/20 group-hover:scale-[1.03] group-hover:border-white/50 group-hover:-translate-y-1">
        {/* Enhanced shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="relative space-y-4">
          {/* Icon container - no blue background on hover */}
          <div className="w-fit">
            <div className="p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-white/40 transition-all duration-500 group-hover:bg-white/70 group-hover:border-white/60 group-hover:shadow-lg">
              <Icon />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-800 transition-colors duration-300 group-hover:text-slate-900">{module.name}</h3>
            <p className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-700 transition-colors duration-300">{module.description}</p>
          </div>
          
          {/* Arrow indicator */}
          <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-2 group-hover:translate-x-0">
            <div className="p-2 rounded-lg bg-white/60 backdrop-blur-sm border border-white/40 shadow-lg">
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
        {patients.length > maxItems && (<div className="text-center py-4 text-sm text-slate-600">+{patients.length - maxItems} more patients</div>)}
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

  const openModule = useCallback(async (moduleId: ModuleId) => {
    setIsLoading(true);
    // Add a delay to show loading animation for analytics processing
    await new Promise(resolve => setTimeout(resolve, 800));
    
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
    setIsLoading(false);
  }, [navigate]);

  const backToMain = useCallback(() => { setViewMode("main"); }, []);
  const [aggregateView, setAggregateView] = useState<'executive' | 'service-line'>('executive');

  if (viewMode === "main") {
    return (
      <div className="min-h-screen relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, rgba(150, 175, 200, 1) 0%, rgba(197, 217, 232, 1) 30%, rgba(224, 235, 245, 1) 60%, rgba(240, 245, 250, 1) 100%)'
      }}>
        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, rgba(150, 175, 200, 1) 0%, rgba(197, 217, 232, 1) 30%, rgba(224, 235, 245, 1) 60%, rgba(240, 245, 250, 1) 100%)'
          }}>
            <div className="text-center">
              {/* Loading animation */}
              <div className="mb-8">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 border-4 border-white/40 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-white/80 rounded-full border-t-transparent animate-spin"></div>
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
                <div className="w-2 h-2 bg-white/80 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-white/90 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
              </div>
              
              {/* Subtitle */}
              <p className="text-sm text-white mt-6" style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)' }}>
                Population • Panel • Patient Analytics
              </p>
            </div>
          </div>
        )}
        
        {/* Web3Background-style floating particles and patterns */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Glassmorphic overlays matching Web3Background */}
          <div 
            className="absolute top-20 left-20 w-96 h-96 rounded-full opacity-40 blur-3xl animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(240, 245, 250, 0.8) 0%, rgba(197, 217, 232, 0.5) 50%, transparent 70%)',
              animation: 'pulse 8s ease-in-out infinite'
            }}
          />
          <div 
            className="absolute bottom-20 right-20 w-96 h-96 rounded-full opacity-45 blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.7) 0%, rgba(240, 245, 250, 0.4) 50%, transparent 70%)',
              animation: 'pulse 10s ease-in-out infinite reverse'
            }}
          />
          <div 
            className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full opacity-35 blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(197, 217, 232, 0.7) 0%, rgba(224, 235, 245, 0.5) 50%, transparent 70%)',
              animation: 'pulse 12s ease-in-out infinite',
              transform: 'translate(-50%, -50%)'
            }}
          />
        </div>

        {/* Geometric floating shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute top-1/4 left-1/4 w-32 h-32 border-2 border-white/60 rounded-lg backdrop-blur-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(240, 245, 250, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)',
              boxShadow: '0 0 50px rgba(240, 245, 250, 0.6), inset 0 0 25px rgba(255, 255, 255, 0.3)',
              animation: 'float 20s ease-in-out infinite',
              transform: 'rotate(45deg)'
            }}
          />
          <div 
            className="absolute top-1/2 right-1/3 w-24 h-24 border-2 border-white/50 rounded-full backdrop-blur-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(224, 235, 245, 0.2) 100%)',
              boxShadow: '0 0 40px rgba(255, 255, 255, 0.5), inset 0 0 20px rgba(240, 245, 250, 0.35)',
              animation: 'float 15s ease-in-out infinite reverse'
            }}
          />
          <div 
            className="absolute bottom-1/4 left-1/2 w-40 h-40 border-2 border-white/55 backdrop-blur-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(224, 235, 245, 0.25) 0%, rgba(197, 217, 232, 0.18) 100%)',
              boxShadow: '0 0 60px rgba(224, 235, 245, 0.7), inset 0 0 30px rgba(255, 255, 255, 0.25)',
              animation: 'float 18s ease-in-out infinite',
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
            }}
          />
        </div>
        
        <div className="relative z-10 min-h-screen p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Clean Professional Medical Header */}
            <div className="flex items-center justify-between">
              <div>
                <TailrdLogo size="large" variant="light" className="mb-3" />
                <p className="text-lg text-slate-600 font-light">Precision Cardiovascular Care Platform</p>
              </div>
              <div className="text-right">
                <div className="bg-gradient-to-br from-white/80 to-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-xl p-4 shadow-lg shadow-blue-200/10">
                  <div className="text-xs text-blue-600 mb-1 font-medium">Last Updated</div>
                  <div className="text-lg font-medium text-slate-700">{new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            
            {/* Cardiovascular Service Line - Slightly darker than modules */}
            <div className="flex justify-center mb-8">
              <button 
                onClick={async () => {
                  setIsLoading(true);
                  // Add delay to show loading animation for comprehensive analytics
                  await new Promise(resolve => setTimeout(resolve, 1200));
                  setViewMode('aggregate');
                  setIsLoading(false);
                }}
                className="relative group"
              >
                {/* Subtle glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-white/15 to-white/10 rounded-3xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                
                <div className="relative px-12 py-6 bg-gradient-to-br from-white/70 via-white/80 to-white/70 text-slate-700 rounded-2xl backdrop-blur-xl border border-white/40 shadow-xl transition-all duration-300 group-hover:shadow-2xl group-hover:scale-[1.02] group-hover:from-white/80 group-hover:via-white/90 group-hover:to-white/80">
                  {/* Subtle shine */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-medical-blue-100 border border-medical-blue-200">
                      <Icons.Chart />
                    </div>
                    <div className="text-left">
                      <div className="text-2xl font-medium">Cardiovascular Service Line</div>
                      <div className="text-sm opacity-80 font-light">Population • Panel • Patient - PCP to Specialty Care</div>
                    </div>
                    <Icons.ArrowRight />
                  </div>
                </div>
              </button>
            </div>
            
            {/* Clinical Modules */}
            <div>
              <h2 className="text-2xl font-light text-slate-700 mb-6">Clinical Modules</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MODULES.map((module) => (<ModuleTile key={module.id} module={module} onClick={() => openModule(module.id)} />))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Comprehensive Cardiovascular Service Line Dashboard
  if (viewMode === "aggregate") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-100 to-blue-100 relative overflow-hidden">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-slate-100 to-blue-100 z-[100] flex items-center justify-center">
            <div className="text-center">
              {/* Loading animation */}
              <div className="mb-8">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
              </div>
              
              {/* Brand */}
              <div className="mb-2">
                <TailrdLogo size="medium" variant="light" />
              </div>
              
              {/* Loading message */}
              <p className="text-lg text-slate-600 font-light mb-4">Processing Service Line Analytics...</p>
              
              {/* Animated dots */}
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
              </div>
              
              {/* Subtitle */}
              <p className="text-sm text-slate-600 mt-6">
                Population • Panel • Patient Analytics
              </p>
            </div>
          </div>
        )}
        
        {/* Background effects */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 30% 20%, #1e40af 2px, transparent 2px), radial-gradient(circle at 70% 80%, #0ea5e9 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-slate-600/5"></div>
        
        <div className="relative z-10 min-h-screen p-6 overflow-y-auto">
          <div className="max-w-[120rem] mx-auto space-y-6">
            {/* Compact Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={backToMain}
                  className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-white/80 border border-blue-200/50 hover:from-blue-200 hover:to-blue-50 transition-all duration-300"
                >
                  <Icons.ArrowLeft />
                </button>
                <div>
                  <TailrdLogo size="medium" variant="light" />
                  <h2 className="text-xl font-medium text-slate-800 mb-2">Precision Cardiovascular Care Platform</h2>
                  <p className="text-slate-600 font-light mb-3">Comprehensive Service Line Analytics Dashboard</p>
                  
                  {/* Enhanced Analytics Framework Display */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg px-3 py-2 border border-blue-200/50">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="font-medium text-slate-700">Population</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span className="font-medium text-slate-700">Panel</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className="font-medium text-slate-700">Patient</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg px-3 py-2 border border-emerald-200/50">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                          <span className="font-medium text-slate-700">PCP</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          <span className="font-medium text-slate-700">Cardiology</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                          <span className="font-medium text-slate-700">Hospital</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="bg-gradient-to-br from-blue-50/80 to-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl p-3">
                  <div className="text-xs text-blue-600 font-medium">Real-time Data</div>
                  <div className="text-sm font-medium text-slate-800">{new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            
            {/* Executive Summary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50/60 via-white/70 to-blue-50/60 backdrop-blur-sm border border-blue-200/40 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50">
                    <Icons.Users />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{totalMetrics.totalPatients.toLocaleString()}</div>
                    <div className="text-sm text-slate-600">Active Patients</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-50/60 via-white/70 to-slate-50/60 backdrop-blur-sm border border-slate-200/40 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50">
                    <Icons.Activity />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{totalMetrics.totalProcedures.toLocaleString()}</div>
                    <div className="text-sm text-slate-600">Annual Procedures</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50/60 via-white/70 to-blue-50/60 backdrop-blur-sm border border-blue-200/40 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50">
                    <Icons.Dollar />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{formatMoney(totalMetrics.totalRevenue)}</div>
                    <div className="text-sm text-slate-600">Total Revenue</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-50/60 via-white/70 to-slate-50/60 backdrop-blur-sm border border-slate-200/40 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50">
                    <Icons.Target />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">4.8/5.0</div>
                    <div className="text-sm text-slate-600">CMS Star Rating</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Enhanced Data Sources & Care Continuum Integration */}
            <div className="bg-gradient-to-br from-emerald-50/60 via-white/70 to-emerald-50/60 backdrop-blur-sm border border-emerald-200/40 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-medium text-slate-800 flex items-center gap-3">
                  <Icons.Database />
                  <span>Precision Cardiovascular Care Platform</span>
                </h3>
                <div className="text-sm font-medium text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                  Population • Panel • Patient Analytics
                </div>
              </div>
              
              {/* Three-Tier Analytics Framework */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50/70 rounded-xl p-4 border border-blue-200/50">
                  <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    Population Analytics
                  </h4>
                  <div className="text-2xl font-bold text-blue-700 mb-2">
                    <CountUp start={0} end={127834} duration={1.5} separator="," useEasing={true} /> patients
                  </div>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li>• EHR population health screening</li>
                    <li>• Health plan risk stratification</li>
                    <li>• Community health assessments</li>
                    <li>• Social determinants integration</li>
                  </ul>
                </div>
                
                <div className="bg-purple-50/70 rounded-xl p-4 border border-purple-200/50">
                  <h4 className="text-lg font-semibold text-purple-800 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    Panel Analytics
                  </h4>
                  <div className="text-2xl font-bold text-purple-700 mb-2">
                    <CountUp start={0} end={112} duration={1.2} useEasing={true} /> providers
                  </div>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li>• Provider panel optimization</li>
                    <li>• Care gap identification</li>
                    <li>• Practice performance metrics</li>
                    <li>• Quality measure tracking</li>
                  </ul>
                </div>
                
                <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200/50">
                  <h4 className="text-lg font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    Patient Analytics
                  </h4>
                  <div className="text-2xl font-bold text-emerald-700 mb-2">
                    Individual-level insights
                  </div>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li>• Personalized risk assessment</li>
                    <li>• Treatment optimization</li>
                    <li>• Outcomes prediction</li>
                    <li>• Care pathway guidance</li>
                  </ul>
                </div>
              </div>
              
              {/* Care Continuum Integration */}
              <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4 border border-blue-200/50">
                <h4 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Icons.Heart />
                  Care Continuum Integration: PCP • Cardiology • Hospital
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
                      <span className="font-semibold text-emerald-800">Primary Care (<CountUp start={0} end={89} duration={1.0} useEasing={true} /> providers)</span>
                    </div>
                    <ul className="text-sm text-slate-700 space-y-1">
                      <li>• Family medicine practices</li>
                      <li>• Internal medicine groups</li>
                      <li>• Geriatric medicine panels</li>
                      <li>• Population health screening</li>
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      <span className="font-semibold text-blue-800">Cardiology (<CountUp start={0} end={23} duration={0.8} useEasing={true} /> specialists)</span>
                    </div>
                    <ul className="text-sm text-slate-700 space-y-1">
                      <li>• General cardiology clinics</li>
                      <li>• Heart failure specialists</li>
                      <li>• Preventive cardiology</li>
                      <li>• Subspecialty services</li>
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                      <span className="font-semibold text-red-800">Hospital System (<CountUp start={0} end={6} duration={0.6} useEasing={true} /> facilities)</span>
                    </div>
                    <ul className="text-sm text-slate-700 space-y-1">
                      <li>• Inpatient admissions</li>
                      <li>• Cath lab procedures</li>
                      <li>• Surgical interventions</li>
                      <li>• Emergency departments</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics Methodology */}
            <div className="bg-gradient-to-br from-blue-50/60 via-white/70 to-blue-50/60 backdrop-blur-sm border border-blue-200/40 rounded-xl p-4">
              <h3 className="text-lg font-medium text-slate-800 mb-3 flex items-center gap-2">
                <Icons.Brain />
                <span>Clinical Performance Framework</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium text-slate-700 mb-1">CMS Quality Measures</div>
                  <div className="text-slate-600">• AMI-7a: 30-day mortality<br/>• HF-1: Discharge instructions<br/>• PC-01: Elective delivery</div>
                </div>
                <div>
                  <div className="font-medium text-slate-700 mb-1">Professional Standards</div>
                  <div className="text-slate-600">• ACC/AHA Class I recommendations<br/>• ESC evidence level A<br/>• SCAI consensus statements</div>
                </div>
                <div>
                  <div className="font-medium text-slate-700 mb-1">National Registries</div>
                  <div className="text-slate-600">• STS Adult Cardiac Surgery DB<br/>• NCDR CathPCI Registry<br/>• TVT Registry (Edwards/Medtronic)</div>
                </div>
                <div>
                  <div className="font-medium text-slate-700 mb-1">Risk-Adjusted Outcomes</div>
                  <div className="text-slate-600">• O/E mortality ratios<br/>• AHRQ safety indicators<br/>• Leapfrog safety grades</div>
                </div>
              </div>
            </div>
            
            {/* Comprehensive Module Performance */}
            <div>
              <h3 className="text-xl font-medium text-slate-800 mb-4">Complete Module Performance Analysis</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {MODULES.map((module) => {
                  const Icon = module.icon;
                  const revenuePercentage = (module.revenue / totalMetrics.totalRevenue) * 100;
                  const patientShare = (module.patients / totalMetrics.totalPatients) * 100;
                  
                  // Evidence-based quality benchmarks from clinical literature
                  const qualityBenchmarks = {
                    hf: { benchmark: 85, metric: "GDMT Adherence (AHA/ACC Guidelines)" },
                    ep: { benchmark: 92, metric: "Composite Device Success (HRS Standards)" },
                    structural: { benchmark: 90, metric: "TAVR 30-day Mortality (STS Registry)" },
                    coronary: { benchmark: 88, metric: "Door-to-Balloon <90min (AHA Mission)" },
                    valvular: { benchmark: 93, metric: "Mitral Repair Success (STS Database)" },
                    peripheral: { benchmark: 87, metric: "Limb Salvage Rate (SVS Guidelines)" }
                  };
                  
                  const benchmark = qualityBenchmarks[module.id as keyof typeof qualityBenchmarks];
                  
                  return (
                    <div key={module.id} className="bg-gradient-to-br from-blue-50/60 via-white/70 to-blue-50/60 backdrop-blur-sm border border-blue-200/40 rounded-xl p-4">
                      {/* Module Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100/90 to-blue-50/90 border border-blue-200/30">
                          <Icon />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-slate-800">{module.name}</h4>
                          <p className="text-xs text-slate-600">{module.description}</p>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${
                            module.qualityScore >= benchmark.benchmark ? 'text-blue-600' : 'text-slate-600'
                          }`}>
                            {module.qualityScore}%
                          </div>
                          <div className="text-xs text-slate-500">Quality</div>
                        </div>
                      </div>
                      
                      {/* Key Metrics Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-slate-50/50 rounded-lg p-2">
                          <div className="text-lg font-bold text-slate-800">{module.patients.toLocaleString()}</div>
                          <div className="text-xs text-slate-600">Active Patients</div>
                          <div className="text-xs text-blue-600">{patientShare.toFixed(1)}% of total</div>
                        </div>
                        <div className="bg-slate-50/50 rounded-lg p-2">
                          <div className="text-lg font-bold text-slate-800">{module.procedures.toLocaleString()}</div>
                          <div className="text-xs text-slate-600">Annual Procedures</div>
                          <div className="text-xs text-slate-600">+8.2% YoY</div>
                        </div>
                        <div className="bg-slate-50/50 rounded-lg p-2">
                          <div className="text-lg font-bold text-blue-600">{formatMoney(module.revenue)}</div>
                          <div className="text-xs text-slate-600">Annual Revenue</div>
                          <div className="text-xs text-slate-600">{revenuePercentage.toFixed(1)}% of total</div>
                        </div>
                        <div className="bg-slate-50/50 rounded-lg p-2">
                          <div className="text-lg font-bold text-slate-700">{(module.revenue / module.procedures).toLocaleString('en-US', {style: 'currency', currency: 'USD'})}</div>
                          <div className="text-xs text-slate-600">Revenue/Procedure</div>
                          <div className="text-xs text-slate-600">+5.1% YoY</div>
                        </div>
                      </div>
                      
                      {/* Quality Detail */}
                      <div className="bg-slate-50/50 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-slate-700">Primary Quality Metric</span>
                          <span className={`text-sm font-bold ${
                            module.qualityScore >= benchmark.benchmark ? 'text-blue-600' : 'text-slate-600'
                          }`}>
                            {module.qualityScore >= benchmark.benchmark ? 'Above Benchmark' : 'Below Benchmark'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mb-2">{benchmark.metric}</div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              module.qualityScore >= benchmark.benchmark 
                                ? 'bg-gradient-to-r from-blue-400 to-blue-600' 
                                : 'bg-gradient-to-r from-slate-400 to-slate-600'
                            }`}
                            style={{ width: `${(module.qualityScore / 100) * 100}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-slate-500">
                          <span>Current: {module.qualityScore}%</span>
                          <span>Target: {benchmark.benchmark}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Service Line Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performers */}
              <div className="bg-gradient-to-br from-blue-50/60 via-white/70 to-blue-50/60 backdrop-blur-sm border border-blue-200/40 rounded-xl p-4">
                <h4 className="text-lg font-medium text-slate-800 mb-4">Top Performing Modules</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-blue-50/50 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-800">Electrophysiology</div>
                      <div className="text-sm text-slate-600">96% Composite Score • $3.25M Revenue • 1,234 Procedures</div>
                    </div>
                    <div className="text-blue-600 font-bold">#1</div>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-50/30 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-800">Heart Failure</div>
                      <div className="text-sm text-slate-600">94% GDMT Compliance • $805K Revenue • 892 Admissions</div>
                    </div>
                    <div className="text-blue-600 font-bold">#2</div>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-50/20 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-800">Structural Heart</div>
                      <div className="text-sm text-slate-600">96% TAVR Success • $1.70M Revenue • 945 Procedures</div>
                    </div>
                    <div className="text-blue-600 font-bold">#3</div>
                  </div>
                </div>
              </div>
              
              {/* Improvement Opportunities */}
              <div className="bg-gradient-to-br from-slate-50/60 via-white/70 to-slate-50/60 backdrop-blur-sm border border-slate-200/40 rounded-xl p-4">
                <h4 className="text-lg font-medium text-slate-800 mb-4">Improvement Opportunities</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-slate-50/50 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-800">Coronary Intervention</div>
                      <div className="text-sm text-slate-600">Door-to-balloon: 91% vs 95% target (AHA Mission: Lifeline)</div>
                    </div>
                    <div className="text-slate-600 font-bold">91%</div>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-slate-50/30 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-800">Peripheral Vascular</div>
                      <div className="text-sm text-slate-600">Limb salvage: 91% vs 94% SVS benchmark</div>
                    </div>
                    <div className="text-slate-600 font-bold">92%</div>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-slate-50/20 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-800">Valvular Disease</div>
                      <div className="text-sm text-slate-600">Mitral repair: 93% vs 95% STS benchmark</div>
                    </div>
                    <div className="text-slate-600 font-bold">93%</div>
                  </div>
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
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-100 to-blue-100 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `radial-gradient(circle at 30% 20%, #1e40af 2px, transparent 2px), radial-gradient(circle at 70% 80%, #0ea5e9 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}></div>
          
          <div className="relative z-10 flex items-center justify-center min-h-screen">
            <div className="text-center">
              {/* Loading animation */}
              <div className="mb-8">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
              </div>
              
              {/* Brand */}
              <div className="mb-2">
                <TailrdLogo size="medium" variant="light" />
              </div>
              
              {/* Loading message */}
              <p className="text-lg text-slate-600 font-light mb-4">Processing Analytics...</p>
              
              {/* Animated dots */}
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
              </div>
              
              {/* Subtitle */}
              <p className="text-sm text-slate-600 mt-6">
                Population • Panel • Patient Analytics
              </p>
            </div>
          </div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<MainDashboard />} />
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
