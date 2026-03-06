import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpApiService } from './http-api.service';
import { MaintenanceDto, PagedResult } from '../models/domain.model';

export interface MaintenancePayload {
  propertyId: string;
  title: string;
  description: string;
  priority: string;
  estimatedCost?: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class MaintenanceApiService {
  constructor(private readonly api: HttpApiService) {}

  list(page = 1, pageSize = 80, propertyId = '', status = '', priority = ''): Observable<PagedResult<MaintenanceDto>> {
    return this.api.get<PagedResult<MaintenanceDto>>('/manutencoes', { page, pageSize, propertyId, status, priority });
  }

  getById(id: string): Observable<MaintenanceDto> {
    return this.api.get<MaintenanceDto>(`/manutencoes/${id}`);
  }

  create(payload: MaintenancePayload): Observable<MaintenanceDto> {
    return this.api.post<MaintenanceDto>('/manutencoes', payload);
  }

  update(
    id: string,
    payload: {
      title: string;
      description: string;
      priority: string;
      estimatedCost?: number;
      actualCost?: number;
      status: string;
      startedAtUtc?: string;
      finishedAtUtc?: string;
      notes?: string;
    }
  ): Observable<MaintenanceDto> {
    return this.api.put<MaintenanceDto>(`/manutencoes/${id}`, payload);
  }

  updateStatus(id: string, status: string): Observable<MaintenanceDto> {
    return this.api.patch<MaintenanceDto>(`/manutencoes/${id}/status`, { status });
  }
}
