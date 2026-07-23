import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';

import { WorkoutsTabComponent } from './workouts-tab.component';
import { TEST_PROVIDERS } from '../../../testing/test-providers';
import { HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';

describe('WorkoutsTabComponent', () => {
  let component: WorkoutsTabComponent;
  let fixture: ComponentFixture<WorkoutsTabComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkoutsTabComponent], providers: TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkoutsTabComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders loading while workouts are requested', () => {
    expect(fixture.nativeElement.querySelector('.loading')).not.toBeNull();
  });

  it('renders the empty state for an empty response', fakeAsync(() => {
    http.expectOne(`${environment.apiUrl}/api/workouts`).flush([]);
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No workouts yet');
  }));

  it('renders a retryable error when loading fails', fakeAsync(() => {
    http.expectOne(`${environment.apiUrl}/api/workouts`).flush('failed', { status: 500, statusText: 'Error' });
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-cy="workouts-error"]')).not.toBeNull();
  }));
});
