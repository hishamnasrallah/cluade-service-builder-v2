// src/app/services/mapper-api.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ConfigService } from './config.service';
import {
  CaseMapper,
  MapperTarget,
  ModelOption,
  LookupOption,
  TransformFunction,
  FilterFunction,
  PreviewResult,
  SaveMapperRequest
} from '../models/mapper.models';

@Injectable({
  providedIn: 'root'
})
export class MapperApiService {
  private apiUrl = '/api/mapping';

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  private getFullUrl(endpoint: string): string {
    const baseUrl = this.configService.getBaseUrl();
    if (!baseUrl) {
      throw new Error('Base URL not configured');
    }
    return `${baseUrl}${endpoint}`;
  }

  private handleError(operation: string) {
    return (error: any): Observable<never> => {
      console.error(`${operation} failed:`, error);

      let userMessage = 'An error occurred';
      if (error.error instanceof ErrorEvent) {
        userMessage = 'Network error occurred';
      } else {
        switch (error.status) {
          case 400:
            userMessage = error.error.detail || 'Invalid request';
            break;
          case 401:
            userMessage = 'Authentication required';
            break;
          case 403:
            userMessage = 'Permission denied';
            break;
          case 404:
            userMessage = 'Resource not found';
            break;
          case 500:
            userMessage = 'Server error occurred';
            break;
          default:
            userMessage = error.error?.detail || error.message || 'Unknown error';
        }
      }

      return throwError(() => new Error(`${operation} failed: ${userMessage}`));
    };
  }

  // Model & Function APIs
  getAvailableModels(): Observable<ModelOption[]> {
    return this.http.get<ModelOption[]>(this.getFullUrl('/api/mapping/models/'))
      .pipe(
        tap(models => console.log('Available models:', models)),
        catchError(this.handleError('getAvailableModels'))
      );
  }

  getAvailableLookups(): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(this.getFullUrl('/api/lookups/'))
      .pipe(
        tap(lookups => console.log('Available lookups:', lookups)),
        catchError(this.handleError('getAvailableLookups'))
      );
  }

  getTransformFunctions(): Observable<TransformFunction[]> {
    return this.http.get<TransformFunction[]>(this.getFullUrl('/api/functions/transforms/'))
      .pipe(
        tap(transforms => console.log('Transform functions:', transforms)),
        catchError(this.handleError('getTransformFunctions'))
      );
  }

  getFilterFunctions(): Observable<FilterFunction[]> {
    return this.http.get<FilterFunction[]>(this.getFullUrl('/api/functions/filters/'))
      .pipe(
        tap(filters => console.log('Filter functions:', filters)),
        catchError(this.handleError('getFilterFunctions'))
      );
  }

  // CaseMapper CRUD
  getCaseMappers(): Observable<CaseMapper[]> {
    return this.http.get<CaseMapper[]>(this.getFullUrl('/api/mapping/case-mappers/'))
      .pipe(
        tap(mappers => console.log('Case mappers:', mappers)),
        catchError(this.handleError('getCaseMappers'))
      );
  }

  getCaseMapper(id: number): Observable<CaseMapper> {
    return this.http.get<CaseMapper>(this.getFullUrl(`/api/mapping/case-mappers/${id}/`))
      .pipe(
        tap(mapper => console.log('Case mapper:', mapper)),
        catchError(this.handleError('getCaseMapper'))
      );
  }

  // MapperTarget CRUD
  getMapperTargets(caseMapperIt?: number): Observable<MapperTarget[]> {
    const params = caseMapperIt ? { case_mapper: caseMapperIt.toString() } : {};
    return this.http.get<MapperTarget[]>(this.getFullUrl('/api/mapping/targets/'), { params })
      .pipe(
        tap(targets => console.log('Mapper targets:', targets)),
        catchError(this.handleError('getMapperTargets'))
      );
  }

  getMapperTarget(id: string): Observable<MapperTarget> {
    return this.http.get<MapperTarget>(this.getFullUrl(`/api/mapping/targets/${id}/`))
      .pipe(
        tap(target => console.log('Mapper target:', target)),
        catchError(this.handleError('getMapperTarget'))
      );
  }

  createMapperTarget(target: MapperTarget): Observable<MapperTarget> {
    return this.http.post<MapperTarget>(this.getFullUrl('/api/mapping/targets/'), target)
      .pipe(
        tap(newTarget => console.log('Created mapper target:', newTarget)),
        catchError(this.handleError('createMapperTarget'))
      );
  }

  updateMapperTarget(id: string, target: MapperTarget): Observable<MapperTarget> {
    return this.http.put<MapperTarget>(this.getFullUrl(`/api/mapping/targets/${id}/`), target)
      .pipe(
        tap(updatedTarget => console.log('Updated mapper target:', updatedTarget)),
        catchError(this.handleError('updateMapperTarget'))
      );
  }

  deleteMapperTarget(id: string): Observable<void> {
    return this.http.delete<void>(this.getFullUrl(`/api/mapping/targets/${id}/`))
      .pipe(
        tap(() => console.log('Deleted mapper target:', id)),
        catchError(this.handleError('deleteMapperTarget'))
      );
  }

  // Preview
  runDryRun(caseId: number, mapperTargetId: string): Observable<PreviewResult> {
    return this.http.post<PreviewResult>(this.getFullUrl('/api/mapping/dry_run/'), {
      case_id: caseId,
      mapper_target_id: mapperTargetId
    })
      .pipe(
        tap(result => console.log('Dry run result:', result)),
        catchError(this.handleError('runDryRun'))
      );
  }

  // Save entire configuration
  saveMapperConfiguration(config: SaveMapperRequest): Observable<any> {
    return this.http.post(this.getFullUrl('/api/mapping/save/'), config)
      .pipe(
        tap(result => console.log('Save result:', result)),
        catchError(this.handleError('saveMapperConfiguration'))
      );
  }

  // Helper methods
  getModelFields(model: string): Observable<string[]> {
    // This would ideally be a separate API endpoint
    // For now, returning a mock response
    const mockFields: { [key: string]: string[] } = {
      'citizen.Citizen': ['id', 'full_name', 'birth_date', 'national_id', 'gender', 'marital_status'],
      'citizen.Child': ['id', 'name', 'age', 'parent', 'birth_date'],
      'education.EducationRecord': ['id', 'level', 'institution', 'graduation_date', 'degree']
    };

    return new Observable(observer => {
      setTimeout(() => {
        observer.next(mockFields[model] || ['id', 'name', 'created_at', 'updated_at']);
        observer.complete();
      }, 100);
    });
  }

  // Get case types for mapper creation
  getCaseTypes(): Observable<string[]> {
    // This would ideally come from backend
    return new Observable(observer => {
      observer.next(['CitizenRequest', 'VacationRequest', 'EducationRequest', 'GeneralRequest']);
      observer.complete();
    });
  }
}
