// src/app/services/mapper-api.service.ts - Updated with correct endpoints

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
  SaveMapperRequest,
  ModelField,
  MapperExecutionLog,
  MapperFieldRuleLog,
  MapperVersion,
  MapperExportData,
  TestResult,
  BatchOperationRequest,
  JSONPathSuggestion,
  ProcessorFunction,
  ValidationResult
} from '../models/mapper.models';


@Injectable({
  providedIn: 'root'
})
export class MapperApiService {
  // Updated to match documentation
  private apiUrl = '/case/api/mapper';

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}
  // /**
  //  * Export a mapper configuration
  //  * @param mapperId The ID of the mapper to export
  //  * @returns Observable of the export data
  //  */
  // exportMapper(mapperId: number): Observable<MapperExportData> {
  //   return this.http.get<MapperExportData>(`${this.apiUrl}/mappers/${mapperId}/export`);
  // }

  // /**
  //  * Get export preview for a mapper (optional - can use exportMapper instead)
  //  * @param mapperId The ID of the mapper
  //  * @returns Observable of the export preview data
  //  */
  getExportPreview(mapperId: number): Observable<MapperExportData> {
    return this.http.get<MapperExportData>(`${this.apiUrl}/mappers/${mapperId}/export-preview`);
  }
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
    return this.http.get<ModelOption[]>(this.getFullUrl('/auth/content-types/models/'))
      .pipe(
        tap(models => console.log('Available models:', models)),
        catchError(this.handleError('getAvailableModels'))
      );
  }

  getAvailableLookups(): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(this.getFullUrl('/lookups/'))
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

  getProcessorFunctions(): Observable<ProcessorFunction[]> {
    return this.http.get<ProcessorFunction[]>(this.getFullUrl('/api/functions/processors/'))
      .pipe(
        tap(processors => console.log('Processor functions:', processors)),
        catchError(this.handleError('getProcessorFunctions'))
      );
  }

  // CaseMapper CRUD
  getCaseMappers(): Observable<CaseMapper[]> {
    return this.http.get<CaseMapper[]>(this.getFullUrl('/cases/case-mappers/'))
      .pipe(
        tap(mappers => console.log('Case mappers:', mappers)),
        catchError(this.handleError('getCaseMappers'))
      );
  }

  getCaseMapper(id: number): Observable<CaseMapper> {
    return this.http.get<CaseMapper>(this.getFullUrl(`/cases/case-mappers/${id}/`))
      .pipe(
        tap(mapper => console.log('Case mapper:', mapper)),
        catchError(this.handleError('getCaseMapper'))
      );
  }

  // MapperTarget CRUD
  getMapperTargets(caseMapperIt?: number): Observable<MapperTarget[]> {
    let params = new HttpParams();
    if (caseMapperIt) {
      params = params.set('case_mapper', caseMapperIt.toString());
    }
    return this.http.get<MapperTarget[]>(this.getFullUrl('/cases/targets/'), { params })
      .pipe(
        tap(targets => console.log('Mapper targets:', targets)),
        catchError(this.handleError('getMapperTargets'))
      );
  }

  createMapperTarget(target: MapperTarget): Observable<MapperTarget> {
    return this.http.post<MapperTarget>(this.getFullUrl('/cases/targets/'), target)
      .pipe(
        tap(newTarget => console.log('Created mapper target:', newTarget)),
        catchError(this.handleError('createMapperTarget'))
      );
  }

  updateMapperTarget(id: string, target: MapperTarget): Observable<MapperTarget> {
    return this.http.put<MapperTarget>(this.getFullUrl(`/cases/targets/${id}/`), target)
      .pipe(
        tap(updatedTarget => console.log('Updated mapper target:', updatedTarget)),
        catchError(this.handleError('updateMapperTarget'))
      );
  }

  deleteMapperTarget(id: string): Observable<void> {
    return this.http.delete<void>(this.getFullUrl(`/cases/targets/${id}/`))
      .pipe(
        tap(() => console.log('Deleted mapper target:', id)),
        catchError(this.handleError('deleteMapperTarget'))
      );
  }

  // Model fields API
  getModelFields(model: string): Observable<ModelField[]> {
    return this.http.get<ModelField[]>(this.getFullUrl(`/api/models/${model}/fields/`))
      .pipe(
        tap(fields => console.log(`Model fields for ${model}:`, fields)),
        catchError(this.handleError('getModelFields'))
      );
  }

  // Preview and Execution
  runDryRun(caseId: number, mapperTargetId: string): Observable<PreviewResult> {
    return this.http.post<PreviewResult>(this.getFullUrl('/case/api/mapper/dry-run/'), {
      case_id: caseId,
      mapper_target_id: mapperTargetId
    })
      .pipe(
        tap(result => console.log('Dry run result:', result)),
        catchError(this.handleError('runDryRun'))
      );
  }

  runMapping(caseId: number, targetId: string): Observable<any> {
    return this.http.post(
      this.getFullUrl('/case/api/mapper/run/'),
      { case_id: caseId, mapper_target_id: targetId }
    )
      .pipe(
        tap(result => console.log('Mapping result:', result)),
        catchError(this.handleError('runMapping'))
      );
  }
  getExecutionLogs(params?: any): Observable<MapperExecutionLog[]> {
    return this.http.get<MapperExecutionLog[]>(this.getFullUrl('/case/api/mapper/logs/'), { params })
      .pipe(
        tap(logs => console.log('Execution logs:', logs)),
        catchError(this.handleError('getExecutionLogs'))
      );
  }

  // Clone mapper endpoint
  cloneMapperVersion(mapperId: number): Observable<CaseMapper> {
    return this.http.post<CaseMapper>(
      this.getFullUrl(`/api/case-mappers/${mapperId}/clone/`),
      {}
    )
      .pipe(
        tap(mapper => console.log('Cloned mapper:', mapper)),
        catchError(this.handleError('cloneMapperVersion'))
      );
  }

  // Export/Import endpoints
  exportMapper(mapperId: number): Observable<MapperExportData> {
    return this.http.get<MapperExportData>(
      this.getFullUrl(`/api/case-mappers/${mapperId}/export/`)
    )
      .pipe(
        tap(data => console.log('Export data:', data)),
        catchError(this.handleError('exportMapper'))
      );
  }

  importMapper(data: any): Observable<CaseMapper> {
    return this.http.post<CaseMapper>(
      this.getFullUrl('/api/case-mappers/import/'),
      data
    )
      .pipe(
        tap(mapper => console.log('Imported mapper:', mapper)),
        catchError(this.handleError('importMapper'))
      );
  }
  // Save entire configuration
  saveMapperConfiguration(config: SaveMapperRequest): Observable<any> {
    return this.http.post(this.getFullUrl('/cases/save/'), config)
      .pipe(
        tap(result => console.log('Save result:', result)),
        catchError(this.handleError('saveMapperConfiguration'))
      );
  }


  getExecutionLogDetail(id: number): Observable<MapperExecutionLog> {
    return this.http.get<MapperExecutionLog>(this.getFullUrl(`/api/mapper/logs/${id}/`))
      .pipe(
        tap(log => console.log('Execution log detail:', log)),
        catchError(this.handleError('getExecutionLogDetail'))
      );
  }

  // Field rule change logs
  getFieldRuleLogs(ruleId: number): Observable<MapperFieldRuleLog[]> {
    return this.http.get<MapperFieldRuleLog[]>(
      this.getFullUrl(`/api/mapper/field-rules/${ruleId}/logs/`)
    )
      .pipe(
        tap(logs => console.log('Field rule logs:', logs)),
        catchError(this.handleError('getFieldRuleLogs'))
      );
  }

  // Version management
  getMapperVersions(mapperId: number): Observable<MapperVersion[]> {
    return this.http.get<MapperVersion[]>(
      this.getFullUrl(`/api/case-mappers/${mapperId}/versions/`)
    )
      .pipe(
        tap(versions => console.log('Mapper versions:', versions)),
        catchError(this.handleError('getMapperVersions'))
      );
  }

  cloneMapper(mapperId: number): Observable<CaseMapper> {
    return this.http.post<CaseMapper>(
      this.getFullUrl(`/api/case-mappers/${mapperId}/clone/`),
      {}
    )
      .pipe(
        tap(mapper => console.log('Cloned mapper:', mapper)),
        catchError(this.handleError('cloneMapper'))
      );
  }

  createMapperVersion(mapperId: number, data: any): Observable<MapperVersion> {
    return this.http.post<MapperVersion>(
      this.getFullUrl(`/api/case-mappers/${mapperId}/create-version/`),
      data
    )
      .pipe(
        tap(version => console.log('Created version:', version)),
        catchError(this.handleError('createMapperVersion'))
      );
  }

  rollbackToVersion(mapperId: number, versionId: number): Observable<any> {
    return this.http.post(
      this.getFullUrl(`/api/case-mappers/${mapperId}/rollback/`),
      { version_id: versionId }
    )
      .pipe(
        tap(result => console.log('Rollback result:', result)),
        catchError(this.handleError('rollbackToVersion'))
      );
  }

  deleteMapperVersion(versionId: number): Observable<void> {
    return this.http.delete<void>(
      this.getFullUrl(`/api/mapper/versions/${versionId}/`)
    )
      .pipe(
        tap(() => console.log('Deleted version:', versionId)),
        catchError(this.handleError('deleteMapperVersion'))
      );
  }

  // Test individual field rules
  testFieldRule(ruleId: number, testData: any): Observable<TestResult> {
    return this.http.post<TestResult>(
      this.getFullUrl(`/api/mapper/field-rules/${ruleId}/test/`),
      testData
    )
      .pipe(
        tap(result => console.log('Test result:', result)),
        catchError(this.handleError('testFieldRule'))
      );
  }

  // Batch operations
  batchUpdateTargets(request: BatchOperationRequest): Observable<any> {
    return this.http.post(
      this.getFullUrl('/api/mapper/targets/batch/'),
      request
    )
      .pipe(
        tap(result => console.log('Batch update result:', result)),
        catchError(this.handleError('batchUpdateTargets'))
      );
  }

  // JSONPath suggestions
  getJSONPathSuggestions(caseType: string): Observable<JSONPathSuggestion[]> {
    return this.http.get<JSONPathSuggestion[]>(
      this.getFullUrl(`/api/mapper/json-paths/${caseType}/`)
    )
      .pipe(
        tap(suggestions => console.log('JSONPath suggestions:', suggestions)),
        catchError(this.handleError('getJSONPathSuggestions'))
      );
  }

  // Case types
  getCaseTypes(): Observable<string[]> {
    return this.http.get<string[]>(this.getFullUrl('/api/case-types/'))
      .pipe(
        tap(types => console.log('Case types:', types)),
        catchError(this.handleError('getCaseTypes'))
      );
  }

  // Validate mapper configuration
  validateMapper(mapperId: number): Observable<ValidationResult> {
    return this.http.post<ValidationResult>(
      this.getFullUrl(`/api/case-mappers/${mapperId}/validate/`),
      {}
    )
      .pipe(
        tap(result => console.log('Validation result:', result)),
        catchError(this.handleError('validateMapper'))
      );
  }
  // CaseMapper CRUD - Add these methods after getCaseMapper
  createCaseMapper(mapper: CaseMapper): Observable<CaseMapper> {
    return this.http.post<CaseMapper>(this.getFullUrl('/cases/case-mappers/'), mapper)
      .pipe(
        tap(newMapper => console.log('Created case mapper:', newMapper)),
        catchError(this.handleError('createCaseMapper'))
      );
  }

  updateCaseMapper(id: number, mapper: Partial<CaseMapper>): Observable<CaseMapper> {
    return this.http.put<CaseMapper>(this.getFullUrl(`/cases/case-mappers/${id}/`), mapper)
      .pipe(
        tap(updatedMapper => console.log('Updated case mapper:', updatedMapper)),
        catchError(this.handleError('updateCaseMapper'))
      );
  }

  deleteCaseMapper(id: number): Observable<void> {
    return this.http.delete<void>(this.getFullUrl(`/cases/case-mappers/${id}/`))
      .pipe(
        tap(() => console.log('Deleted case mapper:', id)),
        catchError(this.handleError('deleteCaseMapper'))
      );
  }
}
