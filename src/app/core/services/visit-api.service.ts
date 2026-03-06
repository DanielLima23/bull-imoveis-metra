import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpApiService } from './http-api.service';
import { PagedResult, VisitDto } from '../models/domain.model';

export interface VisitPayload {
  propertyId: string;
  scheduledAtUtc: string;
  contactName: string;
  contactPhone?: string;
  responsibleName?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class VisitApiService {
  constructor(private readonly api: HttpApiService) {}

  list(page = 1, pageSize = 80, propertyId = '', status = ''): Observable<PagedResult<VisitDto>> {
    return this.api.get<PagedResult<VisitDto>>('/visitas', { page, pageSize, propertyId, status });
  }

  getById(id: string): Observable<VisitDto> {
    return this.api.get<VisitDto>(`/visitas/${id}`);
  }

  create(payload: VisitPayload): Observable<VisitDto> {
    return this.api.post<VisitDto>('/visitas', payload);
  }

  update(id: string, payload: VisitPayload & { status: string }): Observable<VisitDto> {
    return this.api.put<VisitDto>(`/visitas/${id}`, payload);
  }

  updateStatus(id: string, status: string): Observable<VisitDto> {
    return this.api.patch<VisitDto>(`/visitas/${id}/status`, { status });
  }
}
