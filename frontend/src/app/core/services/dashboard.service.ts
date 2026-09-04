// src/app/core/services/dashboard.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  DashboardData,
  DashboardStats,
  DisclosureStats,
  IPAssetStats,
  LicenceStats,
  RecentActivity,
  PendingTask,
  ExpiringItem,
  IPBreakdown,
  MonthlyTrend
} from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService extends ApiService {

  /**
   * Get user-specific dashboard data
   */
  getDashboard(): Observable<DashboardData> {
    return this.get<{ success: boolean; data: DashboardData }>('/reports/dashboard')
      .pipe(map(response => response.data));
  }

  /**
   * Get Executive Dashboard
   * Access: Executive, Admin
   */
  getExecutiveDashboard(): Observable<DashboardData> {
    return this.get<{ success: boolean; data: DashboardData }>('/reports/dashboard/executive')
      .pipe(map(response => response.data));
  }

  /**
   * Get TTO Dashboard
   * Access: TTO Officer, Admin
   */
  getTTODashboard(): Observable<DashboardData> {
    return this.get<{ success: boolean; data: DashboardData }>('/reports/dashboard/tto')
      .pipe(map(response => response.data));
  }

  /**
   * Get Researcher Dashboard
   * Access: Researcher
   */
  getResearcherDashboard(): Observable<DashboardData> {
    return this.get<{ success: boolean; data: DashboardData }>('/reports/dashboard/researcher')
      .pipe(map(response => response.data));
  }

  /**
   * Get Disclosure Statistics
   */
  getDisclosureStats(): Observable<DisclosureStats> {
    return this.get<{ success: boolean; data: DisclosureStats }>('/disclosures/statistics')
      .pipe(map(response => response.data));
  }

  /**
   * Get IP Asset Statistics
   */
  getIPAssetStats(): Observable<IPAssetStats> {
    return this.get<{ success: boolean; data: IPAssetStats }>('/ip-assets/statistics')
      .pipe(map(response => response.data));
  }

  /**
   * Get Licence Statistics
   */
  getLicenceStats(): Observable<LicenceStats> {
    return this.get<{ success: boolean; data: LicenceStats }>('/licences/statistics')
      .pipe(map(response => response.data));
  }

  /**
   * Get Recent Activity
   */
  getRecentActivity(limit: number = 10): Observable<RecentActivity[]> {
    return this.get<{ success: boolean; data: RecentActivity[]; count: number }>(`/audit/logs?limit=${limit}`)
      .pipe(map(response => response.data));
  }

  /**
   * Get Pending Tasks for current user
   */
  getPendingTasks(): Observable<PendingTask[]> {
    return this.get<{ success: boolean; data: PendingTask[]; count: number }>('/workflows/tasks/pending')
      .pipe(map(response => response.data));
  }

  /**
   * Get Expiring Licences
   */
  getExpiringLicences(days: number = 90): Observable<ExpiringItem[]> {
    return this.get<{ success: boolean; data: ExpiringItem[]; count: number }>(`/licences/expiring?days=${days}`)
      .pipe(map(response => response.data));
  }

  /**
   * Get Expiring Patents
   */
  getExpiringPatents(days: number = 180): Observable<ExpiringItem[]> {
    return this.get<{ success: boolean; data: ExpiringItem[]; count: number }>(`/patents/expiring?days=${days}`)
      .pipe(map(response => response.data));
  }

  /**
   * Get IP Type Breakdown
   */
  getIPBreakdown(): Observable<IPBreakdown[]> {
    return this.get<{ success: boolean; data: IPBreakdown[] }>('/reports/ip-breakdown')
      .pipe(map(response => response.data));
  }

  /**
   * Get Monthly Trends
   */
  getTrends(months: number = 12, type: string = 'disclosure'): Observable<MonthlyTrend[]> {
    return this.get<{ success: boolean; data: MonthlyTrend[] }>(`/reports/trends?months=${months}&type=${type}`)
      .pipe(map(response => response.data));
  }
}