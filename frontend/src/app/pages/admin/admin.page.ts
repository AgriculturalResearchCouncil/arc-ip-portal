import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonTitle,  IonButton, IonIcon } from '@ionic/angular';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  imports: [IonContent, IonTitle,  IonButton, IonIcon, CommonModule, FormsModule]
})
export class AdminPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
