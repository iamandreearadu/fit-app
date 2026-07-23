import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';

import { NutritionTabComponent } from './nutrition-tab.component';
import { TEST_PROVIDERS } from '../../../testing/test-providers';
import { HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';

describe('NutritionTabComponent', () => {
  let component: NutritionTabComponent;
  let fixture: ComponentFixture<NutritionTabComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NutritionTabComponent], providers: TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(NutritionTabComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders loading while meals are requested', () => {
    expect(fixture.nativeElement.querySelector('.loading')).not.toBeNull();
  });

  it('passes the empty response to the guided empty state', fakeAsync(() => {
    http.expectOne(`${environment.apiUrl}/api/nutrition?pageSize=50`).flush([]);
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-nutrition-guided-empty')).not.toBeNull();
  }));

  it('passes request errors to the guided error state', fakeAsync(() => {
    http.expectOne(`${environment.apiUrl}/api/nutrition?pageSize=50`).flush('failed', { status: 500, statusText: 'Error' });
    tick();
    fixture.detectChanges();
    expect(component.facade.error()).toBe('Failed to load meals. Please try again.');
  }));
});
