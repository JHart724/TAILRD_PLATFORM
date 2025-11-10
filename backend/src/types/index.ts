export interface RedoxWebhookPayload {
  EventType: string;
  EventDateTime: string;
  Test: boolean;
  Source: {
    ID?: string;
    Name?: string;
  };
  Destinations: Array<{
    ID?: string;
    Name?: string;
  }>;
  Patient?: FHIRPatient;
  Visit?: FHIREncounter;
  Orders?: FHIROrder[];
  Results?: FHIRObservation[];
  Meta?: {
    DataModel: string;
    EventType: string;
    EventDateTime: string;
    Test: boolean;
    Source: {
      ID: string;
      Name: string;
    };
    Destinations: Array<{
      ID: string;
      Name: string;
    }>;
    FacilityCode?: string;
  };
}

export interface FHIRPatient {
  resourceType: 'Patient';
  id?: string;
  identifier?: Array<{
    use?: string;
    type?: {
      coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
    };
    system?: string;
    value?: string;
  }>;
  active?: boolean;
  name?: Array<{
    use?: string;
    family?: string;
    given?: string[];
    prefix?: string[];
    suffix?: string[];
  }>;
  telecom?: Array<{
    system?: string;
    value?: string;
    use?: string;
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  address?: Array<{
    use?: string;
    type?: string;
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
  maritalStatus?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  };
  contact?: Array<{
    relationship?: Array<{
      coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
    }>;
    name?: {
      family?: string;
      given?: string[];
    };
    telecom?: Array<{
      system?: string;
      value?: string;
      use?: string;
    }>;
  }>;
}

export interface FHIREncounter {
  resourceType: 'Encounter';
  id?: string;
  identifier?: Array<{
    use?: string;
    system?: string;
    value?: string;
  }>;
  status?: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled';
  class?: {
    system?: string;
    code?: string;
    display?: string;
  };
  type?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  }>;
  subject?: {
    reference?: string;
    display?: string;
  };
  period?: {
    start?: string;
    end?: string;
  };
  reasonCode?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;
  diagnosis?: Array<{
    condition?: {
      reference?: string;
      display?: string;
    };
    use?: {
      coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
    };
    rank?: number;
  }>;
  location?: Array<{
    location?: {
      reference?: string;
      display?: string;
    };
    status?: string;
    period?: {
      start?: string;
      end?: string;
    };
  }>;
}

export interface FHIRObservation {
  resourceType: 'Observation';
  id?: string;
  identifier?: Array<{
    use?: string;
    system?: string;
    value?: string;
  }>;
  status?: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  }>;
  code?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  subject?: {
    reference?: string;
    display?: string;
  };
  encounter?: {
    reference?: string;
  };
  effectiveDateTime?: string;
  effectivePeriod?: {
    start?: string;
    end?: string;
  };
  issued?: string;
  performer?: Array<{
    reference?: string;
    display?: string;
  }>;
  valueQuantity?: {
    value?: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  valueCodeableConcept?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueRange?: {
    low?: {
      value?: number;
      unit?: string;
      system?: string;
      code?: string;
    };
    high?: {
      value?: number;
      unit?: string;
      system?: string;
      code?: string;
    };
  };
  interpretation?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  }>;
  referenceRange?: Array<{
    low?: {
      value?: number;
      unit?: string;
      system?: string;
      code?: string;
    };
    high?: {
      value?: number;
      unit?: string;
      system?: string;
      code?: string;
    };
    type?: {
      coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
    };
    text?: string;
  }>;
}

export interface FHIROrder {
  resourceType: 'ServiceRequest';
  id?: string;
  identifier?: Array<{
    use?: string;
    system?: string;
    value?: string;
  }>;
  status?: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';
  intent?: 'proposal' | 'plan' | 'directive' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  category?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  }>;
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  code?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  subject?: {
    reference?: string;
    display?: string;
  };
  encounter?: {
    reference?: string;
  };
  occurrenceDateTime?: string;
  occurrencePeriod?: {
    start?: string;
    end?: string;
  };
  authoredOn?: string;
  requester?: {
    reference?: string;
    display?: string;
  };
  performer?: Array<{
    reference?: string;
    display?: string;
  }>;
  reasonCode?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;
}

export interface CardiovascularModule {
  id: string;
  name: string;
  type: 'heart-failure' | 'electrophysiology' | 'structural-heart' | 'coronary-intervention' | 'peripheral-vascular' | 'valvular-disease';
  patientCount: number;
  activePatients: number;
  riskScores: {
    low: number;
    moderate: number;
    high: number;
  };
  metrics: {
    [key: string]: number | string;
  };
  lastUpdated: Date;
}

export interface PatientAnalytics {
  patientId: string;
  moduleType: CardiovascularModule['type'];
  riskScore: number;
  riskCategory: 'low' | 'moderate' | 'high';
  clinicalMetrics: {
    [key: string]: number | string | boolean;
  };
  alerts: Alert[];
  recommendations: Recommendation[];
  lastAssessment: Date;
}

export interface Alert {
  id: string;
  type: 'clinical' | 'administrative' | 'technical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  patientId?: string;
  moduleType?: CardiovascularModule['type'];
  actionRequired: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface Recommendation {
  id: string;
  type: 'medication' | 'procedure' | 'followup' | 'lifestyle';
  priority: 'low' | 'medium' | 'high';
  description: string;
  evidence: string;
  patientId: string;
  moduleType: CardiovascularModule['type'];
  implementedAt?: Date;
  createdAt: Date;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends APIResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Hospital {
  id: string;
  name: string;
  system?: string; // Health system name if part of larger network
  npi?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  patientCount: number;
  bedCount: number;
  hospitalType: 'community' | 'academic' | 'specialty' | 'critical-access' | 'federal';
  redoxConfig: {
    sourceId: string;
    destinationId: string;
    webhookUrl: string;
    isActive: boolean;
  };
  modules: {
    heartFailure: boolean;
    electrophysiology: boolean;
    structuralHeart: boolean;
    coronaryIntervention: boolean;
    peripheralVascular: boolean;
    valvularDisease: boolean;
  };
  subscription: {
    tier: 'basic' | 'professional' | 'enterprise';
    startDate: Date;
    endDate?: Date;
    isActive: boolean;
    maxUsers: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  title?: string;
  department?: string;
  npi?: string; // For physicians
  role: 'super-admin' | 'hospital-admin' | 'physician' | 'nurse-manager' | 'quality-director' | 'analyst' | 'viewer';
  hospitalId: string; // Foreign key to Hospital
  permissions: UserPermissions;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPermissions {
  modules: {
    heartFailure: boolean;
    electrophysiology: boolean;
    structuralHeart: boolean;
    coronaryIntervention: boolean;
    peripheralVascular: boolean;
    valvularDisease: boolean;
  };
  views: {
    executive: boolean;     // C-suite, CMO, CNO
    serviceLines: boolean;  // Department heads, service line directors
    careTeam: boolean;      // Physicians, nurses, care coordinators
  };
  actions: {
    viewReports: boolean;
    exportData: boolean;
    manageUsers: boolean;
    configureAlerts: boolean;
    accessPHI: boolean;     // Patient Health Information
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  hospitalId: string;
  hospitalName: string;
  permissions: UserPermissions;
  iat: number;
  exp: number;
}

export interface LoginSession {
  id: string;
  userId: string;
  hospitalId: string;
  ipAddress: string;
  userAgent: string;
  loginTime: Date;
  lastActivity: Date;
  isActive: boolean;
  expiresAt: Date;
}