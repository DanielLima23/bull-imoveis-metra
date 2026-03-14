import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { LeaseApiService } from './lease-api.service';

export type PropertyStatusTransitionResult =
  | 'allowed'
  | 'blocked_requires_active_lease'
  | 'blocked_requires_closing_active_lease';

@Injectable()
export class PropertyStatusTransitionService {
  private readonly activeLeaseCache = new Map<string, Observable<boolean>>();

  constructor(private readonly leaseApi: LeaseApiService) {}

  validateTransition(propertyId: string, currentStatus?: string | null, nextStatus?: string | null): Observable<PropertyStatusTransitionResult> {
    const current = this.normalizeStatus(currentStatus);
    const next = this.normalizeStatus(nextStatus);

    if (!propertyId || !next || current === next) {
      return of('allowed');
    }

    if (next === 'LEASED' && current !== 'LEASED') {
      return this.hasActiveLease(propertyId).pipe(
        map((hasActiveLease) => (hasActiveLease ? 'allowed' : 'blocked_requires_active_lease'))
      );
    }

    if (current === 'LEASED' && next !== 'LEASED') {
      return this.hasActiveLease(propertyId).pipe(
        map((hasActiveLease) => (hasActiveLease ? 'blocked_requires_closing_active_lease' : 'allowed'))
      );
    }

    return of('allowed');
  }

  invalidate(propertyId?: string): void {
    if (!propertyId) {
      this.activeLeaseCache.clear();
      return;
    }

    this.activeLeaseCache.delete(propertyId);
  }

  private hasActiveLease(propertyId: string): Observable<boolean> {
    const cached = this.activeLeaseCache.get(propertyId);
    if (cached) {
      return cached;
    }

    const request$ = this.leaseApi
      .list({ propertyId, status: 'ACTIVE', page: 1, pageSize: 1 }, { silent: true })
      .pipe(
        map((result) => result.items.length > 0),
        catchError(() => of(false)),
        shareReplay(1)
      );

    this.activeLeaseCache.set(propertyId, request$);
    return request$;
  }

  private normalizeStatus(value?: string | null): string {
    return String(value ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/-/g, '_')
      .toUpperCase();
  }
}
