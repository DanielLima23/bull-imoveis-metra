import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LegacyDatabaseImportRequest, LegacyImportRequest, LegacyImportResultDto } from '../models/domain.model';
import { HttpApiService } from './http-api.service';

@Injectable({ providedIn: 'root' })
export class LegacyImportApiService {
  constructor(private readonly api: HttpApiService) {}

  import(payload: LegacyImportRequest): Observable<LegacyImportResultDto> {
    return this.api.post<LegacyImportResultDto>('/legado/importacao', payload);
  }

  importFromDatabaseUrl(payload: LegacyDatabaseImportRequest): Observable<LegacyImportResultDto> {
    return this.api.post<LegacyImportResultDto>('/legado/importacao/url', payload);
  }
}
