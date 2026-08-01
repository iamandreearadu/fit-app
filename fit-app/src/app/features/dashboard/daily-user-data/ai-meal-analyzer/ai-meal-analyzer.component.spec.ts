import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiMealAnalyzerComponent } from './ai-meal-analyzer.component';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';
import { GroqAiFacade } from '../../../../core/facade/groq-ai.facade';

describe('AiMealAnalyzerComponent', () => {
  let component: AiMealAnalyzerComponent;
  let fixture: ComponentFixture<AiMealAnalyzerComponent>;
  let groqFacade: GroqAiFacade;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiMealAnalyzerComponent], providers: TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiMealAnalyzerComponent);
    component = fixture.componentInstance;
    groqFacade = TestBed.inject(GroqAiFacade);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps analyze disabled until photo or meaningful description exists', () => {
    expect(component.canAnalyze).toBeFalse();
    component.onDescriptionChange('eggs');
    expect(component.canAnalyze).toBeTrue();
  });

  it('does not analyze automatically when a photo is selected', () => {
    const analyzeSpy = spyOn(groqFacade, 'analyzeMeal');
    const file = new File(['image'], 'meal.jpg', { type: 'image/jpeg' });
    const prepareSpy = spyOn(groqFacade, 'prepareMealImage').and.resolveTo(file);
    component.onFileChange({
      target: { files: [file], value: '' },
    } as unknown as Event);
    expect(analyzeSpy).not.toHaveBeenCalled();
    expect(prepareSpy).toHaveBeenCalledOnceWith(file);
  });

  it('analyzes a description without an image', async () => {
    spyOn(groqFacade, 'analyzeMeal').and.resolveTo({
      protein_g: 18,
      carbs_g: 30,
      fats_g: 14,
      calories_kcal: 320,
      items: [{ name: 'Eggs and toast', confidence: 0.8 }],
    });
    component.onDescriptionChange('2 eggs and two slices of toast');

    await component.analyze();

    expect(groqFacade.analyzeMeal).toHaveBeenCalledWith({
      file: undefined,
      description: '2 eggs and two slices of toast',
    });
    expect(component.analysisSource).toBe('description');
    expect(component.result?.calories_kcal).toBe(320);
    expect(component.loading).toBeFalse();
    fixture.detectChanges();
    const analyzeButton = fixture.nativeElement.querySelector('.analyze-meal-btn') as HTMLButtonElement;
    expect(analyzeButton.textContent).toContain('Analyze again');
    expect(analyzeButton.textContent).not.toContain('Analyzing meal');
  });

  it('marks a completed result stale when its description changes', () => {
    component.result = { protein_g: 10, carbs_g: 20, fats_g: 5 };
    component.onDescriptionChange('updated meal');
    expect(component.resultIsStale).toBeTrue();
  });

  it('clear resets both meal evidence inputs and result state', () => {
    component.mealDescription = 'meal';
    component.result = { protein_g: 10, carbs_g: 20, fats_g: 5 };
    component.resultIsStale = true;
    component.clear();
    expect(component.mealDescription).toBe('');
    expect(component.result).toBeNull();
    expect(component.resultIsStale).toBeFalse();
  });
});
