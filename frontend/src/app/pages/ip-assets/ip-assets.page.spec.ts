import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IpAssetsPage } from './ip-assets.page';

describe('IpAssetsPage', () => {
  let component: IpAssetsPage;
  let fixture: ComponentFixture<IpAssetsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(IpAssetsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
