// main.ts - Updated for standalone component bootstrapping
import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/components/app.component';
import { importProvidersFrom } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// Material UI imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';

// Components
import { LoginComponent } from './app/components/login/login.component';
import { ConfigComponent } from './app/components/config/config.component';
import { WorkflowBuilderComponent } from './app/components/workflow-builder/workflow-builder.component';

// Services and Guards
import { AuthService } from './app/services/auth.service';
import { ConfigService } from './app/services/config.service';
import { ApiService } from './app/services/api.service';
import { WorkflowService } from './app/services/workflow.service';
import { AuthGuard } from './app/guards/auth.guard';

// Auth Interceptor
import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptorClass implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();

    if (token) {
      const authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(authReq);
    }

    return next.handle(req);
  }
}

const routes = [
  { path: 'login', component: LoginComponent },
  { path: 'config', component: ConfigComponent },
  {
    path: 'workflow',
    component: WorkflowBuilderComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'mapper-builder',
    loadComponent: () => import('./app/components/mapper-builder/mapper-builder.component')
      .then(m => m.MapperBuilderComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'approval-flow',
    loadComponent: () => import('./app/components/approval-flow-builder/approval-flow-builder.component')
      .then(m => m.ApprovalFlowBuilderComponent),
    canActivate: [AuthGuard]
  },
  { path: '', redirectTo: '/workflow', pathMatch: 'full' },
  { path: '**', redirectTo: '/workflow' }
];

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      HttpClientModule,
      FormsModule,
      ReactiveFormsModule,
      BrowserAnimationsModule,
      RouterModule.forRoot(routes),

      // Material Modules
      MatToolbarModule,
      MatButtonModule,
      MatInputModule,
      MatCardModule,
      MatTabsModule,
      MatTableModule,
      MatIconModule,
      MatDialogModule,
      MatSnackBarModule,
      MatProgressSpinnerModule,
      MatSelectModule,
      MatFormFieldModule,
      MatExpansionModule,
      MatChipsModule,
      MatSidenavModule,
      MatListModule,
      MatMenuModule,
      MatCheckboxModule,
      MatDividerModule,
      MatTooltipModule,
      DragDropModule
    ),

    // Services
    AuthService,
    ConfigService,
    ApiService,
    WorkflowService,
    AuthGuard,

    // HTTP Interceptor
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptorClass,
      multi: true
    }
  ]
}).catch(err => console.error(err));