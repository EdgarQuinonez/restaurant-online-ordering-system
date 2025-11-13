import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { orderDetailResolver } from './order-detail-resolver';

describe('orderDetailResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => orderDetailResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
