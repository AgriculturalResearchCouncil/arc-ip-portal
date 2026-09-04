// src/app/core/models/dashboard.model.ts

export interface DashboardStats {
  totalIPAssets: number;
  totalDisclosures: number;
  pendingDisclosures: number;
  activeLicences: number;
  totalRevenue: number;
  commercialisationRate: number;
}

export interface DisclosureStats {
  total: number;
  submitted: number;
  underReview: number;
  approved: number;
  rejected: number;
  draft: number;
  category_breakdown?: CategoryBreakdown[];
  monthly_trends?: MonthlyTrend[];
}

export interface CategoryBreakdown {
  category: string;
  count: number;
}

export interface MonthlyTrend {
  month: string;
  count: number;
}

export interface IPAssetStats {
  total: number;
  by_type: {
    patent: number;
    pbr: number;
    trademark: number;
    copyright: number;
    design: number;
    tradeSecret: number;
  };
  by_status: {
    active: number;
    pending: number;
    expired: number;
    abandoned: number;
  };
}

export interface LicenceStats {
  total_licences: number;
  active: number;
  pending: number;
  expired: number;
  totalRevenue: number;
  by_type?: {
    exclusive: number;
    nonExclusive: number;
    sole: number;
  };
}

export interface RecentActivity {
  id?: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  user?: string;
  timestamp: string;
  details?: any;
}

export interface PendingTask {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'In Progress' | 'Completed';
  assignedTo: string;
}

export interface ExpiringItem {
  id: string;
  title: string;
  expiryDate: string;
  daysRemaining: number;
  type: string;
  status: string;
}

export interface IPBreakdown {
  type: string;
  count: number;
  percentage: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivity: RecentActivity[];
  pendingTasks: PendingTask[];
  expiringItems: ExpiringItem[];
  ipBreakdown: IPBreakdown[];
  trends: MonthlyTrend[];
}