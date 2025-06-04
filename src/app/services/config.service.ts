// services/config.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private baseUrlSubject = new BehaviorSubject<string>('');
  public baseUrl$ = this.baseUrlSubject.asObservable();

  constructor() {
    // Load saved base URL from localStorage
    const savedBaseUrl = localStorage.getItem('api_base_url');
    if (savedBaseUrl) {
      this.baseUrlSubject.next(savedBaseUrl);
    }
  }

  setBaseUrl(url: string): void {
    const formattedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    this.baseUrlSubject.next(formattedUrl);
    localStorage.setItem('api_base_url', formattedUrl);
  }

  getBaseUrl(): string {
    return this.baseUrlSubject.value;
  }

  isConfigured(): boolean {
    return !!this.baseUrlSubject.value;
  }
}
