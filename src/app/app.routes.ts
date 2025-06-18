// src/app/app.routes.ts - FINAL VERSION
import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/workflow',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'config',
    loadComponent: () => import('./components/config/config.component').then(m => m.ConfigComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'workflow',
    loadComponent: () => import('./components/workflow-builder/workflow-builder.component').then(m => m.WorkflowBuilderComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'approval-flow',
    loadComponent: () => import('./components/approval-flow-builder/approval-flow-builder.component')
      .then(m => m.ApprovalFlowBuilderComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'mapper-builder',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/mapper-builder/components/mapper-list/mapper-list.component')
          .then(m => m.MapperListComponent)
      },
      {
        path: 'new',
        loadComponent: () => import('./components/mapper-builder/mapper-builder.component')
          .then(m => m.MapperBuilderComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('./components/mapper-builder/mapper-builder.component')
          .then(m => m.MapperBuilderComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/workflow'
  }
];
