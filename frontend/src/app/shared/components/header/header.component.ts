import { Component, OnInit } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonMenuButton
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  searchOutline, 
  notificationsOutline,
  personOutline,
  logOutOutline
} from 'ionicons/icons';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonMenuButton
  ]
})
export class HeaderComponent implements OnInit {
  userInitials: string = 'U';
  userName: string = 'User';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({ 
      searchOutline, 
      notificationsOutline,
      personOutline,
      logOutOutline
    });
  }

  ngOnInit() {
    // Subscribe to user changes
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userInitials = this.authService.getUserInitials();
        this.userName = this.authService.getFullName();
      }
    });

    // Also check for immediate user data
    const user = this.authService.getUser();
    if (user) {
      this.userInitials = this.authService.getUserInitials();
      this.userName = this.authService.getFullName();
    }
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Logout error:', err);
        // Still navigate to login even if logout fails
        this.router.navigate(['/login']);
      }
    });
  }
}