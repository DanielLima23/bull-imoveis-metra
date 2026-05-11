import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SystemSettingsService } from '../../core/services/system-settings.service';

type MenuIcon = 'painel' | 'cadastros' | 'operacoes' | 'relatorios' | 'configuracoes';
type ItemIcon = 'dashboard' | 'building' | 'user-check' | 'users' | 'key' | 'wallet' | 'alert-circle' | 'calendar' | 'wrench' | 'bar-chart' | 'sliders';

interface MenuItem {
  label: string;
  route: string;
  icon: ItemIcon;
}

interface MenuGroup {
  label: string;
  icon: MenuIcon;
  items: MenuItem[];
}

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './private-layout.component.html',
  styleUrl: './private-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrivateLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly systemSettings = inject(SystemSettingsService);
  private readonly router = inject(Router);

  private readonly STORAGE_KEY = 'sidebar-collapsed';
  readonly isCollapsed = signal<boolean>(true);

  readonly isMobileOpen = signal(false);
  readonly user = this.authService.currentUser;
  readonly brandName = this.systemSettings.brandName;
  readonly brandShortName = this.systemSettings.brandShortName;

  constructor() {
    this.isCollapsed.set(this.readStoredState());
  }

  readonly menuGroups = computed<MenuGroup[]>(() => [
    {
      label: 'Painel',
      icon: 'painel',
      items: [{ label: 'Visão geral', route: '/app/dashboard', icon: 'dashboard' }]
    },
    {
      label: 'Cadastros',
      icon: 'cadastros',
      items: [
        { label: 'Imóveis', route: '/app/imoveis', icon: 'building' },
        { label: 'Locatários', route: '/app/locatarios', icon: 'user-check' },
        { label: 'Pessoas', route: '/app/pessoas', icon: 'users' }
      ]
    },
    {
      label: 'Operações',
      icon: 'operacoes',
      items: [
        { label: 'Locações', route: '/app/locacoes', icon: 'key' },
        { label: 'Contas', route: '/app/despesas', icon: 'wallet' },
        { label: 'Pendências', route: '/app/pendencias', icon: 'alert-circle' },
        { label: 'Visitas', route: '/app/visitas', icon: 'calendar' },
        { label: 'Manutenções', route: '/app/manutencoes', icon: 'wrench' }
      ]
    },
    {
      label: 'Relatórios',
      icon: 'relatorios',
      items: [{ label: 'Painéis e exportações', route: '/app/relatorios', icon: 'bar-chart' }]
    },
    {
      label: 'Configurações',
      icon: 'configuracoes',
      items: [{ label: 'Preferências do sistema', route: '/app/configuracoes', icon: 'sliders' }]
    }
  ]);

  logout(): void {
    this.authService.logout();
  }

  closeMobileMenu(): void {
    this.isMobileOpen.set(false);
  }

  toggleMobileMenu(): void {
    this.isMobileOpen.update((value) => !value);
  }

  onBrandClick(): void {
    void this.router.navigate(['/app/dashboard']);
  }

  onMenuItemClick(): void {
    this.closeMobileMenu();
  }

  toggleSidebar(): void {
    this.isCollapsed.update(v => !v);
    this.persistState(this.isCollapsed());
  }

  private readStoredState(): boolean {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored === null ? true : stored === 'true'; // default: collapsed
    } catch {
      return true; // default: collapsed
    }
  }

  private persistState(collapsed: boolean): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, String(collapsed));
    } catch {
      // Silently fail - sidebar still works, just won't persist
    }
  }
}
