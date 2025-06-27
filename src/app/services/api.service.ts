// services/api.service.ts - Updated for real service flow API
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap, map, switchMap } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { WorkflowData } from '../models/workflow.models';

// Service Flow API Response Structure
export interface ServiceFlowResponse {
  service_flow: ServiceFlow[] | GroupedServiceFlow[];
}

// Add Condition interface
export interface Condition {
  id?: number;
  target_field: number;
  active_ind: boolean;
  condition_logic: any[];
  workflow?: number;
  position_x?: number;
  position_y?: number;
}

export interface GroupedServiceFlow {
  service_code: string;
  pages: ServiceFlowPage[];
}

export interface ServiceFlow {
  service_code: string;
  pages: ServiceFlowPage[];
}

export interface ServiceFlowField {
  name: string;
  field_id: number;
  display_name: string;
  display_name_ara?: string;
  field_type: string | number | { id: number; name: string; code: string; };
  mandatory: boolean;
  lookup?: number | { id: number; name: string; };
  allowed_lookups: any[];
  sub_fields: any[];
  is_hidden: boolean;
  is_disabled: boolean;
  visibility_conditions: VisibilityCondition[];
  sequence?: number;

  // Explicit foreign key fields from workflow API
  field_type_id?: number;
  field_type_name?: string;
  field_type_code?: string;
  lookup_id?: number;
  lookup_name?: string;
  lookup_code?: string;
  parent_field_id?: number;
  parent_field_name?: string;
  service?: number[];
  services?: number[];
  _category?: number[];
  categories?: number[];
  active_ind?: boolean;

  // Alternative field names (with underscore prefix)
  _field_name?: string;
  _field_display_name?: string;
  _field_display_name_ara?: string;
  _field_type?: string | number;
  _field_id?: number;
  _mandatory?: boolean;
  _is_hidden?: boolean;
  _is_disabled?: boolean;
  _lookup?: number;
  _sequence?: number;

  // Add all validation properties
  max_length?: number;
  min_length?: number;
  regex_pattern?: string;
  allowed_characters?: string;
  forbidden_words?: string;
  value_greater_than?: number;
  value_less_than?: number;
  integer_only?: boolean;
  positive_only?: boolean;
  precision?: number;
  default_boolean?: boolean;
  file_types?: string;
  max_file_size?: number;
  image_max_width?: number;
  image_max_height?: number;
  max_selections?: number;
  min_selections?: number;
  date_greater_than?: string;
  date_less_than?: string;
  future_only?: boolean;
  past_only?: boolean;
  unique?: boolean;
  default_value?: string;
  coordinates_format?: boolean;
  uuid_format?: boolean;

  // Validation properties with underscore prefix
  _max_length?: number;
  _min_length?: number;
  _regex_pattern?: string;
  _allowed_characters?: string;
  _forbidden_words?: string;
  _value_greater_than?: number;
  _value_less_than?: number;
  _integer_only?: boolean;
  _positive_only?: boolean;
  _precision?: number;
  _default_boolean?: boolean;
  _file_types?: string;
  _max_file_size?: number;
  _image_max_width?: number;
  _image_max_height?: number;
  _max_selections?: number;
  _min_selections?: number;
  _date_greater_than?: string;
  _date_less_than?: string;
  _future_only?: boolean;
  _past_only?: boolean;
  _unique?: boolean;
  _default_value?: string;
  _coordinates_format?: boolean;
  _uuid_format?: boolean;
}

export interface ServiceFlowCategory {
  id: number;
  name: string;
  name_ara?: string;
  repeatable: boolean;
  fields: ServiceFlowField[];
  description?: string;
  code?: string;
}

export interface ServiceFlowPage {
  sequence_number: string | { id: number; code: string; name: string; };
  name: string;
  name_ara?: string;
  description?: string;
  description_ara?: string;
  is_hidden_page: boolean;
  page_id: number;
  categories: ServiceFlowCategory[];
  applicant_type?: number | { id: number; name: string; };
  service?: number | { id: number; code: string; name: string; };

  // Explicit foreign key fields from workflow API
  service_id?: number;
  service_code?: string;
  service_name?: string;
  sequence_number_id?: number;
  sequence_number_code?: string;
  sequence_number_name?: string;
  applicant_type_id?: number;
  applicant_type_code?: string;
  applicant_type_name?: string;
  active_ind?: boolean;
}

export interface VisibilityCondition {
  id?: number;
  condition_logic: ConditionLogicItem[];
}

export interface ConditionLogicItem {
  field: string;
  operation: string;
  value: any;
}

// Workflow summary for the selector
export interface ServiceFlowSummary {
  service_code: string;
  service_name?: string;
  page_count: number;
  category_count: number;
  field_count: number;
  last_updated?: string;
  is_active: boolean;
}

// Lookup Response interfaces
export interface LookupResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LookupItem[];
}

export interface LookupItem {
  id: number;
  parent_lookup?: number;
  type: number;
  name: string;
  name_ara: string;
  code: string;
  icon?: string | null;
  active_ind: boolean;
}

export interface PageResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Page[];
}

export interface Page {
  id?: number;
  name: string;
  name_ara?: string;
  description?: string;
  description_ara?: string;
  active_ind: boolean;
  service: number;
  sequence_number: number;
  applicant_type: number;
  workflow?: number;
  position_x?: number;
  position_y?: number;
  is_expanded?: boolean;
}

export interface CategoryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Category[];
}

export interface Category {
  id?: number;
  name: string;
  name_ara?: string;
  page: number[];
  is_repeatable: boolean;
  description?: string;
  code?: string;
  active_ind: boolean;
  workflow?: number;
  relative_position_x?: number;
  relative_position_y?: number;
}

export interface FieldResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Field[];
}

export interface Field {
  id?: number;
  _field_name: string;
  _sequence?: number;
  _field_display_name: string;
  _field_display_name_ara?: string;
  _field_type: number;
  _category: number[];
  service: number[];
  _parent_field?: number | null;
  _lookup?: number | null;
  workflow?: number;
  relative_position_x?: number;
  relative_position_y?: number;
  _max_length?: number;
  _min_length?: number;
  _regex_pattern?: string;
  _allowed_characters?: string;
  _forbidden_words?: string;
  _value_greater_than?: number;
  _value_less_than?: number;
  _integer_only?: boolean;
  _positive_only?: boolean;
  _date_greater_than?: string;
  _date_less_than?: string;
  _future_only?: boolean;
  _past_only?: boolean;
  _default_boolean?: boolean;
  _file_types?: string;
  _max_file_size?: number;
  _image_max_width?: number;
  _image_max_height?: number;
  _max_selections?: number;
  _min_selections?: number;
  _precision?: number;
  _unique?: boolean;
  _default_value?: string;
  _coordinates_format?: boolean;
  _uuid_format?: boolean;
  _is_hidden: boolean;
  _is_disabled: boolean;
  _mandatory: boolean;
  active_ind: boolean;
  allowed_lookups: any[];
}

export interface FieldTypeResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: FieldType[];
}

export interface FieldType {
  id: number;
  name: string;
  name_ara: string;
  code: string;
  active_ind: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  private getApiUrl(endpoint: string, useWorkflowApi: boolean = true): string {
    const baseUrl = this.configService.getBaseUrl();
    if (!baseUrl) {
      throw new Error('Base URL not configured. Please configure the API base URL first.');
    }

    // Remove leading slash if present
    endpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;

    // Handle workflow container endpoints (workflows)
    if (endpoint.startsWith('/dynamic/workflows/')) {
      return `${baseUrl}${endpoint}`;
    }

    // Handle workflow service flow endpoint
    if (endpoint.startsWith('/dynamic/workflow/')) {
      return `${baseUrl}${endpoint}`;
    }

    // Handle legacy dynamic endpoints - convert to dynamic
    if (endpoint.startsWith('/dynamic/')) {
      endpoint = endpoint.replace('/dynamic/', '/dynamic/');
    }

    return `${baseUrl}${endpoint}`;
  }

  private handleError = (error: HttpErrorResponse) => {
    console.error('API Error:', error);

    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = `Bad Request: ${error.error?.detail || error.message}`;
          break;
        case 401:
          errorMessage = 'Unauthorized: Please login again';
          break;
        case 403:
          errorMessage = 'Forbidden: You do not have permission to access this resource';
          break;
        case 404:
          errorMessage = 'Not Found: The requested resource was not found';
          break;
        case 500:
          errorMessage = 'Internal Server Error: Please try again later';
          break;
        default:
          errorMessage = `Server Error (${error.status}): ${error.error?.detail || error.message}`;
      }
    }

    return throwError(() => ({ ...error, message: errorMessage }));
  };

// Service Flow APIs - Using correct endpoint
  getServiceFlows(): Observable<ServiceFlowResponse> {
    return this.http.get<ServiceFlowResponse>(this.getApiUrl('/dynamic/workflow/service_flow/'))
      .pipe(
        tap(response => console.log('Loaded service flows:', response)),
        catchError(this.handleError)
      );
  }


  getServiceFlow(serviceCode: string): Observable<ServiceFlow> {
    return this.getServiceFlows().pipe(
      map(response => {
        // Handle both flat and grouped formats
        let serviceFlows: ServiceFlow[];

        // Check if response is in grouped format
        if (response.service_flow.length > 0 && 'service_code' in response.service_flow[0]) {
          // Grouped format
          serviceFlows = response.service_flow as ServiceFlow[];
        } else {
          // Flat format - need to extract the service code from pages
          const flatResponse = response.service_flow as any[];
          serviceFlows = [{
            service_code: serviceCode,
            pages: flatResponse
          }];
        }

        const serviceFlow = serviceFlows.find(sf => sf.service_code === serviceCode);
        if (!serviceFlow) {
          throw new Error(`Service flow with code ${serviceCode} not found`);
        }
        return serviceFlow;
      }),
      tap(serviceFlow => console.log('Loaded specific service flow:', serviceFlow)),
      catchError(this.handleError)
    );
  }

  // Convert service flows to workflow summaries for the selector
  getServiceFlowSummaries(): Observable<ServiceFlowSummary[]> {
    return this.getServiceFlows().pipe(
      map(response => {
        return response.service_flow.map(sf => ({
          service_code: sf.service_code,
          service_name: this.getServiceName(sf.service_code),
          page_count: sf.pages.length,
          category_count: sf.pages.reduce((sum, page) => sum + page.categories.length, 0),
          field_count: sf.pages.reduce((sum, page) =>
            sum + page.categories.reduce((catSum, cat) => catSum + cat.fields.length, 0), 0),
          last_updated: new Date().toISOString(), // You might want to add this to your API
          is_active: true
        }));
      }),
      tap(summaries => console.log('Service flow summaries:', summaries)),
      catchError(this.handleError)
    );
  }

  // Helper method to get service name from service code
  private getServiceName(serviceCode: string): string {
    const serviceNames: { [key: string]: string } = {
      '01': 'Passport Issuance',
      '02': 'Personal Information Service',
      '03': 'Personal Information Service',
      '04': 'Basic Information Service'
    };
    return serviceNames[serviceCode] || `Service ${serviceCode}`;
  }

  // Convert service flow to workflow data format
  private getServiceIdFromCode(serviceCode: string): Observable<number | undefined> {
    return this.getServices().pipe(
      map(response => {
        const service = response.results.find(s => s.code === serviceCode);
        return service?.id;
      }),
      catchError(() => of(undefined))
    );
  }

  convertServiceFlowToWorkflow(serviceFlow: ServiceFlow): Observable<WorkflowData> {
    // First get the service ID from the service code
    return this.getServiceIdFromCode(serviceFlow.service_code).pipe(
      map(serviceId => {
        const workflowData: WorkflowData = {
          id: serviceFlow.service_code,
          name: `Service Flow - ${this.getServiceName(serviceFlow.service_code)}`,
          description: `Service flow for service ${serviceFlow.service_code}`,
          elements: [],
          connections: [],
          metadata: {
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: '1.0',
            service_code: serviceFlow.service_code,
            service_id: serviceId
          }
        };

        // Add start element
        workflowData.elements.push({
          id: 'start',
          type: 'start' as any,
          position: { x: 100, y: 100 },
          properties: { name: 'Start' },
          connections: []
        });

        let previousElementId = 'start';
        let yPosition = 100;

        // Convert pages to workflow elements
        serviceFlow.pages.forEach((page, pageIndex) => {
          const pageElementId = `page-${page.page_id}`;
          yPosition += 200;

          // Extract IDs from objects if they are objects
          let sequenceNumberId: number | undefined;
          if (page.sequence_number) {
            if (typeof page.sequence_number === 'object' && page.sequence_number.id) {
              sequenceNumberId = Number(page.sequence_number.id);
            } else if (typeof page.sequence_number === 'string' || typeof page.sequence_number === 'number') {
              sequenceNumberId = Number(page.sequence_number);
            }
          }

          let applicantTypeId: number | undefined;
          if (page.applicant_type) {
            if (typeof page.applicant_type === 'object' && page.applicant_type.id) {
              applicantTypeId = Number(page.applicant_type.id);
            } else if (typeof page.applicant_type === 'string' || typeof page.applicant_type === 'number') {
              applicantTypeId = Number(page.applicant_type);
            }
          }

          // Add page element with proper service ID
          workflowData.elements.push({
            id: pageElementId,
            type: 'page' as any,
            position: { x: 100, y: yPosition },
            properties: {
              name: page.name,
              name_ara: page.name_ara,
              description: page.description,
              description_ara: page.description_ara,
              service: serviceId || serviceFlow.service_code, // Use the fetched service ID
              sequence_number: sequenceNumberId || '',
              applicant_type: applicantTypeId || '',
              page_id: page.page_id,
              is_hidden_page: page.is_hidden_page
            },
            connections: []
          });

          // Connect to previous element
          workflowData.connections.push({
            id: `conn-${previousElementId}-${pageElementId}`,
            sourceId: previousElementId,
            targetId: pageElementId
          });

          let xPosition = 300;

          // Convert categories to workflow elements
          page.categories.forEach((category, categoryIndex) => {
            const categoryElementId = `category-${category.id}`;

            workflowData.elements.push({
              id: categoryElementId,
              type: 'category' as any,
              position: { x: xPosition, y: yPosition },
              properties: {
                name: category.name,
                name_ara: category.name_ara,
                category_id: category.id,
                is_repeatable: category.repeatable,
                description: category.description,
                code: category.code
              },
              connections: []
            });

            // Connect category to page
            workflowData.connections.push({
              id: `conn-${pageElementId}-${categoryElementId}`,
              sourceId: pageElementId,
              targetId: categoryElementId
            });

            let fieldYPosition = yPosition + 50;

            // Convert fields to workflow elements
            category.fields.forEach((field, fieldIndex) => {
              const fieldElementId = `field-${field.field_id}`;
              fieldYPosition += 100;

              // Extract field type ID if it's an object
              const fieldTypeId = typeof field.field_type === 'object'
                ? field.field_type.id
                : field.field_type;

              const lookupId = typeof field.lookup === 'object'
                ? field.lookup.id
                : field.lookup;

              workflowData.elements.push({
                id: fieldElementId,
                type: 'field' as any,
                position: { x: xPosition + 200, y: fieldYPosition },
                properties: {
                  name: field.display_name,
                  _field_name: field.name,
                  _field_display_name: field.display_name,
                  _field_display_name_ara: field.display_name_ara,
                  _field_type: fieldTypeId,
                  _field_id: field.field_id,
                  _mandatory: field.mandatory,
                  _is_hidden: field.is_hidden,
                  _is_disabled: field.is_disabled,
                  _lookup: lookupId,
                  _sequence: field.sequence,

                  // Validation properties
                  _max_length: field.max_length,
                  _min_length: field.min_length,
                  _regex_pattern: field.regex_pattern,
                  _allowed_characters: field.allowed_characters,
                  _forbidden_words: field.forbidden_words,
                  _value_greater_than: field.value_greater_than,
                  _value_less_than: field.value_less_than,
                  _integer_only: field.integer_only,
                  _positive_only: field.positive_only,
                  _precision: field.precision,
                  _default_boolean: field.default_boolean,
                  _file_types: field.file_types,
                  _max_file_size: field.max_file_size,
                  _image_max_width: field.image_max_width,
                  _image_max_height: field.image_max_height,
                  _max_selections: field.max_selections,
                  _min_selections: field.min_selections,
                  _date_greater_than: field.date_greater_than,
                  _date_less_than: field.date_less_than,
                  _future_only: field.future_only,
                  _past_only: field.past_only,
                  _unique: field.unique,
                  _default_value: field.default_value,
                  _coordinates_format: field.coordinates_format,
                  _uuid_format: field.uuid_format,

                  allowed_lookups: field.allowed_lookups
                },
                connections: []
              });

              // Connect field to category
              workflowData.connections.push({
                id: `conn-${categoryElementId}-${fieldElementId}`,
                sourceId: categoryElementId,
                targetId: fieldElementId
              });

              // Add visibility conditions as condition elements
              if (field.visibility_conditions && field.visibility_conditions.length > 0) {
                field.visibility_conditions.forEach((condition, conditionIndex) => {
                  const conditionElementId = `condition-${field.field_id}-${conditionIndex}`;

                  workflowData.elements.push({
                    id: conditionElementId,
                    type: 'condition' as any,
                    position: { x: xPosition + 400, y: fieldYPosition + (conditionIndex * 80) },
                    properties: {
                      name: `Visibility Condition for ${field.display_name}`,
                      target_field: field.name,
                      target_field_id: field.field_id,
                      condition_logic: condition.condition_logic,
                      condition_id: condition.id
                    },
                    connections: []
                  });

                  // Connect condition to field
                  workflowData.connections.push({
                    id: `conn-${fieldElementId}-${conditionElementId}`,
                    sourceId: fieldElementId,
                    targetId: conditionElementId
                  });
                });
              }
            });

            xPosition += 300;
          });

          previousElementId = pageElementId;
        });

        // Add end element
        const endElementId = 'end';
        yPosition += 200;

        workflowData.elements.push({
          id: endElementId,
          type: 'end' as any,
          position: { x: 100, y: yPosition },
          properties: {
            name: 'End',
            action: 'submit'
          },
          connections: []
        });

        // Connect last page to end
        if (previousElementId !== 'start') {
          workflowData.connections.push({
            id: `conn-${previousElementId}-${endElementId}`,
            sourceId: previousElementId,
            targetId: endElementId
          });
        }

        return workflowData;
      })
    );
  }

  // Lookup APIs
  getLookups(name: string): Observable<LookupResponse> {
    const params = new HttpParams().set('name', name);
    return this.http.get<LookupResponse>(this.getApiUrl('/lookups/'), { params })
      .pipe(
        tap(response => console.log(`Loaded ${name} lookups:`, response)),
        catchError(this.handleError)
      );
  }

  // Service lookup
  getServices(): Observable<LookupResponse> {
    return this.getLookups('Service');
  }

  // Flow Step lookup - handle gracefully if not available
  getFlowSteps(): Observable<LookupResponse> {
    return this.getLookups('Flow Step').pipe(
      catchError((error) => {
        console.warn('Flow Step lookup not available:', error);
        // Return empty result
        return of({
          count: 0,
          next: null,
          previous: null,
          results: []
        });
      })
    );
  }

  // Applicant Type lookup - handle different possible names
  getApplicantTypes(): Observable<LookupResponse> {
    return this.getLookups('Service Applicant Type').pipe(
      catchError((error) => {
        console.warn('Service Applicant Type lookup failed, trying Applicant Type:', error);
        // Fallback to "Applicant Type" if "Service Applicant Type" fails
        return this.getLookups('Applicant Type');
      })
    );
  }

// Field Type APIs - Using correct endpoint
  getFieldTypes(): Observable<FieldTypeResponse> {
    return this.http.get<FieldTypeResponse>(this.getApiUrl('/dynamic/workflow/api/v1/field-types/'))
      .pipe(
        tap(response => console.log('Loaded field types:', response)),
        catchError(this.handleError)
      );
  }

// Page APIs - Using correct endpoints
  getPages(): Observable<PageResponse> {
    return this.http.get<PageResponse>(this.getApiUrl('/dynamic/workflow/api/v1/pages/'))
      .pipe(
        tap(response => console.log('Loaded pages:', response)),
        catchError(this.handleError)
      );
  }

// Category APIs - Using correct endpoints
  getCategories(): Observable<CategoryResponse> {
    return this.http.get<CategoryResponse>(this.getApiUrl('/dynamic/workflow/api/v1/categories/'))
      .pipe(
        tap(response => console.log('Loaded categories:', response)),
        catchError(this.handleError)
      );
  }

// Field APIs - Using correct endpoints
  getFields(): Observable<FieldResponse> {
    return this.http.get<FieldResponse>(this.getApiUrl('/dynamic/workflow/api/v1/fields/'))
      .pipe(
        tap(response => console.log('Loaded fields:', response)),
        catchError(this.handleError)
      );
  }


  // Utility methods
  isConfigured(): boolean {
    return this.configService.isConfigured();
  }

  getBaseUrl(): string {
    return this.configService.getBaseUrl();
  }

  // Test connection method
  testConnection(): Observable<any> {
    return this.http.get(this.getApiUrl('/'))
      .pipe(
        tap(response => console.log('Connection test successful:', response)),
        catchError(this.handleError)
      );
  }

  createPage(page: Partial<Page>): Observable<Page> {
    // Ensure numeric fields are properly typed
    const payload = {
      ...page,
      service: page.service ? this.toNumber(page.service) : null,
      sequence_number: page.sequence_number ? this.toNumber(page.sequence_number) : null,
      applicant_type: page.applicant_type ? this.toNumber(page.applicant_type) : null,
      position_x: page.position_x || 0,
      position_y: page.position_y || 0,
      active_ind: page.active_ind !== false
    };

    return this.http.post<Page>(this.getApiUrl('/dynamic/workflow/api/v1/pages/'), payload)
      .pipe(
        tap(response => console.log('Page created:', response)),
        catchError(this.handleError)
      );
  }

// Add helper method if not exists
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

  updatePage(id: number | null | undefined, page: Partial<Page>): Observable<Page> {
    if (!id) {
      return throwError(() => new Error('Page ID is required'));
    }
    return this.http.patch<Page>(this.getApiUrl(`/dynamic/workflow/api/v1/pages/${id}/`), page)
      .pipe(
        tap(response => console.log('Page updated:', response)),
        catchError(this.handleError)
      );
  }

  deletePage(id: number): Observable<void> {
    return this.http.delete<void>(this.getApiUrl(`/dynamic/workflow/api/v1/pages/${id}/`))
      .pipe(
        tap(() => console.log('Page deleted:', id)),
        catchError(this.handleError)
      );
  }


  // CATEGORY CRUD Operations
  createCategory(category: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(this.getApiUrl('/dynamic/workflow/api/v1/categories/'), category)
      .pipe(
        tap(response => console.log('Category created:', response)),
        catchError(this.handleError)
      );
  }

  updateCategory(id: number, category: Partial<Category>): Observable<Category> {
    return this.http.patch<Category>(this.getApiUrl(`/dynamic/workflow/api/v1/categories/${id}/`), category)
      .pipe(
        tap(response => console.log('Category updated:', response)),
        catchError(this.handleError)
      );
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(this.getApiUrl(`/dynamic/workflow/api/v1/categories/${id}/`))
      .pipe(
        tap(() => console.log('Category deleted:', id)),
        catchError(this.handleError)
      );
  }

  addPagesToCategory(categoryId: number, pageIds: number[]): Observable<Category> {
    return this.http.post<Category>(
      this.getApiUrl(`/dynamic/workflow/api/v1/categories/${categoryId}/add_pages/`),
      { page_ids: pageIds }
    ).pipe(
      tap(response => console.log('Pages added to category:', response)),
      catchError(this.handleError)
    );
  }

// FIELD CRUD Operations
  createField(field: Partial<Field>): Observable<Field> {
    return this.http.post<Field>(this.getApiUrl('/dynamic/workflow/api/v1/fields/'), field)
      .pipe(
        tap(response => console.log('Field created:', response)),
        catchError(this.handleError)
      );
  }

  updateField(id: number, field: Partial<Field>): Observable<Field> {
    return this.http.patch<Field>(this.getApiUrl(`/dynamic/workflow/api/v1/fields/${id}/`), field)
      .pipe(
        tap(response => console.log('Field updated:', response)),
        catchError(this.handleError)
      );
  }

  deleteField(id: number): Observable<void> {
    return this.http.delete<void>(this.getApiUrl(`/dynamic/workflow/api/v1/fields/${id}/`))
      .pipe(
        tap(() => console.log('Field deleted:', id)),
        catchError(this.handleError)
      );
  }

// CONDITION CRUD Operations
  createCondition(condition: Partial<Condition>): Observable<Condition> {
    return this.http.post<Condition>(this.getApiUrl('/dynamic/workflow/api/v1/conditions/'), condition)
      .pipe(
        tap(response => console.log('Condition created:', response)),
        catchError(this.handleError)
      );
  }

  updateCondition(id: number, condition: Partial<Condition>): Observable<Condition> {
    return this.http.patch<Condition>(this.getApiUrl(`/dynamic/workflow/api/v1/conditions/${id}/`), condition)
      .pipe(
        tap(response => console.log('Condition updated:', response)),
        catchError(this.handleError)
      );
  }

  deleteCondition(id: number): Observable<void> {
    return this.http.delete<void>(this.getApiUrl(`/dynamic/workflow/api/v1/conditions/${id}/`))
      .pipe(
        tap(() => console.log('Condition deleted:', id)),
        catchError(this.handleError)
      );
  }
  // Bulk operations
  bulkUpdateFields(fieldIds: number[], action: string): Observable<any> {
    return this.http.post(this.getApiUrl('/dynamic/api/v1/fields/bulk_update/'), {
      field_ids: fieldIds,
      action: action
    }).pipe(
      tap(response => console.log('Bulk update completed:', response)),
      catchError(this.handleError)
    );
  }

  // Additional operations
  duplicateField(fieldId: number, newName: string): Observable<Field> {
    return this.http.post<Field>(
      this.getApiUrl(`/dynamic/api/v1/fields/${fieldId}/duplicate/`),
      { _field_name: newName }
    ).pipe(
      tap(response => console.log('Field duplicated:', response)),
      catchError(this.handleError)
    );
  }

  validateField(fieldId: number, value: any): Observable<any> {
    const params = new HttpParams().set('value', value);
    return this.http.get(this.getApiUrl(`/dynamic/api/v1/fields/${fieldId}/validate_field/`), { params })
      .pipe(
        tap(response => console.log('Field validation result:', response)),
        catchError(this.handleError)
      );
  }

  testCondition(conditionId: number, fieldData: any): Observable<any> {
    return this.http.post(
      this.getApiUrl(`/dynamic/api/v1/conditions/${conditionId}/test_condition/`),
      { field_data: fieldData }
    ).pipe(
      tap(response => console.log('Condition test result:', response)),
      catchError(this.handleError)
    );
  }

  // WORKFLOW CRUD Operations
  createWorkflow(workflow: any): Observable<any> {
    const payload: any = {
      name: workflow.name || 'Untitled Workflow',
      description: workflow.description || '',
      is_active: workflow.is_active !== false,
      is_draft: workflow.is_draft !== false,
      version: workflow.version || 1,
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'user', // Add actual user if available
        ...(workflow.metadata || {})
      },
      canvas_state: {
        zoom: 1,
        panX: 100,
        panY: 100,
        viewMode: 'collapsed',
        ...(workflow.canvas_state || {})
      }
    };

    // Add service-related fields with proper type conversion
    if (workflow.service_id !== undefined && workflow.service_id !== null) {
      payload.service = typeof workflow.service_id === 'string' ? parseInt(workflow.service_id, 10) : workflow.service_id;
    }
    if (workflow.service_code) {
      payload.service_code = workflow.service_code;
    }

    // Add elements and connections if provided
    if (workflow.elements) {
      payload.elements = workflow.elements;
    }
    if (workflow.connections) {
      payload.connections = workflow.connections;
    }

    console.log('Creating workflow with payload:', payload);

    return this.http.post(this.getApiUrl('/dynamic/workflows/'), payload)
      .pipe(
        tap(response => console.log('Workflow created:', response)),
        catchError(this.handleError)
      );
  }
  updateWorkflow(workflowId: string, workflow: any): Observable<any> {
    const payload = {
      name: workflow.name,
      description: workflow.description,
      service_id: workflow.service_id,
      service_code: workflow.service_code,
      metadata: workflow.metadata,
      is_active: workflow.is_active !== false
    };

    return this.http.patch(this.getApiUrl(`/dynamic/workflows/${workflowId}/`), payload)
      .pipe(
        tap(response => console.log('Workflow updated:', response)),
        catchError(this.handleError)
      );
  }

  deleteWorkflow(workflowId: string): Observable<void> {
    return this.http.delete<void>(this.getApiUrl(`/dynamic/workflows/${workflowId}/`))
      .pipe(
        tap(() => console.log('Workflow deleted:', workflowId)),
        catchError(this.handleError)
      );
  }

  getWorkflows(params?: any): Observable<any> {
    const httpParams = new HttpParams({ fromObject: params || {} });
    return this.http.get(this.getApiUrl('/dynamic/workflows/'), { params: httpParams })
      .pipe(
        tap(response => console.log('Loaded workflows:', response)),
        catchError(this.handleError)
      );
  }

  getWorkflow(workflowId: string): Observable<any> {
    console.log('Getting workflow with ID:', workflowId); // Add debug log
    return this.http.get(this.getApiUrl(`/dynamic/workflows/${workflowId}/`))
      .pipe(
        tap(response => console.log('Loaded workflow:', response)),
        catchError(this.handleError)
      );
  }

// Export workflow as service flow format
  exportWorkflow(workflowId: string): Observable<ServiceFlow> {
    return this.http.get<ServiceFlow>(this.getApiUrl(`/dynamic/workflows/${workflowId}/export/`))
      .pipe(
        tap(response => console.log('Exported workflow:', response)),
        catchError(this.handleError)
      );
  }

// Import service flow to workflow
  importWorkflow(serviceFlow: ServiceFlow): Observable<any> {
    return this.http.post(this.getApiUrl('/dynamic/workflows/import/'), serviceFlow)
      .pipe(
        tap(response => console.log('Imported workflow:', response)),
        catchError(this.handleError)
      );
  }

// Save complete workflow in a single transaction
  saveCompleteWorkflow(workflowId: string, data: any): Observable<any> {
    // Ensure all data is properly formatted before sending
    const cleanedData = {
      ...data,
      workflow_id: workflowId,
      elements: data.elements.map((element: any) => ({
        ...element,
        // Ensure frontend_id is preserved for mapping
        frontend_id: element.id,
        // Add backend_id if available
        backend_id: this.getBackendId(element),
        // Ensure all position data is included
        position_x: element.position_x || element.position?.x || 0,
        position_y: element.position_y || element.position?.y || 0,
        relative_position_x: element.relative_position_x !== undefined ? element.relative_position_x : (element.parentId ? (element.position?.x || 0) : null),
        relative_position_y: element.relative_position_y !== undefined ? element.relative_position_y : (element.parentId ? (element.position?.y || 0) : null),
        is_expanded: element.is_expanded || element.isExpanded || false,
        parent_id: element.parent_id || element.parentId || null,
        children: element.children || [],
        type: element.type,
        properties: this.cleanElementProperties(element)
      })),
      connections: data.connections.map((conn: any) => ({
        ...conn,
        frontend_id: conn.id,
        source_id: conn.source_id || conn.sourceId,
        target_id: conn.target_id || conn.targetId,
        source_port: conn.source_port || conn.sourcePort || null,
        target_port: conn.target_port || conn.targetPort || null,
        connection_metadata: {
          ...(conn.connection_metadata || {}),
          frontend_source_id: conn.sourceId,
          frontend_target_id: conn.targetId
        }
      })),
      canvas_state: {
        zoom: data.canvas_state?.zoom || 1,
        panX: data.canvas_state?.panX || 0,
        panY: data.canvas_state?.panY || 0,
        viewMode: data.canvas_state?.viewMode || 'collapsed',
        expandedElementId: data.canvas_state?.expandedElementId || null,
        selectedElementId: data.canvas_state?.selectedElementId || null,
        canvasSize: data.canvas_state?.canvasSize || { width: 5000, height: 5000 }
      },
      deleted_elements: data.deleted_elements || {
        pages: [],
        categories: [],
        fields: [],
        conditions: []
      }
    };

    console.log('Saving complete workflow with cleaned data:', cleanedData);
    console.log('Elements being sent:', cleanedData.elements);

    return this.http.post<any>(
      this.getApiUrl(`/dynamic/workflows/${workflowId}/save_complete_workflow/`),
      cleanedData
    ).pipe(
      tap(response => console.log('Complete workflow saved response:', response)),
      map((response: any) => {
        // Ensure response has the expected structure
        if (!response.elements || !response.connections) {
          console.warn('Response missing elements or connections, using sent data');
          return {
            ...response,
            elements: data.elements || [],
            connections: data.connections || []
          };
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  private getBackendId(element: any): number | string | null {
    if (!element) return null;

    switch (element.type) {
      case 'start':
        return 'start';
      case 'end':
        return 'end';
      case 'page':
        return element.properties?.page_id || null;
      case 'category':
        return element.properties?.category_id || null;
      case 'field':
        return element.properties?._field_id || null;
      case 'condition':
        return element.properties?.condition_id || null;
      default:
        return null;
    }
  }

  private cleanElementProperties(element: any): any {
    const props = { ...(element.properties || {}) };

    console.log('Properties before cleaning:', props);

    // FIXED: Ensure text fields are included
    const textFields = [
      'name', 'name_ara', 'description', 'description_ara',
      'code', '_field_name', '_field_display_name', '_field_display_name_ara',
      '_regex_pattern', '_allowed_characters', '_forbidden_words',
      '_file_types', '_default_value', 'target_field', 'action'
    ];

    textFields.forEach(field => {
      if (props[field] !== undefined) {
        // Keep the value as is, including empty strings
        // Don't skip null values - convert them to empty strings for text fields
        props[field] = props[field] === null ? '' : props[field];
      }
    });

    // Convert string numbers to actual numbers
    const numericFields = [
      'page_id', 'category_id', '_field_id', 'condition_id',
      'service', 'service_id', 'sequence_number', 'sequence_number_id',
      'applicant_type', 'applicant_type_id', '_field_type', 'field_type_id',
      '_lookup', 'lookup_id', 'parent_field_id', '_parent_field',
      '_sequence', '_max_length', '_min_length', '_value_greater_than',
      '_value_less_than', '_max_file_size', '_image_max_width',
      '_image_max_height', '_precision', '_max_selections', '_min_selections',
      'target_field_id'
    ];

    numericFields.forEach(field => {
      if (props[field] !== undefined && props[field] !== null && props[field] !== '') {
        if (typeof props[field] === 'string' && /^\d+$/.test(props[field])) {
          props[field] = parseInt(props[field], 10);
        }
      }
    });

    // Ensure boolean fields are boolean
    const booleanFields = [
      '_mandatory', '_is_hidden', '_is_disabled', 'is_repeatable',
      '_integer_only', '_positive_only', '_future_only', '_past_only',
      '_default_boolean', '_unique', '_coordinates_format', '_uuid_format',
      'is_hidden_page', 'active_ind'
    ];

    booleanFields.forEach(field => {
      if (props[field] !== undefined) {
        props[field] = props[field] === true || props[field] === 'true' || props[field] === 1;
      }
    });

    // Ensure array fields are arrays
    const arrayFields = [
      'page_ids', 'category_ids', 'service_ids', 'allowed_lookups',
      '_category', 'service', 'page'
    ];

    arrayFields.forEach(field => {
      if (props[field] !== undefined) {
        if (!Array.isArray(props[field])) {
          props[field] = props[field] ? [props[field]] : [];
        }
        // Convert array elements to numbers if they are numeric strings
        props[field] = props[field]
          .filter((val: any) => val !== null && val !== undefined && val !== '')
          .map((val: any) => {
            if (typeof val === 'string' && /^\d+$/.test(val)) {
              return parseInt(val, 10);
            }
            return val;
          });

        // Remove the field if it's an empty array and it's an ID field
        if (props[field].length === 0 && (field === 'id' || field.endsWith('_id'))) {
          delete props[field];
        }
      }
    });

    // Handle single ID fields that might be arrays
    const singleIdFields = [
      'page_id', 'category_id', '_field_id', 'condition_id',
      'service_id', 'sequence_number_id', 'applicant_type_id',
      'field_type_id', 'lookup_id', 'parent_field_id', 'target_field_id'
    ];

    singleIdFields.forEach(field => {
      if (props[field] !== undefined) {
        if (Array.isArray(props[field])) {
          // If it's an array, take the first valid value
          const validValues = props[field].filter((val: any) =>
            val !== null && val !== undefined && val !== ''
          );
          if (validValues.length > 0) {
            props[field] = typeof validValues[0] === 'string' && /^\d+$/.test(validValues[0])
              ? parseInt(validValues[0], 10)
              : validValues[0];
          } else {
            delete props[field];
          }
        } else if (props[field] === '' || props[field] === null) {
          delete props[field];
        } else if (typeof props[field] === 'string' && /^\d+$/.test(props[field])) {
          props[field] = parseInt(props[field], 10);
        }
      }
    });

    // Never send 'id' field for elements
    if ('id' in props) {
      delete props.id;
    }

    // Add active_ind if not present
    if (props.active_ind === undefined) {
      props.active_ind = true;
    }

    console.log('Properties after cleaning:', props);

    return props;
  }
// Clone workflow
  cloneWorkflow(workflowId: string, data: any): Observable<any> {
    return this.http.post(
      this.getApiUrl(`/dynamic/workflows/${workflowId}/clone/`),
      data
    ).pipe(
      tap(response => console.log('Workflow cloned:', response)),
      catchError(this.handleError)
    );
  }


  // Import service flow to create workflow
  importServiceFlowAsWorkflow(serviceFlow: ServiceFlow, workflowName: string): Observable<any> {
    const payload = {
      workflow_name: workflowName,
      description: `Imported from service flow ${serviceFlow.service_code}`,
      service_flow: serviceFlow
    };

    return this.http.post(this.getApiUrl('/dynamic/workflows/import_service_flow/'), payload)
      .pipe(
        tap(response => console.log('Service flow imported as workflow:', response)),
        catchError(this.handleError)
      );
  }

// Activate workflow
  activateWorkflow(workflowId: string, deactivateOthers: boolean = false): Observable<any> {
    return this.http.post(
      this.getApiUrl(`/dynamic/workflows/${workflowId}/activate/`),
      { deactivate_others: deactivateOthers }
    ).pipe(
      tap(response => console.log('Workflow activated:', response)),
      catchError(this.handleError)
    );
  }

// Deactivate workflow
  deactivateWorkflow(workflowId: string): Observable<any> {
    return this.http.post(
      this.getApiUrl(`/dynamic/workflows/${workflowId}/deactivate/`),
      {}
    ).pipe(
      tap(response => console.log('Workflow deactivated:', response)),
      catchError(this.handleError)
    );
  }

// Get workflow statistics
  getWorkflowStatistics(): Observable<any> {
    return this.http.get(this.getApiUrl('/dynamic/workflows/statistics/'))
      .pipe(
        tap(response => console.log('Workflow statistics:', response)),
        catchError(this.handleError)
      );
  }

// Validate workflow
  validateWorkflow(workflowId: string): Observable<any> {
    return this.http.get(this.getApiUrl(`/dynamic/workflows/${workflowId}/validate/`))
      .pipe(
        tap(response => console.log('Workflow validation:', response)),
        catchError(this.handleError)
      );
  }

// Check for duplicate fields
  checkDuplicateFields(workflowId: string): Observable<any> {
    return this.http.post(
      this.getApiUrl(`/dynamic/workflows/${workflowId}/duplicate_check/`),
      {}
    ).pipe(
      tap(response => console.log('Duplicate check result:', response)),
      catchError(this.handleError)
    );
  }

// Preview workflow structure
  previewWorkflow(workflowId: string): Observable<any> {
    return this.http.get(this.getApiUrl(`/dynamic/workflows/${workflowId}/preview/`))
      .pipe(
        tap(response => console.log('Workflow preview:', response)),
        catchError(this.handleError)
      );
  }
  // Load service flow and create/update workflow
  loadServiceFlowAsWorkflow(serviceCode: string, workflowName?: string): Observable<any> {
    return this.getServiceFlow(serviceCode).pipe(
      switchMap(serviceFlow => {
        // Check if a workflow already exists for this service
        return this.getWorkflows({ service_code: serviceCode }).pipe(
          switchMap(response => {
            const existingWorkflows = response.results || [];

            if (existingWorkflows.length > 0) {
              // Update existing workflow
              const workflow = existingWorkflows[0];
              return this.updateWorkflowFromServiceFlow(workflow.id, serviceFlow);
            } else {
              // Create new workflow
              return this.createWorkflowFromServiceFlow(serviceFlow, workflowName);
            }
          })
        );
      })
    );
  }

  // FORM UTILITY APIs
  getFormSchema(pageId: number): Observable<any> {
    return this.http.get(this.getApiUrl(`/dynamic/api/v1/form-schema/${pageId}/`))
      .pipe(
        tap(response => console.log('Form schema loaded:', response)),
        catchError(this.handleError)
      );
  }

  submitForm(pageId: number, formData: any): Observable<any> {
    return this.http.post(
      this.getApiUrl(`/dynamic/api/v1/form-submission/${pageId}/`),
      { form_data: formData }
    ).pipe(
      tap(response => console.log('Form submission result:', response)),
      catchError(this.handleError)
    );
  }

  validateSingleField(fieldId: number, value: any): Observable<any> {
    return this.http.post(
      this.getApiUrl(`/dynamic/api/v1/field-validation/${fieldId}/`),
      { value }
    ).pipe(
      tap(response => console.log('Field validation result:', response)),
      catchError(this.handleError)
    );
  }

  getFormStatistics(): Observable<any> {
    return this.http.get(this.getApiUrl('/dynamic/api/v1/form-statistics/'))
      .pipe(
        tap(response => console.log('Form statistics:', response)),
        catchError(this.handleError)
      );
  }

  exportFormConfiguration(pageId: number): Observable<any> {
    return this.http.get(this.getApiUrl(`/dynamic/api/v1/form-export/${pageId}/`))
      .pipe(
        tap(response => console.log('Form configuration exported:', response)),
        catchError(this.handleError)
      );
  }

  importFormConfiguration(formConfig: any): Observable<any> {
    return this.http.post(
      this.getApiUrl('/dynamic/api/v1/form-import/'),
      { form_config: formConfig }
    ).pipe(
      tap(response => console.log('Form configuration imported:', response)),
      catchError(this.handleError)
    );
  }

  private createWorkflowFromServiceFlow(serviceFlow: ServiceFlow, workflowName?: string): Observable<any> {
    // First create the workflow container
    const workflowData = {
      name: workflowName || `Service Flow - ${serviceFlow.service_code}`,
      service_code: serviceFlow.service_code,
      is_draft: false,
      metadata: {
        imported_from: 'service_flow',
        import_date: new Date().toISOString()
      }
    };

    return this.createWorkflow(workflowData).pipe(
      switchMap(workflow => {
        // Then save all elements
        const completeData = this.convertServiceFlowToWorkflowData(serviceFlow, workflow.id);
        return this.saveCompleteWorkflow(workflow.id, completeData);
      })
    );
  }

  private updateWorkflowFromServiceFlow(workflowId: string, serviceFlow: ServiceFlow): Observable<any> {
    const completeData = this.convertServiceFlowToWorkflowData(serviceFlow, workflowId);
    return this.saveCompleteWorkflow(workflowId, completeData);
  }

  private convertServiceFlowToWorkflowData(serviceFlow: ServiceFlow, workflowId: string): any {
    const elements: any[] = [];
    const connections: any[] = [];

    // Add start element
    elements.push({
      id: 'start',
      type: 'start',
      position: { x: 100, y: 100 },
      properties: { name: 'Start' }
    });

    let previousId = 'start';
    let xPosition = 350;

    // Convert pages
    serviceFlow.pages.forEach((page, pageIndex) => {
      const pageId = `page-${page.page_id || pageIndex}`;

      elements.push({
        id: pageId,
        type: 'page',
        position: { x: xPosition, y: 100 },
        properties: {
          ...page,
          page_id: page.page_id
        }
      });

      // Connect to previous
      connections.push({
        sourceId: previousId,
        targetId: pageId
      });

      // Add categories and fields as children
      if (page.categories) {
        page.categories.forEach((category, catIndex) => {
          const categoryId = `category-${category.id || catIndex}`;

          elements.push({
            id: categoryId,
            type: 'category',
            parentId: pageId,
            position: { x: 0, y: 0 },
            properties: {
              ...category,
              category_id: category.id
            }
          });

          if (category.fields) {
            category.fields.forEach((field, fieldIndex) => {
              const fieldId = `field-${field.field_id || fieldIndex}`;

              elements.push({
                id: fieldId,
                type: 'field',
                parentId: categoryId,
                position: { x: 0, y: 0 },
                properties: {
                  ...field,
                  _field_id: field.field_id
                }
              });
            });
          }
        });
      }

      previousId = pageId;
      xPosition += 300;
    });

    // Add end element
    elements.push({
      id: 'end',
      type: 'end',
      position: { x: xPosition, y: 100 },
      properties: { name: 'End', action: 'submit' }
    });

    connections.push({
      sourceId: previousId,
      targetId: 'end'
    });

    return {
      elements,
      connections,
      canvas_state: {
        zoom: 1,
        panX: 100,
        panY: 100
      }
    };
  }
}
