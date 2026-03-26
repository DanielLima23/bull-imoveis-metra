import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { SystemSettingsDto, SystemSettingsUpdateRequest, ThemePresetKey } from '../models/domain.model';
import { HttpApiService } from './http-api.service';

type ThemeMode = 'LIGHT' | 'DARK';

export interface ThemePresetOption {
  key: ThemePresetKey;
  label: string;
  description: string;
  mode: ThemeMode;
  swatches: readonly [string, string, string];
  cssVars: Record<string, string>;
}

export const THEME_PRESETS: readonly ThemePresetOption[] = [
  {
    key: 'SAND_LIGHT',
    label: 'Sand Light',
    description: 'Preset oficial claro em bege quente com contraste suave e institucional.',
    mode: 'LIGHT',
    swatches: ['#8F6A3A', '#5E4525', '#C69A5D'],
    cssVars: {
      '--bg': '#f5efe4',
      '--surface': '#fffcf7',
      '--surface-2': '#f5ede1',
      '--surface-glass': 'rgba(255, 250, 242, 0.8)',
      '--text': '#241d15',
      '--muted': '#74624f',
      '--border': '#e2d4c0',
      '--border-strong': '#c9b08a',
      '--bg-radial-1': 'rgba(198, 154, 93, 0.22)',
      '--bg-radial-2': 'rgba(106, 78, 42, 0.12)',
      '--bg-linear-start': '#fbf6ee',
      '--bg-linear-mid': '#f5efe4',
      '--bg-linear-end': '#f2ebdf',
      '--row-hover': '#fbf5eb',
      '--input-bg': '#fffaf2',
      '--input-placeholder': '#9e8c78',
      '--menu-bg': '#fffaf2',
      '--menu-hover': '#f6ecdd',
      '--btn-secondary-bg': '#f8efe2',
      '--btn-secondary-text': '#3e2f1f',
      '--btn-secondary-bg-hover': '#fff7ea',
      '--sidenav-border': 'rgba(94, 69, 37, 0.18)',
      '--sidenav-radial': 'rgba(198, 154, 93, 0.16)',
      '--sidenav-bg-top': '#f5ede0',
      '--sidenav-bg-mid': '#f3eadb',
      '--sidenav-bg-bottom': '#efe5d6',
      '--sidenav-text': '#2c241b',
      '--sidenav-grid': 'rgba(142, 107, 54, 0.08)',
      '--sidenav-hover-border': 'rgba(143, 106, 58, 0.18)',
      '--sidenav-hover-bg': 'rgba(198, 154, 93, 0.08)',
      '--sidenav-active-border': 'rgba(143, 106, 58, 0.28)',
      '--sidenav-active-a': 'rgba(198, 154, 93, 0.2)',
      '--sidenav-active-b': 'rgba(94, 69, 37, 0.08)',
      '--sidenav-button-border': 'rgba(94, 69, 37, 0.12)',
      '--sidenav-button-bg': 'rgba(255, 255, 255, 0.4)',
      '--sidenav-button-bg-hover': 'rgba(255, 255, 255, 0.65)',
      '--topbar-bg': 'rgba(255, 250, 242, 0.84)',
      '--topbar-border': 'rgba(156, 121, 74, 0.2)',
      '--avatar-border': 'rgba(143, 106, 58, 0.18)',
      '--avatar-bg-a': '#fff8ea',
      '--avatar-bg-b': '#f0e0c2',
      '--story-border': 'rgba(143, 106, 58, 0.14)',
      '--story-radial-a': 'rgba(198, 154, 93, 0.14)',
      '--story-radial-b': 'rgba(94, 69, 37, 0.1)',
      '--story-bg-a': 'rgba(255, 250, 242, 0.92)',
      '--story-bg-b': 'rgba(247, 238, 226, 0.9)',
      '--story-grid': 'rgba(143, 106, 58, 0.05)',
      '--story-list-text': '#3b3127',
      '--story-metric-border': 'rgba(143, 106, 58, 0.12)',
      '--story-metric-bg': 'rgba(255, 249, 239, 0.78)',
      '--story-metric-strong': '#5b4223',
      '--auth-panel-border': 'rgba(143, 106, 58, 0.16)',
      '--auth-panel-bg': 'rgba(255, 251, 245, 0.9)'
    }
  },
  {
    key: 'AURORA_LIGHT',
    label: 'Aurora Blue',
    description: 'Visual clean com azul tecnologico e ciano luminoso.',
    mode: 'LIGHT',
    swatches: ['#1176EE', '#0A58BA', '#06B6D4'],
    cssVars: {
      '--bg': '#eef4fb',
      '--surface': '#ffffff',
      '--surface-2': '#f5f9ff',
      '--surface-glass': 'rgba(255, 255, 255, 0.78)',
      '--text': '#0f172a',
      '--muted': '#5c6c86',
      '--border': '#d7e2f1',
      '--border-strong': '#b8cae4',
      '--bg-radial-1': 'rgba(17, 118, 238, 0.2)',
      '--bg-radial-2': 'rgba(6, 182, 212, 0.16)',
      '--bg-linear-start': '#f7fbff',
      '--bg-linear-mid': '#eef4fb',
      '--bg-linear-end': '#edf3fb',
      '--row-hover': '#f8fbff',
      '--input-bg': '#ffffff',
      '--input-placeholder': '#94a3b8',
      '--menu-bg': '#ffffff',
      '--menu-hover': '#f3f8ff',
      '--btn-secondary-bg': '#f9fbff',
      '--btn-secondary-text': '#1d2a43',
      '--btn-secondary-bg-hover': '#ffffff',
      '--sidenav-border': 'rgba(30, 66, 115, 0.22)',
      '--sidenav-radial': 'rgba(17, 118, 238, 0.26)',
      '--sidenav-bg-top': '#0c1730',
      '--sidenav-bg-mid': '#111f3e',
      '--sidenav-bg-bottom': '#122447',
      '--sidenav-text': '#d9e8ff',
      '--sidenav-grid': 'rgba(90, 131, 190, 0.14)',
      '--sidenav-hover-border': 'rgba(154, 189, 238, 0.28)',
      '--sidenav-hover-bg': 'rgba(203, 225, 252, 0.12)',
      '--sidenav-active-border': 'rgba(102, 186, 255, 0.4)',
      '--sidenav-active-a': 'rgba(17, 118, 238, 0.3)',
      '--sidenav-active-b': 'rgba(6, 182, 212, 0.24)',
      '--sidenav-button-border': 'rgba(187, 212, 247, 0.25)',
      '--sidenav-button-bg': 'rgba(255, 255, 255, 0.08)',
      '--sidenav-button-bg-hover': 'rgba(255, 255, 255, 0.16)',
      '--topbar-bg': 'rgba(255, 255, 255, 0.8)',
      '--topbar-border': 'rgba(184, 203, 228, 0.8)',
      '--avatar-border': 'rgba(177, 197, 224, 0.82)',
      '--avatar-bg-a': '#ffffff',
      '--avatar-bg-b': '#f1f7ff',
      '--story-border': 'rgba(187, 207, 234, 0.72)',
      '--story-radial-a': 'rgba(17, 118, 238, 0.2)',
      '--story-radial-b': 'rgba(6, 182, 212, 0.2)',
      '--story-bg-a': 'rgba(255, 255, 255, 0.88)',
      '--story-bg-b': 'rgba(247, 251, 255, 0.85)',
      '--story-grid': 'rgba(17, 118, 238, 0.06)',
      '--story-list-text': '#24334d',
      '--story-metric-border': 'rgba(17, 118, 238, 0.16)',
      '--story-metric-bg': 'rgba(255, 255, 255, 0.72)',
      '--story-metric-strong': '#103468',
      '--auth-panel-border': 'rgba(183, 201, 226, 0.82)',
      '--auth-panel-bg': 'rgba(255, 255, 255, 0.8)'
    }
  },
  {
    key: 'EMERALD_LIGHT',
    label: 'Emerald Grid',
    description: 'Paleta moderna em verde e teal com leitura suave.',
    mode: 'LIGHT',
    swatches: ['#0F766E', '#115E59', '#22C55E'],
    cssVars: {
      '--bg': '#edf7f5',
      '--surface': '#ffffff',
      '--surface-2': '#f1fbf8',
      '--surface-glass': 'rgba(255, 255, 255, 0.8)',
      '--text': '#112530',
      '--muted': '#4f6774',
      '--border': '#cde3dd',
      '--border-strong': '#a6c8be',
      '--bg-radial-1': 'rgba(15, 118, 110, 0.18)',
      '--bg-radial-2': 'rgba(34, 197, 94, 0.14)',
      '--bg-linear-start': '#f6fffd',
      '--bg-linear-mid': '#edf7f5',
      '--bg-linear-end': '#e9f3f1',
      '--row-hover': '#f0fbf8',
      '--input-bg': '#ffffff',
      '--input-placeholder': '#7b8f9d',
      '--menu-bg': '#ffffff',
      '--menu-hover': '#edf8f4',
      '--btn-secondary-bg': '#f2fbf8',
      '--btn-secondary-text': '#1c3d4a',
      '--btn-secondary-bg-hover': '#ffffff',
      '--sidenav-border': 'rgba(16, 83, 77, 0.24)',
      '--sidenav-radial': 'rgba(15, 118, 110, 0.25)',
      '--sidenav-bg-top': '#0a1f25',
      '--sidenav-bg-mid': '#0f2b32',
      '--sidenav-bg-bottom': '#12353f',
      '--sidenav-text': '#daf8f3',
      '--sidenav-grid': 'rgba(74, 167, 150, 0.18)',
      '--sidenav-hover-border': 'rgba(112, 211, 191, 0.3)',
      '--sidenav-hover-bg': 'rgba(106, 219, 196, 0.12)',
      '--sidenav-active-border': 'rgba(83, 221, 177, 0.45)',
      '--sidenav-active-a': 'rgba(15, 118, 110, 0.32)',
      '--sidenav-active-b': 'rgba(34, 197, 94, 0.24)',
      '--sidenav-button-border': 'rgba(174, 236, 223, 0.25)',
      '--sidenav-button-bg': 'rgba(255, 255, 255, 0.08)',
      '--sidenav-button-bg-hover': 'rgba(255, 255, 255, 0.16)',
      '--topbar-bg': 'rgba(255, 255, 255, 0.82)',
      '--topbar-border': 'rgba(166, 200, 190, 0.75)',
      '--avatar-border': 'rgba(164, 199, 192, 0.82)',
      '--avatar-bg-a': '#ffffff',
      '--avatar-bg-b': '#ecf9f4',
      '--story-border': 'rgba(168, 207, 197, 0.68)',
      '--story-radial-a': 'rgba(15, 118, 110, 0.18)',
      '--story-radial-b': 'rgba(34, 197, 94, 0.16)',
      '--story-bg-a': 'rgba(255, 255, 255, 0.9)',
      '--story-bg-b': 'rgba(244, 255, 251, 0.86)',
      '--story-grid': 'rgba(15, 118, 110, 0.08)',
      '--story-list-text': '#23414c',
      '--story-metric-border': 'rgba(15, 118, 110, 0.16)',
      '--story-metric-bg': 'rgba(255, 255, 255, 0.74)',
      '--story-metric-strong': '#0f4d5c',
      '--auth-panel-border': 'rgba(163, 196, 186, 0.78)',
      '--auth-panel-bg': 'rgba(255, 255, 255, 0.82)'
    }
  },
  {
    key: 'MIDNIGHT_DARK',
    label: 'Midnight Pulse',
    description: 'Modo dark com azul neon e contraste premium.',
    mode: 'DARK',
    swatches: ['#38BDF8', '#0EA5E9', '#22D3EE'],
    cssVars: {
      '--bg': '#0b1322',
      '--surface': '#111c2f',
      '--surface-2': '#16253b',
      '--surface-glass': 'rgba(13, 23, 38, 0.8)',
      '--text': '#e6edf9',
      '--muted': '#9bb0cb',
      '--border': '#2a3d5d',
      '--border-strong': '#3a557d',
      '--bg-radial-1': 'rgba(56, 189, 248, 0.18)',
      '--bg-radial-2': 'rgba(34, 211, 238, 0.12)',
      '--bg-linear-start': '#0d1628',
      '--bg-linear-mid': '#0b1322',
      '--bg-linear-end': '#0a1120',
      '--row-hover': '#1b2d48',
      '--input-bg': '#132238',
      '--input-placeholder': '#8ea5c3',
      '--menu-bg': '#132238',
      '--menu-hover': '#1c3150',
      '--btn-secondary-bg': '#182a44',
      '--btn-secondary-text': '#d9e9ff',
      '--btn-secondary-bg-hover': '#21385b',
      '--sidenav-border': 'rgba(61, 103, 154, 0.32)',
      '--sidenav-radial': 'rgba(56, 189, 248, 0.2)',
      '--sidenav-bg-top': '#091529',
      '--sidenav-bg-mid': '#0c1a32',
      '--sidenav-bg-bottom': '#0f2343',
      '--sidenav-text': '#d6e6ff',
      '--sidenav-grid': 'rgba(95, 136, 186, 0.16)',
      '--sidenav-hover-border': 'rgba(120, 175, 235, 0.32)',
      '--sidenav-hover-bg': 'rgba(114, 181, 255, 0.15)',
      '--sidenav-active-border': 'rgba(56, 189, 248, 0.58)',
      '--sidenav-active-a': 'rgba(56, 189, 248, 0.28)',
      '--sidenav-active-b': 'rgba(34, 211, 238, 0.26)',
      '--sidenav-button-border': 'rgba(161, 198, 245, 0.28)',
      '--sidenav-button-bg': 'rgba(255, 255, 255, 0.08)',
      '--sidenav-button-bg-hover': 'rgba(255, 255, 255, 0.16)',
      '--topbar-bg': 'rgba(13, 23, 38, 0.82)',
      '--topbar-border': 'rgba(55, 76, 108, 0.88)',
      '--avatar-border': 'rgba(71, 99, 139, 0.86)',
      '--avatar-bg-a': '#162944',
      '--avatar-bg-b': '#102136',
      '--story-border': 'rgba(62, 84, 117, 0.78)',
      '--story-radial-a': 'rgba(56, 189, 248, 0.14)',
      '--story-radial-b': 'rgba(34, 211, 238, 0.14)',
      '--story-bg-a': 'rgba(14, 24, 40, 0.86)',
      '--story-bg-b': 'rgba(10, 18, 32, 0.9)',
      '--story-grid': 'rgba(105, 146, 196, 0.12)',
      '--story-list-text': '#d5e5fb',
      '--story-metric-border': 'rgba(72, 109, 157, 0.38)',
      '--story-metric-bg': 'rgba(16, 30, 49, 0.74)',
      '--story-metric-strong': '#7ad4ff',
      '--auth-panel-border': 'rgba(58, 82, 118, 0.84)',
      '--auth-panel-bg': 'rgba(13, 23, 38, 0.85)'
    }
  },
  {
    key: 'GRAPHITE_DARK',
    label: 'Graphite Neo',
    description: 'Modo dark elegante com violeta e aqua.',
    mode: 'DARK',
    swatches: ['#8B5CF6', '#6366F1', '#14B8A6'],
    cssVars: {
      '--bg': '#101019',
      '--surface': '#181927',
      '--surface-2': '#212336',
      '--surface-glass': 'rgba(24, 25, 39, 0.8)',
      '--text': '#eceffc',
      '--muted': '#a9aec9',
      '--border': '#343854',
      '--border-strong': '#4a5173',
      '--bg-radial-1': 'rgba(139, 92, 246, 0.15)',
      '--bg-radial-2': 'rgba(20, 184, 166, 0.12)',
      '--bg-linear-start': '#141523',
      '--bg-linear-mid': '#101019',
      '--bg-linear-end': '#0d0e16',
      '--row-hover': '#2a2d43',
      '--input-bg': '#202338',
      '--input-placeholder': '#9ba3bf',
      '--menu-bg': '#202338',
      '--menu-hover': '#2a2f49',
      '--btn-secondary-bg': '#2a2d45',
      '--btn-secondary-text': '#e7ebff',
      '--btn-secondary-bg-hover': '#343955',
      '--sidenav-border': 'rgba(115, 106, 179, 0.33)',
      '--sidenav-radial': 'rgba(139, 92, 246, 0.2)',
      '--sidenav-bg-top': '#17162b',
      '--sidenav-bg-mid': '#1b1d34',
      '--sidenav-bg-bottom': '#212546',
      '--sidenav-text': '#e8e4ff',
      '--sidenav-grid': 'rgba(143, 136, 201, 0.16)',
      '--sidenav-hover-border': 'rgba(175, 160, 255, 0.35)',
      '--sidenav-hover-bg': 'rgba(151, 129, 250, 0.15)',
      '--sidenav-active-border': 'rgba(139, 92, 246, 0.58)',
      '--sidenav-active-a': 'rgba(139, 92, 246, 0.28)',
      '--sidenav-active-b': 'rgba(20, 184, 166, 0.26)',
      '--sidenav-button-border': 'rgba(203, 194, 255, 0.26)',
      '--sidenav-button-bg': 'rgba(255, 255, 255, 0.08)',
      '--sidenav-button-bg-hover': 'rgba(255, 255, 255, 0.16)',
      '--topbar-bg': 'rgba(24, 25, 39, 0.84)',
      '--topbar-border': 'rgba(71, 79, 114, 0.84)',
      '--avatar-border': 'rgba(92, 98, 139, 0.84)',
      '--avatar-bg-a': '#2a2e45',
      '--avatar-bg-b': '#1e2235',
      '--story-border': 'rgba(82, 88, 124, 0.8)',
      '--story-radial-a': 'rgba(139, 92, 246, 0.14)',
      '--story-radial-b': 'rgba(20, 184, 166, 0.14)',
      '--story-bg-a': 'rgba(25, 26, 41, 0.86)',
      '--story-bg-b': 'rgba(15, 17, 29, 0.9)',
      '--story-grid': 'rgba(163, 161, 198, 0.12)',
      '--story-list-text': '#e1e3f5',
      '--story-metric-border': 'rgba(106, 113, 160, 0.42)',
      '--story-metric-bg': 'rgba(30, 33, 52, 0.76)',
      '--story-metric-strong': '#c6b6ff',
      '--auth-panel-border': 'rgba(77, 83, 122, 0.86)',
      '--auth-panel-bg': 'rgba(24, 25, 39, 0.86)'
    }
  }
];

const PRESET_MAP = new Map<ThemePresetKey, ThemePresetOption>(THEME_PRESETS.map((preset) => [preset.key, preset]));

const DEFAULT_SETTINGS: SystemSettingsDto = {
  id: 'default',
  brandName: 'Imóveis Hub',
  brandShortName: 'IH',
  themePreset: 'SAND_LIGHT',
  primaryColor: '#8F6A3A',
  secondaryColor: '#5E4525',
  accentColor: '#C69A5D',
  enableAnimations: true,
  enableGuidedFlows: false,
  updatedAtUtc: new Date(0).toISOString()
};

const SETTINGS_CACHE_KEY = 'imoveis_system_settings';

@Injectable({ providedIn: 'root' })
export class SystemSettingsService {
  private readonly api = inject(HttpApiService);
  private readonly settingsState = signal<SystemSettingsDto>(this.readCachedSettings());

  readonly settings = computed(() => this.settingsState());
  readonly brandName = computed(() => this.settingsState().brandName || DEFAULT_SETTINGS.brandName);
  readonly brandShortName = computed(() => this.settingsState().brandShortName || DEFAULT_SETTINGS.brandShortName);
  readonly guidedFlowsEnabled = computed(() => !!this.settingsState().enableGuidedFlows);
  readonly themePresets = THEME_PRESETS;

  constructor() {
    this.applyTheme(this.settingsState());
  }

  loadPublic(): Observable<SystemSettingsDto> {
    return this.api.get<SystemSettingsDto>('/configuracoes/publico', undefined, { silent: true }).pipe(
      tap((settings) => this.setSettings({ ...this.settingsState(), ...settings })),
      catchError(() => of(this.settingsState()))
    );
  }

  loadPrivate(): Observable<SystemSettingsDto> {
    return this.api.get<SystemSettingsDto>('/configuracoes', undefined, { silent: true }).pipe(
      tap((settings) => this.setSettings({ ...this.settingsState(), ...settings }))
    );
  }

  update(payload: SystemSettingsUpdateRequest): Observable<SystemSettingsDto> {
    return this.api.put<SystemSettingsDto>('/configuracoes', payload).pipe(
      map((settings) => this.normalizeSettings({ ...this.settingsState(), ...settings, ...payload })),
      tap((settings) => this.setSettings(settings))
    );
  }

  applyPreview(payload: SystemSettingsUpdateRequest): void {
    const preview = this.normalizeSettings({
      ...this.settingsState(),
      ...payload
    });

    this.applyTheme(preview);
  }

  restoreAppliedTheme(): void {
    this.applyTheme(this.settingsState());
  }

  private setSettings(settings: SystemSettingsDto): void {
    const normalized = this.normalizeSettings(settings);
    this.settingsState.set(normalized);
    this.cacheSettings(normalized);
    this.applyTheme(normalized);
  }

  private normalizeSettings(settings: SystemSettingsDto): SystemSettingsDto {
    const preset = this.resolvePreset(settings.themePreset);

    return {
      ...settings,
      brandName: (settings.brandName || DEFAULT_SETTINGS.brandName).trim(),
      brandShortName: (settings.brandShortName || DEFAULT_SETTINGS.brandShortName).trim().toUpperCase(),
      themePreset: preset.key,
      primaryColor: this.normalizeHex(settings.primaryColor, preset.swatches[0]),
      secondaryColor: this.normalizeHex(settings.secondaryColor, preset.swatches[1]),
      accentColor: this.normalizeHex(settings.accentColor, preset.swatches[2]),
      enableAnimations: !!settings.enableAnimations,
      enableGuidedFlows: !!settings.enableGuidedFlows
    };
  }

  private normalizeHex(value: string | null | undefined, fallback: string): string {
    const normalized = (value ?? '').trim().toUpperCase();
    return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : fallback;
  }

  private resolvePreset(value: ThemePresetKey | string | null | undefined): ThemePresetOption {
    const normalized = String(value ?? '').trim().toUpperCase() as ThemePresetKey;
    return PRESET_MAP.get(normalized) ?? PRESET_MAP.get(DEFAULT_SETTINGS.themePreset)!;
  }

  private applyTheme(settings: SystemSettingsDto): void {
    if (typeof document === 'undefined') {
      return;
    }

    const preset = this.resolvePreset(settings.themePreset);
    const root = document.documentElement;

    root.style.setProperty('--brand', settings.primaryColor);
    root.style.setProperty('--brand-2', settings.secondaryColor);
    root.style.setProperty('--accent', settings.accentColor);

    for (const [key, value] of Object.entries(preset.cssVars)) {
      root.style.setProperty(key, value);
    }

    root.classList.toggle('theme-dark', preset.mode === 'DARK');
    root.classList.toggle('reduced-motion', !settings.enableAnimations);
    root.dataset['themePreset'] = preset.key;
  }

  private readCachedSettings(): SystemSettingsDto {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_SETTINGS;
    }

    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    try {
      return this.normalizeSettings(JSON.parse(raw) as SystemSettingsDto);
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  private cacheSettings(settings: SystemSettingsDto): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
  }
}
