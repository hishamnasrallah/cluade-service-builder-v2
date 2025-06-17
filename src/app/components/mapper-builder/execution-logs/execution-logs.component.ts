// src/app/components/mapper-builder/components/execution-logs/execution-logs.component.ts

import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MapperExecutionLog } from '../../../models/mapper.models';
import { MapperApiService } from '../../../services/mapper-api.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-execution-logs',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatExpansionModule
  ],
  templateUrl: './execution-logs.component.html',
  styleUrl: './execution-logs.component.scss'
})
export class ExecutionLogsComponent implements OnInit {
  @Input() mapperId?: number;
  @Input({transform: (value: string | undefined | null): string | undefined => {
      return value ? value.trim() : undefined;
    }}) targetId?: string;
  @Input() caseId?: number;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'timestamp',
    'case',
    'target',
    'status',
    'duration',
    'records',
    'user',
    'actions'
  ];

  dataSource: MatTableDataSource<MapperExecutionLog>;
  filterForm: FormGroup;
  selectedLog?: MapperExecutionLog;
  isLoading = false;

  statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'success', label: 'Success' },
    { value: 'failure', label: 'Failed' }
  ];

  constructor(
    private fb: FormBuilder,
    private apiService: MapperApiService
  ) {
    this.dataSource = new MatTableDataSource<MapperExecutionLog>([]);

    this.filterForm = this.fb.group({
      search: [''],
      status: ['all'],
      dateFrom: [null],
      dateTo: [null],
      targetId: ['']
    });
  }

  ngOnInit(): void {
    this.setupFilters();
    this.loadExecutionLogs();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  setupFilters(): void {
    // Search filter
    this.filterForm.get('search')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.dataSource.filter = searchTerm.toLowerCase();
    });

    // Other filters
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });

    // Custom filter predicate
    this.dataSource.filterPredicate = (data: MapperExecutionLog, filter: string) => {
      const searchStr = filter.toLowerCase();
      return data.case.toString().includes(searchStr) ||
        data.mapper_target.toLowerCase().includes(searchStr) ||
        (data.executed_by || '').toLowerCase().includes(searchStr);
    };
  }

  loadExecutionLogs(): void {
    this.isLoading = true;

    const params: any = {};
    if (this.mapperId) params.mapper_id = this.mapperId;
    if (this.targetId) params.target_id = this.targetId;
    if (this.caseId) params.case_id = this.caseId;

    this.apiService.getExecutionLogs(params).subscribe({
      next: (logs) => {
        this.dataSource.data = logs;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load execution logs:', error);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    const filters = this.filterForm.value;
    let filteredData = [...this.dataSource.data];

    // Status filter
    if (filters.status !== 'all') {
      filteredData = filteredData.filter(log =>
        filters.status === 'success' ? log.success : !log.success
      );
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filteredData = filteredData.filter(log =>
        new Date(log.executed_at) >= fromDate
      );
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filteredData = filteredData.filter(log =>
        new Date(log.executed_at) <= toDate
      );
    }

    // Target filter
    if (filters.targetId) {
      filteredData = filteredData.filter(log =>
        log.mapper_target === filters.targetId
      );
    }

    this.dataSource.data = filteredData;
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      status: 'all',
      dateFrom: null,
      dateTo: null,
      targetId: ''
    });
  }

  viewDetails(log: MapperExecutionLog): void {
    this.selectedLog = log;
  }

  rerunMapping(log: MapperExecutionLog): void {
    if (confirm('Are you sure you want to rerun this mapping?')) {
      this.apiService.runMapping(log.case, log.mapper_target).subscribe({
        next: () => {
          this.loadExecutionLogs();
        },
        error: (error) => {
          console.error('Failed to rerun mapping:', error);
        }
      });
    }
  }

  exportLogs(): void {
    const data = this.dataSource.filteredData.map(log => ({
      timestamp: log.executed_at,
      case_id: log.case,
      target: log.mapper_target,
      success: log.success,
      duration_ms: log.execution_time_ms,
      records_created: log.records_created,
      records_updated: log.records_updated,
      user: log.executed_by,
      error: log.error_trace
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  refreshLogs(): void {
    this.loadExecutionLogs();
  }

  getStatusIcon(success: boolean): string {
    return success ? 'check_circle' : 'error';
  }

  getStatusColor(success: boolean): string {
    return success ? 'success' : 'error';
  }

  formatDuration(ms?: number): string {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  formatRecords(created?: number, updated?: number): string {
    const parts = [];
    if (created) parts.push(`${created} created`);
    if (updated) parts.push(`${updated} updated`);
    return parts.join(', ') || '-';
  }
}
