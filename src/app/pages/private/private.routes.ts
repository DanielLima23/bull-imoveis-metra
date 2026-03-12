import { Routes } from '@angular/router';
import { authChildGuard, authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { PrivateLayoutComponent } from '../../layouts/private-layout/private-layout.component';

const secured = [authGuard, authChildGuard];
const rolesData = { roles: ['ADMIN', 'OPERATOR'] };

export const PRIVATE_ROUTES: Routes = [
  {
    path: '',
    component: PrivateLayoutComponent,
    canActivate: [secured[0]],
    canActivateChild: [secured[1]],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./dashboard/dashboard.page').then((m) => m.DashboardPage) },

      { path: 'imoveis', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./imoveis/imoveis.page').then((m) => m.ImoveisPage) },
      { path: 'imoveis/new', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./imoveis/imoveis-form.page').then((m) => m.ImoveisFormPage) },
      { path: 'imoveis/:id/contas', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./despesas/despesas.page').then((m) => m.DespesasPage) },
      {
        path: 'imoveis/:id/pendencias',
        canActivate: [roleGuard],
        data: rolesData,
        loadComponent: () => import('./pendencias/pendencias.page').then((m) => m.PendenciasPage)
      },
      { path: 'imoveis/:id', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./imoveis/imoveis-detail.page').then((m) => m.ImoveisDetailPage) },
      { path: 'imoveis/:id/edit', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./imoveis/imoveis-form.page').then((m) => m.ImoveisFormPage) },
      { path: 'imoveis/:id/locatarios', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./imoveis/imoveis-locatarios.page').then((m) => m.ImoveisLocatariosPage) },

      { path: 'locatarios', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./locatarios/locatarios.page').then((m) => m.LocatariosPage) },
      { path: 'locatarios/new', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./locatarios/locatarios-form.page').then((m) => m.LocatariosFormPage) },
      { path: 'locatarios/:id/edit', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./locatarios/locatarios-form.page').then((m) => m.LocatariosFormPage) },

      { path: 'pessoas', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./pessoas/pessoas.page').then((m) => m.PessoasPage) },
      { path: 'pessoas/new', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./pessoas/pessoas-form.page').then((m) => m.PessoasFormPage) },
      { path: 'pessoas/:id/edit', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./pessoas/pessoas-form.page').then((m) => m.PessoasFormPage) },

      { path: 'locacoes', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./locacoes/locacoes.page').then((m) => m.LocacoesPage) },
      { path: 'locacoes/new', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./locacoes/locacoes-form.page').then((m) => m.LocacoesFormPage) },
      { path: 'locacoes/:id/edit', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./locacoes/locacoes-form.page').then((m) => m.LocacoesFormPage) },

      { path: 'despesas', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./despesas/despesas.page').then((m) => m.DespesasPage) },
      { path: 'despesas/new', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./despesas/despesas-form.page').then((m) => m.DespesasFormPage) },
      { path: 'despesas/:id/edit', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./despesas/despesas-form.page').then((m) => m.DespesasFormPage) },

      { path: 'pendencias', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./pendencias/pendencias.page').then((m) => m.PendenciasPage) },
      { path: 'pendencias/new', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./pendencias/pendencias-form.page').then((m) => m.PendenciasFormPage) },
      { path: 'pendencias/:id/edit', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./pendencias/pendencias-form.page').then((m) => m.PendenciasFormPage) },

      { path: 'visitas', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./visitas/visitas.page').then((m) => m.VisitasPage) },
      { path: 'visitas/new', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./visitas/visitas-form.page').then((m) => m.VisitasFormPage) },
      { path: 'visitas/:id/edit', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./visitas/visitas-form.page').then((m) => m.VisitasFormPage) },

      { path: 'manutencoes', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./manutencoes/manutencoes.page').then((m) => m.ManutencoesPage) },
      { path: 'manutencoes/new', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./manutencoes/manutencoes-form.page').then((m) => m.ManutencoesFormPage) },
      { path: 'manutencoes/:id/edit', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./manutencoes/manutencoes-form.page').then((m) => m.ManutencoesFormPage) },

      { path: 'relatorios', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./relatorios/relatorios.page').then((m) => m.RelatoriosPage) },
      { path: 'configuracoes', canActivate: [roleGuard], data: rolesData, loadComponent: () => import('./configuracoes/configuracoes.page').then((m) => m.ConfiguracoesPage) },
      {
        path: 'configuracoes/importacao-legado',
        canActivate: [roleGuard],
        data: rolesData,
        loadComponent: () => import('./configuracoes/importacao-legado.page').then((m) => m.ImportacaoLegadoPage)
      },
      { path: '**', redirectTo: 'dashboard' }
    ]
  }
];

