import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon  } from '@ionic/angular';

@Component({
  selector: 'app-disclosures',
  templateUrl: './disclosures.page.html',
  styleUrls: ['./disclosures.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon, CommonModule, FormsModule]
})
export class DisclosuresPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
