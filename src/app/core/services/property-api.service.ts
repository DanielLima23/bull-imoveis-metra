import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResult, PropertyDto } from '../models/domain.model';
import { ApiRequestOptions, HttpApiService } from './http-api.service';

export interface PropertyPayload {
  title: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  status: string;
  notes?: string;
  initialRentAmount?: number;
  initialRentEffectiveFrom?: string;
}

export interface PropertyRentReferencePayload {
  amount: number;
  effectiveFrom: string;
}

@Injectable({ providedIn: 'root' })
export class PropertyApiService {
  constructor(private readonly api: HttpApiService) {}

  list(search = '', status = '', page = 1, pageSize = 80, options?: ApiRequestOptions): Observable<PagedResult<PropertyDto>> {
    return this.api.get<PagedResult<PropertyDto>>('/imoveis', { search, status, page, pageSize }, options);
  }

  getById(id: string, options?: ApiRequestOptions): Observable<PropertyDto> {
    return this.api.get<PropertyDto>(`/imoveis/${id}`, undefined, options);
  }

  create(payload: PropertyPayload): Observable<PropertyDto> {
    return this.api.post<PropertyDto>('/imoveis', payload);
  }

  update(id: string, payload: Omit<PropertyPayload, 'initialRentAmount' | 'initialRentEffectiveFrom'>): Observable<PropertyDto> {
    return this.api.put<PropertyDto>(`/imoveis/${id}`, payload);
  }

  updateStatus(id: string, status: string): Observable<PropertyDto> {
    return this.api.patch<PropertyDto>(`/imoveis/${id}/status`, { status });
  }

  addRentReference(id: string, payload: PropertyRentReferencePayload): Observable<{ id: string; amount: number; effectiveFrom: string }> {
    return this.api.post<{ id: string; amount: number; effectiveFrom: string }>(`/imoveis/${id}/valor-base`, payload);
  }

  getRentHistory(id: string): Observable<{ id: string; amount: number; effectiveFrom: string }[]> {
    return this.api.get<{ id: string; amount: number; effectiveFrom: string }[]>(`/imoveis/${id}/valor-base/historico`);
  }
}
