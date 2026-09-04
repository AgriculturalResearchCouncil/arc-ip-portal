import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon  } from '@ionic/angular';

@Component({
  selector: 'app-licence-list',
  templateUrl: './licence-list.page.html',
  styleUrls: ['./licence-list.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon, CommonModule, FormsModule]
})
export class LicenceListPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
