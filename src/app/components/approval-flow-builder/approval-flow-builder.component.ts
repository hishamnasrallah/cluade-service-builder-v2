// components/approval-flow-builder/approval-flow-builder.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';

import { ApprovalFlowService } from '../../services/approval-flow.service';
import { ApprovalFlowApiService } from '../../services/approval-flow-api.service';
import {
  ApprovalFlowData,
  ApprovalFlowElement,
  ApprovalElementType,
  Position,
  ApprovalConnection
} from '../../models/approval-flow.models';

// Import components
import { ApprovalElementPaletteComponent } from './approval-element-palette/approval-element-palette.component';
import { ApprovalPropertiesPanelComponent } from './approval-properties-panel/approval-properties-panel.component';
import { ApprovalFlowCanvasComponent } from './approval-flow-canvas/approval-flow-canvas.component';
import { ApprovalFlowSelectorDialogComponent, ApprovalFlowSelectionResult } from './approval-flow-selector-dialog/approval-flow-selector-dialog.component';

@Component({
  selector: 'app-approval-flow-builder',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatDividerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ApprovalElementPaletteComponent,
    ApprovalPropertiesPanelComponent,
    ApprovalFlowCanvasComponent
  ],
  template: `
    <div class="approval-flow-builder">
      <!-- Top Toolbar -->
      <mat-toolbar class="approval-toolbar">
        <button mat-icon-button
                (click)="showApprovalFlowSelector()"
                title="Select Approval Flow"
                [disabled]="isLoading">
          <mat-icon>account_tree</mat-icon>
        </button>

        <span class="approval-title">{{ approvalFlow.name }}</span>

        <span class="approval-status" *ngIf="currentServiceCode">
          <mat-icon>cloud</mat-icon>
          Service: {{ currentServiceCode }}
        </span>
        <span class="approval-status unsaved" *ngIf="!currentServiceCode">
          <mat-icon>cloud_off</mat-icon>
          Local Only
        </span>

        <span class="spacer"></span>

        <!-- Canvas Controls -->
        <div class="canvas-controls">
          <button mat-icon-button
                  (click)="autoOrganize()"
                  title="Auto-organize Layout"
                  [disabled]="isLoading">
            <mat-icon>auto_fix_high</mat-icon>
          </button>

          <button mat-icon-button
                  (click)="fitToContent()"
                  title="Fit to Content"
                  [disabled]="isLoading">
            <mat-icon>center_focus_strong</mat-icon>
          </button>

          <button mat-icon-button
                  (click)="zoomIn()"
                  title="Zoom In"
                  [disabled]="isLoading">
            <mat-icon>zoom_in</mat-icon>
          </button>

          <button mat-icon-button
                  (click)="zoomOut()"
                  title="Zoom Out"
                  [disabled]="isLoading">
            <mat-icon>zoom_out</mat-icon>
          </button>

          <button mat-icon-button
                  (click)="resetZoom()"
                  title="Reset Zoom"
                  [disabled]="isLoading">
            <mat-icon>center_focus_weak</mat-icon>
          </button>
        </div>

        <mat-divider vertical></mat-divider>

        <!-- Flow Actions -->
        <div class="flow-actions">
          <button mat-icon-button
                  (click)="validateApprovalFlow()"
                  title="Validate Flow"
                  [disabled]="isLoading">
            <mat-icon>check_circle</mat-icon>
          </button>

          <button mat-icon-button
                  (click)="saveApprovalFlow()"
                  title="Save Flow"
                  [disabled]="isLoading || isSaving">
            <mat-icon>{{ isSaving ? 'hourglass_empty' : 'save' }}</mat-icon>
          </button>

          <button mat-icon-button
                  (click)="createNewApprovalFlow()"
                  title="New Flow"
                  [disabled]="isLoading">
            <mat-icon>add</mat-icon>
          </button>

          <button mat-icon-button
                  (click)="exportApprovalFlow()"
                  title="Export Flow"
                  [disabled]="!currentServiceCode || isLoading">
            <mat-icon>download</mat-icon>
          </button>
        </div>

        <!-- View Options -->
        <mat-divider vertical></mat-divider>

        <button mat-icon-button
                [color]="showMinimap ? 'accent' : ''"
                (click)="toggleMinimap()"
                title="Toggle Minimap"
                [disabled]="isLoading">
          <mat-icon>map</mat-icon>
        </button>

        <button mat-icon-button
                [color]="showCoordinates ? 'accent' : ''"
                (click)="toggleCoordinates()"
                title="Toggle Coordinates"
                [disabled]="isLoading">
          <mat-icon>my_location</mat-icon>
        </button>
      </mat-toolbar>

      <!-- Loading Overlay -->
      <div *ngIf="isLoading" class="loading-overlay">
        <div class="loading-content">
          <mat-spinner diameter="60"></mat-spinner>
          <p>{{ loadingMessage }}</p>
        </div>
      </div>

      <!-- Main Content -->
      <div class="approval-content" [class.loading]="isLoading">
        <mat-sidenav-container class="sidenav-container">

          <!-- Left Sidebar - Element Palette -->
          <mat-sidenav mode="side" opened class="element-palette">
            <app-approval-element-palette
              (elementSelected)="onElementSelected($event)"
              (elementDragStart)="onElementDragStart($event)">
            </app-approval-element-palette>
          </mat-sidenav>

          <!-- Main Canvas Area -->
          <mat-sidenav-content class="canvas-container">
            <app-approval-flow-canvas
              #canvas
              [elements]="approvalFlow.elements"
              [connections]="approvalFlow.connections"
              [selectedElementId]="selectedElementId"
              [selectedConnectionId]="selectedConnectionId"
              [showMinimap]="showMinimap"
              [showCoordinates]="showCoordinates"
              (elementSelected)="onCanvasElementSelected($event)"
              (elementDoubleClicked)="onElementDoubleClicked($event)"
              (connectionSelected)="onConnectionSelected($event)"
              (elementPositionChanged)="onElementPositionChanged($event)"
              (elementAdded)="onCanvasElementAdded($event)"
              (elementDeleted)="onElementDeleted($event)"
              (elementDuplicated)="onElementDuplicated($event)"
              (elementActiveToggled)="onElementActiveToggled($event)"
              (connectionCreated)="onConnectionCreated($event)"
              (canvasClicked)="onCanvasClicked()">
            </app-approval-flow-canvas>

            <!-- Flow Statistics -->
            <div class="flow-statistics" *ngIf="showStatistics">
              <div class="statistics-header">
                <mat-icon>analytics</mat-icon>
                <span>Flow Statistics</span>
                <button mat-icon-button (click)="showStatistics = false">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
              <div class="statistics-content">
                <div class="stat-item">
                  <span class="stat-label">Elements:</span>
                  <span class="stat-value">{{ approvalFlow.elements.length }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Connections:</span>
                  <span class="stat-value">{{ approvalFlow.connections.length }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Approval Steps:</span>
                  <span class="stat-value">{{ getElementCount('approval_step') }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Action Steps:</span>
                  <span class="stat-value">{{ getElementCount('action_step') }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Conditions:</span>
                  <span class="stat-value">{{ getElementCount('condition_step') }}</span>
                </div>
              </div>
            </div>
          </mat-sidenav-content>

          <!-- Right Sidebar - Properties Panel -->
          <mat-sidenav mode="side" opened position="end" class="properties-panel">
            <app-approval-properties-panel
              [selectedElement]="getSelectedElement()"
              [selectedConnection]="getSelectedConnection()"
              [allElements]="approvalFlow.elements"
              [allConnections]="approvalFlow.connections"
              (elementUpdated)="onElementUpdated($event)"
              (connectionUpdated)="onConnectionUpdated($event)">
            </app-approval-properties-panel>
          </mat-sidenav>
        </mat-sidenav-container>
      </div>

      <!-- Validation Results -->
      <div *ngIf="validationResults && validationResults.errors.length > 0"
           class="validation-results">
        <div class="validation-header">
          <mat-icon color="warn">warning</mat-icon>
          <span>Validation Issues ({{ validationResults.errors.length }})</span>
          <button mat-icon-button (click)="clearValidationResults()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <div class="validation-content">
          <div *ngFor="let error of validationResults.errors" class="validation-error">
            <mat-icon>error_outline</mat-icon>
            <span>{{ error }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .approval-flow-builder {
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    .approval-toolbar {
      flex-shrink: 0;
      background: #1976d2;
      color: white;
      z-index: 1000;
    }

    .approval-title {
      font-weight: 500;
      margin-left: 8px;
    }

    .approval-status {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: 12px;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.2);
    }

    .approval-status.unsaved {
      background: rgba(255, 152, 0, 0.3);
    }

    .spacer {
      flex: 1 1 auto;
    }

    .canvas-controls,
    .flow-actions {
      display: flex;
      gap: 4px;
    }

    .approval-content {
      flex: 1;
      overflow: hidden;
      transition: opacity 0.3s ease;
    }

    .approval-content.loading {
      opacity: 0.7;
      pointer-events: none;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      text-align: center;
    }

    .loading-content p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .sidenav-container {
      height: 100%;
    }

    .element-palette {
      width: 280px;
      background: #f5f5f5;
      border-right: 1px solid #ddd;
    }

    .properties-panel {
      width: 350px;
      background: #f5f5f5;
      border-left: 1px solid #ddd;
    }

    .canvas-container {
      position: relative;
      overflow: hidden;
    }

    .flow-statistics {
      position: absolute;
      top: 20px;
      right: 380px;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
      min-width: 200px;
    }

    .statistics-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-bottom: 1px solid #e0e0e0;
      background: #f8f9fa;
      border-radius: 8px 8px 0 0;
      font-weight: 500;
    }

    .statistics-header mat-icon:first-child {
      color: #2196F3;
    }

    .statistics-header span {
      flex: 1;
    }

    .statistics-content {
      padding: 12px 16px;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 13px;
    }

    .stat-item:last-child {
      margin-bottom: 0;
    }

    .stat-label {
      color: #666;
    }

    .stat-value {
      font-weight: 500;
      color: #333;
    }

    .validation-results {
      position: absolute;
      bottom: 20px;
      left: 300px;
      right: 370px;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid #f44336;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
      max-height: 200px;
      overflow-y: auto;
    }

    .validation-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-bottom: 1px solid #ffcdd2;
      background: #ffebee;
      border-radius: 8px 8px 0 0;
      font-weight: 500;
      color: #d32f2f;
    }

    .validation-header span {
      flex: 1;
    }

    .validation-content {
      padding: 12px 16px;
    }

    .validation-error {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 13px;
      color: #d32f2f;
    }

    .validation-error:last-child {
      margin-bottom: 0;
    }

    .validation-error mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    /* Responsive adjustments */
    @media (max-width: 1200px) {
      .element-palette {
        width: 240px;
      }

      .properties-panel {
        width: 300px;
      }

      .flow-statistics {
        right: 320px;
      }

      .validation-results {
        left: 260px;
        right: 320px;
      }
    }

    @media (max-width: 768px) {
      .approval-toolbar {
        padding: 0 8px;
      }

      .canvas-controls,
      .flow-actions {
        gap: 2px;
      }

      .approval-title {
        font-size: 14px;
      }

      .approval-status {
        font-size: 10px;
        padding: 2px 6px;
      }

      .flow-statistics,
      .validation-results {
        position: relative;
        top: auto;
        bottom: auto;
        left: auto;
        right: auto;
        margin: 16px;
      }
    }

    /* Animation for smooth transitions */
    .approval-content,
    .flow-statistics,
    .validation-results {
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ApprovalFlowBuilderComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('canvas') canvasComponent!: ApprovalFlowCanvasComponent;

  approvalFlow: ApprovalFlowData = { name: 'New Approval Flow', elements: [], connections: [] };
  selectedElementId?: string;
  selectedConnectionId?: string;
  currentServiceCode?: string;

  // UI State
  isLoading = false;
  isSaving = false;
  loadingMessage = 'Loading...';
  showMinimap = false;
  showCoordinates = false;
  showStatistics = false;

  // Validation
  validationResults?: { isValid: boolean; errors: string[] };

  private destroy$ = new Subject<void>();

  constructor(
    private approvalFlowService: ApprovalFlowService,
    private approvalFlowApiService: ApprovalFlowApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.subscribeToApprovalFlow();
    this.initializeApprovalFlow();
  }

  ngAfterViewInit(): void {
    // Auto-show flow selector if API is configured
    if (this.approvalFlowApiService.isConfigured()) {
      setTimeout(() => {
        this.showApprovalFlowSelector();
      }, 1000);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToApprovalFlow(): void {
    this.approvalFlowService.approvalFlow$
      .pipe(takeUntil(this.destroy$))
      .subscribe(approvalFlow => {
        this.approvalFlow = approvalFlow;
        this.clearValidationResults();
      });
  }

  private initializeApprovalFlow(): void {
    this.currentServiceCode = this.approvalFlowService.getCurrentServiceCode();

    // Show statistics panel initially
    setTimeout(() => {
      this.showStatistics = true;
    }, 2000);
  }

  // Flow Management
  showApprovalFlowSelector(): void {
    const dialogRef = this.dialog.open(ApprovalFlowSelectorDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((result: ApprovalFlowSelectionResult) => {
      if (result) {
        if (result.action === 'create') {
          this.createNewApprovalFlow();
        } else if (result.action === 'load' && result.serviceCode) {
          this.loadApprovalFlow(result.serviceCode, result.serviceName);
        }
      }
    });
  }

  loadApprovalFlow(serviceCode: string, serviceName?: string): void {
    this.isLoading = true;
    this.loadingMessage = `Loading approval flow for ${serviceName || serviceCode}...`;

    this.approvalFlowService.loadApprovalFlowFromApi(serviceCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (approvalFlow) => {
          this.currentServiceCode = serviceCode;
          this.isLoading = false;
          this.selectedElementId = undefined;
          this.selectedConnectionId = undefined;

          this.snackBar.open(`Loaded approval flow for ${serviceName || serviceCode}`, 'Close', {
            duration: 3000
          });

          // Auto-organize and fit to content
          setTimeout(() => {
            this.autoOrganize();
            setTimeout(() => this.fitToContent(), 500);
          }, 100);
        },
        error: (error) => {
          this.isLoading = false;
          this.snackBar.open(`Failed to load approval flow: ${error.message}`, 'Close', {
            duration: 5000
          });
        }
      });
  }

  createNewApprovalFlow(): void {
    const newName = `New Approval Flow ${new Date().toLocaleDateString()}`;
    this.approvalFlowService.createNewApprovalFlow(newName);
    this.currentServiceCode = undefined;
    this.selectedElementId = undefined;
    this.selectedConnectionId = undefined;
    this.clearValidationResults();
    this.resetZoom();

    this.snackBar.open('New approval flow created', 'Close', { duration: 2000 });
  }

  saveApprovalFlow(): void {
    this.isSaving = true;

    this.approvalFlowService.saveApprovalFlow()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.snackBar.open('Approval flow saved successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          this.isSaving = false;
          this.snackBar.open('Error saving approval flow', 'Close', { duration: 3000 });
        }
      });
  }

  exportApprovalFlow(): void {
    if (!this.currentServiceCode) {
      this.snackBar.open('No approval flow loaded to export', 'Close', { duration: 3000 });
      return;
    }

    const masterStep = this.approvalFlowService.convertApprovalFlowToMasterStep();
    if (masterStep) {
      const dataStr = JSON.stringify({ approval_flow: [masterStep] }, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `approval-flow-${this.currentServiceCode}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.snackBar.open('Approval flow exported', 'Close', { duration: 3000 });
    } else {
      this.snackBar.open('Failed to export approval flow', 'Close', { duration: 3000 });
    }
  }

  validateApprovalFlow(): void {
    this.validationResults = this.approvalFlowService.validateApprovalFlow();

    if (this.validationResults.isValid) {
      this.snackBar.open('Approval flow is valid ✓', 'Close', { duration: 3000 });
    } else {
      this.snackBar.open(`Found ${this.validationResults.errors.length} validation issue(s)`, 'Close', {
        duration: 5000
      });
    }
  }

  clearValidationResults(): void {
    this.validationResults = undefined;
  }

  // Canvas Controls
  autoOrganize(): void {
    this.approvalFlowService.autoOrganizeElements();
    this.snackBar.open('Elements auto-organized', 'Close', { duration: 2000 });
  }

  zoomIn(): void {
    this.canvasComponent?.zoomIn();
  }

  zoomOut(): void {
    this.canvasComponent?.zoomOut();
  }

  resetZoom(): void {
    this.canvasComponent?.resetZoom();
  }

  fitToContent(): void {
    this.canvasComponent?.fitToContent();
  }

  toggleMinimap(): void {
    this.showMinimap = !this.showMinimap;
  }

  toggleCoordinates(): void {
    this.showCoordinates = !this.showCoordinates;
  }

  // Element Palette Events
  onElementSelected(elementType: ApprovalElementType): void {
    // Add element at center of visible area
    const position: Position = {
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100
    };

    this.addElement(elementType, position);
  }

  onElementDragStart(event: { event: DragEvent; elementType: ApprovalElementType }): void {
    // Handled by canvas drop events
  }

  // Canvas Events
  onCanvasElementSelected(elementId: string): void {
    this.selectedElementId = elementId;
    this.selectedConnectionId = undefined;
  }

  onElementDoubleClicked(elementId: string): void {
    // Focus on properties panel or open detailed editor
    this.selectedElementId = elementId;
    this.selectedConnectionId = undefined;
  }

  onConnectionSelected(connectionId: string): void {
    this.selectedConnectionId = connectionId;
    this.selectedElementId = undefined;
  }

  onElementPositionChanged(event: { id: string; position: Position }): void {
    this.approvalFlowService.updateElement(event.id, { position: event.position });
  }

  onCanvasElementAdded(event: { type: ApprovalElementType; position: Position }): void {
    this.addElement(event.type, event.position);
  }

  onElementDeleted(elementId: string): void {
    try {
      this.approvalFlowService.removeElement(elementId);
      if (this.selectedElementId === elementId) {
        this.selectedElementId = undefined;
      }
      this.snackBar.open('Element deleted', 'Close', { duration: 2000 });
    } catch (error) {
      this.snackBar.open((error as Error).message, 'Close', { duration: 3000 });
    }
  }

  onElementDuplicated(elementId: string): void {
    const element = this.approvalFlow.elements.find(el => el.id === elementId);
    if (element) {
      const newPosition: Position = {
        x: element.position.x + 50,
        y: element.position.y + 50
      };
      this.addElement(element.type, newPosition, { ...element.properties });
    }
  }

  onElementActiveToggled(elementId: string): void {
    const element = this.approvalFlow.elements.find(el => el.id === elementId);
    if (element) {
      const newActiveState = !element.properties.active_ind;
      this.approvalFlowService.updateElement(elementId, {
        properties: { ...element.properties, active_ind: newActiveState }
      });

      this.snackBar.open(`Element ${newActiveState ? 'activated' : 'deactivated'}`, 'Close', {
        duration: 2000
      });
    }
  }

  onConnectionCreated(event: { sourceId: string; targetId: string }): void {
    try {
      this.approvalFlowService.addConnection(event.sourceId, event.targetId);
      this.snackBar.open('Connection created', 'Close', { duration: 2000 });
    } catch (error) {
      this.snackBar.open((error as Error).message, 'Close', { duration: 3000 });
    }
  }

  onCanvasClicked(): void {
    this.selectedElementId = undefined;
    this.selectedConnectionId = undefined;
  }

  // Properties Panel Events
  onElementUpdated(event: { id: string; properties: any }): void {
    const element = this.approvalFlow.elements.find(el => el.id === event.id);
    if (element) {
      this.approvalFlowService.updateElement(event.id, {
        properties: { ...element.properties, ...event.properties }
      });
    }
  }

  onConnectionUpdated(event: any): void {
    if (event.action === 'delete' && event.connection) {
      this.approvalFlowService.removeConnection(event.connection.id);
      this.selectedConnectionId = undefined;
      this.snackBar.open('Connection deleted', 'Close', { duration: 2000 });
    }
  }

  // Helper Methods
  private addElement(type: ApprovalElementType, position: Position, properties: any = {}): void {
    try {
      let defaultProperties = { ...properties };

      // Set default properties based on element type
      if (type === ApprovalElementType.APPROVAL_STEP) {
        defaultProperties.seq = this.approvalFlowService.getNextSequenceNumber();
        defaultProperties.step_type = 2; // ACTION_BASED by default
        defaultProperties.active_ind = true;
      } else if (type === ApprovalElementType.ACTION_STEP) {
        defaultProperties.active_ind = true;
      } else if (type === ApprovalElementType.CONDITION_STEP) {
        defaultProperties.type = 1; // CONDITION by default
        defaultProperties.active_ind = true;
      }

      const element = this.approvalFlowService.addElement(type, position, defaultProperties);
      this.selectedElementId = element.id;
      this.selectedConnectionId = undefined;

      this.snackBar.open(`${type.replace('_', ' ')} element added`, 'Close', { duration: 2000 });
    } catch (error) {
      this.snackBar.open((error as Error).message, 'Close', { duration: 3000 });
    }
  }

  getSelectedElement(): ApprovalFlowElement | undefined {
    return this.approvalFlow.elements.find(el => el.id === this.selectedElementId);
  }

  getSelectedConnection(): ApprovalConnection | undefined {
    return this.approvalFlow.connections.find(conn => conn.id === this.selectedConnectionId);
  }

  getElementCount(type: string): number {
    return this.approvalFlow.elements.filter(el => el.type === type).length;
  }
}
