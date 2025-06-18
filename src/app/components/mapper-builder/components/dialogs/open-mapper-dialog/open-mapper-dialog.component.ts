// src/app/components/mapper-builder/components/dialogs/open-mapper-dialog/open-mapper-dialog.component.ts
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { debounceTime } from 'rxjs/operators';

import { CaseMapper } from '../../../../../models/mapper.models';
import { MapperApiService } from '../../../../../services/mapper-api.service';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-open-mapper-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatChipsModule
  ],
  templateUrl: 'open-mapper-dialog.component.html',
  styleUrl: 'open-mapper-dialog.component.scss'
})
export class OpenMapperDialogComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns = ['name', 'case_type', 'version', 'active_ind', 'updated_at', 'actions'];
  dataSource = new MatTableDataSource<CaseMapper>([]);

  searchControl = new FormControl('');
  caseTypeControl = new FormControl('');
  statusControl = new FormControl<string | boolean>('');

  caseTypes: string[] = [];
  isLoading = true;
  selectedMapper: CaseMapper | null = null;
  allMappers: CaseMapper[] = [];

  constructor(
    private dialogRef: MatDialogRef<OpenMapperDialogComponent>,
    private apiService: MapperApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCaseTypes();
    this.loadMappers();
    this.setupFilters();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private loadCaseTypes(): void {
    this.apiService.getCaseTypes().subscribe({
      next: (types) => {
        this.caseTypes = types;
      },
      error: (error) => {
        console.error('Failed to load case types:', error);
      }
    });
  }

  private loadMappers(): void {
    this.isLoading = true;

    this.apiService.getCaseMappers().subscribe({
      next: (mappers) => {
        this.allMappers = mappers;
        this.dataSource.data = mappers;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load mappers:', error);
        this.isLoading = false;
      }
    });
  }

  private setupFilters(): void {
    // Search filter
    this.searchControl.valueChanges
      .pipe(debounceTime(300))
      .subscribe(() => this.applyFilters());

    // Case type filter
    this.caseTypeControl.valueChanges.subscribe(() => this.applyFilters());

    // Status filter
    this.statusControl.valueChanges.subscribe(() => this.applyFilters());
  }

  private applyFilters(): void {
    let filteredData = [...this.allMappers];

    // Apply search filter
    const searchTerm = this.searchControl.value?.toLowerCase();
    if (searchTerm) {
      filteredData = filteredData.filter(mapper =>
        mapper.name.toLowerCase().includes(searchTerm) ||
        mapper.case_type.toLowerCase().includes(searchTerm)
      );
    }

    // Apply case type filter
    const caseType = this.caseTypeControl.value;
    if (caseType) {
      filteredData = filteredData.filter(mapper => mapper.case_type === caseType);
    }

    // Apply status filter
    const status = this.statusControl.value;
    if (status !== '' && status !== null) {
      // Convert status to boolean for comparison
      const statusBool = status === true || status === 'true';
      filteredData = filteredData.filter(mapper => mapper.active_ind === statusBool);
    }

    this.dataSource.data = filteredData;
  }

  getParentVersion(parentId: number): number {
    const parent = this.allMappers.find(m => m.id === parentId);
    return parent?.version || 0;
  }

  openMapper(mapper: CaseMapper): void {
    this.selectedMapper = mapper;
    this.confirmOpen();
  }

  confirmOpen(): void {
    if (this.selectedMapper) {
      this.dialogRef.close(this.selectedMapper);
      this.router.navigate(['/mapper-builder', this.selectedMapper.id]);
    }
  }

  cloneMapper(mapper: CaseMapper): void {
    if (confirm(`Clone mapper "${mapper.name}"?`)) {
      this.apiService.cloneMapper(mapper.id!).subscribe({
        next: (clonedMapper) => {
          this.loadMappers(); // Refresh list
        },
        error: (error) => {
          console.error('Failed to clone mapper:', error);
        }
      });
    }
  }

  exportMapper(mapper: CaseMapper): void {
    this.apiService.exportMapper(mapper.id!).subscribe({
      next: (exportData) => {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${mapper.name.replace(/\s+/g, '_')}_v${mapper.version}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Failed to export mapper:', error);
      }
    });
  }

  deleteMapper(mapper: CaseMapper): void {
    if (mapper.active_ind) {
      alert('Cannot delete active mapper. Please deactivate it first.');
      return;
    }

    if (confirm(`Are you sure you want to delete "${mapper.name}" v${mapper.version}?`)) {
      this.apiService.deleteCaseMapper(mapper.id!).subscribe({
        next: () => {
          this.loadMappers(); // Refresh list
        },
        error: (error) => {
          console.error('Failed to delete mapper:', error);
          alert('Failed to delete mapper. It may have dependencies.');
        }
      });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
