// services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ConfigService } from './config.service';

// Response interfaces matching your API
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

  // Text validations
  _max_length?: number;
  _min_length?: number;
  _regex_pattern?: string;
  _allowed_characters?: string;
  _forbidden_words?: string;

  // Number validations
  _value_greater_than?: number;
  _value_less_than?: number;
  _integer_only?: boolean;
  _positive_only?: boolean;

  // Date validations
  _date_greater_than?: string;
  _date_less_than?: string;
  _future_only?: boolean;
  _past_only?: boolean;

  // Boolean default
  _default_boolean?: boolean;

  // File validations
  _file_types?: string;
  _max_file_size?: number;
  _image_max_width?: number;
  _image_max_height?: number;

  // Selection validations
  _max_selections?: number;
  _min_selections?: number;

  // Advanced validations
  _precision?: number;
  _unique?: boolean;
  _default_value?: string;
  _coordinates_format?: boolean;
  _uuid_format?: boolean;

  // Visibility
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

  // Page APIs
  getPages(): Observable<PageResponse> {
    return this.http.get<PageResponse>(this.getApiUrl('/define/api/pages/'))
      .pipe(
        tap(response => console.log('Loaded pages:', response)),
        catchError(this.handleError)
      );
  }

  createPage(page: Page): Observable<Page> {
    return this.http.post<Page>(this.getApiUrl('/define/api/pages/'), page)
      .pipe(
        tap(response => console.log('Created page:', response)),
        catchError(this.handleError)
      );
  }

  updatePage(id: number, page: Page): Observable<Page> {
    return this.http.put<Page>(this.getApiUrl(`/define/api/pages/${id}/`), page)
      .pipe(
        tap(response => console.log('Updated page:', response)),
        catchError(this.handleError)
      );
  }

  getPage(id: number): Observable<Page> {
    return this.http.get<Page>(this.getApiUrl(`/define/api/pages/${id}/`))
      .pipe(
        tap(response => console.log('Loaded page:', response)),
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

  createCategory(category: Category): Observable<Category> {
    return this.http.post<Category>(this.getApiUrl('/define/api/categories/'), category)
      .pipe(
        tap(response => console.log('Created category:', response)),
        catchError(this.handleError)
      );
  }

  updateCategory(id: number, category: Category): Observable<Category> {
    return this.http.put<Category>(this.getApiUrl(`/define/api/categories/${id}/`), category)
      .pipe(
        tap(response => console.log('Updated category:', response)),
        catchError(this.handleError)
      );
  }

  getCategory(id: number): Observable<Category> {
    return this.http.get<Category>(this.getApiUrl(`/define/api/categories/${id}/`))
      .pipe(
        tap(response => console.log('Loaded category:', response)),
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

  createField(field: Field): Observable<Field> {
    return this.http.post<Field>(this.getApiUrl('/define/api/fields/'), field)
      .pipe(
        tap(response => console.log('Created field:', response)),
        catchError(this.handleError)
      );
  }

  updateField(id: number, field: Field): Observable<Field> {
    return this.http.put<Field>(this.getApiUrl(`/define/api/fields/${id}/`), field)
      .pipe(
        tap(response => console.log('Updated field:', response)),
        catchError(this.handleError)
      );
  }

  getField(id: number): Observable<Field> {
    return this.http.get<Field>(this.getApiUrl(`/define/api/fields/${id}/`))
      .pipe(
        tap(response => console.log('Loaded field:', response)),
        catchError(this.handleError)
      );
  }

  // Field Type APIs
  getFieldTypes(): Observable<FieldTypeResponse> {
    return this.http.get<FieldTypeResponse>(this.getApiUrl('/define/api/field-types/'))
      .pipe(
        tap(response => console.log('Loaded field types:', response)),
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
}
