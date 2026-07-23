import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreviousDailyUserDataComponent } from './previous-daily-user-data.component';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('PreviousDailyUserDataComponent', () => {
  let component: PreviousDailyUserDataComponent;
  let fixture: ComponentFixture<PreviousDailyUserDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreviousDailyUserDataComponent], providers: TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreviousDailyUserDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
