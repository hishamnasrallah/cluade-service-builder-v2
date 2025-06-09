// components/config/config.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';

import { ConfigService } from '../../services/config.service';
import { ApiService } from '../../services/api.service';
import { ApprovalFlowApiService } from '../../services/approval-flow-api.service';

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
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatSelectModule
  ],
  template: `
    <div class="config-container">
      <div class="config-header">
        <h1>
          <mat-icon>settings</mat-icon>
          Configuration
        </h1>
        <p>Configure API endpoints and application settings</p>
      </div>

      <mat-tab-group class="config-tabs">
        <!-- API Configuration Tab -->
        <mat-tab label="API Configuration">
          <div class="tab-content">
            <mat-card class="config-card">
              <mat-card-header>
                <mat-card-title>API Base URL</mat-card-title>
                <mat-card-subtitle>Configure the backend API connection</mat-card-subtitle>
              </mat-card-header>

              <mat-card-content>
                <form [formGroup]="apiConfigForm" (ngSubmit)="saveApiConfig()">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Base URL</mat-label>
                    <input matInput
                           formControlName="baseUrl"
                           placeholder="https://api.example.com"
                           required>
                    <mat-icon matSuffix>link</mat-icon>
                    <mat-hint>Enter the base URL for your API server</mat-hint>
                    <mat-error *ngIf="apiConfigForm.get('baseUrl')?.hasError('required')">
                      Base URL is required
                    </mat-error>
                    <mat-error *ngIf="apiConfigForm.get('baseUrl')?.hasError('pattern')">
                      Please enter a valid URL
                    </mat-error>
                  </mat-form-field>

                  <div class="form-actions">
                    <button mat-raised-button
                            color="primary"
                            type="submit"
                            [disabled]="apiConfigForm.invalid || isTesting">
                      <mat-spinner diameter="20" *ngIf="isTesting"></mat-spinner>
                      <mat-icon *ngIf="!isTesting">save</mat-icon>
                      {{ isTesting ? 'Testing Connection...' : 'Save & Test' }}
                    </button>

                    <button mat-button
                            type="button"
                            (click)="testConnection()"
                            [disabled]="apiConfigForm.invalid || isTesting">
                      <mat-icon>wifi</mat-icon>
                      Test Connection
                    </button>
                  </div>
                </form>

                <!-- Connection Status -->
                <div class="connection-status" *ngIf="connectionStatus">
                  <div class="status-item" [ngClass]="connectionStatus.type">
                    <mat-icon>{{ getStatusIcon() }}</mat-icon>
                    <span>{{ connectionStatus.message }}</span>
                  </div>

                  <div *ngIf="connectionStatus.details" class="status-details">
                    <p><strong>Response Time:</strong> {{ connectionStatus.details.responseTime }}ms</p>
                    <p><strong>Server:</strong> {{ connectionStatus.details.server || 'Unknown' }}</p>
                    <p><strong>API Version:</strong> {{ connectionStatus.details.version || 'Unknown' }}</p>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- API Endpoints Information -->
            <mat-card class="config-card">
              <mat-card-header>
                <mat-card-title>Available Endpoints</mat-card-title>
                <mat-card-subtitle>Approval Flow API endpoints</mat-card-subtitle>
              </mat-card-header>

              <mat-card-content>
                <div class="endpoints-list">
                  <div class="endpoint-item" *ngFor="let endpoint of apiEndpoints">
                    <div class="endpoint-info">
                      <span class="endpoint-method" [ngClass]="endpoint.method.toLowerCase()">
                        {{ endpoint.method }}
                      </span>
                      <span class="endpoint-path">{{ endpoint.path }}</span>
                    </div>
                    <span class="endpoint-description">{{ endpoint.description }}</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Application Settings Tab -->
        <mat-tab label="Application Settings">
          <div class="tab-content">
            <mat-card class="config-card">
              <mat-card-header>
                <mat-card-title>User Interface</mat-card-title>
                <mat-card-subtitle>Customize the application interface</mat-card-subtitle>
              </mat-card-header>

              <mat-card-content>
                <form [formGroup]="appSettingsForm" (ngSubmit)="saveAppSettings()">
                  <div class="settings-grid">
                    <mat-form-field appearance="outline">
                      <mat-label>Default Language</mat-label>
                      <mat-select formControlName="language">
                        <mat-option value="en">English</mat-option>
                        <mat-option value="ar">Arabic</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Theme</mat-label>
                      <mat-select formControlName="theme">
                        <mat-option value="light">Light</mat-option>
                        <mat-option value="dark">Dark</mat-option>
                        <mat-option value="auto">Auto (System)</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Auto-save Interval (seconds)</mat-label>
                      <input matInput
                             type="number"
                             formControlName="autoSaveInterval"
                             min="10"
                             max="300">
                      <mat-hint>How often to auto-save changes</mat-hint>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Grid Snap Size (pixels)</mat-label>
                      <input matInput
                             type="number"
                             formControlName="gridSnapSize"
                             min="5"
                             max="50">
                      <mat-hint>Grid snap size for element positioning</mat-hint>
                    </mat-form-field>
                  </div>

                  <div class="settings-toggles">
                    <mat-slide-toggle formControlName="showGridLines">
                      Show grid lines in canvas
                    </mat-slide-toggle>

                    <mat-slide-toggle formControlName="enableSnapToGrid">
                      Enable snap to grid
                    </mat-slide-toggle>

                    <mat-slide-toggle formControlName="showElementIds">
                      Show element IDs
                    </mat-slide-toggle>

                    <mat-slide-toggle formControlName="enableKeyboardShortcuts">
                      Enable keyboard shortcuts
                    </mat-slide-toggle>

                    <mat-slide-toggle formControlName="showMinimap">
                      Show minimap by default
                    </mat-slide-toggle>

                    <mat-slide-toggle formControlName="autoValidate">
                      Auto-validate flows on changes
                    </mat-slide-toggle>
                  </div>

                  <div class="form-actions">
                    <button mat-raised-button
                            color="primary"
                            type="submit"
                            [disabled]="appSettingsForm.invalid">
                      <mat-icon>save</mat-icon>
                      Save Settings
                    </button>

                    <button mat-button
                            type="button"
                            (click)="resetToDefaults()">
                      <mat-icon>restore</mat-icon>
                      Reset to Defaults
                    </button>
                  </div>
                </form>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Data Management Tab -->
        <mat-tab label="Data Management">
          <div class="tab-content">
            <mat-card class="config-card">
              <mat-card-header>
                <mat-card-title>Local Data</mat-card-title>
                <mat-card-subtitle>Manage locally stored data</mat-card-subtitle>
              </mat-card-header>

              <mat-card-content>
                <div class="data-stats">
                  <div class="stat-item">
                    <mat-icon>storage</mat-icon>
                    <div>
                      <strong>Local Storage Used</strong>
                      <p>{{ getLocalStorageSize() }} KB</p>
                    </div>
                  </div>

                  <div class="stat-item">
                    <mat-icon>account_tree</mat-icon>
                    <div>
                      <strong>Saved Flows</strong>
                      <p>{{ getSavedFlowsCount() }} flows</p>
                    </div>
                  </div>

                  <div class="stat-item">
                    <mat-icon>settings</mat-icon>
                    <div>
                      <strong>Configuration</strong>
                      <p>{{ isConfigured ? 'Configured' : 'Not configured' }}</p>
                    </div>
                  </div>
                </div>

                <mat-divider></mat-divider>

                <div class="data-actions">
                  <h3>Data Actions</h3>

                  <div class="action-buttons">
                    <button mat-raised-button
                            color="accent"
                            (click)="exportData()">
                      <mat-icon>download</mat-icon>
                      Export All Data
                    </button>

                    <button mat-raised-button
                            (click)="importData()">
                      <mat-icon>upload</mat-icon>
                      Import Data
                    </button>

                    <button mat-raised-button
                            color="warn"
                            (click)="clearAllData()">
                      <mat-icon>delete_sweep</mat-icon>
                      Clear All Data
                    </button>
                  </div>

                  <input #fileInput
                         type="file"
                         accept=".json"
                         (change)="onFileSelected($event)"
                         style="display: none;">
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- About Tab -->
        <mat-tab label="About">
          <div class="tab-content">
            <mat-card class="config-card">
              <mat-card-header>
                <mat-card-title>Approval Flow Builder</mat-card-title>
                <mat-card-subtitle>Version 1.0.0</mat-card-subtitle>
              </mat-card-header>

              <mat-card-content>
                <div class="about-content">
                  <div class="app-info">
                    <mat-icon class="app-logo">account_tree</mat-icon>
                    <h2>Approval Flow Builder</h2>
                    <p>A powerful visual tool for designing and managing approval workflows with dynamic conditions and role-based routing.</p>
                  </div>

                  <mat-divider></mat-divider>

                  <div class="features-list">
                    <h3>Features</h3>
                    <ul>
                      <li>Visual drag-and-drop flow builder</li>
                      <li>Dynamic conditional logic</li>
                      <li>Role-based approval routing</li>
                      <li>Parallel approval groups</li>
                      <li>Real-time validation</li>
                      <li>Export/import capabilities</li>
                      <li>API integration</li>
                    </ul>
                  </div>

                  <mat-divider></mat-divider>

                  <div class="tech-info">
                    <h3>Technical Information</h3>
                    <div class="tech-grid">
                      <div class="tech-item">
                        <strong>Framework:</strong>
                        <span>Angular 17</span>
                      </div>
                      <div class="tech-item">
                        <strong>UI Library:</strong>
                        <span>Angular Material</span>
                      </div>
                      <div class="tech-item">
                        <strong>Build Tool:</strong>
                        <span>Angular CLI</span>
                      </div>
                      <div class="tech-item">
                        <strong>Browser Support:</strong>
                        <span>Modern browsers (ES2020+)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>

      <!-- Navigation Actions -->
      <div class="navigation-actions">
        <button mat-raised-button
                color="primary"
                (click)="navigateToApprovalFlow()">
          <mat-icon>account_tree</mat-icon>
          Go to Approval Flow Builder
        </button>

        <button mat-raised-button
                color="accent"
                (click)="goToLogin()"
                *ngIf="configService.isConfigured()">
          <mat-icon>login</mat-icon>
          Go to Login
        </button>

        <button mat-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
          Back
        </button>
      </div>
    </div>
  `,
  styles: [`
    .config-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .config-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .config-header h1 {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin: 0 0 8px 0;
      color: #333;
    }

    .config-header h1 mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .config-header p {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .config-tabs {
      margin-bottom: 32px;
    }

    .tab-content {
      padding: 24px 0;
    }

    .config-card {
      margin-bottom: 24px;
    }

    .full-width {
      width: 100%;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .connection-status {
      margin-top: 24px;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid;
    }

    .connection-status.success {
      background: #e8f5e8;
      border-color: #4caf50;
      color: #2e7d32;
    }

    .connection-status.error {
      background: #ffebee;
      border-color: #f44336;
      color: #c62828;
    }

    .connection-status.warning {
      background: #fff3e0;
      border-color: #ff9800;
      color: #ef6c00;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .status-details {
      margin-left: 32px;
      font-size: 14px;
    }

    .status-details p {
      margin: 4px 0;
    }

    .endpoints-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .endpoint-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 4px solid #2196f3;
    }

    .endpoint-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .endpoint-method {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      color: white;
      min-width: 60px;
      text-align: center;
    }

    .endpoint-method.get { background: #4caf50; }
    .endpoint-method.post { background: #2196f3; }
    .endpoint-method.put { background: #ff9800; }
    .endpoint-method.delete { background: #f44336; }

    .endpoint-path {
      font-family: monospace;
      font-size: 14px;
      color: #333;
    }

    .endpoint-description {
      font-size: 13px;
      color: #666;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .settings-toggles {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .data-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .stat-item mat-icon {
      color: #2196f3;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .stat-item div {
      flex: 1;
    }

    .stat-item strong {
      display: block;
      margin-bottom: 4px;
      color: #333;
    }

    .stat-item p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .data-actions h3 {
      margin: 24px 0 16px 0;
      color: #333;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .about-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .app-info {
      text-align: center;
    }

    .app-logo {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #2196f3;
      margin-bottom: 16px;
    }

    .app-info h2 {
      margin: 0 0 16px 0;
      color: #333;
    }

    .app-info p {
      margin: 0;
      color: #666;
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.6;
    }

    .features-list h3,
    .tech-info h3 {
      margin: 0 0 16px 0;
      color: #333;
    }

    .features-list ul {
      margin: 0;
      padding-left: 20px;
      color: #666;
    }

    .features-list li {
      margin-bottom: 8px;
    }

    .tech-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .tech-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }

    .tech-item:last-child {
      border-bottom: none;
    }

    .navigation-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      padding-top: 24px;
      border-top: 1px solid #eee;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .config-container {
        padding: 16px;
      }

      .settings-grid {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column;
      }

      .action-buttons {
        flex-direction: column;
      }

      .navigation-actions {
        flex-direction: column;
      }
    }
  `]
})
export class ConfigComponent implements OnInit {
  apiConfigForm: FormGroup;
  appSettingsForm: FormGroup;
  isTesting = false;
  isConfigured = false;

  connectionStatus: {
    type: 'success' | 'error' | 'warning';
    message: string;
    details?: any;
  } | null = null;

  apiEndpoints = [
    { method: 'GET', path: '/conditional_approvals/actions/', description: 'Retrieve approval actions' },
    { method: 'POST', path: '/conditional_approvals/actions/', description: 'Create new approval action' },
    { method: 'GET', path: '/conditional_approvals/master-steps/', description: 'Retrieve approval flow steps' },
    { method: 'GET', path: '/lookups/?name=Service', description: 'Get service types' },
    { method: 'GET', path: '/lookups/?name=Case Status', description: 'Get case statuses' },
    { method: 'GET', path: '/auth/groups/', description: 'Get user groups' }
  ];

  constructor(
    private fb: FormBuilder,
    public configService: ConfigService,
    private apiService: ApiService,
    private approvalFlowApiService: ApprovalFlowApiService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.apiConfigForm = this.fb.group({
      baseUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]]
    });

    this.appSettingsForm = this.fb.group({
      language: ['en'],
      theme: ['light'],
      autoSaveInterval: [30, [Validators.min(10), Validators.max(300)]],
      gridSnapSize: [20, [Validators.min(5), Validators.max(50)]],
      showGridLines: [true],
      enableSnapToGrid: [true],
      showElementIds: [false],
      enableKeyboardShortcuts: [true],
      showMinimap: [false],
      autoValidate: [true]
    });
  }

  ngOnInit(): void {
    this.loadCurrentConfiguration();
    this.loadAppSettings();
  }

  private loadCurrentConfiguration(): void {
    const currentUrl = this.configService.getBaseUrl();
    this.isConfigured = this.configService.isConfigured();

    if (currentUrl) {
      this.apiConfigForm.patchValue({ baseUrl: currentUrl });
    }
  }

  private loadAppSettings(): void {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('app_settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        this.appSettingsForm.patchValue(settings);
      } catch (error) {
        console.error('Error loading app settings:', error);
      }
    }
  }

  saveApiConfig(): void {
    if (this.apiConfigForm.valid) {
      const baseUrl = this.apiConfigForm.get('baseUrl')?.value;
      this.configService.setBaseUrl(baseUrl);
      this.testConnection();
    }
  }

  testConnection(): void {
    if (this.apiConfigForm.invalid) {
      return;
    }

    this.isTesting = true;
    this.connectionStatus = null;

    const startTime = Date.now();

    // Test with a simple API call
    this.approvalFlowApiService.getActions().subscribe({
      next: (response) => {
        const responseTime = Date.now() - startTime;
        this.isTesting = false;
        this.connectionStatus = {
          type: 'success',
          message: 'Connection successful! API is responding.',
          details: {
            responseTime,
            server: 'Approval Flow API',
            version: '1.0'
          }
        };

        this.snackBar.open('API connection test successful', 'Close', { duration: 3000 });
      },
      error: (error) => {
        const responseTime = Date.now() - startTime;
        this.isTesting = false;
        this.connectionStatus = {
          type: 'error',
          message: `Connection failed: ${error.message}`,
          details: {
            responseTime,
            error: error.status || 'Network Error'
          }
        };

        this.snackBar.open('API connection test failed', 'Close', { duration: 5000 });
      }
    });
  }

  saveAppSettings(): void {
    if (this.appSettingsForm.valid) {
      const settings = this.appSettingsForm.value;
      localStorage.setItem('app_settings', JSON.stringify(settings));

      this.snackBar.open('Application settings saved', 'Close', { duration: 3000 });
    }
  }

  resetToDefaults(): void {
    this.appSettingsForm.reset({
      language: 'en',
      theme: 'light',
      autoSaveInterval: 30,
      gridSnapSize: 20,
      showGridLines: true,
      enableSnapToGrid: true,
      showElementIds: false,
      enableKeyboardShortcuts: true,
      showMinimap: false,
      autoValidate: true
    });

    this.snackBar.open('Settings reset to defaults', 'Close', { duration: 3000 });
  }

  exportData(): void {
    const data = {
      config: {
        baseUrl: this.configService.getBaseUrl(),
        settings: this.appSettingsForm.value
      },
      flows: this.getAllSavedFlows(),
      timestamp: new Date().toISOString()
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `approval-flow-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.snackBar.open('Data exported successfully', 'Close', { duration: 3000 });
  }

  importData(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput.click();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);

          // Import configuration
          if (data.config) {
            if (data.config.baseUrl) {
              this.configService.setBaseUrl(data.config.baseUrl);
              this.apiConfigForm.patchValue({ baseUrl: data.config.baseUrl });
            }

            if (data.config.settings) {
              this.appSettingsForm.patchValue(data.config.settings);
              localStorage.setItem('app_settings', JSON.stringify(data.config.settings));
            }
          }

          // Import flows
          if (data.flows) {
            Object.keys(data.flows).forEach(key => {
              localStorage.setItem(key, data.flows[key]);
            });
          }

          this.snackBar.open('Data imported successfully', 'Close', { duration: 3000 });
        } catch (error) {
          this.snackBar.open('Error importing data: Invalid file format', 'Close', { duration: 5000 });
        }
      };
      reader.readAsText(file);
    }
  }

  clearAllData(): void {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      // Clear specific keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('approval_flow_') || key === 'current_approval_flow' || key === 'app_settings')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));

      this.snackBar.open('All data cleared successfully', 'Close', { duration: 3000 });
    }
  }

  getLocalStorageSize(): number {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return Math.round(total / 1024); // Convert to KB
  }

  getSavedFlowsCount(): number {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('approval_flow_')) {
        count++;
      }
    }
    return count;
  }

  private getAllSavedFlows(): { [key: string]: any } {
    const flows: { [key: string]: any } = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('approval_flow_') || key === 'current_approval_flow')) {
        flows[key] = localStorage.getItem(key);
      }
    }
    return flows;
  }

  getStatusIcon(): string {
    if (!this.connectionStatus) return 'help';

    switch (this.connectionStatus.type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'help';
    }
  }

  navigateToApprovalFlow(): void {
    this.router.navigate(['/approval-flow']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goBack(): void {
    window.history.back();
  }
}
