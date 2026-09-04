import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LicenceDetailPage } from './licence-detail.page';

describe('LicenceDetailPage', () => {
  let component: LicenceDetailPage;
  let fixture: ComponentFixture<LicenceDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LicenceDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
