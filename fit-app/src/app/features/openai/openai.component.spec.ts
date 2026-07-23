import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenaiComponent } from './openai.component';
import { TEST_PROVIDERS } from '../../testing/test-providers';

describe('OpenaiComponent', () => {
  let component: OpenaiComponent;
  let fixture: ComponentFixture<OpenaiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpenaiComponent], providers: TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpenaiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
