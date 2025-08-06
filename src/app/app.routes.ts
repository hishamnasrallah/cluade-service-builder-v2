// src/app/app.routes.ts - DEBUGGED VERSION
import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login', // Changed: Start with login instead of workflow
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => {
      console.log('Loading login component...');
      return import('./components/login/login.component').then(m => {
        console.log('Login component loaded successfully');
        return m.LoginComponent;
      }).catch(err => {
        console.error('Error loading login component:', err);
        throw err;
      });
    }
  },
  {
    path: 'config',
    loadComponent: () => {
      console.log('Loading config component...');
      return import('./components/config/config.component').then(m => {
        console.log('Config component loaded successfully');
        return m.ConfigComponent;
      }).catch(err => {
        console.error('Error loading config component:', err);
        throw err;
      });
    }
    // Temporarily remove AuthGuard to test
    // canActivate: [AuthGuard]
  },
  {
    path: 'workflow',
    loadComponent: () => {
      console.log('Loading workflow component...');
      return import('./components/workflow-builder/workflow-builder.component').then(m => {
        console.log('Workflow component loaded successfully');
        return m.WorkflowBuilderComponent;
      }).catch(err => {
        console.error('Error loading workflow component:', err);
        // Fallback to a simple component or redirect
        throw err;
      });
    },
    canActivate: [AuthGuard]
  },
  {
    path: 'approval-flow',
    loadComponent: () => {
      console.log('Loading approval-flow component...');
      return import('./components/approval-flow-builder/approval-flow-builder.component')
        .then(m => {
          console.log('Approval-flow component loaded successfully');
          return m.ApprovalFlowBuilderComponent;
        }).catch(err => {
          console.error('Error loading approval-flow component:', err);
          throw err;
        });
    },
    canActivate: [AuthGuard]
  },
  {
    path: 'mapper-builder',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => {
          console.log('Loading mapper-list component...');
          return import('./components/mapper-builder/components/mapper-list/mapper-list.component')
            .then(m => {
              console.log('Mapper-list component loaded successfully');
              return m.MapperListComponent;
            }).catch(err => {
              console.error('Error loading mapper-list component:', err);
              throw err;
            });
        }
      },
      {
        path: 'new',
        loadComponent: () => {
          console.log('Loading mapper-builder component...');
          return import('./components/mapper-builder/mapper-builder.component')
            .then(m => {
              console.log('Mapper-builder component loaded successfully');
              return m.MapperBuilderComponent;
            }).catch(err => {
              console.error('Error loading mapper-builder component:', err);
              throw err;
            });
        }
      },
      {
        path: ':id',
        loadComponent: () => {
          console.log('Loading mapper-builder component...');
          return import('./components/mapper-builder/mapper-builder.component')
            .then(m => {
              console.log('Mapper-builder component loaded successfully');
              return m.MapperBuilderComponent;
            }).catch(err => {
              console.error('Error loading mapper-builder component:', err);
              throw err;
            });
        }
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/login' // Changed: Redirect unknown routes to login instead of workflow
  }
];
