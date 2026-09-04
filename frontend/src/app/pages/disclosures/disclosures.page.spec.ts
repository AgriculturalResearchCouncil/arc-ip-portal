import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DisclosuresPage } from './disclosures.page';

describe('DisclosuresPage', () => {
  let component: DisclosuresPage;
  let fixture: ComponentFixture<DisclosuresPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DisclosuresPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
