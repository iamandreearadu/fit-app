import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkoutsContentComponent } from './workouts-content.component';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('WorkoutsContentComponent', () => {
  let component: WorkoutsContentComponent;
  let fixture: ComponentFixture<WorkoutsContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkoutsContentComponent], providers: TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkoutsContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
