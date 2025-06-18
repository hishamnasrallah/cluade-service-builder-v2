// src/app/components/mapper-list/mapper-list.component.ts
import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

// Models and Services
import { CaseMapper } from '../../../../models/mapper.models';
import { MapperApiService } from '../../../../services/mapper-api.service';
import { NewMapperDialogComponent } from '../../../mapper-builder/components/dialogs/new-mapper-dialog/new-mapper-dialog.component';
import { ImportMapperDialogComponent } from '../../../mapper-builder/components/dialogs/import-mapper-dialog/import-mapper-dialog.component';

interface MapperStats {
  total: number;
  active: number;
  inactive: number;
  byCaseType: Map<string, number>;
}

@Component({
  selector: 'app-mapper-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatBadgeModule,
    MatDividerModule,
    MatExpansionModule,
    MatButtonToggleModule
  ],
  templateUrl: './mapper-list.component.html',
  styleUrls: ['./mapper-list.component.scss']
})
export class MapperListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Table
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<CaseMapper>([]);
  displayedColumns = ['name', 'case_type', 'version', 'targets', 'updated_at', 'status', 'actions'];

  // Filters
  searchControl = new FormControl('');
  caseTypeFilter = new FormControl('');
  statusFilter = new FormControl('');
  viewMode: 'table' | 'grid' = 'table';

  // Data
  allMappers: CaseMapper[] = [];
  filteredMappers: CaseMapper[] = [];
  caseTypes: string[] = [];
  stats: MapperStats = {
    total: 0,
    active: 0,
    inactive: 0,
    byCaseType: new Map()
  };

  // UI State
  isLoading = true;
  selectedMappers = new Set<number>();
  expandedPanelId: number | null = null;

  // Target counts (mock data - in real app, would come from API)
  targetCounts = new Map<number, number>();

  constructor(
    private router: Router,
    private apiService: MapperApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadMappers();
    this.setupFilters();
    this.loadCaseTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private loadMappers(): void {
    this.isLoading = true;

    this.apiService.getCaseMappers().subscribe({
      next: (mappers) => {
        this.allMappers = mappers;
        this.calculateStats();
        this.applyFilters();
        this.isLoading = false;

        // Mock target counts
        mappers.forEach(mapper => {
          this.targetCounts.set(mapper.id!, Math.floor(Math.random() * 10) + 1);
        });
      },
      error: (error) => {
        console.error('Failed to load mappers:', error);
        this.showError('Failed to load mappers');
        this.isLoading = false;
      }
    });
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

  private setupFilters(): void {
    // Search filter
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.applyFilters());

    // Case type filter
    this.caseTypeFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());

    // Status filter
    this.statusFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  private applyFilters(): void {
    let filtered = [...this.allMappers];

    // Search filter
    const searchTerm = this.searchControl.value?.toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter(mapper =>
        mapper.name.toLowerCase().includes(searchTerm) ||
        mapper.case_type.toLowerCase().includes(searchTerm) ||
        mapper.updated_by?.toLowerCase().includes(searchTerm)
      );
    }

    // Case type filter
    const caseType = this.caseTypeFilter.value;
    if (caseType) {
      filtered = filtered.filter(mapper => mapper.case_type === caseType);
    }

    // Status filter
    const status = this.statusFilter.value;
    if (status !== '' && status !== null) {
      filtered = filtered.filter(mapper => mapper.active_ind === (status === 'active'));
    }

    this.filteredMappers = filtered;
    this.dataSource.data = filtered;
  }

  private calculateStats(): void {
    this.stats.total = this.allMappers.length;
    this.stats.active = this.allMappers.filter(m => m.active_ind).length;
    this.stats.inactive = this.stats.total - this.stats.active;

    // Calculate by case type
    this.stats.byCaseType.clear();
    this.allMappers.forEach(mapper => {
      const count = this.stats.byCaseType.get(mapper.case_type) || 0;
      this.stats.byCaseType.set(mapper.case_type, count + 1);
    });
  }

  // Actions
  createNewMapper(): void {
    const dialogRef = this.dialog.open(NewMapperDialogComponent, {
      width: '500px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.router.navigate(['/mapper-builder/new'], {
          queryParams: {
            name: result.name,
            caseType: result.caseType,
            template: result.templateId
          }
        });
      }
    });
  }

  importMapper(): void {
    const dialogRef = this.dialog.open(ImportMapperDialogComponent, {
      width: '600px',
      maxHeight: '80vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadMappers(); // Refresh list
        this.showSuccess('Mapper imported successfully');
      }
    });
  }

  openMapper(mapper: CaseMapper): void {
    this.router.navigate(['/mapper-builder', mapper.id]);
  }

  editMapper(mapper: CaseMapper): void {
    this.openMapper(mapper);
  }

  cloneMapper(mapper: CaseMapper): void {
    if (confirm(`Create a copy of "${mapper.name}"?`)) {
      this.apiService.cloneMapper(mapper.id!).subscribe({
        next: (clonedMapper) => {
          this.loadMappers();
          this.showSuccess(`Mapper cloned as "${clonedMapper.name}"`);
          this.router.navigate(['/mapper-builder', clonedMapper.id]);
        },
        error: (error) => {
          console.error('Failed to clone mapper:', error);
          this.showError('Failed to clone mapper');
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
        a.download = `${mapper.name.replace(/\s+/g, '_')}_v${mapper.version}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.showSuccess('Mapper exported successfully');
      },
      error: (error) => {
        console.error('Failed to export mapper:', error);
        this.showError('Failed to export mapper');
      }
    });
  }

  toggleMapperStatus(mapper: CaseMapper): void {
    const newStatus = !mapper.active_ind;
    const action = newStatus ? 'activate' : 'deactivate';

    if (confirm(`Are you sure you want to ${action} "${mapper.name}"?`)) {
      this.apiService.updateCaseMapper(mapper.id!, { ...mapper, active_ind: newStatus }).subscribe({
        next: () => {
          mapper.active_ind = newStatus;
          this.calculateStats();
          this.showSuccess(`Mapper ${action}d successfully`);
        },
        error: (error: any) => {
          console.error(`Failed to ${action} mapper:`, error);
          this.showError(`Failed to ${action} mapper`);
        }
      });
    }
  }

  deleteMapper(mapper: CaseMapper): void {
    if (mapper.active_ind) {
      this.showError('Cannot delete active mapper. Please deactivate it first.');
      return;
    }

    if (confirm(`Are you sure you want to delete "${mapper.name}" v${mapper.version}?\n\nThis action cannot be undone.`)) {
      this.apiService.deleteCaseMapper(mapper.id!).subscribe({
        next: () => {
          this.loadMappers();
          this.showSuccess('Mapper deleted successfully');
        },
        error: (error: any) => {
          console.error('Failed to delete mapper:', error);
          this.showError('Failed to delete mapper. It may have dependencies.');
        }
      });
    }
  }

  runMapper(mapper: CaseMapper): void {
    this.router.navigate(['/mapper-builder', mapper.id], {
      queryParams: { action: 'run' }
    });
  }

  viewHistory(mapper: CaseMapper): void {
    this.router.navigate(['/mapper-builder', mapper.id], {
      queryParams: { tab: 'logs' }
    });
  }

  // Bulk Actions
  selectAll(): void {
    if (this.selectedMappers.size === this.filteredMappers.length) {
      this.selectedMappers.clear();
    } else {
      this.filteredMappers.forEach(mapper => {
        if (mapper.id) this.selectedMappers.add(mapper.id);
      });
    }
  }

  toggleSelection(mapperId: number): void {
    if (this.selectedMappers.has(mapperId)) {
      this.selectedMappers.delete(mapperId);
    } else {
      this.selectedMappers.add(mapperId);
    }
  }

  isSelected(mapperId: number): boolean {
    return this.selectedMappers.has(mapperId);
  }

  exportSelected(): void {
    const selected = this.filteredMappers.filter(m => m.id && this.selectedMappers.has(m.id));
    if (selected.length === 0) {
      this.showError('No mappers selected');
      return;
    }

    // In real implementation, would batch export
    selected.forEach(mapper => this.exportMapper(mapper));
  }

  // Utility Methods
  getTargetCount(mapperId: number): number {
    return this.targetCounts.get(mapperId) || 0;
  }

  getVersionHistory(mapper: CaseMapper): string {
    if (mapper.parent) {
      return `Based on v${mapper.version - 1}`;
    }
    return 'Original version';
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return d.toLocaleDateString();
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.caseTypeFilter.setValue('');
    this.statusFilter.setValue('');
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: 'success-snackbar'
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: 'error-snackbar'
    });
  }
}
