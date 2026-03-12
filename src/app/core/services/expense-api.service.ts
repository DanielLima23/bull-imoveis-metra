import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ExpenseDto, ExpenseMarkPaidRequest, ExpenseTypeDto, PagedResult } from '../models/domain.model';
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

export interface ExpenseUpdatePayload {
  description: string;
  frequency: string;
  dueDate: string;
  totalAmount: number;
  installmentsCount: number;
  isRecurring: boolean;
  yearlyMonth?: number;
  status: string;
  notes?: string;
}

export interface ExpenseTypePayload {
  name: string;
  category: string;
  isFixedCost: boolean;
}

export interface ExpenseListFilters extends Record<string, string | number | boolean | undefined> {
  propertyId?: string;
  expenseTypeId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class ExpenseApiService {
  constructor(private readonly api: HttpApiService) {}

  listTypes(): Observable<ExpenseTypeDto[]> {
    return this.api.get<ExpenseTypeDto[]>('/despesas/tipos');
  }

  createType(payload: ExpenseTypePayload): Observable<ExpenseTypeDto> {
    return this.api.post<ExpenseTypeDto>('/despesas/tipos', payload);
  }

  updateType(id: string, payload: ExpenseTypePayload): Observable<ExpenseTypeDto> {
    return this.api.put<ExpenseTypeDto>(`/despesas/tipos/${id}`, payload);
  }

  list(filters: ExpenseListFilters = {}): Observable<PagedResult<ExpenseDto>> {
    return this.api.get<PagedResult<ExpenseDto>>('/despesas', filters);
  }

  listOverdue(): Observable<ExpenseDto[]> {
    return this.api.get<ExpenseDto[]>('/despesas/atrasadas');
  }

  getById(id: string): Observable<ExpenseDto> {
    return this.api.get<ExpenseDto>(`/despesas/${id}`);
  }

  create(payload: ExpensePayload): Observable<ExpenseDto> {
    return this.api.post<ExpenseDto>('/despesas', payload);
  }

  update(id: string, payload: ExpenseUpdatePayload): Observable<ExpenseDto> {
    return this.api.put<ExpenseDto>(`/despesas/${id}`, payload);
  }

  markPaid(id: string, payload: ExpenseMarkPaidRequest): Observable<ExpenseDto> {
    return this.api.patch<ExpenseDto>(`/despesas/${id}/pagar`, payload);
  }
}
