// src/app/core/services/dashboard.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardService extends ApiService {

  /**
   * Get user-specific dashboard data
   * The API returns: { success: true, data: { executive: {...}, ipTypeBreakdown: [...] } }
   */
  getDashboard(): Observable<any> {
    console.log('📊 Fetching dashboard data...');
    return this.get<any>('/reports/dashboard').pipe(
      map(response => {
        console.log('📥 Raw API response:', response);
        // The API returns { success: true, data: {...} }
        // We need to extract the data property
        if (response && response.success && response.data) {
          console.log('✅ Extracted data:', response.data);
          return response.data;
        }
        // Fallback: if response is already the data
        return response;
      })
    );
  }

  /**
   * Get Executive Dashboard
   */
  getExecutiveDashboard(): Observable<any> {
    return this.get<any>('/reports/dashboard/executive').pipe(
      map(response => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return response;
      })
    );
  }

  /**
   * Get TTO Dashboard
   */
  getTTODashboard(): Observable<any> {
    return this.get<any>('/reports/dashboard/tto').pipe(
      map(response => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return response;
      })
    );
  }

  /**
   * Get Researcher Dashboard
   */
  getResearcherDashboard(): Observable<any> {
    return this.get<any>('/reports/dashboard/researcher').pipe(
      map(response => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return response;
      })
    );
  }

  /**
   * Get IP Type Breakdown
   */
  getIPBreakdown(): Observable<any> {
    return this.get<any>('/reports/ip-breakdown').pipe(
      map(response => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return response;
      })
    );
  }

  /**
   * Get Monthly Trends
   */
  getTrends(months: number = 12, type: string = 'disclosure'): Observable<any> {
    return this.get<any>(`/reports/trends?months=${months}&type=${type}`).pipe(
      map(response => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return response;
      })
    );
  }
}