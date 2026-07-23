import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiMealAnalyzerComponent } from './ai-meal-analyzer.component';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';

describe('AiMealAnalyzerComponent', () => {
  let component: AiMealAnalyzerComponent;
  let fixture: ComponentFixture<AiMealAnalyzerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiMealAnalyzerComponent], providers: TEST_PROVIDERS
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
