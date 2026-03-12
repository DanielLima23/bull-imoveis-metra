import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { SystemSettingsService } from './core/services/system-settings.service';
import { GlobalLoadingOverlayComponent } from './shared/components/global-loading-overlay/global-loading-overlay.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent, GlobalLoadingOverlayComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly systemSettings = inject(SystemSettingsService);

  ngOnInit(): void {
    this.systemSettings.loadPublic().subscribe({
      next: () => undefined,
      error: () => undefined
    });

    this.authService.bootstrapSession().subscribe({
      next: () => undefined,
      error: () => undefined
    });
  }
}
