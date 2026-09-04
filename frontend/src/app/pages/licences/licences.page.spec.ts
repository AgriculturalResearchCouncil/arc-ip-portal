import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LicencesPage } from './licences.page';

describe('LicencesPage', () => {
  let component: LicencesPage;
  let fixture: ComponentFixture<LicencesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LicencesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
