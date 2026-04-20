import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkoutsTabComponent } from './workouts-tab.component';

describe('WorkoutsTabComponent', () => {
  let component: WorkoutsTabComponent;
  let fixture: ComponentFixture<WorkoutsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkoutsTabComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkoutsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
