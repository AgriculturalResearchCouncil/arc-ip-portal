import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon  } from '@ionic/angular';

@Component({
  selector: 'app-new-disclosure',
  templateUrl: './new-disclosure.page.html',
  styleUrls: ['./new-disclosure.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon, CommonModule, FormsModule]
})
export class NewDisclosurePage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
