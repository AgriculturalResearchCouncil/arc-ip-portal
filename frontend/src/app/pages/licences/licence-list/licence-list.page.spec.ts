import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LicenceListPage } from './licence-list.page';

describe('LicenceListPage', () => {
  let component: LicenceListPage;
  let fixture: ComponentFixture<LicenceListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LicenceListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
