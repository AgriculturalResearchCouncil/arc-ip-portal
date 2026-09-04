// src/app/pages/dashboard/dashboard.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonIcon,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonChip,
  IonSpinner
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  folderOpenOutline,
  timeOutline,
  documentTextOutline,
  cashOutline,
  arrowUpOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  trendingUpOutline,
  arrowForwardOutline,
  addOutline,
  barChartOutline,
  briefcaseOutline,
  peopleOutline,
  calendarOutline,
  warningOutline,
  hourglassOutline,
  checkmarkDoneCircleOutline,
  businessOutline,
  statsChartOutline,
  clipboardOutline,
  fileTrayFullOutline,
  refreshOutline
} from 'ionicons/icons';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardData, RecentActivity, PendingTask, ExpiringItem, IPBreakdown } from '../../core/models/dashboard.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonIcon,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonChip,
    IonSpinner
  ]
})
export class DashboardPage implements OnInit, OnDestroy {
  // Data
  dashboardData: DashboardData | null = null;
  isLoading = true;
  error: string | null = null;
  userRole: string = '';

  // Stats
  stats = [
    { label: 'Total IP Assets', value: 0, change: '', icon: 'folder-open-outline', type: 'primary' },
    { label: 'Pending Disclosures', value: 0, change: '', icon: 'time-outline', type: 'warning' },
    { label: 'Active Licences', value: 0, change: '', icon: 'document-text-outline', type: 'success' },
    { label: 'Revenue Generated', value: 'R0', change: '', icon: 'cash-outline', type: 'gold' }
  ];

  recentActivities: RecentActivity[] = [];
  pendingTasks: PendingTask[] = [];
  expiringItems: ExpiringItem[] = [];
  ipBreakdown: IPBreakdown[] = [];

  private subscriptions: Subscription[] = [];

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService
  ) {
    addIcons({
      folderOpenOutline,
      timeOutline,
      documentTextOutline,
      cashOutline,
      arrowUpOutline,
      alertCircleOutline,
      checkmarkCircleOutline,
      trendingUpOutline,
      arrowForwardOutline,
      addOutline,
      barChartOutline,
      briefcaseOutline,
      peopleOutline,
      calendarOutline,
      warningOutline,
      hourglassOutline,
      checkmarkDoneCircleOutline,
      businessOutline,
      statsChartOutline,
      clipboardOutline,
      fileTrayFullOutline,
      refreshOutline
    });
  }

  ngOnInit() {
    this.loadDashboard();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadDashboard() {
    this.isLoading = true;
    this.error = null;

    const user = this.authService.getUser();
    this.userRole = user?.role || '';

    let dashboard$;

    // Load dashboard based on role
    if (this.userRole === 'Executive') {
      dashboard$ = this.dashboardService.getExecutiveDashboard();
    } else if (this.userRole === 'TTO Officer' || this.userRole === 'Admin') {
      dashboard$ = this.dashboardService.getTTODashboard();
    } else if (this.userRole === 'Researcher') {
      dashboard$ = this.dashboardService.getResearcherDashboard();
    } else {
      dashboard$ = this.dashboardService.getDashboard();
    }

    const sub = dashboard$.subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.updateStats(data);
        this.recentActivities = data.recentActivity || [];
        this.pendingTasks = data.pendingTasks || [];
        this.expiringItems = data.expiringItems || [];
        this.ipBreakdown = data.ipBreakdown || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard:', err);
        this.error = err.message || 'Failed to load dashboard data';
        this.isLoading = false;
        this.loadFallbackData();
      }
    });

    this.subscriptions.push(sub);
  }

  private updateStats(data: DashboardData) {
    if (!data || !data.stats) return;

    const s = data.stats;
    this.stats[0].value = s.totalIPAssets || 0;
    this.stats[1].value = s.pendingDisclosures || 0;
    this.stats[2].value = s.activeLicences || 0;
    this.stats[3].value = `R${(s.totalRevenue || 0).toLocaleString()}`;
  }

  private loadFallbackData() {
    // Load data from individual endpoints as fallback
    const sub1 = this.dashboardService.getIPAssetStats().subscribe({
      next: (data) => {
        this.stats[0].value = data.total || 0;
      },
      error: () => {}
    });

    const sub2 = this.dashboardService.getDisclosureStats().subscribe({
      next: (data) => {
        // Fixed: Use underReview or total as fallback
        this.stats[1].value = data.underReview || data.total || 0;
      },
      error: () => {}
    });

    const sub3 = this.dashboardService.getLicenceStats().subscribe({
      next: (data) => {
        this.stats[2].value = data.active || 0;
        this.stats[3].value = `R${(data.totalRevenue || 0).toLocaleString()}`;
      },
      error: () => {}
    });

    const sub4 = this.dashboardService.getRecentActivity(10).subscribe({
      next: (data) => {
        this.recentActivities = data;
      },
      error: () => {}
    });

    const sub5 = this.dashboardService.getPendingTasks().subscribe({
      next: (data) => {
        this.pendingTasks = data;
      },
      error: () => {}
    });

    const sub6 = this.dashboardService.getIPBreakdown().subscribe({
      next: (data) => {
        this.ipBreakdown = data;
      },
      error: () => {}
    });

    this.subscriptions.push(sub1, sub2, sub3, sub4, sub5, sub6);
  }

  getPriorityColor(priority: string): string {
    const colors: { [key: string]: string } = {
      'High': 'danger',
      'Medium': 'warning',
      'Low': 'success'
    };
    return colors[priority] || 'medium';
  }

  getPriorityIcon(priority: string): string {
    const icons: { [key: string]: string } = {
      'High': 'alert-circle-outline',
      'Medium': 'hourglass-outline',
      'Low': 'checkmark-circle-outline'
    };
    return icons[priority] || 'ellipse-outline';
  }

  getExpiryStatus(daysRemaining: number): string {
    if (daysRemaining <= 30) return 'danger';
    if (daysRemaining <= 90) return 'warning';
    return 'success';
  }

  getActivityIcon(action: string): string {
    const icons: { [key: string]: string } = {
      'CREATE': 'add-circle-outline',
      'UPDATE': 'create-outline',
      'DELETE': 'trash-outline',
      'SUBMIT': 'send-outline',
      'REVIEW': 'eye-outline',
      'APPROVE': 'checkmark-circle-outline',
      'REJECT': 'close-circle-outline',
      'UPLOAD': 'cloud-upload-outline',
      'DOWNLOAD': 'cloud-download-outline'
    };
    return icons[action] || 'ellipse-outline';
  }

  refresh() {
    this.loadDashboard();
  }
}