import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiMealAnalyzerComponent } from './ai-meal-analyzer.component';

describe('AiMealAnalyzerComponent', () => {
  let component: AiMealAnalyzerComponent;
  let fixture: ComponentFixture<AiMealAnalyzerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiMealAnalyzerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiMealAnalyzerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
