import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tray } from './tray';

describe('Tray', () => {
  let component: Tray;
  let fixture: ComponentFixture<Tray>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tray]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Tray);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
