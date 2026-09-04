import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon } from '@ionic/angular';

@Component({
  selector: 'app-licence-form',
  templateUrl: './licence-form.page.html',
  styleUrls: ['./licence-form.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon, CommonModule, FormsModule]
})
export class LicenceFormPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
