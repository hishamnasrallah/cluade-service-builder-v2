// src/app/services/mapper-api.service.ts - Complete implementation with lookup transformation

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
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
  ValidationResult,
  LookupValue,
  MapperFieldRule
} from '../models/mapper.models';

// Interface for the actual API response
interface LookupApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LookupApiItem[];
}

interface LookupApiItem {
  id: number;
  parent_lookup?: number | null;
  type: number;
  name: string;
  name_ara: string;
  code: string;
  icon?: string | null;
  active_ind: boolean;
}

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

  // Updated method to transform API response to expected format
  getAvailableLookups(): Observable<LookupOption[]> {
    return this.http.get<LookupApiResponse>(this.getFullUrl('/lookups/'))
      .pipe(
        tap(response => console.log('Raw lookup response:', response)),
        map(response => this.transformLookupResponse(response.results)),
        tap(lookups => console.log('Transformed lookups:', lookups)),
        catchError(error => {
          console.error('Failed to load lookups:', error);
          // Return empty array as fallback
          return of([]);
        })
      );
  }

  // Transform the API response to match the expected LookupOption format
  // Transform the API response to match the expected LookupOption format
  private transformLookupResponse(apiItems: LookupApiItem[]): LookupOption[] {
    if (!apiItems || apiItems.length === 0) {
      console.warn('No lookup items to transform');
      return [];
    }

    // Log the raw data for debugging
    console.log('Raw lookup items:', apiItems);

    // Based on the data structure, parent items have type: 1 and no parent_lookup
    // Child items have type: 2 and a parent_lookup reference
    const parentItems = apiItems.filter(item => item.type === 1 && (!item.parent_lookup || item.parent_lookup === null));
    const childItems = apiItems.filter(item => item.type === 2 && item.parent_lookup !== null && item.parent_lookup !== undefined);

    console.log(`Found ${parentItems.length} parent items and ${childItems.length} child items`);

    // Create lookup options from parent items
    const lookupOptions = parentItems.map(parent => {
      // Find child items for this parent
      const children = childItems.filter(child => child.parent_lookup === parent.id);

      console.log(`Parent "${parent.name}" (ID: ${parent.id}) has ${children.length} children`);

      return {
        id: parent.id,
        code: parent.code || '',
        label: parent.name,
        values: children.map(child => ({
          id: child.id,
          code: child.code || '',
          label: child.name
        }))
      };
    });

    // Filter to only return lookups that have values (children)
    const validLookups = lookupOptions.filter(lookup => lookup.values.length > 0);

    console.log('Transformed lookups with values:', validLookups);

    // If no lookups with children found, return all items as a flat structure
    if (validLookups.length === 0) {
      console.warn('No parent-child relationships found, returning all items as single lookup');

      // Return all items under a single "All Lookups" parent
      return [{
        id: 0,
        code: 'all',
        label: 'All Lookups',
        values: apiItems.map(item => ({
          id: item.id,
          code: item.code || '',
          label: item.name
        }))
      }];
    }

    return validLookups;
  }
  // Alternative: Get lookups by specific type name
  getLookupsByName(name: string): Observable<LookupOption[]> {
    const params = new HttpParams().set('name', name);
    return this.http.get<LookupApiResponse>(this.getFullUrl('/lookups/'), { params })
      .pipe(
        map(response => {
          // If specific lookup requested, transform differently
          const items = response.results;

          // Find the parent item with the matching name
          const parentItem = items.find(item => item.type === 1 && item.name === name);
          if (!parentItem) {
            console.warn(`No parent lookup found with name: ${name}`);
            return [];
          }

          // Get all child items for this parent
          const childItems = items.filter(item => item.type === 2 && item.parent_lookup === parentItem.id);

          // Return single lookup option with its values
          return [{
            id: parentItem.id,
            code: parentItem.code || '',
            label: parentItem.name,
            values: childItems.map(child => ({
              id: child.id,
              code: child.code || '',
              label: child.name
            }))
          }];
        }),
        tap(lookups => console.log(`Lookups for ${name}:`, lookups)),
        catchError(this.handleError('getLookupsByName'))
      );
  }

  // Get all lookup types (parents only)
  getLookupTypes(): Observable<LookupOption[]> {
    return this.http.get<LookupApiResponse>(this.getFullUrl('/lookups/'))
      .pipe(
        map(response => {
          // Return only parent items as lookup types
          const parentItems = response.results.filter(item => item.type === 1);

          return parentItems.map(parent => ({
            id: parent.id,
            code: parent.code || '',
            label: parent.name,
            values: [] // Empty values for type listing
          }));
        }),
        tap(types => console.log('Lookup types:', types)),
        catchError(this.handleError('getLookupTypes'))
      );
  }

  // Helper method to get lookup label
  getLookupLabel(lookups: LookupOption[], lookupId: number): string {
    const lookup = lookups.find(l => l.id === lookupId);
    return lookup ? lookup.label : `Lookup ${lookupId}`;
  }

  // Helper method to get value label
  getValueLabel(lookups: LookupOption[], lookupId: number, valueId: number): string {
    const lookup = lookups.find(l => l.id === lookupId);
    if (lookup) {
      const value = lookup.values.find(v => v.id === valueId);
      return value ? value.label : `Value ${valueId}`;
    }
    return `Value ${valueId}`;
  }

  // Mock data fallback for testing
  getMockLookups(): Observable<LookupOption[]> {
    const mockLookups: LookupOption[] = [
      {
        id: 1,
        code: '03',
        label: 'Phone Types',
        values: [
          { id: 2, code: '01', label: 'Fax' },
          { id: 3, code: '02', label: 'Mobile' },
          { id: 4, code: '03', label: 'Line' }
        ]
      },
      {
        id: 5,
        code: '01',
        label: 'User Types',
        values: [
          { id: 6, code: '01', label: 'Admin' },
          { id: 7, code: '02', label: 'Public User' }
        ]
      },
      {
        id: 10,
        code: '04',
        label: 'Case Status',
        values: [
          { id: 11, code: '01', label: 'Submitted' },
          { id: 19, code: '', label: 'emp1' },
          { id: 20, code: '', label: 'Draft' },
          { id: 21, code: '04', label: 'Return To Applicant' },
          { id: 57, code: '55', label: 'Completed' }
        ]
      },
      {
        id: 12,
        code: '05',
        label: 'Applicant Type',
        values: [
          { id: 13, code: '', label: 'Self' },
          { id: 52, code: '', label: 'Father' }
        ]
      },
      {
        id: 31,
        code: '08',
        label: 'Gender',
        values: [
          { id: 32, code: '01', label: 'Male' },
          { id: 33, code: '02', label: 'Female' }
        ]
      }
    ];

    return of(mockLookups).pipe(
      tap(lookups => console.log('Using mock lookups:', lookups))
    );
  }

  getTransformFunctions(): Observable<TransformFunction[]> {
    return this.http.get<TransformFunction[]>(this.getFullUrl('/cases/functions/transforms/'))
      .pipe(
        tap(transforms => console.log('Transform functions:', transforms)),
        catchError(error => {
          console.error('Failed to load transforms:', error);
          // Return mock transforms as fallback
          return of([
            {
              path: 'common.transforms.to_uppercase',
              label: 'To Uppercase',
              description: 'Convert text to uppercase',
              is_builtin: true
            },
            {
              path: 'common.transforms.to_lowercase',
              label: 'To Lowercase',
              description: 'Convert text to lowercase',
              is_builtin: true
            }
          ]);
        })
      );
  }

  getFilterFunctions(): Observable<FilterFunction[]> {
    return this.http.get<FilterFunction[]>(this.getFullUrl('/cases/functions/filters/'))
      .pipe(
        tap(filters => console.log('Filter functions:', filters)),
        catchError(error => {
          console.error('Failed to load filters:', error);
          // Return mock filters as fallback
          return of([
            {
              path: 'common.filters.not_empty',
              label: 'Not Empty',
              description: 'Filter out empty values',
              is_builtin: true
            },
            {
              path: 'common.filters.is_valid_email',
              label: 'Valid Email',
              description: 'Filter valid email addresses',
              is_builtin: true
            }
          ]);
        })
      );
  }

  getProcessorFunctions(): Observable<ProcessorFunction[]> {
    return this.http.get<ProcessorFunction[]>(this.getFullUrl('/cases/functions/processors/'))
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
    return this.http.get<ModelField[]>(this.getFullUrl(`/auth/content-type/models/${model}/fields/`))
      .pipe(
        tap(fields => console.log(`Model fields for ${model}:`, fields)),
        catchError(error => {
          console.error('Failed to load model fields:', error);
          // Return default fields as fallback
          return of([
            { name: 'id', type: 'AutoField', required: true },
            { name: 'name', type: 'CharField', required: true, max_length: 255 },
            { name: 'created_at', type: 'DateTimeField', required: false },
            { name: 'updated_at', type: 'DateTimeField', required: false }
          ]);
        })
      );
  }

  // Preview and Execution
  runDryRun(caseId: number, mapperTargetId: string): Observable<PreviewResult> {
    return this.http.post<PreviewResult>(this.getFullUrl('/case/cases/dry-run/'), {
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
      this.getFullUrl('/case/cases/run/'),
      { case_id: caseId, mapper_target_id: targetId }
    )
      .pipe(
        tap(result => console.log('Mapping result:', result)),
        catchError(this.handleError('runMapping'))
      );
  }

  getExecutionLogs(params?: any): Observable<MapperExecutionLog[]> {
    return this.http.get<MapperExecutionLog[]>(this.getFullUrl('/case/cases/logs/'), { params })
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
    return this.http.get<MapperExecutionLog>(this.getFullUrl(`/cases/logs/${id}/`))
      .pipe(
        tap(log => console.log('Execution log detail:', log)),
        catchError(this.handleError('getExecutionLogDetail'))
      );
  }

  // Field rule change logs
  getFieldRuleLogs(ruleId: number): Observable<MapperFieldRuleLog[]> {
    return this.http.get<MapperFieldRuleLog[]>(
      this.getFullUrl(`/cases/field-rules/${ruleId}/logs/`)
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
      this.getFullUrl(`/cases/versions/${versionId}/`)
    )
      .pipe(
        tap(() => console.log('Deleted version:', versionId)),
        catchError(this.handleError('deleteMapperVersion'))
      );
  }

  // Test individual field rules
  testFieldRule(ruleId: number, testData: any): Observable<TestResult> {
    return this.http.post<TestResult>(
      this.getFullUrl(`/cases/field-rules/${ruleId}/test/`),
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
      this.getFullUrl('/cases/targets/batch/'),
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
      this.getFullUrl(`/cases/json-paths/${caseType}/`)
    )
      .pipe(
        tap(suggestions => console.log('JSONPath suggestions:', suggestions)),
        catchError(error => {
          console.error('Failed to load JSONPath suggestions:', error);
          // Return default suggestions
          return of([
            { path: 'user.name', description: 'User name', type: 'string' },
            { path: 'user.profile.full_name', description: 'Full name', type: 'string' },
            { path: 'user.birth_date', description: 'Birth date', type: 'date' },
            { path: 'applicant.name', description: 'Applicant name', type: 'string' },
            { path: 'case_data.citizen_info.name', description: 'Citizen name', type: 'string' }
          ]);
        })
      );
  }

  // Case types - Fixed to use existing method
  getCaseTypes(): Observable<string[]> {
    return this.getLookupsByName('Service').pipe(
      map((response: LookupOption[]) => {
        // Extract case types from the service lookup
        if (response.length > 0) {
          return response[0].values.map((item: LookupValue) => item.code);
        }
        return [];
      }),
      tap(types => console.log('Case types:', types)),
      catchError(error => {
        console.error('Failed to load case types:', error);
        return of(['USER_REG', 'EMPLOYEE_BENEFITS', 'APPLICATION_FORM']);
      })
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

  // Get export preview for a mapper
  getExportPreview(mapperId: number): Observable<MapperExportData> {
    return this.http.get<MapperExportData>(`${this.apiUrl}/mappers/${mapperId}/export-preview`)
      .pipe(
        tap(data => console.log('Export preview:', data)),
        catchError(this.handleError('getExportPreview'))
      );
  }
}