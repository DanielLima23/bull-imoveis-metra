export interface PropertyDto {
  id: string;
  code: string;
  title: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  status: 'AVAILABLE' | 'LEASED' | 'PREPARATION';
  notes?: string;
  currentBaseRent?: number;
  createdAtUtc: string;
}

export interface TenantDto {
  id: string;
  name: string;
  documentNumber: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAtUtc: string;
}

export interface LeaseDto {
  id: string;
  propertyId: string;
  tenantId: string;
  propertyTitle: string;
  tenantName: string;
  startDate: string;
  endDate?: string;
  monthlyRent: number;
  depositAmount?: number;
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'CANCELED';
  notes?: string;
  createdAtUtc: string;
}

export interface ExpenseTypeDto {
  id: string;
  name: string;
  category: string;
  isFixedCost: boolean;
}

export interface ExpenseInstallmentDto {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: string;
  paidAtUtc?: string;
  paidAmount?: number;
}

export interface ExpenseDto {
  id: string;
  propertyId: string;
  expenseTypeId: string;
  propertyTitle: string;
  expenseTypeName: string;
  description: string;
  frequency: string;
  dueDate: string;
  totalAmount: number;
  installmentsCount: number;
  isRecurring: boolean;
  yearlyMonth?: number;
  status: string;
  notes?: string;
  installments: ExpenseInstallmentDto[];
}

export interface PendencyTypeDto {
  id: string;
  name: string;
  defaultSlaDays: number;
}

export interface PendencyDto {
  id: string;
  propertyId: string;
  pendencyTypeId: string;
  propertyTitle: string;
  pendencyTypeName: string;
  title: string;
  description?: string;
  dueAtUtc: string;
  openedAtUtc: string;
  resolvedAtUtc?: string;
  status: 'OPEN' | 'RESOLVED';
  severity: 'ATTENTION' | 'URGENT' | 'CRITICAL';
  elapsedDays: number;
  slaDays: number;
}

export interface VisitDto {
  id: string;
  propertyId: string;
  propertyTitle: string;
  scheduledAtUtc: string;
  contactName: string;
  contactPhone?: string;
  responsibleName?: string;
  status: string;
  notes?: string;
}

export interface MaintenanceDto {
  id: string;
  propertyId: string;
  propertyTitle: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  estimatedCost?: number;
  actualCost?: number;
  requestedAtUtc: string;
  startedAtUtc?: string;
  finishedAtUtc?: string;
  notes?: string;
}

export interface DashboardOverviewDto {
  competence: string;
  receivedAmount: number;
  expectedAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  vacantPropertiesCount: number;
  vacancyLossAmount: number;
  totalProperties: number;
  leasedProperties: number;
  availableProperties: number;
  preparationProperties: number;
}

export interface DashboardOverdueExpenseDto {
  expenseId: string;
  propertyTitle: string;
  expenseTypeName: string;
  description: string;
  dueDate: string;
  amount: number;
  overdueDays: number;
}

export interface DashboardPendencyAlertDto {
  pendencyId: string;
  propertyTitle: string;
  pendencyTypeName: string;
  title: string;
  dueAtUtc: string;
  severity: string;
  elapsedDays: number;
  slaDays: number;
}

export interface RealEstateDashboardDto {
  overview: DashboardOverviewDto;
  overdueExpenses: DashboardOverdueExpenseDto[];
  pendencyAlerts: DashboardPendencyAlertDto[];
}

export interface SystemSettingsDto {
  id: string;
  brandName: string;
  brandShortName: string;
  themePreset: ThemePresetKey;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  enableAnimations: boolean;
  updatedAtUtc: string;
}

export type ThemePresetKey = 'AURORA_LIGHT' | 'EMERALD_LIGHT' | 'MIDNIGHT_DARK' | 'GRAPHITE_DARK';

export interface SystemSettingsUpdateRequest {
  brandName: string;
  brandShortName: string;
  themePreset: ThemePresetKey;
  enableAnimations: boolean;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
