import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostSubmission } from './post-submission';

describe('PostSubmission', () => {
  let component: PostSubmission;
  let fixture: ComponentFixture<PostSubmission>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostSubmission]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PostSubmission);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
