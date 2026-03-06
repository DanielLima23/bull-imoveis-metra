import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { SystemSettingsDto, SystemSettingsUpdateRequest, ThemePresetKey } from '../../../core/models/domain.model';
import { AuthService } from '../../../core/services/auth.service';
import { ThemePresetOption, THEME_PRESETS, SystemSettingsService } from '../../../core/services/system-settings.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ToastService } from '../../../shared/services/toast.service';

const DEFAULT_SETTINGS: SystemSettingsUpdateRequest = {
  brandName: 'Imoveis Hub',
  brandShortName: 'IH',
  themePreset: 'AURORA_LIGHT',
  enableAnimations: true
};

@Component({
  selector: 'app-configuracoes-page',
  standalone: true,
  imports: [PageHeaderComponent, ReactiveFormsModule],
  templateUrl: './configuracoes.page.html',
  styleUrl: './configuracoes.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfiguracoesPage implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(SystemSettingsService);
  private readonly toast = inject(ToastService);

  readonly themePresets = THEME_PRESETS;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly savedPayload = signal<SystemSettingsUpdateRequest | null>(null);

  readonly user = this.authService.currentUser;
  readonly canEdit = computed(() => this.user()?.role === 'ADMIN');

  readonly form = this.fb.nonNullable.group({
    brandName: ['', [Validators.required, Validators.maxLength(120)]],
    brandShortName: ['', [Validators.required, Validators.maxLength(8)]],
    themePreset: ['AURORA_LIGHT' as ThemePresetKey, [Validators.required]],
    enableAnimations: [true]
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.loading()) {
        return;
      }

      this.settingsService.applyPreview(this.buildPayload());
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  ngOnDestroy(): void {
    this.settingsService.restoreAppliedTheme();
  }

  submit(): void {
    if (!this.canEdit()) {
      this.toast.warning('Somente administradores podem salvar personalizacoes.');
      return;
    }

    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      this.toast.warning('Revise os campos obrigatorios antes de salvar.');
      return;
    }

    const payload = this.buildPayload();

    this.saving.set(true);
    this.settingsService
      .update(payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (saved) => {
          const normalized = this.dtoToPayload(saved);
          this.savedPayload.set(normalized);
          this.form.reset(normalized, { emitEvent: false });
          this.form.markAsPristine();
          this.settingsService.applyPreview(normalized);
          this.toast.success('Tema e personalizacoes salvos com sucesso.');
        },
        error: () => {
          this.toast.error('Falha ao salvar personalizacoes.');
          this.settingsService.restoreAppliedTheme();
        }
      });
  }

  restoreSaved(): void {
    const payload = this.savedPayload();
    if (!payload) {
      return;
    }

    this.form.reset(payload, { emitEvent: false });
    this.form.markAsPristine();
    this.settingsService.applyPreview(payload);
  }

  applyDefaults(): void {
    this.form.reset(DEFAULT_SETTINGS);
    this.form.markAsDirty();
    this.settingsService.applyPreview(DEFAULT_SETTINGS);
  }

  selectPreset(key: ThemePresetKey): void {
    this.form.controls.themePreset.setValue(key);
    this.form.controls.themePreset.markAsDirty();
  }

  selectedPreset(): ThemePresetOption {
    return this.presetByKey(this.form.controls.themePreset.value);
  }

  presetByKey(key: ThemePresetKey): ThemePresetOption {
    return this.themePresets.find((item) => item.key === key) ?? this.themePresets[0];
  }

  private loadSettings(): void {
    this.loading.set(true);

    this.settingsService
      .loadPrivate()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (settings) => {
          const payload = this.dtoToPayload(settings);
          this.savedPayload.set(payload);
          this.form.reset(payload, { emitEvent: false });
          this.form.markAsPristine();
          this.settingsService.applyPreview(payload);
        },
        error: () => {
          this.toast.error('Falha ao carregar configuracoes do sistema.');
          const fallback = this.settingsService.settings();
          const payload = this.dtoToPayload(fallback);
          this.savedPayload.set(payload);
          this.form.reset(payload, { emitEvent: false });
          this.form.markAsPristine();
          this.settingsService.applyPreview(payload);
        }
      });
  }

  private dtoToPayload(settings: SystemSettingsDto): SystemSettingsUpdateRequest {
    return {
      brandName: (settings.brandName || DEFAULT_SETTINGS.brandName).trim(),
      brandShortName: (settings.brandShortName || DEFAULT_SETTINGS.brandShortName).trim().toUpperCase(),
      themePreset: this.presetByKey(settings.themePreset).key,
      enableAnimations: settings.enableAnimations
    };
  }

  private buildPayload(): SystemSettingsUpdateRequest {
    const raw = this.form.getRawValue();

    return {
      brandName: raw.brandName.trim(),
      brandShortName: raw.brandShortName.trim().toUpperCase(),
      themePreset: this.presetByKey(raw.themePreset).key,
      enableAnimations: !!raw.enableAnimations
    };
  }
}
