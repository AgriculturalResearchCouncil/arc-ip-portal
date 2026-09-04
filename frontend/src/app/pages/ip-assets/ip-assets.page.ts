import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon  } from '@ionic/angular';

@Component({
  selector: 'app-ip-assets',
  templateUrl: './ip-assets.page.html',
  styleUrls: ['./ip-assets.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon, CommonModule, FormsModule]
})
export class IpAssetsPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
