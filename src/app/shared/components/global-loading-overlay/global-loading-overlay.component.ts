import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-global-loading-overlay',
  standalone: true,
  templateUrl: './global-loading-overlay.component.html',
  styleUrl: './global-loading-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GlobalLoadingOverlayComponent {
  protected readonly isLoading = inject(LoadingService).isLoading;
}
