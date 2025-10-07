import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinalReview } from './final-review';

describe('FinalReview', () => {
  let component: FinalReview;
  let fixture: ComponentFixture<FinalReview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinalReview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinalReview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
