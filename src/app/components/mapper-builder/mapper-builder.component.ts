// src/app/components/mapper-builder/mapper-builder.component.ts

import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, forkJoin, firstValueFrom, combineLatest } from 'rxjs';
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
import {MatTab, MatTabGroup, MatTabsModule} from '@angular/material/tabs';
import { Router, ActivatedRoute } from '@angular/router';
import { map, take } from 'rxjs/operators';

import { MapperTreeComponent } from './components/mapper-tree/mapper-tree.component';
import { MapperCanvasComponent } from './components/mapper-canvas/mapper-canvas.component';
import { PreviewPanelComponent } from './components/preview-panel/preview-panel.component';
import { MapperToolbarComponent } from './components/mapper-toolbar/mapper-toolbar.component';
import { ExecutionLogsComponent } from './execution-logs/execution-logs.component';
import { VersionHistoryComponent } from './version-history/version-history.component';
import { VisualFieldMapperComponent } from './visual-field-mapper/visual-field-mapper.component';
import { SaveMapperDialogComponent } from './dialogs/mapper-dialogs/save-mapper-dialog/save-mapper-dialog.component';
import { LoadMapperDialogComponent } from './dialogs/mapper-dialogs/load-mapper-dialog/load-mapper-dialog.component';

import { MapperStateService } from '../../services/mapper-state.service';
import { MapperApiService } from '../../services/mapper-api.service';
import { MapperValidationService } from '../../services/mapper-validation.service';
import { KeyboardShortcutsService, KeyboardShortcutsDialogComponent } from '../../services/keyboard-shortcuts.service';
import { MapperUndoRedoService } from '../../services/undo-redo.service';
import { MapperStatePersistenceService } from '../../services/state-persistence.service';
import {
  ModelField,
  ProcessorFunction,
  JSONPathSuggestion,
  MapperVersion,
  CaseMapper,
  MapperTarget
} from '../../models/mapper.models';
import {
  NewMapperDialogComponent,
  ValidationErrorsDialogComponent
} from './dialogs/mapper-dialogs/new-mapper-dialog/new-mapper-dialog.component';
import { ExerciseRunnerComponent } from './exercise-runner/exercise-runner.component';
import {FieldRuleTesterComponent} from '../field-rule-tester/field-rule-tester.component';
import {
  TransformFunctionManagerComponent
} from './components/transform-function-manager/transform-function-manager.component';
import {BatchOperationsComponent} from './components/batch-operations/batch-operations.component';

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
    ExerciseRunnerComponent,
    MapperToolbarComponent,
    VersionHistoryComponent,
    ExecutionLogsComponent,
    VisualFieldMapperComponent,
    MatTab,
    MatTabGroup,
    FieldRuleTesterComponent,
    TransformFunctionManagerComponent
  ],
  templateUrl:'mapper-builder.component.html',
  styleUrl:'mapper-builder.component.scss'
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
  showExerciseRunner = false;
  activeView: 'tree' | 'visual' = 'tree';
  modelFields: any[] = [];
  jsonPathSuggestions: string[] = [];
  availableProcessors: any[] = [];
  showLogs = false;
  showVersionHistory = false;
  showVisualMapper = false;

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

  toggleExerciseRunner(): void {
    this.showExerciseRunner = !this.showExerciseRunner;
  }

  onLoadExercise(exerciseId: string): void {
    // Load exercise template
    switch (exerciseId) {
      case 'A1':
        this.loadExerciseA1();
        break;
      case 'B2':
        this.loadExerciseB2();
        break;
      case 'C1':
        this.loadExerciseC1();
        break;
    }
  }

  private loadExerciseA1(): void {
    // Create mapper for Exercise A1
    const mapper: CaseMapper = {
      name: 'User Registration Mapper',
      case_type: 'USER_REG',
      version: 1,
      active_ind: true
    };

    const target: MapperTarget = {
      id: uuidv4(),
      name: 'User Target',
      model: 'auth.User',
      case_mapper: 0,
      active_ind: true,
      field_rules: []
    };

    this.stateService.loadMapper(mapper, [target]);
    this.snackBar.open('Exercise A1 template loaded', 'Close', { duration: 3000 });
  }

  getSelectedFieldRule(): MapperFieldRule | undefined {
    const state = this.stateService.getState$().getValue();
    if (!state.selectedTargetId) return undefined;

    const target = state.targets.find(t => t.id === state.selectedTargetId);
    return target?.field_rules?.[0]; // Or track selected rule
  }

  getTestCaseData(): any {
    // Return test data for the current case type
    const mapper = this.stateService.getState$().getValue().currentMapper;
    if (!mapper) return {};

    // Return sample data based on case type
    const sampleData: { [key: string]: any } = {
      'USER_REG': {
        username: 'johndoe',
        email: 'john@example.com',
        full_name: 'John Doe',
        is_active: true
      },
      'ORDER': {
        order_id: 'ORD-001',
        customer: 'ACME Corp',
        items: [
          { sku: 'WIDGET-A', quantity: 10, price: 29.99 }
        ]
      }
    };

    return sampleData[mapper.case_type] || {};
  }

  openBatchOperations(): void {
    const state = this.stateService.getState$().getValue();

    const dialogRef = this.dialog.open(BatchOperationsComponent, {
      width: '600px',
      data: {
        targets: state.targets,
        selectedTargets: state.selectedTargetId ? [state.selectedTargetId] : []
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Reload targets after batch operation
        this.loadMapper(state.currentMapper!.id!.toString());
      }
    });
  }

  onShowExerciseGuide(exerciseId: string): void {
    // Show visual guide for exercise
    const guides: { [key: string]: string } = {
      'B2': 'For array processing, create a parent target for Order and child targets for OrderItems with root_path set to "items"',
      'C1': 'Use expression conditions and post-processor functions for complex business rules'
    };

    this.snackBar.open(guides[exerciseId] || 'Follow the exercise instructions', 'Close', {
      duration: 10000
    });
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
    // Get the current dirty state
    this.isDirty$.pipe(take(1)).subscribe(isDirty => {
      if (isDirty) {
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
    // Get current state
    this.stateService.getState$().pipe(take(1)).subscribe(state => {
      const errors = this.validationService.validateMapper(state);

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
    });
  }

  private saveMapper(): void {
    this.stateService.getState$().pipe(take(1)).subscribe(state => {
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
    });
  }

  onExportMapper(): void {
    this.stateService.getState$().pipe(take(1)).subscribe(state => {
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
    });
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
    this.stateService.getState$().pipe(take(1)).subscribe(state => {
      if (state.selectedTargetId) {
        this.stateService.updateTarget(state.selectedTargetId, updates);
      }
    });
  }

  onFieldRuleAdded(rule: any): void {
    this.stateService.getState$().pipe(take(1)).subscribe(state => {
      if (state.selectedTargetId) {
        this.stateService.addFieldRule(state.selectedTargetId, rule);
      }
    });
  }

  onFieldRuleUpdated(event: { ruleId: number; updates: any }): void {
    this.stateService.getState$().pipe(take(1)).subscribe(state => {
      if (state.selectedTargetId) {
        this.stateService.updateFieldRule(state.selectedTargetId, event.ruleId, event.updates);
      }
    });
  }

  onFieldRuleDeleted(ruleId: number): void {
    this.stateService.getState$().pipe(take(1)).subscribe(state => {
      if (state.selectedTargetId) {
        this.stateService.deleteFieldRule(state.selectedTargetId, ruleId);
      }
    });
  }

  onRunPreview(caseId: number): void {
    this.stateService.getState$().pipe(take(1)).subscribe(state => {
      if (!state.selectedTargetId) {
        this.snackBar.open('Please select a target first', 'Close', { duration: 3000 });
        return;
      }

      this.stateService.setLoading(true);

      this.apiService.runDryRun(caseId, state.selectedTargetId).pipe(
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
    });
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  showKeyboardShortcuts() {

  }

  onLoadVersion($event: MapperVersion) {

  }

  onCompareVersions($event: { v1: MapperVersion; v2: MapperVersion }) {

  }

  viewVersionHistory(): void {
    this.showVersionHistory = !this.showVersionHistory;
    if (this.showVersionHistory) {
      this.showLogs = false;
      this.showVisualMapper = false;
    }
  }

  viewExecutionLogs(): void {
    this.showLogs = !this.showLogs;
    if (this.showLogs) {
      this.showVisualMapper = false;
      this.showVersionHistory = false;
    }
  }

  toggleVisualMapper(): void {
    this.showVisualMapper = !this.showVisualMapper;
    if (this.showVisualMapper) {
      this.showLogs = false;
      this.showVersionHistory = false;
      this.activeView = 'visual';
    }
  }
}
