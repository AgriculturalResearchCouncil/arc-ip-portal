import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewDisclosurePage } from './new-disclosure.page';

describe('NewDisclosurePage', () => {
  let component: NewDisclosurePage;
  let fixture: ComponentFixture<NewDisclosurePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NewDisclosurePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
