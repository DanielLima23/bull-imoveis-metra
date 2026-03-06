import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ExpenseDto, ExpenseTypeDto, PagedResult } from '../models/domain.model';
import { HttpApiService } from './http-api.service';

export interface ExpensePayload {
  propertyId: string;
  expenseTypeId: string;
  description: string;
  frequency: string;
  dueDate: string;
  totalAmount: number;
  installmentsCount: number;
  isRecurring: boolean;
  yearlyMonth?: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class ExpenseApiService {
  constructor(private readonly api: HttpApiService) {}

  listTypes(): Observable<ExpenseTypeDto[]> {
    return this.api.get<ExpenseTypeDto[]>('/despesas/tipos');
  }

  createType(payload: { name: string; category: string; isFixedCost: boolean }): Observable<ExpenseTypeDto> {
    return this.api.post<ExpenseTypeDto>('/despesas/tipos', payload);
  }

  list(page = 1, pageSize = 100, propertyId = '', expenseTypeId = '', status = ''): Observable<PagedResult<ExpenseDto>> {
    return this.api.get<PagedResult<ExpenseDto>>('/despesas', { page, pageSize, propertyId, expenseTypeId, status });
  }

  getById(id: string): Observable<ExpenseDto> {
    return this.api.get<ExpenseDto>(`/despesas/${id}`);
  }

  create(payload: ExpensePayload): Observable<ExpenseDto> {
    return this.api.post<ExpenseDto>('/despesas', payload);
  }

  update(id: string, payload: ExpensePayload & { status: string }): Observable<ExpenseDto> {
    return this.api.put<ExpenseDto>(`/despesas/${id}`, payload);
  }

  markPaid(id: string): Observable<ExpenseDto> {
    return this.api.patch<ExpenseDto>(`/despesas/${id}/pagar`, {});
  }
}
