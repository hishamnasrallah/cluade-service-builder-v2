// services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

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
  _mandatory: boolean;
  _is_hidden: boolean;
  _is_disabled: boolean;
  active_ind: boolean;
  // ... other field properties
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
    return `${baseUrl}${endpoint}`;
  }

  // Lookup APIs
  getLookups(name: string): Observable<LookupResponse> {
    const params = new HttpParams().set('name', name);
    return this.http.get<LookupResponse>(this.getApiUrl('/lookups/'), { params });
  }

  // Page APIs
  getPages(): Observable<{ count: number; results: Page[] }> {
    return this.http.get<{ count: number; results: Page[] }>(this.getApiUrl('/define/api/pages/'));
  }

  createPage(page: Page): Observable<Page> {
    return this.http.post<Page>(this.getApiUrl('/define/api/pages/'), page);
  }

  updatePage(id: number, page: Page): Observable<Page> {
    return this.http.put<Page>(this.getApiUrl(`/define/api/pages/${id}/`), page);
  }

  // Category APIs
  getCategories(): Observable<{ count: number; results: Category[] }> {
    return this.http.get<{ count: number; results: Category[] }>(this.getApiUrl('/define/api/categories/'));
  }

  createCategory(category: Category): Observable<Category> {
    return this.http.post<Category>(this.getApiUrl('/define/api/categories/'), category);
  }

  // Field APIs
  getFields(): Observable<{ count: number; results: Field[] }> {
    return this.http.get<{ count: number; results: Field[] }>(this.getApiUrl('/define/api/fields/'));
  }

  createField(field: Field): Observable<Field> {
    return this.http.post<Field>(this.getApiUrl('/define/api/fields/'), field);
  }

  getFieldTypes(): Observable<{ count: number; results: FieldType[] }> {
    return this.http.get<{ count: number; results: FieldType[] }>(this.getApiUrl('/define/api/field-types/'));
  }
}
