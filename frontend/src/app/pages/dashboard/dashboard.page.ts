// src/app/pages/dashboard/dashboard.page.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
  refreshOutline,
  leafOutline,
  ribbonOutline,
  createOutline,
  lockClosedOutline,
  downloadOutline
} from 'ionicons/icons';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';

// Interface matching the actual API response
interface ExecutiveData {
  total_ip_assets: number;
  active_ip_assets: number;
  draft_ip_assets: number;
  total_disclosures: number;
  pending_disclosures: number;
  approved_disclosures: number;
  active_licences: number;
  overdue_licences: number;
  active_commercialisations: number;
  completed_commercialisations: number;
  granted_patents: number;
  active_researchers: number;
}

interface IPTypeBreakdown {
  record_type: string;
  count: number;
  active_count: number;
  draft_count: number;
  submitted_count: number;
}

interface DashboardResponse {
  executive: ExecutiveData;
  ipTypeBreakdown: IPTypeBreakdown[];
}

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
  dashboardData: DashboardResponse | null = null;
  isLoading = true;
  error: string | null = null;
  userRole: string = '';

  // Stats for cards - simplified to match API data
  stats = [
    { label: 'Total IP Assets', value: 0, icon: 'folder-open-outline', type: 'primary' },
    { label: 'Active IP Assets', value: 0, icon: 'checkmark-circle-outline', type: 'success' },
    { label: 'Active Licences', value: 0, icon: 'document-text-outline', type: 'tertiary' },
    { label: 'Granted Patents', value: 0, icon: 'business-outline', type: 'gold' }
  ];

  // Additional metrics
  metrics = [
    { label: 'Total Disclosures', value: 0, icon: 'document-text-outline', type: 'primary' },
    { label: 'Pending Disclosures', value: 0, icon: 'time-outline', type: 'warning' },
    { label: 'Active Researchers', value: 0, icon: 'people-outline', type: 'success' },
    { label: 'Commercialisations', value: 0, icon: 'briefcase-outline', type: 'gold' }
  ];

  ipBreakdown: IPTypeBreakdown[] = [];

  private subscriptions: Subscription[] = [];

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef  // ← ADD THIS
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
      refreshOutline,
      leafOutline,
      ribbonOutline,
      createOutline,
      lockClosedOutline,
      downloadOutline
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
    // console.log('👤 User role:', this.userRole);

    const sub = this.dashboardService.getDashboard().subscribe({
      next: (response: any) => {
        // console.log('📊 Dashboard response:', response);
        
        // Handle both response formats
        let data = response;
        if (response && response.data) {
          data = response.data;
        }
        
        if (data && data.executive) {
          this.dashboardData = data;
          this.updateStats(data);
          this.ipBreakdown = data.ipTypeBreakdown || [];
          // console.log('✅ Dashboard loaded successfully!');
          // console.log('📊 dashboardData:', this.dashboardData);
          // console.log('📊 stats:', this.stats);
          // console.log('📊 ipBreakdown:', this.ipBreakdown);
          
          // FORCE CHANGE DETECTION
          this.cdr.detectChanges();
        } else {
          // console.error('❌ Invalid data structure:', data);
          this.error = 'Invalid data structure from server';
        }
        
        // ALWAYS set loading to false
        this.isLoading = false;
        this.cdr.detectChanges();  // ← Force update
      },
      error: (err) => {
        // console.error('❌ Error loading dashboard:', err);
        this.error = err.message || 'Failed to load dashboard data';
        this.isLoading = false;
        this.cdr.detectChanges();  // ← Force update
      }
    });

    this.subscriptions.push(sub);
  }

  private updateStats(data: DashboardResponse) {
    if (!data || !data.executive) return;

    const e = data.executive;
    
    // Main stats
    this.stats[0].value = e.total_ip_assets || 0;
    this.stats[1].value = e.active_ip_assets || 0;
    this.stats[2].value = e.active_licences || 0;
    this.stats[3].value = e.granted_patents || 0;

    // Metrics
    this.metrics[0].value = e.total_disclosures || 0;
    this.metrics[1].value = e.pending_disclosures || 0;
    this.metrics[2].value = e.active_researchers || 0;
    this.metrics[3].value = e.active_commercialisations || 0;
  }

  getTotalIPCount(): number {
    return this.dashboardData?.executive?.total_ip_assets || 0;
  }

  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'PATENT': 'business-outline',
      'PBR': 'leaf-outline',
      'TRADEMARK': 'ribbon-outline',
      'LICENCE': 'document-text-outline',
      'DESIGN': 'create-outline',
      'TRADE_SECRET': 'lock-closed-outline',
      'Disclosure': 'document-text-outline'
    };
    return icons[type] || 'folder-outline';
  }

  getTypeColor(type: string): string {
    const colors: { [key: string]: string } = {
      'PATENT': 'primary',
      'PBR': 'success',
      'TRADEMARK': 'tertiary',
      'LICENCE': 'warning',
      'DESIGN': 'medium',
      'TRADE_SECRET': 'danger',
      'Disclosure': 'primary'
    };
    return colors[type] || 'medium';
  }

  refresh() {
    this.loadDashboard();
  }
}