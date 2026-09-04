import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LicenceFormPage } from './licence-form.page';

describe('LicenceFormPage', () => {
  let component: LicenceFormPage;
  let fixture: ComponentFixture<LicenceFormPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LicenceFormPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
