// components/login/login.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../services/auth.service';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Workflow Builder Login</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <div *ngIf="!configService.isConfigured()" class="config-warning">
            <mat-icon color="warn">warning</mat-icon>
            <span>API Base URL not configured. <a (click)="goToConfig()">Configure now</a></span>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" *ngIf="configService.isConfigured()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Username</mat-label>
              <input matInput formControlName="username" required>
              <mat-error *ngIf="loginForm.get('username')?.hasError('required')">
                Username is required
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password" required>
              <mat-error *ngIf="loginForm.get('password')?.hasError('required')">
                Password is required
              </mat-error>
            </mat-form-field>

            <div class="login-actions">
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="loginForm.invalid || isLoading"
                class="full-width">
                <mat-spinner diameter="20" *ngIf="isLoading"></mat-spinner>
                <span *ngIf="!isLoading">Login</span>
              </button>
            </div>
          </form>
        </mat-card-content>

        <mat-card-actions>
          <button mat-button (click)="goToConfig()">
            <mat-icon>settings</mat-icon>
            Configure API
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .login-card {
      width: 100%;
      max-width: 400px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .login-actions {
      margin-top: 16px;
    }

    .config-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fff3cd;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      color: #856404;
    }

    .config-warning a {
      color: #0066cc;
      cursor: pointer;
      text-decoration: underline;
    }

    mat-spinner {
      margin-right: 8px;
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    public configService: ConfigService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });

    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/workflow']);
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;

      this.authService.login(this.loginForm.value).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.snackBar.open('Login successful!', 'Close', { duration: 3000 });
          this.router.navigate(['/workflow']);
        },
        error: (error) => {
          this.isLoading = false;
          const errorMessage = error.error?.detail || 'Login failed. Please check your credentials.';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        }
      });
    }
  }

  goToConfig(): void {
    this.router.navigate(['/config']);
  }
}
