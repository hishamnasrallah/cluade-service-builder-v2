// src/app/components/mapper-builder/mapper-builder.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, forkJoin } from 'rxjs';
// import { map } from 'rxjs/operators';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Router, ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

import { MapperTreeComponent } from './components/mapper-tree/mapper-tree.component';
import { MapperCanvasComponent } from './components/mapper-canvas/mapper-canvas.component';
import { PreviewPanelComponent } from './components/preview-panel/preview-panel.component';
import { MapperToolbarComponent } from './components/mapper-toolbar/mapper-toolbar.component';
import { SaveMapperDialogComponent } from './dialogs/mapper-dialogs/save-mapper-dialog/save-mapper-dialog.component';
import { LoadMapperDialogComponent } from './dialogs/mapper-dialogs/load-mapper-dialog/load-mapper-dialog.component';

import { MapperStateService } from '../../services/mapper-state.service';
import { MapperApiService } from '../../services/mapper-api.service';
import { MapperValidationService } from '../../services/mapper-validation.service';
import {
  NewMapperDialogComponent,
  ValidationErrorsDialogComponent
} from './dialogs/mapper-dialogs/new-mapper-dialog/new-mapper-dialog.component';

@Component({
  selector: 'app-mapper-builder',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MapperTreeComponent,
    MapperCanvasComponent,
    PreviewPanelComponent,
    MapperToolbarComponent
  ],
  template: `
    <div class="mapper-builder-container">
      <!-- Header Toolbar -->
      <app-mapper-toolbar
        [isDirty]="isDirty$ | async"
        [isLoading]="isLoading$ | async"
        [currentMapper]="currentMapper$ | async"
        (newMapper)="onNewMapper()"
        (loadMapper)="onLoadMapper()"
        (saveMapper)="onSaveMapper()"
        (exportMapper)="onExportMapper()"
        (importMapper)="onImportMapper()">
      </app-mapper-toolbar>

      <!-- Loading Bar -->
      <mat-progress-bar
        *ngIf="isLoading$ | async"
        mode="indeterminate"
        class="loading-bar">
      </mat-progress-bar>

      <!-- Main Content Area -->
      <mat-sidenav-container class="main-container">
        <!-- Left Sidebar - Mapper Tree -->
        <mat-sidenav
          mode="side"
          opened
          [style.width.px]="sidenavWidth"
          class="mapper-tree-sidenav">

          <div class="sidenav-header">
            <h3>Mapper Hierarchy</h3>
            <button mat-icon-button (click)="onAddTarget()" matTooltip="Add new target">
              <mat-icon>add_circle</mat-icon>
            </button>
          </div>

          <mat-divider></mat-divider>

          <div class="tree-container">
            <app-mapper-tree
              [nodes]="targetHierarchy$ | async"
              [selectedNodeId]="selectedTargetId$ | async"
              (nodeSelected)="onNodeSelected($event)"
              (nodeDropped)="onNodeDropped($event)"
              (nodeDeleted)="onNodeDeleted($event)"
              (nodeAdded)="onNodeAdded($event)">
            </app-mapper-tree>
          </div>
        </mat-sidenav>

        <!-- Main Canvas Area -->
        <mat-sidenav-content class="canvas-container">
          <div class="canvas-wrapper">
            <app-mapper-canvas
              [selectedTarget]="selectedTarget$ | async"
              [availableModels]="availableModels$ | async"
              [availableLookups]="availableLookups$ | async"
              [availableTransforms]="availableTransforms$ | async"
              [availableFilters]="availableFilters$ | async"
              (targetUpdated)="onTargetUpdated($event)"
              (fieldRuleAdded)="onFieldRuleAdded($event)"
              (fieldRuleUpdated)="onFieldRuleUpdated($event)"
              (fieldRuleDeleted)="onFieldRuleDeleted($event)">
            </app-mapper-canvas>
          </div>
        </mat-sidenav-content>

        <!-- Right Sidebar - Preview Panel -->
        <mat-sidenav
          mode="side"
          position="end"
          [opened]="showPreview"
          [style.width.px]="previewWidth"
          class="preview-sidenav">

          <div class="sidenav-header">
            <h3>Preview</h3>
            <button mat-icon-button (click)="togglePreview()" matTooltip="Close preview">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <mat-divider></mat-divider>

          <app-preview-panel
            [previewResult]="previewResult$ | async"
            [selectedTarget]="selectedTarget$ | async"
            (runPreview)="onRunPreview($event)">
          </app-preview-panel>
        </mat-sidenav>
      </mat-sidenav-container>

      <!-- Floating Action Buttons -->
      <div class="fab-container">
        <button
          mat-fab
          color="accent"
          (click)="togglePreview()"
          matTooltip="Toggle preview panel"
          matTooltipPosition="left">
          <mat-icon>{{ showPreview ? 'visibility_off' : 'visibility' }}</mat-icon>
        </button>

        <button
          mat-fab
          color="primary"
          (click)="onValidateAndSave()"
          matTooltip="Validate & Save"
          matTooltipPosition="left"
          [disabled]="!(isDirty$ | async) || (isLoading$ | async)">
          <mat-icon>save</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .mapper-builder-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: #f5f5f5;
    }

    .loading-bar {
      position: absolute;
      top: 64px;
      z-index: 1000;
    }

    .main-container {
      flex: 1;
      overflow: hidden;
    }

    .mapper-tree-sidenav {
      border-right: 1px solid #e0e0e0;
      background-color: #fafafa;
    }

    .preview-sidenav {
      border-left: 1px solid #e0e0e0;
      background-color: #fafafa;
    }

    .sidenav-header {
      height: 56px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }

    .sidenav-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: #424242;
    }

    .tree-container {
      padding: 16px;
      height: calc(100% - 57px);
      overflow-y: auto;
    }

    .canvas-container {
      background-color: #f5f5f5;
      height: 100%;
      overflow: hidden;
    }

    .canvas-wrapper {
      height: 100%;
      overflow-y: auto;
      padding: 24px;
    }

    .fab-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      z-index: 100;
    }

    /* Custom scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: #f1f1f1;
    }

    ::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #a1a1a1;
    }

    /* Responsive adjustments */
    @media (max-width: 1024px) {
      .mapper-tree-sidenav {
        width: 250px !important;
      }

      .preview-sidenav {
        width: 350px !important;
      }
    }

    @media (max-width: 768px) {
      .canvas-wrapper {
        padding: 16px;
      }

      .fab-container {
        bottom: 16px;
        right: 16px;
      }
    }
  `]
})
export class MapperBuilderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State observables
  isDirty$ = this.stateService.isDirty$();
  isLoading$ = this.stateService.isLoading$();
  currentMapper$ = this.stateService.getCurrentMapper$();
  targetHierarchy$ = this.stateService.getTargetHierarchy$();
  selectedTargetId$ = this.stateService.getState$().pipe(
    map(state => state.selectedTargetId)
  );
  selectedTarget$ = this.stateService.getSelectedTarget$();
  availableModels$ = this.stateService.getAvailableModels$();
  availableLookups$ = this.stateService.getAvailableLookups$();
  availableTransforms$ = this.stateService.getAvailableTransforms$();
  availableFilters$ = this.stateService.getAvailableFilters$();
  previewResult$ = this.stateService.getPreviewResult$();

  // UI state
  showPreview = false;
  sidenavWidth = 320;
  previewWidth = 400;

  constructor(
    private stateService: MapperStateService,
    private apiService: MapperApiService,
    private validationService: MapperValidationService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadReferenceData();
    this.checkRouteParams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadReferenceData(): void {
    this.stateService.setLoading(true);

    forkJoin({
      models: this.apiService.getAvailableModels(),
      lookups: this.apiService.getAvailableLookups(),
      transforms: this.apiService.getTransformFunctions(),
      filters: this.apiService.getFilterFunctions()
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.stateService.setReferenceData(data);
        this.stateService.setLoading(false);
      },
      error: (error) => {
        console.error('Failed to load reference data:', error);
        this.snackBar.open('Failed to load reference data', 'Close', { duration: 5000 });
        this.stateService.setLoading(false);
      }
    });
  }

  private checkRouteParams(): void {
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      if (params['mapperId']) {
        this.loadMapper(params['mapperId']);
      } else if (params['caseType']) {
        this.createNewMapper(params['caseType']);
      }
    });
  }

  private loadMapper(mapperId: string): void {
    this.stateService.setLoading(true);

    forkJoin({
      mapper: this.apiService.getCaseMapper(parseInt(mapperId)),
      targets: this.apiService.getMapperTargets(parseInt(mapperId))
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ mapper, targets }) => {
        this.stateService.loadMapper(mapper, targets);
        this.stateService.setLoading(false);
      },
      error: (error) => {
        console.error('Failed to load mapper:', error);
        this.snackBar.open('Failed to load mapper', 'Close', { duration: 5000 });
        this.stateService.setLoading(false);
      }
    });
  }

  private createNewMapper(caseType: string): void {
    this.stateService.createNewMapper(caseType);
  }

  onNewMapper(): void {
    if (this.stateService.isDirty$().value) {
      if (!confirm('You have unsaved changes. Continue without saving?')) {
        return;
      }
    }

    const dialogRef = this.dialog.open(NewMapperDialogComponent, {
      width: '400px',
      data: { caseTypes: ['CitizenRequest', 'VacationRequest', 'EducationRequest'] }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.stateService.createNewMapper(result.caseType);
      }
    });
  }

  onLoadMapper(): void {
    const dialogRef = this.dialog.open(LoadMapperDialogComponent, {
      width: '600px',
      maxHeight: '80vh'
    });

    dialogRef.afterClosed().subscribe(mapper => {
      if (mapper) {
        this.loadMapper(mapper.id);
      }
    });
  }

  onSaveMapper(): void {
    this.saveMapper();
  }

  onValidateAndSave(): void {
    const errors = this.validationService.validateMapper(this.stateService.getState$().value);

    if (errors.length > 0) {
      const dialogRef = this.dialog.open(ValidationErrorsDialogComponent, {
        width: '500px',
        data: { errors }
      });

      dialogRef.afterClosed().subscribe(forceSave => {
        if (forceSave) {
          this.saveMapper();
        }
      });
    } else {
      this.saveMapper();
    }
  }

  private saveMapper(): void {
    const state = this.stateService.getState$().value;

    if (!state.currentMapper) {
      this.snackBar.open('No mapper to save', 'Close', { duration: 3000 });
      return;
    }

    this.stateService.setLoading(true);

    const saveRequest = {
      case_mapper: state.currentMapper,
      targets: state.targets
    };

    this.apiService.saveMapperConfiguration(saveRequest).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        this.stateService.resetDirtyState();
        this.stateService.setLoading(false);
        this.snackBar.open('Mapper saved successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Failed to save mapper:', error);
        this.stateService.setLoading(false);
        this.snackBar.open('Failed to save mapper', 'Close', { duration: 5000 });
      }
    });
  }

  onExportMapper(): void {
    const state = this.stateService.getState$().value;
    const exportData = {
      mapper: state.currentMapper,
      targets: state.targets,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapper-${state.currentMapper?.name || 'export'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    this.snackBar.open('Mapper exported successfully', 'Close', { duration: 3000 });
  }

  onImportMapper(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          try {
            const data = JSON.parse(e.target.result);
            if (data.mapper && data.targets) {
              this.stateService.loadMapper(data.mapper, data.targets);
              this.snackBar.open('Mapper imported successfully', 'Close', { duration: 3000 });
            } else {
              throw new Error('Invalid mapper file format');
            }
          } catch (error) {
            this.snackBar.open('Failed to import mapper', 'Close', { duration: 5000 });
          }
        };
        reader.readAsText(file);
      }
    };

    input.click();
  }

  onAddTarget(): void {
    this.stateService.addTarget({
      name: 'New Target',
      model: '',
      active_ind: true
    });
  }

  onNodeSelected(nodeId: string): void {
    this.stateService.selectTarget(nodeId);
  }

  onNodeDropped(event: any): void {
    this.stateService.moveTarget(event.node.id, event.newParentId);
  }

  onNodeDeleted(nodeId: string): void {
    if (confirm('Are you sure you want to delete this target and all its children?')) {
      this.stateService.deleteTarget(nodeId);
    }
  }

  onNodeAdded(parentId: string): void {
    this.stateService.addTarget({
      name: 'New Child Target',
      model: '',
      parent_target: parentId,
      active_ind: true
    });
  }

  onTargetUpdated(updates: any): void {
    const selectedTargetId = this.stateService.getState$().value.selectedTargetId;
    if (selectedTargetId) {
      this.stateService.updateTarget(selectedTargetId, updates);
    }
  }

  onFieldRuleAdded(rule: any): void {
    const selectedTargetId = this.stateService.getState$().value.selectedTargetId;
    if (selectedTargetId) {
      this.stateService.addFieldRule(selectedTargetId, rule);
    }
  }

  onFieldRuleUpdated(event: { ruleId: number; updates: any }): void {
    const selectedTargetId = this.stateService.getState$().value.selectedTargetId;
    if (selectedTargetId) {
      this.stateService.updateFieldRule(selectedTargetId, event.ruleId, event.updates);
    }
  }

  onFieldRuleDeleted(ruleId: number): void {
    const selectedTargetId = this.stateService.getState$().value.selectedTargetId;
    if (selectedTargetId) {
      this.stateService.deleteFieldRule(selectedTargetId, ruleId);
    }
  }

  onRunPreview(caseId: number): void {
    const selectedTargetId = this.stateService.getState$().value.selectedTargetId;
    if (!selectedTargetId) {
      this.snackBar.open('Please select a target first', 'Close', { duration: 3000 });
      return;
    }

    this.stateService.setLoading(true);

    this.apiService.runDryRun(caseId, selectedTargetId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        this.stateService.setPreviewResult(result);
        this.stateService.setLoading(false);
      },
      error: (error) => {
        console.error('Preview failed:', error);
        this.stateService.setLoading(false);
        this.snackBar.open('Preview failed', 'Close', { duration: 5000 });
      }
    });
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }
}
