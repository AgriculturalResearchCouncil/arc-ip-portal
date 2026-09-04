import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import {
  IonSplitPane,
  IonMenu
} from '@ionic/angular';

import { HeaderComponent } from '../../shared/components/header/header.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  imports: [
    RouterOutlet,
    IonSplitPane,
    IonMenu,
    HeaderComponent,
    SidebarComponent
  ]
})
export class MainLayoutComponent {}