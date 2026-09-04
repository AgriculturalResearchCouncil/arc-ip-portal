import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import {
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  gridOutline,
  documentTextOutline,
  folderOpenOutline,
  folderOutline,
  barChartOutline,
  settingsOutline,
  logOutOutline,
  newspaperOutline,
  businessOutline,
  analyticsOutline,
  peopleOutline,
  shieldOutline
} from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon
  ]
})
export class SidebarComponent implements OnInit {
  userInitials: string = 'U';
  userName: string = 'User';
  userRole: string = 'User';

  /**
   * Main navigation items - Core features
   */
  menuItems = [
    {
      label: 'Dashboard',
      url: '/dashboard',
      icon: 'grid-outline'
    },
    {
      label: 'Disclosures',
      url: '/disclosures',
      icon: 'document-text-outline'
    },
    {
      label: 'IP Assets',
      url: '/ip-assets',
      icon: 'folder-open-outline'
    },
    {
      label: 'Licences',
      url: '/licences',
      icon: 'newspaper-outline'
    },
    {
      label: 'Commercialisation',
      url: '/commercialisations',
      icon: 'business-outline'
    },
    {
      label: 'Documents',
      url: '/documents',
      icon: 'folder-outline'
    }
  ];

  /**
   * Reports navigation - Analytics dashboards
   */
  reportItems = [
    {
      label: 'Executive Dashboard',
      url: '/reports/executive',
      icon: 'analytics-outline'
    },
    {
      label: 'Researcher Dashboard',
      url: '/reports/researcher',
      icon: 'people-outline'
    },
    {
      label: 'TTO Dashboard',
      url: '/reports/tto',
      icon: 'shield-outline'
    }
  ];

  /**
   * Administration navigation - System management
   */
  adminItems = [
    {
      label: 'Admin',
      url: '/admin',
      icon: 'shield-outline'
    },
    {
      label: 'User Management',
      url: '/admin',
      icon: 'people-outline'
    }
  ];

  /**
   * Settings
   */
  settingsItems = [
    {
      label: 'Settings',
      url: '/settings',
      icon: 'settings-outline'
    }
  ];

  constructor(private authService: AuthService) {
    addIcons({
      gridOutline,
      documentTextOutline,
      folderOpenOutline,
      folderOutline,
      barChartOutline,
      settingsOutline,
      logOutOutline,
      newspaperOutline,
      businessOutline,
      analyticsOutline,
      peopleOutline,
      shieldOutline
    });
  }

  ngOnInit() {
    // Subscribe to user changes
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.updateUserInfo();
      }
    });

    // Also check for immediate user data
    this.updateUserInfo();
  }

  private updateUserInfo() {
    this.userInitials = this.authService.getUserInitials();
    this.userName = this.authService.getFullName();
    this.userRole = this.authService.getUserRoleDisplay();
  }

  /**
   * Logout
   */
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        window.location.href = '/login';
      },
      error: () => {
        window.location.href = '/login';
      }
    });
  }
}