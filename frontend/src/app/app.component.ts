// src/app/app.component.ts
import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  imports: [IonApp, IonRouterOutlet]
})
export class AppComponent {
  constructor() {
    console.log('ARC IP Portal v1.0.0');
  }
}