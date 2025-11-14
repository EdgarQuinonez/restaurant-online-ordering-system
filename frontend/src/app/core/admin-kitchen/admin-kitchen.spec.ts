import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminKitchen } from './admin-kitchen';

describe('AdminKitchen', () => {
  let component: AdminKitchen;
  let fixture: ComponentFixture<AdminKitchen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminKitchen]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminKitchen);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
