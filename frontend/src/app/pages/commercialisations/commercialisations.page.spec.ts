import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommercialisationsPage } from './commercialisations.page';

describe('CommercialisationsPage', () => {
  let component: CommercialisationsPage;
  let fixture: ComponentFixture<CommercialisationsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CommercialisationsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
