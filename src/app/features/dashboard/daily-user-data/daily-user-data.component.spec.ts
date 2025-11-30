import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyUserDataComponent } from './daily-user-data.component';

describe('DailyUserDataComponent', () => {
  let component: DailyUserDataComponent;
  let fixture: ComponentFixture<DailyUserDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyUserDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyUserDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
