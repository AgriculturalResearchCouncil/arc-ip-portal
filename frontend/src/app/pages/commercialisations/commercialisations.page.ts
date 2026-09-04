import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon } from '@ionic/angular';

@Component({
  selector: 'app-commercialisations',
  templateUrl: './commercialisations.page.html',
  styleUrls: ['./commercialisations.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon, CommonModule, FormsModule]
})
export class CommercialisationsPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
