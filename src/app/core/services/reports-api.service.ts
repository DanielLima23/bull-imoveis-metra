import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ReportCatalogItemDto } from '../models/domain.model';
import { Observable } from 'rxjs';

export interface ReportDownloadFilters {
  mes?: number;
  ano?: number;
}

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  constructor(private readonly http: HttpClient) {}

  listCatalog(): Observable<ReportCatalogItemDto[]> {
    return this.http.get<ReportCatalogItemDto[]>(`${environment.apiUrl}/relatorios`);
  }

  downloadBySlug(slug: string, filters: ReportDownloadFilters, fileName: string): void {
    const params = new URLSearchParams();
    if (filters.mes) {
      params.set('mes', String(filters.mes));
    }
    if (filters.ano) {
      params.set('ano', String(filters.ano));
    }

    const query = params.toString();
    const path = `${environment.apiUrl}/relatorios/${slug}${query ? `?${query}` : ''}`;
    this.download(path, fileName);
  }

  downloadFinancial(month: number, year: number): void {
    this.downloadBySlug('financeiro', { mes: month, ano: year }, `financeiro-${year}-${String(month).padStart(2, '0')}.csv`);
  }

  downloadVacancy(month: number, year: number): void {
    this.downloadBySlug('vacancia', { mes: month, ano: year }, `vacancia-${year}-${String(month).padStart(2, '0')}.csv`);
  }

  downloadPendencies(): void {
    this.downloadBySlug('pendencias', {}, 'pendencias.csv');
  }

  private download(path: string, fileName: string): void {
    this.http.get(path, { responseType: 'blob' }).subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      window.URL.revokeObjectURL(url);
    });
  }
}
