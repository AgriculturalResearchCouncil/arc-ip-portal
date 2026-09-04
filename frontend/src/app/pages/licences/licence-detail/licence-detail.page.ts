import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon  } from '@ionic/angular';

@Component({
  selector: 'app-licence-detail',
  templateUrl: './licence-detail.page.html',
  styleUrls: ['./licence-detail.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon, CommonModule, FormsModule]
})
export class LicenceDetailPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
