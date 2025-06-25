// services/api.service.ts - Updated for real service flow API
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import {Observable, of, throwError} from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
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
}



export interface VisibilityCondition {
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

// ... existing interfaces for other APIs (LookupResponse, etc.) remain the same ...

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  private getApiUrl(endpoint: string): string {
    const baseUrl = this.configService.getBaseUrl();
    if (!baseUrl) {
      throw new Error('Base URL not configured. Please configure the API base URL first.');
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

  // Service Flow APIs
  getServiceFlows(): Observable<ServiceFlowResponse> {
    return this.http.get<ServiceFlowResponse>(this.getApiUrl('/dynamic/service_flow/'))
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
          const sequenceNumberId = typeof page.sequence_number === 'object'
            ? page.sequence_number.id
            : page.sequence_number;

          const applicantTypeId = typeof page.applicant_type === 'object'
            ? page.applicant_type.id
            : page.applicant_type;

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
              sequence_number: sequenceNumberId,
              applicant_type: applicantTypeId,
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
  // ... existing methods for other APIs (getLookups, getPages, etc.) remain the same ...

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

  // Flow Step lookup
  getFlowSteps(): Observable<LookupResponse> {
    return this.getLookups('Flow Step');
  }

  // Applicant Type lookup
  getApplicantTypes(): Observable<LookupResponse> {
    return this.getLookups('Applicant Type');
  }

  // Field Type APIs
  getFieldTypes(): Observable<FieldTypeResponse> {
    return this.http.get<FieldTypeResponse>(this.getApiUrl('/define/api/field-types/'))
      .pipe(
        tap(response => console.log('Loaded field types:', response)),
        catchError(this.handleError)
      );
  }

  // Page APIs
  getPages(): Observable<PageResponse> {
    return this.http.get<PageResponse>(this.getApiUrl('/define/api/pages/'))
      .pipe(
        tap(response => console.log('Loaded pages:', response)),
        catchError(this.handleError)
      );
  }

  // Category APIs
  getCategories(): Observable<CategoryResponse> {
    return this.http.get<CategoryResponse>(this.getApiUrl('/define/api/categories/'))
      .pipe(
        tap(response => console.log('Loaded categories:', response)),
        catchError(this.handleError)
      );
  }

  // Field APIs
  getFields(): Observable<FieldResponse> {
    return this.http.get<FieldResponse>(this.getApiUrl('/define/api/fields/'))
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
  // PAGE CRUD Operations
  createPage(page: Partial<Page>): Observable<Page> {
    return this.http.post<Page>(this.getApiUrl('/define/api/pages/'), page)
      .pipe(
        tap(response => console.log('Page created:', response)),
        catchError(this.handleError)
      );
  }

  updatePage(id: number, page: Partial<Page>): Observable<Page> {
    return this.http.patch<Page>(this.getApiUrl(`/define/api/pages/${id}/`), page)
      .pipe(
        tap(response => console.log('Page updated:', response)),
        catchError(this.handleError)
      );
  }

  deletePage(id: number): Observable<void> {
    return this.http.delete<void>(this.getApiUrl(`/define/api/pages/${id}/`))
      .pipe(
        tap(() => console.log('Page deleted:', id)),
        catchError(this.handleError)
      );
  }

  // CATEGORY CRUD Operations
  createCategory(category: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(this.getApiUrl('/define/api/categories/'), category)
      .pipe(
        tap(response => console.log('Category created:', response)),
        catchError(this.handleError)
      );
  }

  updateCategory(id: number, category: Partial<Category>): Observable<Category> {
    return this.http.patch<Category>(this.getApiUrl(`/define/api/categories/${id}/`), category)
      .pipe(
        tap(response => console.log('Category updated:', response)),
        catchError(this.handleError)
      );
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(this.getApiUrl(`/define/api/categories/${id}/`))
      .pipe(
        tap(() => console.log('Category deleted:', id)),
        catchError(this.handleError)
      );
  }

  addPagesToCategory(categoryId: number, pageIds: number[]): Observable<Category> {
    return this.http.post<Category>(
      this.getApiUrl(`/define/api/categories/${categoryId}/add_pages/`),
      { page_ids: pageIds }
    ).pipe(
      tap(response => console.log('Pages added to category:', response)),
      catchError(this.handleError)
    );
  }

  // FIELD CRUD Operations
  createField(field: Partial<Field>): Observable<Field> {
    return this.http.post<Field>(this.getApiUrl('/define/api/fields/'), field)
      .pipe(
        tap(response => console.log('Field created:', response)),
        catchError(this.handleError)
      );
  }

  updateField(id: number, field: Partial<Field>): Observable<Field> {
    return this.http.patch<Field>(this.getApiUrl(`/define/api/fields/${id}/`), field)
      .pipe(
        tap(response => console.log('Field updated:', response)),
        catchError(this.handleError)
      );
  }

  deleteField(id: number): Observable<void> {
    return this.http.delete<void>(this.getApiUrl(`/define/api/fields/${id}/`))
      .pipe(
        tap(() => console.log('Field deleted:', id)),
        catchError(this.handleError)
      );
  }

  // CONDITION CRUD Operations
  createCondition(condition: Partial<Condition>): Observable<Condition> {
    return this.http.post<Condition>(this.getApiUrl('/define/api/conditions/'), condition)
      .pipe(
        tap(response => console.log('Condition created:', response)),
        catchError(this.handleError)
      );
  }

  updateCondition(id: number, condition: Partial<Condition>): Observable<Condition> {
    return this.http.patch<Condition>(this.getApiUrl(`/define/api/conditions/${id}/`), condition)
      .pipe(
        tap(response => console.log('Condition updated:', response)),
        catchError(this.handleError)
      );
  }

  deleteCondition(id: number): Observable<void> {
    return this.http.delete<void>(this.getApiUrl(`/define/api/conditions/${id}/`))
      .pipe(
        tap(() => console.log('Condition deleted:', id)),
        catchError(this.handleError)
      );
  }

  // Bulk operations
  bulkUpdateFields(fieldIds: number[], action: string): Observable<any> {
    return this.http.post(this.getApiUrl('/define/api/fields/bulk_update/'), {
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
      this.getApiUrl(`/define/api/fields/${fieldId}/duplicate/`),
      { _field_name: newName }
    ).pipe(
      tap(response => console.log('Field duplicated:', response)),
      catchError(this.handleError)
    );
  }

  validateField(fieldId: number, value: any): Observable<any> {
    const params = new HttpParams().set('value', value);
    return this.http.get(this.getApiUrl(`/define/api/fields/${fieldId}/validate_field/`), { params })
      .pipe(
        tap(response => console.log('Field validation result:', response)),
        catchError(this.handleError)
      );
  }

  testCondition(conditionId: number, fieldData: any): Observable<any> {
    return this.http.post(
      this.getApiUrl(`/define/api/conditions/${conditionId}/test_condition/`),
      { field_data: fieldData }
    ).pipe(
      tap(response => console.log('Condition test result:', response)),
      catchError(this.handleError)
    );
  }
}

// Keep existing interfaces for other API responses
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
