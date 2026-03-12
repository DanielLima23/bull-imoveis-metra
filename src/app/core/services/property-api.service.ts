import { Injectable } from '@angular/core';
import {
  PagedResult,
  PropertyAttachmentDto,
  PropertyChargeTemplateDto,
  PropertyDetailDto,
  PropertyDto,
  PropertyHistoryEntryDto,
  PropertyMonthlyStatementDto,
  PropertyRentReferenceDto,
  LeaseDto
} from '../models/domain.model';
import { ApiRequestOptions, HttpApiService } from './http-api.service';
import { Observable } from 'rxjs';

export interface PropertyIdentitySectionPayload {
  title: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  occupancyStatus?: string;
  assetState?: string;
}

export interface PropertyDocumentationSectionPayload {
  registration?: string;
  scripture?: string;
  registrationCertification?: string;
}

export interface PropertyCharacteristicsSectionPayload {
  numOfRooms?: number;
  cleaningIncluded?: boolean;
  elevator?: boolean;
  garage?: boolean;
  unoccupiedSince?: string;
}

export interface PropertyAdministrationSectionPayload {
  proprietary?: string;
  administrator?: string;
  administratorPhone?: string;
  administratorEmail?: string;
  administrateTax?: string;
  lawyer?: string;
  lawyerData?: string;
  observation?: string;
}

export interface PropertyCreatePayload {
  identity: PropertyIdentitySectionPayload;
  documentation?: PropertyDocumentationSectionPayload;
  characteristics?: PropertyCharacteristicsSectionPayload;
  administration?: PropertyAdministrationSectionPayload;
  initialRentAmount?: number;
  initialRentEffectiveFrom?: string;
}

export interface PropertyUpdatePayload {
  identity: PropertyIdentitySectionPayload;
  documentation?: PropertyDocumentationSectionPayload;
  characteristics?: PropertyCharacteristicsSectionPayload;
  administration?: PropertyAdministrationSectionPayload;
}

export interface PropertyStatusUpdatePayload {
  occupancyStatus?: string;
  assetState?: string;
}

export interface PropertyRentReferencePayload {
  amount: number;
  effectiveFrom: string;
}

export interface PropertyAttachmentPayload {
  category?: string;
  title?: string;
  resourceLocation?: string;
  notes?: string;
  referenceDateUtc?: string;
}

export interface PropertyChargeTemplatePayload {
  kind?: string;
  title?: string;
  defaultAmount?: number;
  dueDay?: number;
  defaultResponsibility?: string;
  providerInformation?: string;
  notes?: string;
  isActive: boolean;
}

export interface PropertyHistoryEntryPayload {
  content: string;
  occurredAtUtc: string;
}

export interface PropertyListFilters extends Record<string, string | number | boolean | undefined> {
  search?: string;
  status?: string;
  occupancyStatus?: string;
  assetState?: string;
  propertyType?: string;
  city?: string;
  proprietary?: string;
  administrator?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class PropertyApiService {
  constructor(private readonly api: HttpApiService) {}

  list(filters: PropertyListFilters = {}, options?: ApiRequestOptions): Observable<PagedResult<PropertyDto>> {
    return this.api.get<PagedResult<PropertyDto>>('/imoveis', filters, options);
  }

  getById(id: string, options?: ApiRequestOptions): Observable<PropertyDto> {
    return this.api.get<PropertyDto>(`/imoveis/${id}`, undefined, options);
  }

  getDetail(id: string, options?: ApiRequestOptions): Observable<PropertyDetailDto> {
    return this.api.get<PropertyDetailDto>(`/imoveis/${id}/detalhe`, undefined, options);
  }

  create(payload: PropertyCreatePayload): Observable<PropertyDto> {
    return this.api.post<PropertyDto>('/imoveis', payload);
  }

  update(id: string, payload: PropertyUpdatePayload): Observable<PropertyDto> {
    return this.api.put<PropertyDto>(`/imoveis/${id}`, payload);
  }

  updateStatus(id: string, payload: PropertyStatusUpdatePayload): Observable<PropertyDto> {
    return this.api.patch<PropertyDto>(`/imoveis/${id}/status`, payload);
  }

  addRentReference(id: string, payload: PropertyRentReferencePayload): Observable<PropertyRentReferenceDto> {
    return this.api.post<PropertyRentReferenceDto>(`/imoveis/${id}/valor-base`, payload);
  }

  getRentHistory(id: string, options?: ApiRequestOptions): Observable<PropertyRentReferenceDto[]> {
    return this.api.get<PropertyRentReferenceDto[]>(`/imoveis/${id}/valor-base/historico`, undefined, options);
  }

  listAttachments(id: string, options?: ApiRequestOptions): Observable<PropertyAttachmentDto[]> {
    return this.api.get<PropertyAttachmentDto[]>(`/imoveis/${id}/anexos`, undefined, options);
  }

  createAttachment(id: string, payload: PropertyAttachmentPayload): Observable<PropertyAttachmentDto> {
    return this.api.post<PropertyAttachmentDto>(`/imoveis/${id}/anexos`, payload);
  }

  listChargeTemplates(id: string, options?: ApiRequestOptions): Observable<PropertyChargeTemplateDto[]> {
    return this.api.get<PropertyChargeTemplateDto[]>(`/imoveis/${id}/contas-modelo`, undefined, options);
  }

  createChargeTemplate(id: string, payload: PropertyChargeTemplatePayload): Observable<PropertyChargeTemplateDto> {
    return this.api.post<PropertyChargeTemplateDto>(`/imoveis/${id}/contas-modelo`, payload);
  }

  updateChargeTemplate(id: string, templateId: string, payload: PropertyChargeTemplatePayload): Observable<PropertyChargeTemplateDto> {
    return this.api.put<PropertyChargeTemplateDto>(`/imoveis/${id}/contas-modelo/${templateId}`, payload);
  }

  listHistory(id: string, options?: ApiRequestOptions): Observable<PropertyHistoryEntryDto[]> {
    return this.api.get<PropertyHistoryEntryDto[]>(`/imoveis/${id}/historico`, undefined, options);
  }

  createHistoryEntry(id: string, payload: PropertyHistoryEntryPayload): Observable<PropertyHistoryEntryDto> {
    return this.api.post<PropertyHistoryEntryDto>(`/imoveis/${id}/historico`, payload);
  }

  getMonthlyStatement(id: string, year?: number, month?: number, options?: ApiRequestOptions): Observable<PropertyMonthlyStatementDto> {
    return this.api.get<PropertyMonthlyStatementDto>(`/imoveis/${id}/extrato-mensal`, { year, month }, options);
  }

  getLeaseHistory(id: string, options?: ApiRequestOptions): Observable<LeaseDto[]> {
    return this.api.get<LeaseDto[]>(`/imoveis/${id}/locacoes/historico`, undefined, options);
  }
}
