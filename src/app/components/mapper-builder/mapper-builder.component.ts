// src/app/components/mapper-builder/mapper-builder.component.ts
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';

// Child Components
import { TargetTreeComponent } from './target-tree/target-tree.component';
import { ModelBrowserComponent } from './model-browser/model-browser.component';
import { FunctionBrowserComponent } from './function-browser/function-browser.component';
import { TargetDetailsComponent } from './target-details/target-details.component';
import { PropertiesEditorComponent } from './properties-editor/properties-editor.component';
import { PreviewComponent } from './preview/preview.component';

// Dialogs
import { NewMapperDialogComponent } from './components/dialogs/new-mapper-dialog/new-mapper-dialog.component';
import { OpenMapperDialogComponent } from './components/dialogs/open-mapper-dialog/open-mapper-dialog.component';
import { SaveMapperDialogComponent } from './components/dialogs/save-mapper-dialog/save-mapper-dialog.component';
import { ImportMapperDialogComponent } from './components/dialogs/import-mapper-dialog/import-mapper-dialog.component';
import { ExportMapperDialogComponent } from './components/dialogs/export-mapper-dialog/export-mapper-dialog.component';

// Services
import { MapperApiService } from '../../services/mapper-api.service';
import { MapperStateService } from '../../services/mapper-state.service';
import { MapperValidationService } from '../../services/mapper-validation.service';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';
import { MapperUndoRedoService } from '../../services/undo-redo.service';

// Models
import {
  CaseMapper,
  MapperTarget,
  ModelOption,
  LookupOption,
  TransformFunction,
  FilterFunction,
  ValidationResult, ValidationError
} from '../../models/mapper.models';
import {MatTab, MatTabGroup} from '@angular/material/tabs';

import { LogsViewerComponent } from './components/logs-viewer/logs-viewer.component';
import {
  ValidationResultsDialogComponent
} from './components/dialogs/validation-results-dialog/validation-results-dialog';
import {FieldRuleEditorComponent} from './components/field-rule-editor/field-rule-editor.component';

@Component({
  selector: 'app-mapper-builder',
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
    TargetTreeComponent,
    ModelBrowserComponent,
    FunctionBrowserComponent,
    TargetDetailsComponent,
    PropertiesEditorComponent,
    PreviewComponent,
    MatTabGroup,
    MatTab,
    // LogsViewerComponent
  ],
  templateUrl:'mapper-builder.component.html',
  styleUrl:"mapper-builder.component.scss"
})
export class MapperBuilderComponent implements OnInit, OnDestroy {
  // State
  currentMapper?: CaseMapper;
  targets: MapperTarget[] = [];
  selectedTargetId?: string;
  selectedTarget?: MapperTarget;
  previewResult?: any;

  // Reference data
  availableModels: ModelOption[] = [];
  availableLookups: LookupOption[] = [];
  availableTransforms: TransformFunction[] = [];
  availableFilters: FilterFunction[] = [];

  // UI state
  isLoading = false;
  loadingMessage = '';
  showPreview = false;
  isDirty = false;
  canUndo = false;
  canRedo = false;
  lastSaved?: Date;
  validationErrors: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private mapperApi: MapperApiService,
    private mapperState: MapperStateService,
    private validation: MapperValidationService,
    private shortcuts: KeyboardShortcutsService,
    private undoRedo: MapperUndoRedoService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
  }

  ngOnInit(): void {
    this.initializeState();
    this.loadReferenceData();
    this.registerKeyboardShortcuts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeState(): void {
    // Subscribe to state changes
    this.mapperState.getState$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.currentMapper = state.currentMapper;
        this.targets = state.targets;
        this.selectedTargetId = state.selectedTargetId;
        this.selectedTarget = state.targets.find(t => t.id === state.selectedTargetId);
        this.isDirty = state.isDirty;
        this.previewResult = state.previewResult;
        this.availableModels = state.availableModels;
        this.availableLookups = state.availableLookups;
        this.availableTransforms = state.availableTransforms;
        this.availableFilters = state.availableFilters;
      });

    // Subscribe to undo/redo state
    this.undoRedo.canUndo()
      .pipe(takeUntil(this.destroy$))
      .subscribe(can => this.canUndo = can);

    this.undoRedo.canRedo()
      .pipe(takeUntil(this.destroy$))
      .subscribe(can => this.canRedo = can);
  }

  private loadReferenceData(): void {
    this.isLoading = true;
    this.loadingMessage = 'Loading reference data...';

    Promise.all([
      this.mapperApi.getAvailableModels().toPromise(),
      this.mapperApi.getAvailableLookups().toPromise(),
      this.mapperApi.getTransformFunctions().toPromise(),
      this.mapperApi.getFilterFunctions().toPromise()
    ]).then(([models, lookups, transforms, filters]) => {
      console.log('Loaded reference data:', {
        models: models?.length || 0,
        lookups: lookups?.length || 0,
        transforms: transforms?.length || 0,
        filters: filters?.length || 0
      });

      // Log lookups for debugging
      if (lookups && lookups.length > 0) {
        console.log('Sample lookup:', lookups[0]);
        console.log('All lookups:', lookups);
      } else {
        console.warn('No lookups loaded from API');
      }

      this.mapperState.setReferenceData({
        models: models || [],
        lookups: lookups || [],
        transforms: transforms || [],
        filters: filters || []
      });
      this.isLoading = false;
    }).catch(error => {
      console.error('Failed to load reference data:', error);
      this.snackBar.open('Failed to load reference data', 'Retry', {duration: 5000})
        .onAction().subscribe(() => {
        this.loadReferenceData(); // Retry on action
      });
      this.isLoading = false;
    });
  }
  private registerKeyboardShortcuts(): void {
    this.shortcuts.registerShortcut({
      key: 'n',
      modifiers: ['ctrl'],
      description: 'New mapper',
      action: () => this.newMapper()
    });

    this.shortcuts.registerShortcut({
      key: 'o',
      modifiers: ['ctrl'],
      description: 'Open mapper',
      action: () => this.openMapper()
    });

    this.shortcuts.registerShortcut({
      key: 's',
      modifiers: ['ctrl'],
      description: 'Save mapper',
      action: () => this.saveMapper()
    });

    this.shortcuts.registerShortcut({
      key: 's',
      modifiers: ['ctrl', 'shift'],
      description: 'Save as',
      action: () => this.saveAsMapper()
    });

    this.shortcuts.registerShortcut({
      key: 'z',
      modifiers: ['ctrl'],
      description: 'Undo',
      action: () => this.undo()
    });

    this.shortcuts.registerShortcut({
      key: 'y',
      modifiers: ['ctrl'],
      description: 'Redo',
      action: () => this.redo()
    });

    this.shortcuts.registerShortcut({
      key: 'p',
      modifiers: ['ctrl'],
      description: 'Toggle preview',
      action: () => this.togglePreview()
    });

    this.shortcuts.registerShortcut({
      key: 'f5',
      description: 'Validate',
      action: () => this.validateMapper()
    });
  }

  // Toolbar actions
  newMapper(): void {
    const dialogRef = this.dialog.open(NewMapperDialogComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.mapperState.createNewMapper(result.caseType);
        this.mapperState.updateTarget(this.mapperState.generateTargetId(), {
          name: result.name,
          ...result
        });
        this.snackBar.open('New mapper created', 'Close', {duration: 3000});
      }
    });
  }

  openMapper(): void {
    const dialogRef = this.dialog.open(OpenMapperDialogComponent, {
      width: '800px',
      height: '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadMapper(result.id);
      }
    });
  }

  saveMapper(): void {
    if (!this.currentMapper || !this.isDirty) return;

    this.isLoading = true;
    this.loadingMessage = 'Saving mapper...';

    const saveRequest = {
      case_mapper: this.currentMapper,
      targets: this.targets
    };

    this.mapperApi.saveMapperConfiguration(saveRequest).subscribe({
      next: (result) => {
        this.isLoading = false;
        this.lastSaved = new Date();
        this.mapperState.resetDirtyState();
        this.snackBar.open('Mapper saved successfully', 'Close', {duration: 3000});
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open('Failed to save mapper', 'Close', {duration: 5000});
      }
    });
  }

  saveAsMapper(): void {
    const dialogRef = this.dialog.open(SaveMapperDialogComponent, {
      width: '500px',
      data: {mapper: this.currentMapper}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Create new version or copy
        this.saveMapper();
      }
    });
  }

  undo(): void {
    this.undoRedo.undo();  // It doesn't return a state object
    this.snackBar.open('Action undone', 'Close', {duration: 2000});
  }

  redo(): void {
    this.undoRedo.redo();  // It doesn't return a state object
    this.snackBar.open('Action redone', 'Close', {duration: 2000});
  }

  validateMapper(): void {
    const validationResult = this.validation.validateMapper({
      currentMapper: this.currentMapper,
      targets: this.targets,
      selectedTargetId: this.selectedTargetId,
      isDirty: this.isDirty,
      availableModels: this.availableModels,
      availableLookups: this.availableLookups,
      availableTransforms: this.availableTransforms,
      availableFilters: this.availableFilters,
      loading: false
    });

    // Convert errors array to ValidationResult format
    const result: ValidationResult = {
      valid: validationResult.length === 0,
      errors: validationResult.map(error => ({
        field: error,
        message: error,
        severity: 'error' as const
      })),
      warnings: []
    };

    // Open the validation results dialog
    const dialogRef = this.dialog.open(ValidationResultsDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        result: result,
        mapperName: this.currentMapper?.name || 'Unnamed Mapper'
      }
    });

    dialogRef.afterClosed().subscribe(response => {
      if (response?.action === 'navigate') {
        // Navigate to the error location
        this.navigateToError(response.error);
      } else if (response?.action === 'fix') {
        // Focus on first error
        if (result.errors.length > 0) {
          this.navigateToError(result.errors[0]);
        }
      }
    });
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  runMapper(): void {
    if (!this.selectedTarget) return;

    // Show run dialog to get case ID
    console.log('Run mapper for target:', this.selectedTarget);
  }

  importMapper(): void {
    const dialogRef = this.dialog.open(ImportMapperDialogComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadMapperFromImport(result);
      }
    });
  }

  exportMapper(): void {
    if (!this.currentMapper) return;

    const dialogRef = this.dialog.open(ExportMapperDialogComponent, {
      width: '500px',
      data: {mapper: this.currentMapper}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.performExport(result);
      }
    });
  }

  searchInMapper(): void {
    // Implement search functionality
    console.log('Search in mapper');
  }

  showHelp(): void {
    // Show help dialog
    console.log('Show help');
  }

  showSettings(): void {
    // Show settings dialog
    console.log('Show settings');
  }

  // Target management
  selectTarget(targetId: string): void {
    this.mapperState.selectTarget(targetId);
  }

  addTarget(target: Partial<MapperTarget>): void {
    this.mapperState.addTarget(target);
    this.saveUndoState('ADD_TARGET');
  }

  addNewTarget(): void {
    this.addTarget({
      name: 'New Target',
      model: '',
      active_ind: true
    });
  }

  addTargetFromModel(model: ModelOption): void {
    this.addTarget({
      name: model.model,
      model: `${model.app_label}.${model.model}`,
      active_ind: true
    });
  }

  updateTarget(update: { id: string; changes: Partial<MapperTarget> }): void {
    this.mapperState.updateTarget(update.id, update.changes);
    this.saveUndoState('UPDATE_TARGET');
  }

  deleteTarget(targetId: string): void {
    this.mapperState.deleteTarget(targetId);
    this.saveUndoState('DELETE_TARGET');
  }

  moveTarget(event: { targetId: string; newParentId?: string }): void {
    this.mapperState.moveTarget(event.targetId, event.newParentId);
    this.saveUndoState('MOVE_TARGET');
  }

  updateTargetProperty(event: { property: string; value: any }): void {
    if (this.selectedTargetId) {
      this.mapperState.updateTarget(this.selectedTargetId, {
        [event.property]: event.value
      });
    }
  }

  // Field rule management
  addFieldRule(): void {
    console.log('Opening Field Rule Dialog with lookups:', this.availableLookups?.length || 0);

    if (this.availableLookups && this.availableLookups.length > 0) {
      console.log('Sample lookup:', this.availableLookups[0]);
    }

    const dialogRef = this.dialog.open(FieldRuleEditorComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        rule: null,
        targetModel: this.target?.model || this.targetForm.get('model')?.value,
        availableLookups: this.availableLookups || [],
        availableTransforms: this.availableTransforms || []
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.fieldRuleAdded.emit(result);
      }
    });
  }
  updateFieldRule(event: { ruleId: number; changes: any }): void {
    if (this.selectedTargetId) {
      this.mapperState.updateFieldRule(this.selectedTargetId, event.ruleId, event.changes);
      this.saveUndoState('UPDATE_FIELD_RULE');
    }
  }

  deleteFieldRule(ruleId: number): void {
    if (this.selectedTargetId) {
      this.mapperState.deleteFieldRule(this.selectedTargetId, ruleId);
      this.saveUndoState('DELETE_FIELD_RULE');
    }
  }

  // Preview
  runPreview(caseId: number): void {
    if (!this.selectedTarget) return;

    this.isLoading = true;
    this.loadingMessage = 'Running preview...';

    this.mapperApi.runDryRun(caseId, this.selectedTarget.id!).subscribe({
      next: (result) => {
        this.mapperState.setPreviewResult(result);
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open('Preview failed', 'Close', {duration: 3000});
      }
    });
  }

  // Helper methods
  getTotalFieldRules(): number {
    return this.targets.reduce((sum, target) =>
      sum + (target.field_rules?.length || 0), 0);
  }

  private loadMapper(mapperId: number): void {
    this.isLoading = true;
    this.loadingMessage = 'Loading mapper...';

    Promise.all([
      this.mapperApi.getCaseMapper(mapperId).toPromise(),
      this.mapperApi.getMapperTargets(mapperId).toPromise()
    ]).then(([mapper, targets]) => {
      if (mapper && targets) {
        this.mapperState.loadMapper(mapper, targets);
        this.isLoading = false;
        this.snackBar.open('Mapper loaded successfully', 'Close', {duration: 3000});
      }
    }).catch(error => {
      this.isLoading = false;
      this.snackBar.open('Failed to load mapper', 'Close', {duration: 5000});
    });
  }

  private loadMapperFromImport(data: any): void {
    // Load imported mapper data
    console.log('Load from import:', data);
  }

  private performExport(options: any): void {
    if (!this.currentMapper) return;

    this.mapperApi.exportMapper(this.currentMapper.id!).subscribe({
      next: (data) => {
        // Download the exported data
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mapper-${this.currentMapper!.name}-v${this.currentMapper!.version}.json`;
        a.click();
        window.URL.revokeObjectURL(url);

        this.snackBar.open('Mapper exported successfully', 'Close', {duration: 3000});
      },
      error: (error) => {
        this.snackBar.open('Export failed', 'Close', {duration: 3000});
      }
    });
  }

  private saveUndoState(action: string): void {
    this.undoRedo.saveState({
      currentMapper: this.currentMapper,
      targets: this.targets,
      selectedTargetId: this.selectedTargetId,
      isDirty: true,
      availableModels: this.availableModels,
      availableLookups: this.availableLookups,
      availableTransforms: this.availableTransforms,
      availableFilters: this.availableFilters,
      loading: false
    }, action);
  }

  private navigateToError(error: ValidationError): void {
    // Parse the error field to determine where to navigate
    const field = error.field.toLowerCase();

    if (field.includes('target')) {
      // Extract target ID if present in the error message
      const targetMatch = error.field.match(/target\s+(\S+)/i);
      if (targetMatch) {
        this.selectTarget(targetMatch[1]);
      }
    }
  }
}
