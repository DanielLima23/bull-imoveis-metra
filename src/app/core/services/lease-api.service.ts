import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpApiService } from './http-api.service';
import { LeaseDto, PagedResult } from '../models/domain.model';

export interface LeasePayload {
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate?: string;
  monthlyRent: number;
  depositAmount?: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class LeaseApiService {
  constructor(private readonly api: HttpApiService) {}

  list(page = 1, pageSize = 80, propertyId = '', tenantId = '', status = ''): Observable<PagedResult<LeaseDto>> {
    return this.api.get<PagedResult<LeaseDto>>('/locacoes', { page, pageSize, propertyId, tenantId, status });
  }

  getById(id: string): Observable<LeaseDto> {
    return this.api.get<LeaseDto>(`/locacoes/${id}`);
  }

  create(payload: LeasePayload): Observable<LeaseDto> {
    return this.api.post<LeaseDto>('/locacoes', payload);
  }

  update(id: string, payload: Omit<LeasePayload, 'propertyId' | 'tenantId'> & { status: string }): Observable<LeaseDto> {
    return this.api.put<LeaseDto>(`/locacoes/${id}`, payload);
  }

  close(id: string, endDate: string): Observable<LeaseDto> {
    return this.api.patch<LeaseDto>(`/locacoes/${id}/encerrar`, { endDate });
  }
}
