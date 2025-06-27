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
import {Subject, takeUntil, forkJoin, of, Observable} from 'rxjs';
import {catchError, debounceTime, map} from 'rxjs/operators';

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
  FieldType, Condition
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

  // Add local cache for form values
  private formCache: { [elementId: string]: any } = {};
  private currentElementId?: string;

  constructor(
    private fb: FormBuilder,
    public apiService: ApiService,
    private snackBar: MatSnackBar
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    console.log('Properties panel initialized');

    // Load field types immediately for fields
    if (!this.apiService.isConfigured()) {
      console.warn('API not configured');
    } else {
      // Pre-load field types
      this.loadLookupDataAsync().catch(error => {
        console.warn('Failed to pre-load lookup data:', error);
      });
    }

    // Set up real-time updates for name field
    this.setupRealTimeUpdates();
  }
// Add this helper method to the component
  private toNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    return null;
  }

  private setupRealTimeUpdates(): void {
    // Watch for all form changes, not just name
    this.propertiesForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300)
      )
      .subscribe((formValue) => {
        if (this.selectedElement && this.propertiesForm.valid) {
          // Get the cleaned form values
          const cleanedProperties = this.cleanFormValue(formValue);

          // Check if there are actual changes
          const hasChanges = Object.keys(cleanedProperties).some(key =>
            cleanedProperties[key] !== this.selectedElement!.properties[key]
          );

          if (hasChanges) {
            console.log('Form value changed, emitting update:', cleanedProperties);

            // Emit the update
            this.elementUpdated.emit({
              id: this.selectedElement.id,
              properties: cleanedProperties
            });
          }
        }
      });

    // Watch specifically for field type changes to update validation visibility
    this.propertiesForm.get('_field_type')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((fieldTypeValue) => {
        console.log('Field type changed to:', fieldTypeValue);
        // Force change detection to update validation sections
        setTimeout(() => {
          // This will trigger Angular to re-evaluate the shouldShow methods
        }, 0);
      });

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

    return path; // ADD THIS LINE
  }
    selectHierarchyItem(item: any): void {
    this.selectedElementId = item.id;
    this.elementSelected.emit(item.id);
  }
  private clearCache(): void {
    this.formCache = {};
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

  // Helper method to extract ID from object or return the value itself
  private extractIdValue(value: any): any {
    if (value && typeof value === 'object' && 'id' in value) {
      // Ensure the ID is a number if it's numeric
      const id = value.id;
      return typeof id === 'string' && /^\d+$/.test(id) ? parseInt(id, 10) : id;
    }
    // If value is a string that looks like a number, convert it
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    return value;
  }

  // Compare function for mat-select to properly compare values
  compareByValue(value1: any, value2: any): boolean {
    // Handle null/undefined
    if (value1 === null && value2 === null) return true;
    if (value1 === undefined && value2 === undefined) return true;
    if (value1 === null || value1 === undefined || value2 === null || value2 === undefined) return false;

    // Extract ID if object
    const extractValue = (val: any): any => {
      if (val && typeof val === 'object' && 'id' in val) {
        return val.id;
      }
      return val;
    };

    const extracted1 = extractValue(value1);
    const extracted2 = extractValue(value2);

    // Convert both to numbers if they look like numbers
    const v1 = (typeof extracted1 === 'string' && /^\d+$/.test(extracted1)) ? parseInt(extracted1, 10) : extracted1;
    const v2 = (typeof extracted2 === 'string' && /^\d+$/.test(extracted2)) ? parseInt(extracted2, 10) : extracted2;

    // Direct comparison
    if (v1 === v2) return true;

    // Try string comparison as fallback
    return String(v1) === String(v2);
  }
  // Find the correct lookup ID by matching ID, code, or name
  private findLookupValue(
    lookupArray: LookupItem[],
    id: any,
    code: any,
    name: any
  ): number | null {
    if (!lookupArray || lookupArray.length === 0) {
      console.warn('Lookup array is empty, checking provided values:', { id, code, name });
      // If we have a numeric ID and no lookup data yet, return the ID
      if (id && (typeof id === 'number' || (/^\d+$/.test(id) && id.length > 2))) {
        return typeof id === 'string' ? parseInt(id, 10) : id;
      }
      return null;
    }

    // First try to match by ID (since workflow API provides explicit IDs)
    if (id !== null && id !== undefined) {
      const numericId = typeof id === 'string' && /^\d+$/.test(id) ? parseInt(id, 10) : id;
      if (typeof numericId === 'number') {
        const foundById = lookupArray.find(item => item.id === numericId);
        if (foundById) {
          console.log('Found by ID:', id, '-> ID:', foundById.id);
          return foundById.id;
        }
      }
    }

    // Then try to match by code (important for sequence_number)
    if (code) {
      const foundByCode = lookupArray.find(item =>
        item.code && item.code.toLowerCase() === code.toString().toLowerCase()
      );
      if (foundByCode) {
        console.log('Found by code:', code, '-> ID:', foundByCode.id);
        return foundByCode.id;
      }
    }

    // Finally try to match by name
    if (name) {
      const foundByName = lookupArray.find(item =>
        item.name && item.name.toLowerCase() === name.toString().toLowerCase()
      );
      if (foundByName) {
        console.log('Found by name:', name, '-> ID:', foundByName.id);
        return foundByName.id;
      }
    }

    console.warn('Could not find lookup value for:', { id, code, name, availableItems: lookupArray });
    // If we have a numeric ID, return it anyway (the lookup might be incomplete)
    if (id && typeof id === 'number') {
      return id;
    }
    return null;
  }


// Validation helper methods
  shouldShowTextValidation(): boolean {
    const fieldTypeValue = this.propertiesForm.get('_field_type')?.value;

    // Get the field type object if we have the ID
    const fieldType = this.fieldTypes.find(ft => ft.id === fieldTypeValue);
    const fieldTypeCode = fieldType?.code?.toLowerCase() || '';
    const fieldTypeName = fieldType?.name?.toLowerCase() || '';

    console.log('Checking text validation for field type:', fieldTypeValue, fieldTypeCode, fieldTypeName);

    // Check by code or name
    return ['text', 'textarea', 'email', 'url', 'phone', 'password', 'rich_text', 'slug'].includes(fieldTypeCode) ||
      ['text', 'textarea', 'email', 'url', 'phone', 'password', 'rich text', 'slug'].includes(fieldTypeName);
  }

  shouldShowNumberValidation(): boolean {
    const fieldTypeValue = this.propertiesForm.get('_field_type')?.value;

    const fieldType = this.fieldTypes.find(ft => ft.id === fieldTypeValue);
    const fieldTypeCode = fieldType?.code?.toLowerCase() || '';
    const fieldTypeName = fieldType?.name?.toLowerCase() || '';

    return ['number', 'decimal', 'percentage', 'range', 'currency', 'rating'].includes(fieldTypeCode) ||
      ['number', 'decimal', 'percentage', 'range', 'currency', 'rating'].includes(fieldTypeName);
  }

  shouldShowDateValidation(): boolean {
    const fieldTypeValue = this.propertiesForm.get('_field_type')?.value;

    const fieldType = this.fieldTypes.find(ft => ft.id === fieldTypeValue);
    const fieldTypeCode = fieldType?.code?.toLowerCase() || '';
    const fieldTypeName = fieldType?.name?.toLowerCase() || '';

    return ['date', 'datetime'].includes(fieldTypeCode) ||
      ['date', 'datetime', 'date time'].includes(fieldTypeName);
  }

  shouldShowFileValidation(): boolean {
    const fieldTypeValue = this.propertiesForm.get('_field_type')?.value;

    const fieldType = this.fieldTypes.find(ft => ft.id === fieldTypeValue);
    const fieldTypeCode = fieldType?.code?.toLowerCase() || '';
    const fieldTypeName = fieldType?.name?.toLowerCase() || '';

    return ['file', 'image'].includes(fieldTypeCode) ||
      ['file', 'image', 'file upload'].includes(fieldTypeName);
  }

  shouldShowChoiceValidation(): boolean {
    const fieldTypeValue = this.propertiesForm.get('_field_type')?.value;

    const fieldType = this.fieldTypes.find(ft => ft.id === fieldTypeValue);
    const fieldTypeCode = fieldType?.code?.toLowerCase() || '';
    const fieldTypeName = fieldType?.name?.toLowerCase() || '';

    return ['choice', 'multi_choice', 'select', 'multi_select'].includes(fieldTypeCode) ||
      ['choice', 'multi choice', 'select', 'multi select', 'dropdown'].includes(fieldTypeName);
  }

  shouldShowBooleanValidation(): boolean {
    const fieldTypeValue = this.propertiesForm.get('_field_type')?.value;

    const fieldType = this.fieldTypes.find(ft => ft.id === fieldTypeValue);
    const fieldTypeCode = fieldType?.code?.toLowerCase() || '';
    const fieldTypeName = fieldType?.name?.toLowerCase() || '';

    return fieldTypeCode === 'boolean' || fieldTypeName === 'boolean' || fieldTypeName === 'checkbox';
  }

  getFieldType(): string {
    return this.propertiesForm.get('_field_type')?.value?.toString() || '';
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

  // private setupAutoSave(): void {
  //   this.propertiesForm.valueChanges
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe((formValue) => {
  //       // Only auto-save if we have a selected element, form is valid, and auto-save is enabled
  //       if (this.selectedElement &&
  //         this.propertiesForm.valid &&
  //         this.showAutoSaveStatus) { // Only save when auto-save status is visible (form is ready)
  //         this.autoSaveProperties(formValue);
  //       }
  //     });
  // }

  // Ensure data is loaded when needed
  private ensureDataLoaded(): Promise<void> {
    // Check if we have the specific data needed for the current element type
    const needsPageData = this.selectedElement?.type === ElementType.PAGE;
    const hasRequiredPageData = needsPageData ?
      (this.services.length > 0 && this.flowSteps.length > 0 && this.applicantTypes.length > 0) : true;

    console.log('Data check:', {
      elementType: this.selectedElement?.type,
      needsPageData,
      hasRequiredPageData,
      servicesCount: this.services.length,
      flowStepsCount: this.flowSteps.length,
      applicantTypesCount: this.applicantTypes.length
    });

    // Always load lookup data if we don't have required data
    if (!hasRequiredPageData) {
      console.log('Loading lookup data because required data is missing...');
      return this.loadLookupDataAsync();
    }

    // Load existing data if needed
    const hasExistingData = this.existingPages.length > 0 || this.existingCategories.length > 0 ||
      this.existingFields.length > 0;

    if (!hasExistingData) {
      console.log('Loading existing data...');
      this.loadExistingData();
    }

    return Promise.resolve();
  }
  private ensurePageDataLoaded(): Promise<void> {
    // Always load lookup data for pages
    if (this.services.length === 0 || this.flowSteps.length === 0 || this.applicantTypes.length === 0) {
      console.log('Loading page lookup data...');
      return this.loadLookupDataAsync();
    }
    return Promise.resolve();
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
      // Save current form values to cache before switching
      if (this.currentElementId && this.propertiesForm.valid) {
        this.formCache[this.currentElementId] = this.propertiesForm.value;
      }

      // Cancel any pending auto-save from previous element
      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = undefined;
      }

      // Hide auto-save status when switching elements
      this.showAutoSaveStatus = false;

      // Update current element ID
      this.currentElementId = this.selectedElement?.id;

      // If this is a page element, ensure lookup data is loaded first
      if (this.selectedElement?.type === ElementType.PAGE) {
        this.ensurePageDataLoaded().then(() => {
          this.updateFormForElement();
        }).catch(error => {
          console.error('Failed to load data before updating form:', error);
          this.updateFormForElement();
        });
      } else {
        // For non-page elements, update form immediately
        this.updateFormForElement();
      }
    }
  }

  private hasBackendId(element: WorkflowElement): boolean {
    switch (element.type) {
      case ElementType.PAGE:
        return !!element.properties.page_id;
      case ElementType.CATEGORY:
        return !!element.properties.category_id;
      case ElementType.FIELD:
        return !!element.properties._field_id;
      case ElementType.CONDITION:
        return !!element.properties.condition_id;
      default:
        return false;
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
      _default_boolean: [false],
      _max_selections: [''],
      _min_selections: [''],
      _coordinates_format: [false],
      _uuid_format: [false],
      _parent_field: [''],

      // Condition properties
      condition_id: [''],
      target_field: [''],
      target_field_id: [''],
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

    // For fields, ensure field types are loaded first
    if (this.selectedElement.type === ElementType.FIELD && this.fieldTypes.length === 0) {
      console.log('Loading field types before updating form...');
      this.loadLookupDataAsync().then(() => {
        this.continueUpdateFormForElement();
      }).catch(() => {
        // Continue anyway even if loading fails
        this.continueUpdateFormForElement();
      });
    } else {
      this.continueUpdateFormForElement();
    }
  }

  private continueUpdateFormForElement(): void {
    if (!this.selectedElement) return;

    // Check if we have cached values for this element
    const cachedValues = this.formCache[this.selectedElement.id];
    if (cachedValues) {
      console.log('Restoring from cache for element:', this.selectedElement.id);

      // Update validators first
      this.updateValidators();

      // Restore from cache
      setTimeout(() => {
        this.propertiesForm.patchValue(cachedValues);
        this.showAutoSaveStatus = true;
        this.autoSaveStatus = 'saved';
      }, 50);
    } else {
      // Original logic - load from element properties
      const properties = JSON.parse(JSON.stringify(this.selectedElement.properties || {}));

      // Completely reset the form first
      this.propertiesForm.reset();

      // Update validators based on element type BEFORE setting values
      this.updateValidators();

      // Wait for form to fully reset before setting new values
      setTimeout(() => {
        // Set common properties with defaults
        this.propertiesForm.patchValue({
          name: properties.name || '',
          description: properties.description || ''
        });

        // Set element-specific properties
        this.setElementSpecificProperties(properties);

        // Re-enable auto-save status after form is populated
        setTimeout(() => {
          this.showAutoSaveStatus = true;
          this.autoSaveStatus = 'saved';
        }, 200);
      }, 50);
    }
  }

  private setElementSpecificProperties(properties: any): void {
    if (!this.selectedElement) return;

    switch (this.selectedElement.type) {
      case ElementType.PAGE:
        // Log the properties to debug
        console.log('Setting page properties:', properties);

        // Ensure all text fields are initialized even if empty
        const pageDefaults = {
          name: '',
          name_ara: '',
          description: '',
          description_ara: '',
          service: '',
          sequence_number: '',
          applicant_type: ''
        };
        console.log('Available lookups:', {
          services: this.services.length,
          flowSteps: this.flowSteps.length,
          applicantTypes: this.applicantTypes.length
        });

        // The workflow API now provides explicit foreign key fields
        let mappedSequenceNumber: number | string = '';
        let mappedApplicantType: number | string = '';
        let mappedService: number | string = '';

        // Handle sequence_number - prefer explicit ID from workflow API
        if (properties.sequence_number_id !== undefined && properties.sequence_number_id !== null) {
          mappedSequenceNumber = properties.sequence_number_id;
        } else if (properties.sequence_number !== undefined && properties.sequence_number !== null) {
          // Check if it's already a numeric ID
          if (typeof properties.sequence_number === 'number') {
            mappedSequenceNumber = properties.sequence_number;
          } else if (typeof properties.sequence_number === 'string' && /^\d+$/.test(properties.sequence_number) && properties.sequence_number.length > 2) {
            // It's a numeric string ID (not a code like "01")
            mappedSequenceNumber = parseInt(properties.sequence_number, 10);
          } else {
            // Try to find in lookup
            const found = this.findLookupValue(
              this.flowSteps,
              properties.sequence_number,
              properties.sequence_number_code,
              properties.sequence_number_name
            );
            mappedSequenceNumber = found !== null ? found : properties.sequence_number;
          }
        }

        // Handle applicant_type - prefer explicit ID from workflow API
        if (properties.applicant_type_id !== undefined && properties.applicant_type_id !== null) {
          mappedApplicantType = properties.applicant_type_id;
        } else if (properties.applicant_type !== undefined && properties.applicant_type !== null) {
          // Fallback to old format
          if (typeof properties.applicant_type === 'number') {
            mappedApplicantType = properties.applicant_type;
          } else if (typeof properties.applicant_type === 'string' && /^\d+$/.test(properties.applicant_type)) {
            mappedApplicantType = parseInt(properties.applicant_type, 10);
          } else {
            // Try to find in lookup
            const found = this.findLookupValue(
              this.applicantTypes,
              properties.applicant_type,
              properties.applicant_type_code,
              properties.applicant_type_name
            );
            mappedApplicantType = found !== null ? found : properties.applicant_type;
          }
        }

        // Handle service - prefer explicit ID from workflow API
        if (properties.service_id !== undefined && properties.service_id !== null) {
          mappedService = properties.service_id;
        } else if (properties.service !== undefined && properties.service !== null) {
          const found = this.findLookupValue(
            this.services,
            properties.service,
            properties.service_code,
            properties.service_name
          );
          mappedService = found !== null ? found : properties.service;
        }

        console.log('Mapped values:', {
          sequence_number: mappedSequenceNumber,
          applicant_type: mappedApplicantType,
          service: mappedService
        });

        // FIXED: Set form values with ALL properties including text fields
        const formValues = {
          useExisting: false,
          existingPageId: '',
          service: mappedService || properties.service || '',
          sequence_number: mappedSequenceNumber || properties.sequence_number || '',
          applicant_type: mappedApplicantType || properties.applicant_type || '',
          name: properties.name !== undefined ? properties.name : '',
          name_ara: properties.name_ara !== undefined ? properties.name_ara : '',
          description: properties.description !== undefined ? properties.description : '',
          description_ara: properties.description_ara !== undefined ? properties.description_ara : ''
        };

        console.log('Setting form values for page:', formValues);
        this.propertiesForm.patchValue(formValues);

        break;

      case ElementType.CATEGORY:
        this.propertiesForm.patchValue({
          useExisting: properties.useExisting || false,
          existingCategoryId: properties.existingCategoryId || '',
          name: properties.name || '',
          code: properties.code || '',
          name_ara: properties.name_ara || '',
          description: properties.description || '',
          is_repeatable: properties.is_repeatable || false
        });
        break;

      case ElementType.FIELD:
        // Ensure field type is a number for proper comparison
        let fieldTypeValue = properties.field_type_id || properties._field_type || '';

        // Convert to number if it's a string number
        if (fieldTypeValue && typeof fieldTypeValue === 'string' && /^\d+$/.test(fieldTypeValue)) {
          fieldTypeValue = parseInt(fieldTypeValue, 10);
        } else if (typeof fieldTypeValue === 'object' && fieldTypeValue.id) {
          // Handle case where it might be an object
          fieldTypeValue = fieldTypeValue.id;
        }

        console.log('Setting field type value:', fieldTypeValue, 'from properties:', properties);

        this.propertiesForm.patchValue({
          useExisting: properties.useExisting || false,
          existingFieldId: properties.existingFieldId || '',
          _field_name: properties._field_name || '',
          _field_display_name: properties._field_display_name || '',
          _field_display_name_ara: properties._field_display_name_ara || '',
          _field_type: fieldTypeValue,
          _sequence: properties._sequence !== undefined ? properties._sequence : '',
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
          _default_value: properties._default_value || '',
          _default_boolean: properties._default_boolean || false,
          _max_selections: properties._max_selections || '',
          _min_selections: properties._min_selections || '',
          _coordinates_format: properties._coordinates_format || false,
          _uuid_format: properties._uuid_format || false
        });
        break;

      case ElementType.CONDITION:
        this.propertiesForm.patchValue({
          condition_id: properties.condition_id || '',
          target_field: properties.target_field || '',
          target_field_id: properties.target_field_id || '',
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

  // private autoSaveProperties(formValue: any): void {
  //   if (!this.selectedElement) {
  //     console.log('Auto-save cancelled: No element selected');
  //     return;
  //   }
  //
  //   if (!this.propertiesForm.valid) {
  //     console.log('Auto-save cancelled: Form is invalid');
  //     return;
  //   }
  //
  //   const currentElementId = this.selectedElement.id;
  //
  //   if (this.autoSaveTimeout) {
  //     clearTimeout(this.autoSaveTimeout);
  //   }
  //
  //   this.autoSaveStatus = 'saving';
  //   this.showAutoSaveStatus = true;
  //
  //   this.autoSaveTimeout = setTimeout(() => {
  //     if (!this.selectedElement || this.selectedElement.id !== currentElementId) {
  //       console.log('Auto-save cancelled: Element changed during timeout');
  //       return;
  //     }
  //
  //     try {
  //       const cleanedProperties = this.cleanFormValue(formValue);
  //
  //       // Save to backend based on element type
  //       this.saveElementToBackend(this.selectedElement, cleanedProperties).subscribe({
  //         next: (response) => {
  //           console.log('Element saved to backend:', response);
  //
  //           // Update local state
  //           this.elementUpdated.emit({
  //             id: currentElementId,
  //             properties: cleanedProperties
  //           });
  //
  //           this.autoSaveStatus = 'saved';
  //
  //           setTimeout(() => {
  //             this.showAutoSaveStatus = false;
  //           }, 2000);
  //         },
  //         error: (error) => {
  //           console.error('Auto-save error:', error);
  //           this.autoSaveStatus = 'error';
  //           this.snackBar.open('Failed to save changes', 'Retry', { duration: 5000 })
  //             .onAction().subscribe(() => {
  //             this.autoSaveProperties(formValue);
  //           });
  //         }
  //       });
  //
  //     } catch (error) {
  //       console.error('Auto-save error:', error);
  //       this.autoSaveStatus = 'error';
  //     }
  //   }, 500);
  // }

  private saveElementToBackend(element: WorkflowElement, properties: any): Observable<any> {
    switch (element.type) {
      case ElementType.PAGE:
        if (properties.page_id) {
          return this.apiService.updatePage(properties.page_id, this.mapPageProperties(properties));
        } else if (!properties.useExisting) {
          return this.apiService.createPage(this.mapPageProperties(properties)).pipe(
            map(response => {
              // Update the element with the new page_id
              element.properties.page_id = response.id;
              return response;
            })
          );
        }
        break;

      case ElementType.CATEGORY:
        if (properties.category_id) {
          return this.apiService.updateCategory(properties.category_id, this.mapCategoryProperties(properties));
        } else if (!properties.useExisting) {
          return this.apiService.createCategory(this.mapCategoryProperties(properties)).pipe(
            map(response => {
              element.properties.category_id = response.id;
              return response;
            })
          );
        }
        break;

      case ElementType.FIELD:
        if (properties._field_id) {
          return this.apiService.updateField(properties._field_id, this.mapFieldProperties(properties));
        } else if (!properties.useExisting) {
          return this.apiService.createField(this.mapFieldProperties(properties)).pipe(
            map(response => {
              element.properties._field_id = response.id;
              return response;
            })
          );
        }
        break;

      case ElementType.CONDITION:
        if (properties.condition_id) {
          return this.apiService.updateCondition(properties.condition_id, this.mapConditionProperties(properties));
        } else {
          return this.apiService.createCondition(this.mapConditionProperties(properties)).pipe(
            map(response => {
              element.properties.condition_id = response.id;
              return response;
            })
          );
        }
        break;
    }

    // For other element types, just return a mock observable
    return of({ success: true });
  }

  private mapPageProperties(element: WorkflowElement): any {
    const properties = element.properties;

    return {
      name: properties['name'],
      name_ara: properties['name_ara'],
      description: properties['description'],
      description_ara: properties['description_ara'],
      service: this.toNumber(properties['service'] || properties['service_id']),
      sequence_number: this.toNumber(properties['sequence_number'] || properties['sequence_number_id']),
      applicant_type: this.toNumber(properties['applicant_type'] || properties['applicant_type_id']),
      active_ind: properties['active_ind'] !== false,
      position_x: element.position?.x || 0,
      position_y: element.position?.y || 0,
      is_expanded: element.isExpanded || false
    };
  }

  private mapCategoryProperties(properties: any): Partial<Category> {
    const mapped: Partial<Category> = {
      name: properties.name,
      name_ara: properties.name_ara,
      description: properties.description,
      code: properties.code,
      is_repeatable: properties.is_repeatable,
      active_ind: properties.active_ind !== false,
      relative_position_x: properties.position?.x || 0,
      relative_position_y: properties.position?.y || 0
    };

    // Handle page assignment - many-to-many relationship
    const pageIds: number[] = [];

    // Check if page_ids array is already provided
    if (properties.page_ids && Array.isArray(properties.page_ids)) {
      pageIds.push(...properties.page_ids);
    }

    // Also check parent assignment
    if (this.selectedElement?.parentId) {
      const parentPage = this.workflow.elements.find(el => el.id === this.selectedElement!.parentId);
      if (parentPage?.properties.page_id && !pageIds.includes(parentPage.properties.page_id)) {
        pageIds.push(parentPage.properties.page_id);
      }
    }

    if (pageIds.length > 0) {
      mapped.page = pageIds;
    }

    return mapped;
  }

  private mapFieldProperties(properties: any): Partial<Field> {
    // Convert validation properties - handle both underscore and non-underscore versions
    const validationProperties: any = {};
    const validationKeys = [
      'max_length', 'min_length', 'regex_pattern', 'allowed_characters',
      'forbidden_words', 'value_greater_than', 'value_less_than',
      'integer_only', 'positive_only', 'date_greater_than', 'date_less_than',
      'future_only', 'past_only', 'file_types', 'max_file_size',
      'image_max_width', 'image_max_height', 'precision', 'unique',
      'default_value', 'default_boolean', 'max_selections', 'min_selections',
      'coordinates_format', 'uuid_format'
    ];

    validationKeys.forEach(key => {
      const underscoreKey = `_${key}`;
      if (properties[underscoreKey] !== undefined && properties[underscoreKey] !== null && properties[underscoreKey] !== '') {
        validationProperties[underscoreKey] = properties[underscoreKey];
      }
    });

    const mapped: Partial<Field> = {
      _field_name: properties._field_name,
      _field_display_name: properties._field_display_name,
      _field_display_name_ara: properties._field_display_name_ara,
      _field_type: properties.field_type_id || properties._field_type,
      _sequence: properties._sequence,
      _mandatory: properties._mandatory,
      _is_hidden: properties._is_hidden,
      _is_disabled: properties._is_disabled,
      _lookup: properties.lookup_id || properties._lookup,
      active_ind: properties.active_ind !== false,
      relative_position_x: properties.position?.x || 0,
      relative_position_y: properties.position?.y || 0,
      allowed_lookups: properties.allowed_lookups || [],
      ...validationProperties,

      // Validation properties
      _max_length: properties._max_length,
      _min_length: properties._min_length,
      _regex_pattern: properties._regex_pattern,
      _allowed_characters: properties._allowed_characters,
      _forbidden_words: properties._forbidden_words,
      _value_greater_than: properties._value_greater_than,
      _value_less_than: properties._value_less_than,
      _integer_only: properties._integer_only,
      _positive_only: properties._positive_only,
      _date_greater_than: properties._date_greater_than,
      _date_less_than: properties._date_less_than,
      _future_only: properties._future_only,
      _past_only: properties._past_only,
      _file_types: properties._file_types,
      _max_file_size: properties._max_file_size,
      _image_max_width: properties._image_max_width,
      _image_max_height: properties._image_max_height,
      _precision: properties._precision,
      _unique: properties._unique,
      _default_value: properties._default_value,
      _default_boolean: properties._default_boolean,
      _max_selections: properties._max_selections,
      _min_selections: properties._min_selections,
      _coordinates_format: properties._coordinates_format,
      _uuid_format: properties._uuid_format
    };

// Handle category assignment - many-to-many relationship
    const categoryIds: number[] = [];

    // Check if category_ids array is already provided
    if (properties.category_ids && Array.isArray(properties.category_ids)) {
      categoryIds.push(...properties.category_ids);
    }

    // Also check parent assignment
    if (this.selectedElement?.parentId) {
      const parentCategory = this.workflow.elements.find(el => el.id === this.selectedElement!.parentId);
      if (parentCategory?.properties.category_id && !categoryIds.includes(parentCategory.properties.category_id)) {
        categoryIds.push(parentCategory.properties.category_id);
      }
    }

    if (categoryIds.length > 0) {
      mapped._category = categoryIds;
    }

    // Handle service assignment - many-to-many relationship
    if (properties.service_ids && Array.isArray(properties.service_ids)) {
      mapped.service = properties.service_ids;
    } else {
      // Get service from parent page
      const page = this.findParentPage();
      if (page?.properties.service_id) {
        mapped.service = [page.properties.service_id];
      }
    }

    // Handle parent field
    if (properties.parent_field_id || properties._parent_field) {
      mapped._parent_field = properties.parent_field_id || properties._parent_field;
    }

    return mapped;
  }

  private findParentPage(): WorkflowElement | undefined {
    if (!this.selectedElement) return undefined;

    let current = this.selectedElement;
    while (current.parentId) {
      const parent = this.workflow.elements.find(el => el.id === current.parentId);
      if (!parent) break;
      if (parent.type === ElementType.PAGE) return parent;
      current = parent;
    }

    return undefined;
  }

  private mapConditionProperties(properties: any): Partial<Condition> {
    return {
      target_field: properties.target_field_id || 0, // Need to get the actual field ID
      condition_logic: properties.condition_logic || [],
      active_ind: properties.active_ind !== false,
      position_x: properties.position?.x || 0,
      position_y: properties.position?.y || 0
    };
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
        // Always include basic fields regardless of useExisting
        cleaned.name = formValue.name || '';
        cleaned.name_ara = formValue.name_ara || '';
        cleaned.description = formValue.description || '';
        cleaned.description_ara = formValue.description_ara || '';

        if (formValue.useExisting) {
          cleaned.useExisting = true;
          if (formValue.existingPageId) {
            cleaned.existingPageId = formValue.existingPageId;
          }
        }

        // Always include these fields (not just when !useExisting)
        if (formValue.service !== null && formValue.service !== undefined && formValue.service !== '') {
          cleaned.service = formValue.service;
          cleaned.service_id = formValue.service;
        }
        if (formValue.sequence_number !== null && formValue.sequence_number !== undefined && formValue.sequence_number !== '') {
          cleaned.sequence_number = formValue.sequence_number;
          cleaned.sequence_number_id = formValue.sequence_number;
        }
        if (formValue.applicant_type !== null && formValue.applicant_type !== undefined && formValue.applicant_type !== '') {
          cleaned.applicant_type = formValue.applicant_type;
          cleaned.applicant_type_id = formValue.applicant_type;
        }

        // Include the backend ID if it exists
        if (this.selectedElement?.properties.page_id) {
          cleaned.page_id = this.selectedElement.properties.page_id;
        }

        console.log('Cleaned properties for PAGE:', cleaned);
        break;

      case ElementType.CATEGORY:
        // Always include all category fields, not just when creating new
        cleaned.name = formValue.name || '';
        cleaned.name_ara = formValue.name_ara || '';
        cleaned.code = formValue.code || '';
        cleaned.description = formValue.description || '';
        cleaned.is_repeatable = formValue.is_repeatable || false;

        if (formValue.useExisting) {
          cleaned.useExisting = true;
          if (formValue.existingCategoryId) {
            cleaned.existingCategoryId = formValue.existingCategoryId;
          }
        }

        // Include the backend ID if it exists
        if (this.selectedElement?.properties.category_id) {
          cleaned.category_id = this.selectedElement.properties.category_id;
        }

        console.log('Cleaned properties for CATEGORY:', cleaned);
        break;

      case ElementType.FIELD:
        // Always include all field properties that have values
        Object.keys(formValue).forEach(key => {
          if (key.startsWith('_') && formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
            cleaned[key] = formValue[key];
          }
        });

        // Include non-underscore field properties
        cleaned.name = formValue.name || formValue._field_display_name || formValue._field_name || '';

        if (formValue.useExisting) {
          cleaned.useExisting = true;
          if (formValue.existingFieldId) {
            cleaned.existingFieldId = formValue.existingFieldId;
          }
        }

        // Include the backend ID if it exists
        if (this.selectedElement?.properties._field_id) {
          cleaned._field_id = this.selectedElement.properties._field_id;
        }

        break;

      case ElementType.CONDITION:
        ['condition_id', 'target_field', 'target_field_id'].forEach(key => {
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
      // Clear cache for this element
      delete this.formCache[this.selectedElement.id];
      this.updateFormForElement();
      this.snackBar.open('Form reset to saved values', 'Close', { duration: 2000 });
    }
  }
  public clearAllCache(): void {
    this.clearCache();
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
