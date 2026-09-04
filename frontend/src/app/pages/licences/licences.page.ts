import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon  } from '@ionic/angular';

@Component({
  selector: 'app-licences',
  templateUrl: './licences.page.html',
  styleUrls: ['./licences.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon, CommonModule, FormsModule]
})
export class LicencesPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
