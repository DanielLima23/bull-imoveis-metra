import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  constructor(private readonly http: HttpClient) {}

  downloadFinancial(month: number, year: number): void {
    this.download(`/relatorios/financeiro?mes=${month}&ano=${year}`, `financeiro-${year}-${String(month).padStart(2, '0')}.csv`);
  }

  downloadVacancy(month: number, year: number): void {
    this.download(`/relatorios/vacancia?mes=${month}&ano=${year}`, `vacancia-${year}-${String(month).padStart(2, '0')}.csv`);
  }

  downloadPendencies(): void {
    this.download('/relatorios/pendencias', 'pendencias.csv');
  }

  private download(path: string, fileName: string): void {
    this.http.get(`${environment.apiUrl}${path}`, { responseType: 'blob' }).subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      window.URL.revokeObjectURL(url);
    });
  }
}

