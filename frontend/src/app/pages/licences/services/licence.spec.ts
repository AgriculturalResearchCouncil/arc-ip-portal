import { TestBed } from '@angular/core/testing';
import { Licence } from './licence';

describe('Licence', () => {
  let service: Licence;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Licence);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
