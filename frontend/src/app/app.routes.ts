import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth-guard';

export const routes: Routes = [
  // ==========================================
  // PUBLIC ROUTES (No authentication required)
  // ==========================================
  
  // LOGIN
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login/login.page')
        .then(m => m.LoginPage)
  },

  // ==========================================
  // MAIN APPLICATION (Authentication required)
  // ==========================================
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component')
        .then(m => m.MainLayoutComponent),
    canActivate: [AuthGuard],  // ← Auth Guard added here
    children: [
      // ---------- DASHBOARD ----------
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.page')
            .then(m => m.DashboardPage)
      },

      // ---------- DISCLOSURES ----------
      {
        path: 'disclosures',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/disclosures/disclosures.page')
                .then(m => m.DisclosuresPage)
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./pages/disclosures/new/new-disclosure/new-disclosure.page')
                .then(m => m.NewDisclosurePage)
          }
        ]
      },

      // ---------- IP ASSETS ----------
      {
        path: 'ip-assets',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/ip-assets/ip-assets.page')
                .then(m => m.IpAssetsPage)
          }
        ]
      },

      // ---------- LICENCES ----------
      {
        path: 'licences',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/licences/licence-list/licence-list.page')
                .then(m => m.LicenceListPage)
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./pages/licences/licence-form/licence-form.page')
                .then(m => m.LicenceFormPage)
          },
          {
            path: 'detail/:id',
            loadComponent: () =>
              import('./pages/licences/licence-detail/licence-detail.page')
                .then(m => m.LicenceDetailPage)
          },
          {
            path: 'edit/:id',
            loadComponent: () =>
              import('./pages/licences/licence-form/licence-form.page')
                .then(m => m.LicenceFormPage)
          }
        ]
      },

      // ---------- COMMERCIALISATIONS ----------
      {
        path: 'commercialisations',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/commercialisations/commercialisations.page')
                .then(m => m.CommercialisationsPage)
          }
        ]
      },

      // ---------- DOCUMENTS ----------
      {
        path: 'documents',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/documents/documents.page')
                .then(m => m.DocumentsPage)
          }
        ]
      },

      // ---------- REPORTS ----------
      {
        path: 'reports',
        children: [
          {
            path: '',
            redirectTo: 'executive',
            pathMatch: 'full'
          },
          {
            path: 'executive',
            loadComponent: () =>
              import('./pages/reports/dashboard-executive/dashboard-executive.page')
                .then(m => m.DashboardExecutivePage)
          },
          {
            path: 'researcher',
            loadComponent: () =>
              import('./pages/reports/dashboard-researcher/dashboard-researcher.page')
                .then(m => m.DashboardResearcherPage)
          },
          {
            path: 'tto',
            loadComponent: () =>
              import('./pages/reports/dashboard-tto/dashboard-tto.page')
                .then(m => m.DashboardTtoPage)
          }
        ]
      },

      // ---------- ADMIN ----------
      {
        path: 'admin',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/admin/admin.page')
                .then(m => m.AdminPage)
          }
        ]
      },

      // ---------- SETTINGS ----------
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.page')
            .then(m => m.SettingsPage)
      },

      // ---------- DEFAULT ----------
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },

  // ==========================================
  // FALLBACK - 404
  // ==========================================
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];