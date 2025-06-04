// components/config/config.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="config-container">
      <mat-card class="config-card">
        <mat-card-header>
          <mat-card-title>API Configuration</mat-card-title>
          <mat-card-subtitle>Configure the base URL for your API</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="configForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>API Base URL</mat-label>
              <input
                matInput
                formControlName="baseUrl"
                placeholder="https://api.example.com"
                required>
              <mat-hint>Enter the full base URL without trailing slash</mat-hint>
              <mat-error *ngIf="configForm.get('baseUrl')?.hasError('required')">
                Base URL is required
              </mat-error>
              <mat-error *ngIf="configForm.get('baseUrl')?.hasError('pattern')">
                Please enter a valid URL
              </mat-error>
            </mat-form-field>

            <div class="current-config" *ngIf="currentBaseUrl">
              <strong>Current Configuration:</strong>
              <code>{{ currentBaseUrl }}</code>
            </div>
          </form>
        </mat-card-content>

        <mat-card-actions>
          <button
            mat-raised-button
            color="primary"
            (click)="onSubmit()"
            [disabled]="configForm.invalid">
            <mat-icon>save</mat-icon>
            Save Configuration
          </button>

          <button
            mat-button
            (click)="goToLogin()"
            *ngIf="configService.isConfigured()">
            <mat-icon>login</mat-icon>
            Go to Login
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .config-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .config-card {
      width: 100%;
      max-width: 500px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .current-config {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      margin-top: 16px;
    }

    .current-config code {
      background: #e0e0e0;
      padding: 4px 8px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      display: block;
      margin-top: 8px;
    }

    mat-card-actions {
      display: flex;
      gap: 8px;
    }
  `]
})
export class ConfigComponent {
  configForm: FormGroup;
  currentBaseUrl: string;

  constructor(
    private fb: FormBuilder,
    public configService: ConfigService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.currentBaseUrl = this.configService.getBaseUrl();

    this.configForm = this.fb.group({
      baseUrl: [
        this.currentBaseUrl,
        [
          Validators.required,
          Validators.pattern(/^https?:\/\/[^\s/$.?#].[^\s]*$/i)
        ]
      ]
    });
  }

  onSubmit(): void {
    if (this.configForm.valid) {
      const baseUrl = this.configForm.get('baseUrl')?.value;
      this.configService.setBaseUrl(baseUrl);
      this.currentBaseUrl = baseUrl;

      this.snackBar.open('Configuration saved successfully!', 'Close', {
        duration: 3000
      });
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
