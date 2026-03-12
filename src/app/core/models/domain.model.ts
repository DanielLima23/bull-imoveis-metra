export interface PropertyDocumentationSectionDto {
  registration?: string | null;
  scripture?: string | null;
  registrationCertification?: string | null;
}

export interface PropertyCharacteristicsSectionDto {
  numOfRooms?: number | null;
  cleaningIncluded?: boolean | null;
  elevator?: boolean | null;
  garage?: boolean | null;
  unoccupiedSince?: string | null;
}

export interface PropertyAdministrationSectionDto {
  proprietary?: string | null;
  administrator?: string | null;
  administratorPhone?: string | null;
  administratorEmail?: string | null;
  administrateTax?: string | null;
  lawyer?: string | null;
  lawyerData?: string | null;
  observation?: string | null;
}

export interface PropertyDto {
  id: string;
  code: string;
  title: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  occupancyStatus?: string | null;
  assetState?: string | null;
  status: string;
  proprietary?: string | null;
  administrator?: string | null;
  currentBaseRent?: number | null;
  createdAtUtc: string;
  documentation?: PropertyDocumentationSectionDto | null;
  characteristics?: PropertyCharacteristicsSectionDto | null;
  administration?: PropertyAdministrationSectionDto | null;
}

export interface PropertyCurrentLeaseDto {
  id: string;
  tenantId: string;
  tenantName: string;
  startDate: string;
  endDate?: string | null;
  monthlyRent: number;
  status: string;
  paymentDay?: number | null;
  paymentLocation?: string | null;
}

export interface PropertyRentReferenceDto {
  id: string;
  amount: number;
  effectiveFrom: string;
}

export interface PropertyChargeTemplateDto {
  id: string;
  kind?: string | null;
  title?: string | null;
  defaultAmount?: number | null;
  dueDay?: number | null;
  defaultResponsibility?: string | null;
  providerInformation?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAtUtc: string;
}

export interface PropertyHistoryEntryDto {
  id: string;
  content?: string | null;
  occurredAtUtc: string;
  createdAtUtc: string;
}

export interface PropertyAttachmentDto {
  id: string;
  category?: string | null;
  title?: string | null;
  resourceLocation?: string | null;
  notes?: string | null;
  referenceDateUtc?: string | null;
  createdAtUtc: string;
}

export interface PropertyOpenPendencyDto {
  id: string;
  code?: string | null;
  name?: string | null;
  title?: string | null;
  dueAtUtc: string;
  severity?: string | null;
  status?: string | null;
}

export interface PropertyUpcomingVisitDto {
  id: string;
  scheduledAtUtc: string;
  contactName?: string | null;
  status?: string | null;
}

export interface PropertyMaintenanceSummaryDto {
  id: string;
  title?: string | null;
  priority?: string | null;
  status?: string | null;
  estimatedCost?: number | null;
  actualCost?: number | null;
}

export interface PropertyMonthlyStatementLineDto {
  sourceType?: string | null;
  kind?: string | null;
  label?: string | null;
  competenceDate: string;
  dueDate: string;
  expectedAmount: number;
  paidAmount?: number | null;
  status?: string | null;
  paidBy?: string | null;
  notes?: string | null;
}

export interface PropertyMonthlyStatementDto {
  propertyId: string;
  year: number;
  month?: number | null;
  lines: PropertyMonthlyStatementLineDto[];
}

export interface PropertyDetailDto {
  property: PropertyDto;
  currentLease?: PropertyCurrentLeaseDto | null;
  rentHistory: PropertyRentReferenceDto[];
  chargeTemplates: PropertyChargeTemplateDto[];
  historyEntries: PropertyHistoryEntryDto[];
  attachments: PropertyAttachmentDto[];
  openPendencies: PropertyOpenPendencyDto[];
  upcomingVisits: PropertyUpcomingVisitDto[];
  maintenanceItems: PropertyMaintenanceSummaryDto[];
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
  endDate?: string | null;
  monthlyRent: number;
  depositAmount?: number | null;
  status: string;
  contractWith?: string | null;
  paymentDay?: number | null;
  paymentLocation?: string | null;
  readjustmentIndex?: string | null;
  contractRegistration?: string | null;
  insurance?: string | null;
  signatureRecognition?: string | null;
  optionalContactName?: string | null;
  optionalContactPhone?: string | null;
  guarantorName?: string | null;
  guarantorDocument?: string | null;
  guarantorPhone?: string | null;
  notes?: string | null;
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
  paidAtUtc?: string | null;
  paidAmount?: number | null;
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
  yearlyMonth?: number | null;
  status: string;
  notes?: string | null;
  installments: ExpenseInstallmentDto[];
}

export interface ExpenseMarkPaidRequest {
  paidAmount?: number | null;
  paidAtUtc?: string | null;
  paidBy?: string | null;
  notes?: string | null;
}

export interface PendencyTypeDto {
  id: string;
  code?: string | null;
  name: string;
  description?: string | null;
  defaultSlaDays: number;
}

export interface PendencyDto {
  id: string;
  propertyId: string;
  pendencyTypeId: string;
  propertyTitle: string;
  pendencyTypeName: string;
  title: string;
  description?: string | null;
  dueAtUtc: string;
  openedAtUtc: string;
  resolvedAtUtc?: string | null;
  status: string;
  severity: string;
  elapsedDays: number;
  slaDays: number;
}

export interface VisitDto {
  id: string;
  propertyId: string;
  propertyTitle: string;
  scheduledAtUtc: string;
  contactName: string;
  contactPhone?: string | null;
  responsibleName?: string | null;
  status: string;
  notes?: string | null;
  createdAtUtc?: string | null;
}

export interface MaintenanceDto {
  id: string;
  propertyId: string;
  propertyTitle: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  estimatedCost?: number | null;
  actualCost?: number | null;
  requestedAtUtc: string;
  startedAtUtc?: string | null;
  finishedAtUtc?: string | null;
  notes?: string | null;
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

export interface DashboardOverdueReceivableDto {
  leaseId: string;
  propertyTitle: string;
  tenantName: string;
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
  overdueReceivables?: DashboardOverdueReceivableDto[];
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

export interface ReportCatalogItemDto {
  slug?: string | null;
  name?: string | null;
  description?: string | null;
  requiresMonth: boolean;
  requiresYear: boolean;
}

export interface PartyDto {
  id: string;
  kind?: string | null;
  name?: string | null;
  documentNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAtUtc: string;
}

export interface LegacyImportRequest {
  estates: unknown[];
  financialRecords: unknown[];
  histories: unknown[];
  pendencyAcronyms: unknown[];
  pendencyStates: unknown[];
}

export interface LegacyImportResultDto {
  importedProperties: number;
  importedTenants: number;
  importedLeases: number;
  importedChargeTemplates: number;
  importedExpenses: number;
  importedHistoryEntries: number;
  importedAttachments: number;
  importedPendencies: number;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
