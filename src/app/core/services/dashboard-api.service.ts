import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpApiService } from './http-api.service';
import { RealEstateDashboardDto } from '../models/domain.model';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  constructor(private readonly api: HttpApiService) {}

  get(month?: number, year?: number): Observable<RealEstateDashboardDto> {
    return this.api.get<RealEstateDashboardDto>('/dashboard/imobiliario', { mes: month, ano: year });
  }
}
