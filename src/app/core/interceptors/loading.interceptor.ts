import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { SKIP_GLOBAL_LOADING } from '../http/http-context.tokens';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_GLOBAL_LOADING)) {
    return next(req);
  }

  const loadingService = inject(LoadingService);
  loadingService.start();

  return next(req).pipe(finalize(() => loadingService.stop()));
};
