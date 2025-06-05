// app.module.ts - Updated with dialog component
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
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
import { AppComponent } from './components/app.component';
import { LoginComponent } from './components/login/login.component';
import { ConfigComponent } from './components/config/config.component';
import { WorkflowBuilderComponent } from './components/workflow-builder/workflow-builder.component';

// Dialog Components
import { WorkflowSelectorDialogComponent } from './components/workflow-builder/workflow-selector-dialog/workflow-selector-dialog.component';

// Services and Guards
import { AuthService } from './services/auth.service';
import { ConfigService } from './services/config.service';
import { ApiService } from './services/api.service';
import { WorkflowService } from './services/workflow.service';
import { AuthGuard } from './guards/auth.guard';

// Create a class-based interceptor wrapper for the functional interceptor
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

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'config', component: ConfigComponent },
  {
    path: 'workflow',
    component: WorkflowBuilderComponent,
    canActivate: [AuthGuard]
  },
  { path: '', redirectTo: '/workflow', pathMatch: 'full' },
  { path: '**', redirectTo: '/workflow' }
];

@NgModule({
  declarations: [
    // Components are now standalone, so we don't declare them here
    // AppComponent,
    // LoginComponent,
    // ConfigComponent,
    // WorkflowBuilderComponent,
    // WorkflowSelectorDialogComponent
  ],
  imports: [
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
    DragDropModule,

    // Standalone Components
    AppComponent,
    LoginComponent,
    ConfigComponent,
    WorkflowBuilderComponent,
    WorkflowSelectorDialogComponent
  ],
  providers: [
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
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
