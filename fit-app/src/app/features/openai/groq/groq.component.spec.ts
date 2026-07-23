import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroqComponent } from './groq.component';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('GroqComponent', () => {
  let component: GroqComponent;
  let fixture: ComponentFixture<GroqComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroqComponent], providers: TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroqComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
