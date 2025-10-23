// Corporate Business Types
export type BusinessType =
  | 'fleet'
  | 'dealership'
  | 'repair_shop'
  | 'rental'
  | 'taxi_service'
  | 'trucking'
  | 'other';

export type SubscriptionTier = 'basic' | 'professional' | 'enterprise' | 'custom';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type EmployeeRole =
  | 'driver'
  | 'fleet_manager'
  | 'admin'
  | 'technician'
  | 'supervisor';

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'refunded';

export interface CorporateBusiness {
  id: string;
  created_at: string;
  updated_at: string;

  // Company information
  company_name: string;
  company_email: string;
  company_phone?: string;
  company_website?: string;

  // Business classification
  industry?: string;
  business_type: BusinessType;

  // Address information
  street_address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country: string;

  // Billing information
  billing_email?: string;
  billing_contact_name?: string;
  billing_contact_phone?: string;
  billing_address_same_as_company: boolean;
  billing_street_address?: string;
  billing_city?: string;
  billing_province?: string;
  billing_postal_code?: string;

  // Subscription details
  subscription_tier: SubscriptionTier;
  contract_start_date?: string;
  contract_end_date?: string;
  auto_renew: boolean;

  // Status and approval
  is_active: boolean;
  approval_status: ApprovalStatus;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;

  // Account management
  assigned_account_manager_id?: string;

  // Fleet and usage limits
  fleet_size?: number;
  monthly_session_limit?: number;
  current_month_sessions: number;

  // Pricing and discounts
  discount_percentage: number;
  custom_rate_per_session?: number;
  payment_terms: string;

  // Contact person (primary)
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone?: string;
  primary_contact_title?: string;

  // Additional details
  business_registration_number?: string;
  tax_id?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CorporateEmployee {
  id: string;
  created_at: string;
  updated_at: string;

  // Links
  corporate_id: string;
  employee_user_id: string;

  // Employee details
  employee_role: EmployeeRole;
  employee_number?: string;
  department?: string;

  // Status
  is_active: boolean;
  added_by?: string;
  removed_at?: string;
  removed_by?: string;

  // Usage tracking
  total_sessions: number;
  last_session_at?: string;

  // Additional details
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CorporateInvoice {
  id: string;
  created_at: string;
  updated_at: string;

  // Invoice details
  invoice_number: string;
  corporate_id: string;

  // Billing period
  billing_period_start: string;
  billing_period_end: string;

  // Amounts
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;

  // Sessions included
  sessions_count: number;
  session_ids: string[];

  // Status
  status: InvoiceStatus;
  sent_at?: string;
  due_date?: string;
  paid_at?: string;

  // Payment details
  payment_method?: string;
  payment_reference?: string;
  stripe_invoice_id?: string;

  // Invoice file
  pdf_url?: string;

  // Additional details
  notes?: string;
  internal_notes?: string;
  metadata?: Record<string, any>;
}

export interface CorporateVehicle {
  id: string;
  created_at: string;
  updated_at: string;

  // Links
  corporate_id: string;

  // Vehicle details
  vehicle_number?: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;

  // Assignment
  assigned_to_employee_id?: string;

  // Status
  is_active: boolean;

  // Service tracking
  last_service_date?: string;
  next_service_date?: string;
  total_sessions: number;

  // Additional details
  notes?: string;
  metadata?: Record<string, any>;
}

// API Response Types
export interface CorporateSignupRequest {
  companyName: string;
  companyEmail: string;
  companyPhone?: string;
  companyWebsite?: string;
  businessType: BusinessType;
  industry?: string;
  streetAddress?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  contactTitle?: string;
  businessRegistrationNumber?: string;
  taxId?: string;
  fleetSize?: string;
  estimatedMonthlyUsage?: string;
  currentChallenges?: string;
  desiredFeatures?: string;
}

export interface CorporateDashboardData {
  account: CorporateBusiness;
  employees: (CorporateEmployee & { user?: { email: string; full_name: string } })[];
  vehicles: CorporateVehicle[];
  invoices: CorporateInvoice[];
  sessions: any[];
}

export interface AddEmployeeRequest {
  email: string;
  role: EmployeeRole;
  employeeNumber?: string;
  department?: string;
}

// Subscription Tier Configurations
export const SUBSCRIPTION_TIERS = {
  basic: {
    name: 'Basic',
    monthlyLimit: 100,
    discount: 5,
    features: [
      'Up to 10 vehicles',
      'Basic reporting',
      'Email support',
      '5% volume discount',
    ],
  },
  professional: {
    name: 'Professional',
    monthlyLimit: 500,
    discount: 10,
    features: [
      'Up to 50 vehicles',
      'Advanced analytics',
      'Priority support',
      '10% volume discount',
      'Dedicated account manager',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    monthlyLimit: null, // Unlimited
    discount: 15,
    features: [
      'Unlimited vehicles',
      'Custom integrations',
      '24/7 premium support',
      '15% volume discount',
      'Dedicated account manager',
      'Custom SLA',
      'API access',
    ],
  },
  custom: {
    name: 'Custom',
    monthlyLimit: null,
    discount: 0,
    features: ['Custom pricing', 'Tailored features', 'Enterprise support'],
  },
};

// Business Type Labels
export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  fleet: 'Fleet Management',
  dealership: 'Automotive Dealership',
  repair_shop: 'Repair Shop',
  rental: 'Rental Company',
  taxi_service: 'Taxi/Ride Service',
  trucking: 'Trucking Company',
  other: 'Other',
};

// Employee Role Labels
export const EMPLOYEE_ROLE_LABELS: Record<EmployeeRole, string> = {
  driver: 'Driver',
  fleet_manager: 'Fleet Manager',
  admin: 'Admin',
  technician: 'Technician',
  supervisor: 'Supervisor',
};
