import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {RouterOutlet, Router, RouterLink} from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    RouterLink
  ],
  template: `
    <div class="app-container">
      <mat-toolbar color="primary" class="app-toolbar">
        <span>Workflow Builder</span>
        <span class="spacer"></span>

        <button mat-button routerLink="/approval-flow">
          <mat-icon>account_tree</mat-icon>
          Approval Flows
        </button>
        <button mat-button *ngIf="authService.isAuthenticated()" (click)="logout()">
          <mat-icon>logout</mat-icon>
          Logout
        </button>
      </mat-toolbar>
      <main class="app-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .app-toolbar {
      flex-shrink: 0;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .app-content {
      flex: 1;
      overflow: hidden;
    }
  `]
})
export class AppComponent {
  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
