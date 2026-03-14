import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiRequestOptions, HttpApiService } from './http-api.service';
import { LeaseDto, PagedResult } from '../models/domain.model';

export interface LeasePayloadBase {
  startDate: string;
  endDate?: string;
  monthlyRent: number;
  depositAmount?: number;
  contractWith?: string;
  paymentDay?: number;
  paymentLocation?: string;
  readjustmentIndex?: string;
  contractRegistration?: string;
  insurance?: string;
  signatureRecognition?: string;
  optionalContactName?: string;
  optionalContactPhone?: string;
  guarantorName?: string;
  guarantorDocument?: string;
  guarantorPhone?: string;
  cleaningIncluded?: boolean;
  notes?: string;
}

export interface LeaseCreatePayload extends LeasePayloadBase {
  propertyId: string;
  tenantId: string;
}

export interface LeaseUpdatePayload extends LeasePayloadBase {
  status: string;
}

export interface LeaseListFilters extends Record<string, string | number | boolean | undefined> {
  propertyId?: string;
  tenantId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class LeaseApiService {
  constructor(private readonly api: HttpApiService) {}

  list(filters: LeaseListFilters = {}, options?: ApiRequestOptions): Observable<PagedResult<LeaseDto>> {
    return this.api.get<PagedResult<LeaseDto>>('/locacoes', filters, options);
  }

  getById(id: string): Observable<LeaseDto> {
    return this.api.get<LeaseDto>(`/locacoes/${id}`);
  }

  create(payload: LeaseCreatePayload): Observable<LeaseDto> {
    return this.api.post<LeaseDto>('/locacoes', payload);
  }

  update(id: string, payload: LeaseUpdatePayload): Observable<LeaseDto> {
    return this.api.put<LeaseDto>(`/locacoes/${id}`, payload);
  }

  close(id: string, endDate: string): Observable<LeaseDto> {
    return this.api.patch<LeaseDto>(`/locacoes/${id}/encerrar`, { endDate });
  }
}
