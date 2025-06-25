// components/workflow-builder/properties-panel/properties-panel.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  canContainChildren,
  getValidChildTypes,
  ELEMENT_CONFIGS, WorkflowData
} from '../../../models/workflow.models';

import { WorkflowElement, ElementType } from '../../../models/workflow.models';
import {
  ApiService,
  LookupItem,
  Page,
  Category,
  Field,
  FieldType
} from '../../../services/api.service';
import { ConditionBuilderComponent } from './condition-builder/condition-builder.component';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatListModule,
    // ConditionBuilderComponent
  ],
  templateUrl: './properties-panel.component.html',
  styleUrls: ['./properties-panel.component.scss']
})
export class PropertiesPanelComponent implements OnInit, OnChanges, OnDestroy {
  @Input() selectedElement?: WorkflowElement;
  @Input() selectedConnection?: any;
  @Input() workflow: WorkflowData = { name: '', elements: [], connections: [] };

  @Output() elementUpdated = new EventEmitter<{ id: string; properties: any }>();
  @Output() connectionUpdated = new EventEmitter<any>();
  @Output() elementSelected = new EventEmitter<string>();
  @Output() elementExpanded = new EventEmitter<string>();
  @Output() elementCollapsed = new EventEmitter<string>();
  @Output() elementDeleted = new EventEmitter<string>();
  propertiesForm!: FormGroup;
  private destroy$ = new Subject<void>();
  selectedElementId?: string;

  // Loading and error states
  isLoading = false;
  errorMessage = '';

  // Auto-save status
  showAutoSaveStatus = false;
  autoSaveStatus: 'saved' | 'saving' | 'error' = 'saved';
  private autoSaveTimeout?: any;

  // Lookup Data
  services: LookupItem[] = [];
  flowSteps: LookupItem[] = [];
  applicantTypes: LookupItem[] = [];
  fieldTypes: FieldType[] = [];

  // Existing Data
  existingPages: Page[] = [];
  existingCategories: Category[] = [];
  existingFields: Field[] = [];

  constructor(
    private fb: FormBuilder,
    public apiService: ApiService,
    private snackBar: MatSnackBar
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Don't auto-load data here, wait for element selection
    console.log('Properties panel initialized');

    // Set up auto-save on form changes
    this.setupAutoSave();
  }
// Hierarchy navigation methods
  // @ts-ignore
  getHierarchyPath(): any[] {
    if (!this.selectedElement) return [];

    const path = [];
    let current = this.selectedElement as WorkflowElement; // non-nullable

    while (true) {
      const config = ELEMENT_CONFIGS.find(c => c.type === current.type);

      path.unshift({
        id:   current.id,
        name: current.properties.name ?? current.type,
        type: current.type,
        icon: config?.icon ?? 'help',
      });

      if (!current.parentId) break;

      const parent = this.workflow.elements.find(el => el.id === current.parentId);
      if (!parent) break;      // parent not found → stop climbing

      current = parent;        // guaranteed WorkflowElement here
    }
}

    selectHierarchyItem(item: any): void {
    this.selectedElementId = item.id;
    this.elementSelected.emit(item.id);
  }

  canContainChildren(elementType: ElementType): boolean {
    return canContainChildren(elementType);
  }

  getValidChildTypes(parentType: ElementType): ElementType[] {
    return getValidChildTypes(parentType);
  }

  getElementTypeIcon(elementType: ElementType): string {
    const config = ELEMENT_CONFIGS.find(c => c.type === elementType);
    return config?.icon || 'help';
  }

  getElementTypeColor(elementType: ElementType): string {
    const config = ELEMENT_CONFIGS.find(c => c.type === elementType);
    return config?.color || '#999';
  }

  // Validation helper methods
  shouldShowTextValidation(): boolean {
    const fieldType = this.propertiesForm.get('_field_type')?.value;
    return ['text', 'textarea', 'email', 'url', 'phone', 'password'].includes(fieldType?.toString());
  }

  shouldShowNumberValidation(): boolean {
    const fieldType = this.propertiesForm.get('_field_type')?.value;
    return ['number', 'decimal', 'percentage', 'range'].includes(fieldType?.toString());
  }

  shouldShowDateValidation(): boolean {
    const fieldType = this.propertiesForm.get('_field_type')?.value;
    return ['date', 'datetime'].includes(fieldType?.toString());
  }

  shouldShowFileValidation(): boolean {
    const fieldType = this.propertiesForm.get('_field_type')?.value;
    return fieldType?.toString() === 'file';
  }

  expandElement(): void {
    if (this.selectedElement) {
      this.elementExpanded.emit(this.selectedElement.id);
    }
  }

  collapseElement(): void {
    if (this.selectedElement) {
      this.elementCollapsed.emit(this.selectedElement.id);
    }
  }

  selectParent(): void {
    if (this.selectedElement?.parentId) {
      this.selectedElementId = this.selectedElement.parentId;
      this.elementSelected.emit(this.selectedElement.parentId);
    }
  }

  getParentName(): string {
    if (!this.selectedElement?.parentId) return '';

    const parent = this.workflow.elements.find(el => el.id === this.selectedElement!.parentId);
    return parent?.properties.name || parent?.type || 'Parent';
  }

  getParentIcon(): string {
    if (!this.selectedElement?.parentId) return 'folder';

    const parent = this.workflow.elements.find(el => el.id === this.selectedElement!.parentId);
    if (!parent) return 'folder';

    const config = ELEMENT_CONFIGS.find(c => c.type === parent.type);
    return config?.icon || 'folder';
  }

  getChildElements(): WorkflowElement[] {
    if (!this.selectedElement?.children) return [];

    return this.selectedElement.children
      .map(childId => this.workflow.elements.find(el => el.id === childId))
      .filter(el => el !== undefined) as WorkflowElement[];
  }

  selectChild(child: WorkflowElement): void {
    this.selectedElementId = child.id;
    this.elementSelected.emit(child.id);
  }

  deleteChild(child: WorkflowElement, event: Event): void {
    event.stopPropagation();

    if (confirm(`Delete ${child.properties.name || child.type}?`)) {
      this.elementDeleted.emit(child.id);
    }
  }

  private setupAutoSave(): void {
    this.propertiesForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((formValue) => {
        // Only auto-save if we have a selected element, form is valid, and auto-save is enabled
        if (this.selectedElement &&
          this.propertiesForm.valid &&
          this.showAutoSaveStatus) { // Only save when auto-save status is visible (form is ready)
          this.autoSaveProperties(formValue);
        }
      });
  }

  // Ensure data is loaded when needed
  private async ensureDataLoaded(): Promise<void> {
    // Check if we have any data loaded
    const hasLookupData = this.services.length > 0 || this.flowSteps.length > 0 ||
      this.applicantTypes.length > 0 || this.fieldTypes.length > 0;

    const hasExistingData = this.existingPages.length > 0 || this.existingCategories.length > 0 ||
      this.existingFields.length > 0;

    console.log('Data check:', { hasLookupData, hasExistingData });

    if (!hasLookupData) {
      console.log('Loading lookup data...');
      await this.loadLookupDataAsync();
    }

    if (!hasExistingData) {
      console.log('Loading existing data...');
      this.loadExistingData(); // This can be async, doesn't need to block
    }
  }

  private async loadLookupDataAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.apiService.isConfigured()) {
        this.errorMessage = 'API not configured. Please configure the base URL first.';
        console.error('API not configured');
        reject(new Error('API not configured'));
        return;
      }

      this.isLoading = true;
      this.errorMessage = '';
      console.log('Starting lookup data load...');

      // Load all lookup data in parallel
      const loadOperations = {
        services: this.apiService.getServices().pipe(catchError((error) => {
          console.error('Services loading failed:', error);
          return of({ count: 0, results: [] as LookupItem[] });
        })),
        flowSteps: this.apiService.getFlowSteps().pipe(catchError((error) => {
          console.error('Flow steps loading failed:', error);
          return of({ count: 0, results: [] as LookupItem[] });
        })),
        applicantTypes: this.apiService.getApplicantTypes().pipe(catchError((error) => {
          console.error('Applicant types loading failed:', error);
          return of({ count: 0, results: [] as LookupItem[] });
        })),
        fieldTypes: this.apiService.getFieldTypes().pipe(catchError((error) => {
          console.error('Field types loading failed:', error);
          return of({ count: 0, results: [] as FieldType[] });
        }))
      };

      forkJoin(loadOperations)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (responses) => {
            console.log('Raw responses:', responses);

            this.services = responses.services.results || [];
            this.flowSteps = responses.flowSteps.results || [];
            this.applicantTypes = responses.applicantTypes.results || [];
            this.fieldTypes = responses.fieldTypes.results || [];

            this.isLoading = false;
            console.log('Lookup data loaded successfully:', {
              services: this.services.length,
              flowSteps: this.flowSteps.length,
              applicantTypes: this.applicantTypes.length,
              fieldTypes: this.fieldTypes.length
            });

            // Check if we actually got data
            if (this.services.length === 0 && this.flowSteps.length === 0 &&
              this.applicantTypes.length === 0 && this.fieldTypes.length === 0) {
              this.errorMessage = 'No data received from API. Please check your API endpoints.';
              reject(new Error('No data received'));
            } else {
              resolve();
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = `Failed to load lookup data: ${error.message}`;
            console.error('Error loading lookup data:', error);
            reject(error);
          }
        });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedElement']) {
      // Cancel any pending auto-save from previous element
      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = undefined;
      }

      // Hide auto-save status when switching elements
      this.showAutoSaveStatus = false;

      // Ensure data is loaded before updating form
      this.ensureDataLoaded().then(() => {
        this.updateFormForElement();
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Clear auto-save timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
  }

  private initializeForm(): void {
    this.propertiesForm = this.fb.group({
      // Common properties
      name: ['', Validators.required],
      description: [''],

      // Page properties
      useExisting: [false],
      existingPageId: [''],
      service: [''],
      sequence_number: [''],
      applicant_type: [''],
      name_ara: [''],
      description_ara: [''],

      // Category properties
      existingCategoryId: [''],
      code: [''],
      is_repeatable: [false],

      // Field properties
      existingFieldId: [''],
      _field_name: [''],
      _field_display_name: [''],
      _field_display_name_ara: [''],
      _field_type: [''],
      _sequence: [''],
      _mandatory: [false],
      _is_hidden: [false],
      _is_disabled: [false],

      // Field validation properties
      _min_length: [''],
      _max_length: [''],
      _regex_pattern: [''],
      _allowed_characters: [''],
      _forbidden_words: [''],
      _value_greater_than: [''],
      _value_less_than: [''],
      _integer_only: [false],
      _positive_only: [false],
      _date_greater_than: [''],
      _date_less_than: [''],
      _future_only: [false],
      _past_only: [false],
      _file_types: [''],
      _max_file_size: [''],
      _image_max_width: [''],
      _image_max_height: [''],
      _precision: [''],
      _unique: [false],
      _default_value: [''],

      // Condition properties
      target_field: [''],
      condition_logic: [[]],

      // End properties
      action: ['submit']
    });
  }

  loadLookupData(): void {
    this.loadLookupDataAsync().catch(error => {
      console.error('Failed to load lookup data:', error);
    });
  }

  loadExistingData(): void {
    if (!this.apiService.isConfigured()) {
      console.log('API not configured, skipping existing data load');
      return;
    }

    console.log('Loading existing data...');

    // Load existing data in parallel (don't block UI if these fail)
    const existingDataOperations = {
      pages: this.apiService.getPages().pipe(catchError((error) => {
        console.error('Pages loading failed:', error);
        return of({ count: 0, results: [] as Page[] });
      })),
      categories: this.apiService.getCategories().pipe(catchError((error) => {
        console.error('Categories loading failed:', error);
        return of({ count: 0, results: [] as Category[] });
      })),
      fields: this.apiService.getFields().pipe(catchError((error) => {
        console.error('Fields loading failed:', error);
        return of({ count: 0, results: [] as Field[] });
      }))
    };

    forkJoin(existingDataOperations)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (responses) => {
          this.existingPages = responses.pages.results || [];
          this.existingCategories = responses.categories.results || [];
          this.existingFields = responses.fields.results || [];

          console.log('Existing data loaded successfully:', {
            pages: this.existingPages.length,
            categories: this.existingCategories.length,
            fields: this.existingFields.length
          });
        },
        error: (error) => {
          console.warn('Some existing data could not be loaded:', error);
        }
      });
  }

  // Debug methods callable from template
  testApiConnection(): void {
    console.log('Testing API connection...');
    console.log('Base URL:', this.apiService.getBaseUrl());
    console.log('Is configured:', this.apiService.isConfigured());

    if (this.apiService.isConfigured()) {
      this.apiService.getServices().subscribe({
        next: (response) => {
          console.log('API test successful:', response);
          this.snackBar.open('API connection successful!', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('API test failed:', error);
          this.snackBar.open(`API test failed: ${error.message}`, 'Close', { duration: 5000 });
        }
      });
    } else {
      this.snackBar.open('API not configured. Please configure base URL first.', 'Close', { duration: 5000 });
    }
  }

  // Force reload all data
  forceReloadData(): void {
    console.log('Force reloading all data...');
    this.services = [];
    this.flowSteps = [];
    this.applicantTypes = [];
    this.fieldTypes = [];
    this.existingPages = [];
    this.existingCategories = [];
    this.existingFields = [];

    this.loadLookupData();
    this.loadExistingData();
  }

  // Dropdown open handlers to ensure data is loaded
  onServiceDropdownOpen(opened: boolean): void {
    if (opened && this.services.length === 0 && !this.isLoading) {
      console.log('Service dropdown opened with no data, loading...');
      this.loadLookupData();
    }
  }

  onFlowStepDropdownOpen(opened: boolean): void {
    if (opened && this.flowSteps.length === 0 && !this.isLoading) {
      console.log('Flow step dropdown opened with no data, loading...');
      this.loadLookupData();
    }
  }

  onApplicantTypeDropdownOpen(opened: boolean): void {
    if (opened && this.applicantTypes.length === 0 && !this.isLoading) {
      console.log('Applicant type dropdown opened with no data, loading...');
      this.loadLookupData();
    }
  }

  onFieldTypeDropdownOpen(opened: boolean): void {
    if (opened && this.fieldTypes.length === 0 && !this.isLoading) {
      console.log('Field type dropdown opened with no data, loading...');
      this.loadLookupData();
    }
  }

  // Existing data dropdown handlers
  onExistingPageDropdownOpen(opened: boolean): void {
    if (opened && this.existingPages.length === 0) {
      console.log('Existing page dropdown opened with no data, loading...');
      this.loadExistingData();
    }
  }

  onExistingCategoryDropdownOpen(opened: boolean): void {
    if (opened && this.existingCategories.length === 0) {
      console.log('Existing category dropdown opened with no data, loading...');
      this.loadExistingData();
    }
  }

  onExistingFieldDropdownOpen(opened: boolean): void {
    if (opened && this.existingFields.length === 0) {
      console.log('Existing field dropdown opened with no data, loading...');
      this.loadExistingData();
    }
  }

  private updateFormForElement(): void {
    if (!this.selectedElement) {
      // Clear form if no element selected
      this.propertiesForm.reset();
      this.showAutoSaveStatus = false;
      return;
    }

    console.log('Updating form for element:', this.selectedElement.id, this.selectedElement.properties);

    // Temporarily disable auto-save while updating form
    this.showAutoSaveStatus = false;

    // Cancel any pending auto-save
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = undefined;
    }

    // Get the current element's properties (ensure we have a clean copy)
    const properties = JSON.parse(JSON.stringify(this.selectedElement.properties || {})); // Deep copy

    // Completely reset the form first
    this.propertiesForm.reset();

    // Wait for form to fully reset before setting new values
    setTimeout(() => {
      // Set common properties with defaults
      this.propertiesForm.patchValue({
        name: properties.name || '',
        description: properties.description || ''
      });

      // Set element-specific properties
      this.setElementSpecificProperties(properties);

      // Update validators based on element type
      this.updateValidators();

      // Re-enable auto-save status after form is populated
      setTimeout(() => {
        this.showAutoSaveStatus = true;
        this.autoSaveStatus = 'saved';
      }, 200);
    }, 50);
  }

  private setElementSpecificProperties(properties: any): void {
    if (!this.selectedElement) return;

    switch (this.selectedElement.type) {
      case ElementType.PAGE:
        this.propertiesForm.patchValue({
          useExisting: properties.useExisting || false,
          existingPageId: properties.existingPageId || '',
          service: properties.service || '',
          sequence_number: properties.sequence_number || '',
          applicant_type: properties.applicant_type || '',
          name_ara: properties.name_ara || '',
          description_ara: properties.description_ara || ''
        });
        break;

      case ElementType.CATEGORY:
        this.propertiesForm.patchValue({
          useExisting: properties.useExisting || false,
          existingCategoryId: properties.existingCategoryId || '',
          code: properties.code || '',
          name_ara: properties.name_ara || '',
          is_repeatable: properties.is_repeatable || false
        });
        break;

      case ElementType.FIELD:
        this.propertiesForm.patchValue({
          useExisting: properties.useExisting || false,
          existingFieldId: properties.existingFieldId || '',
          _field_name: properties._field_name || '',
          _field_display_name: properties._field_display_name || '',
          _field_display_name_ara: properties._field_display_name_ara || '',
          _field_type: properties._field_type || '',
          _sequence: properties._sequence || '',
          _mandatory: properties._mandatory || false,
          _is_hidden: properties._is_hidden || false,
          _is_disabled: properties._is_disabled || false,
          // Validation properties
          _min_length: properties._min_length || '',
          _max_length: properties._max_length || '',
          _regex_pattern: properties._regex_pattern || '',
          _allowed_characters: properties._allowed_characters || '',
          _forbidden_words: properties._forbidden_words || '',
          _value_greater_than: properties._value_greater_than || '',
          _value_less_than: properties._value_less_than || '',
          _integer_only: properties._integer_only || false,
          _positive_only: properties._positive_only || false,
          _date_greater_than: properties._date_greater_than || '',
          _date_less_than: properties._date_less_than || '',
          _future_only: properties._future_only || false,
          _past_only: properties._past_only || false,
          _file_types: properties._file_types || '',
          _max_file_size: properties._max_file_size || '',
          _image_max_width: properties._image_max_width || '',
          _image_max_height: properties._image_max_height || '',
          _precision: properties._precision || '',
          _unique: properties._unique || false,
          _default_value: properties._default_value || ''
        });
        break;

      case ElementType.CONDITION:
        this.propertiesForm.patchValue({
          target_field: properties.target_field || '',
          condition_logic: properties.condition_logic || []
        });
        break;

      case ElementType.END:
        this.propertiesForm.patchValue({
          action: properties.action || 'submit'
        });
        break;
    }
  }

  private autoSaveProperties(formValue: any): void {
    // Guard against saving when no element is selected
    if (!this.selectedElement) {
      console.log('Auto-save cancelled: No element selected');
      return;
    }

    // Guard against saving invalid forms
    if (!this.propertiesForm.valid) {
      console.log('Auto-save cancelled: Form is invalid');
      return;
    }

    // Store the current element ID to prevent race conditions
    const currentElementId = this.selectedElement.id;

    // Clear existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Show saving status
    this.autoSaveStatus = 'saving';
    this.showAutoSaveStatus = true;

    // Debounce auto-save by 500ms
    this.autoSaveTimeout = setTimeout(() => {
      // Double-check that we're still on the same element
      if (!this.selectedElement || this.selectedElement.id !== currentElementId) {
        console.log('Auto-save cancelled: Element changed during timeout');
        return;
      }

      try {
        // Clean up the form value based on element type
        const cleanedProperties = this.cleanFormValue(formValue);

        console.log('Auto-saving for element:', currentElementId, cleanedProperties);

        this.elementUpdated.emit({
          id: currentElementId,
          properties: cleanedProperties
        });

        this.autoSaveStatus = 'saved';

        // Hide status after 2 seconds
        setTimeout(() => {
          this.showAutoSaveStatus = false;
        }, 2000);

      } catch (error) {
        console.error('Auto-save error:', error);
        this.autoSaveStatus = 'error';

        // Show error for longer
        setTimeout(() => {
          this.showAutoSaveStatus = false;
        }, 5000);
      }
    }, 500);
  }

  getAutoSaveIcon(): string {
    switch (this.autoSaveStatus) {
      case 'saving': return 'sync';
      case 'saved': return 'check_circle';
      case 'error': return 'error';
      default: return 'check_circle';
    }
  }

  getAutoSaveMessage(): string {
    switch (this.autoSaveStatus) {
      case 'saving': return 'Saving...';
      case 'saved': return 'Changes saved';
      case 'error': return 'Save failed';
      default: return 'Changes saved';
    }
  }

  private updateValidators(): void {
    if (!this.selectedElement) return;

    // Clear all validators
    Object.keys(this.propertiesForm.controls).forEach(key => {
      this.propertiesForm.get(key)?.clearValidators();
    });

    // Add required validators based on element type
    this.propertiesForm.get('name')?.setValidators([Validators.required]);

    switch (this.selectedElement.type) {
      case ElementType.PAGE:
        if (!this.propertiesForm.get('useExisting')?.value) {
          this.propertiesForm.get('service')?.setValidators([Validators.required]);
          this.propertiesForm.get('sequence_number')?.setValidators([Validators.required]);
          this.propertiesForm.get('applicant_type')?.setValidators([Validators.required]);
        }
        break;

      case ElementType.FIELD:
        if (!this.propertiesForm.get('useExisting')?.value) {
          this.propertiesForm.get('_field_name')?.setValidators([Validators.required]);
          this.propertiesForm.get('_field_display_name')?.setValidators([Validators.required]);
          this.propertiesForm.get('_field_type')?.setValidators([Validators.required]);
        }
        break;
    }

    // Update form validation
    this.propertiesForm.updateValueAndValidity();
  }

  onExistingPageSelected(pageId: number): void {
    const page = this.existingPages.find(p => p.id === pageId);
    if (page) {
      this.propertiesForm.patchValue({
        name: page.name,
        name_ara: page.name_ara,
        description: page.description,
        description_ara: page.description_ara,
        service: page.service,
        sequence_number: page.sequence_number,
        applicant_type: page.applicant_type
      });
    }
  }

  onExistingCategorySelected(categoryId: number): void {
    const category = this.existingCategories.find(c => c.id === categoryId);
    if (category) {
      this.propertiesForm.patchValue({
        name: category.name,
        name_ara: category.name_ara,
        description: category.description,
        code: category.code,
        is_repeatable: category.is_repeatable
      });
    }
  }

  onExistingFieldSelected(fieldId: number): void {
    const field = this.existingFields.find(f => f.id === fieldId);
    if (field) {
      this.propertiesForm.patchValue({
        _field_name: field._field_name,
        _field_display_name: field._field_display_name,
        _field_display_name_ara: field._field_display_name_ara,
        _field_type: field._field_type,
        _sequence: field._sequence,
        _mandatory: field._mandatory,
        _is_hidden: field._is_hidden,
        _is_disabled: field._is_disabled
      });
    }
  }

  onConditionLogicChanged(conditionLogic: any[]): void {
    // Update the form control with a copy of the condition logic
    const currentElement = this.selectedElement;
    if (currentElement && currentElement.type === ElementType.CONDITION) {
      console.log('Condition logic changed for element:', currentElement.id, conditionLogic);

      // Create a deep copy to prevent reference sharing
      const conditionLogicCopy = JSON.parse(JSON.stringify(conditionLogic));
      this.propertiesForm.patchValue({ condition_logic: conditionLogicCopy });
    }
  }

  private cleanFormValue(formValue: any): any {
    if (!this.selectedElement) return {};

    // Create a clean copy to avoid reference sharing
    const cleaned: any = {};

    // Include common properties
    if (formValue.name !== null && formValue.name !== undefined) {
      cleaned.name = formValue.name;
    }
    if (formValue.description !== null && formValue.description !== undefined) {
      cleaned.description = formValue.description;
    }

    // Include element-specific properties
    switch (this.selectedElement.type) {
      case ElementType.PAGE:
        if (formValue.useExisting) {
          cleaned.useExisting = true;
          if (formValue.existingPageId) {
            cleaned.existingPageId = formValue.existingPageId;
          }
        } else {
          // Only include properties that have values
          ['service', 'sequence_number', 'applicant_type', 'name_ara', 'description_ara'].forEach(key => {
            if (formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
              cleaned[key] = formValue[key];
            }
          });
        }
        break;

      case ElementType.CATEGORY:
        if (formValue.useExisting) {
          cleaned.useExisting = true;
          if (formValue.existingCategoryId) {
            cleaned.existingCategoryId = formValue.existingCategoryId;
          }
        } else {
          ['code', 'name_ara', 'is_repeatable'].forEach(key => {
            if (formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
              cleaned[key] = formValue[key];
            }
          });
        }
        break;

      case ElementType.FIELD:
        if (formValue.useExisting) {
          cleaned.useExisting = true;
          if (formValue.existingFieldId) {
            cleaned.existingFieldId = formValue.existingFieldId;
          }
        } else {
          // Include all field properties that have values
          Object.keys(formValue).forEach(key => {
            if (key.startsWith('_') && formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
              cleaned[key] = formValue[key];
            }
          });
        }
        break;

      case ElementType.CONDITION:
        ['target_field'].forEach(key => {
          if (formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
            cleaned[key] = formValue[key];
          }
        });

        // Special handling for condition logic array
        if (formValue.condition_logic && Array.isArray(formValue.condition_logic)) {
          cleaned.condition_logic = [...formValue.condition_logic]; // Create a copy
        }
        break;

      case ElementType.END:
        if (formValue.action) {
          cleaned.action = formValue.action;
        }
        break;
    }

    console.log('Cleaned form value for', this.selectedElement.type, ':', cleaned);
    return cleaned;
  }

  resetForm(): void {
    if (this.selectedElement) {
      console.log('Resetting form for element:', this.selectedElement.id);
      this.updateFormForElement();
      this.snackBar.open('Form reset to saved values', 'Close', { duration: 2000 });
    }
  }

  deleteConnection(): void {
    if (this.selectedConnection) {
      this.connectionUpdated.emit({ action: 'delete', connection: this.selectedConnection });
    }
  }

  getElementIcon(): string {
    const icons: { [key: string]: string } = {
      [ElementType.START]: 'play_circle',
      [ElementType.PAGE]: 'description',
      [ElementType.CATEGORY]: 'category',
      [ElementType.FIELD]: 'input',
      [ElementType.CONDITION]: 'help',
      [ElementType.END]: 'stop_circle'
    };
    return icons[this.selectedElement?.type || ''] || 'help';
  }

  getElementTitle(): string {
    const elementName = this.selectedElement?.properties?.name;
    const elementType = this.selectedElement?.type;

    if (elementName) {
      return elementName;
    }

    if (elementType) {
      return elementType.charAt(0).toUpperCase() + elementType.slice(1);
    }

    return 'Element';
  }

  getElementDescription(): string {
    const descriptions: { [key: string]: string } = {
      [ElementType.START]: 'Configure the starting point of your workflow',
      [ElementType.PAGE]: 'Define form pages with fields and validation',
      [ElementType.CATEGORY]: 'Group related fields into categories',
      [ElementType.FIELD]: 'Configure input fields and validation rules',
      [ElementType.CONDITION]: 'Set up conditional logic and branching',
      [ElementType.END]: 'Define workflow completion actions'
    };
    return descriptions[this.selectedElement?.type || ''] || '';
  }

  getSourceElementName(): string {
    // This would be implemented to get the actual source element name
    return 'Source Element';
  }

  getTargetElementName(): string {
    // This would be implemented to get the actual target element name
    return 'Target Element';
  }

  getServiceName(serviceId: number): string {
    const service = this.services.find(s => s.id === serviceId);
    return service ? service.name : `Service ${serviceId}`;
  }
}
