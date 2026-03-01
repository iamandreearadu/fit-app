import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NutritionTabComponent } from './nutrition-tab.component';

describe('NutritionTabComponent', () => {
  let component: NutritionTabComponent;
  let fixture: ComponentFixture<NutritionTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NutritionTabComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NutritionTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
