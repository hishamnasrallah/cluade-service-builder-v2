// src/app/components/mapper-builder/components/logs-viewer/logs-viewer.component.ts
import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';

import { MapperExecutionLog } from '../../../../models/mapper.models';
import { MapperApiService } from '../../../../services/mapper-api.service';

@Component({
  selector: 'app-logs-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatChipListbox,
    MatChipOption,
    MatTooltipModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTabsModule,
    MatBadgeModule
  ],
  templateUrl: './logs-viewer.component.html',
  styleUrls: ['./logs-viewer.component.scss']
})
export class LogsViewerComponent implements OnInit, OnChanges {
  // Input properties - explicitly typed
  @Input() public mapperId?: number;
  @Input() public targetId?: string;

  // Component state - all public for template access
  public isLoading: boolean = false;
  public logs: MapperExecutionLog[] = [];
  public recentLogs: MapperExecutionLog[] = [];
  public errorLogs: MapperExecutionLog[] = [];
  public expandedLogId: number | null = null;

  // Statistics - all public
  public successCount: number = 0;
  public errorCount: number = 0;
  public avgExecutionTime: number = 0;
  public totalRecords: number = 0;
  public successRate: number = 0;
  public executionTimes: number[] = [];
  public maxExecutionTime: number = 0;
  public executionFrequency: { date: Date; count: number }[] = [];
  public maxFrequency: number = 0;

  constructor(private apiService: MapperApiService) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mapperId'] || changes['targetId']) {
      this.loadLogs();
    }
  }

  private loadLogs(): void {
    if (!this.mapperId && !this.targetId) {
      this.logs = [];
      return;
    }

    this.isLoading = true;

    const params: any = {};
    if (this.mapperId) params.case_mapper = this.mapperId;
    if (this.targetId) params.mapper_target = this.targetId;

    this.apiService.getExecutionLogs(params).subscribe({
      next: (response: any) => {
        // Handle the response based on whether it's paginated or not
        this.logs = response.results || response || [];
        this.processLogs();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load logs:', error);
        this.logs = [];
        this.isLoading = false;
      }
    });
  }

  private processLogs(): void {
    // Separate recent and error logs
    this.recentLogs = this.logs.slice(0, 10);
    this.errorLogs = this.logs.filter(log => !log.success);

    // Calculate statistics
    this.successCount = this.logs.filter(log => log.success).length;
    this.errorCount = this.logs.filter(log => !log.success).length;

    const executionTimes = this.logs
      .filter(log => log.execution_time_ms)
      .map(log => log.execution_time_ms!);

    this.avgExecutionTime = executionTimes.length > 0
      ? Math.round(executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length)
      : 0;

    this.totalRecords = this.logs.reduce((sum, log) =>
      sum + (log.records_created || 0) + (log.records_updated || 0), 0
    );

    this.successRate = this.logs.length > 0
      ? Math.round((this.successCount / this.logs.length) * 100)
      : 0;

    // Execution times for trend
    this.executionTimes = this.logs.slice(0, 20).map(log => log.execution_time_ms || 0);
    this.maxExecutionTime = Math.max(...this.executionTimes, 1);

    // Calculate frequency
    this.calculateExecutionFrequency();
  }

  private calculateExecutionFrequency(): void {
    const frequency = new Map<string, number>();

    this.logs.forEach(log => {
      const date = new Date(log.executed_at);
      const dateKey = date.toDateString();
      frequency.set(dateKey, (frequency.get(dateKey) || 0) + 1);
    });

    this.executionFrequency = Array.from(frequency.entries())
      .map(([dateStr, count]) => ({
        date: new Date(dateStr),
        count
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 7);

    this.maxFrequency = Math.max(...this.executionFrequency.map(f => f.count), 1);
  }

  public getTargetName(targetId: string): string {
    // In real implementation, lookup target name
    return targetId;
  }

  public formatJson(data: any): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  public getErrorMessage(log: MapperExecutionLog): string {
    if (log.error_trace) {
      // Extract first line or main error message
      const lines = log.error_trace.split('\n');
      return lines[lines.length - 1] || 'Unknown error';
    }
    return 'Execution failed';
  }

  public viewFullLog(log: MapperExecutionLog): void {
    // Open in dialog or new window
    console.log('View full log:', log);
  }

  public rerunExecution(log: MapperExecutionLog): void {
    if (confirm('Re-run this mapping execution?')) {
      // Trigger re-run
      console.log('Re-run execution:', log);
    }
  }

  public showErrorDetails(log: MapperExecutionLog): void {
    // Show error details in dialog
    console.log('Show error details:', log);
  }
}
