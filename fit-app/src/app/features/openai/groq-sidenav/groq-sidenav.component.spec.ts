import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroqSidenavComponent } from './groq-sidenav.component';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('GroqSidenavComponent', () => {
  let component: GroqSidenavComponent;
  let fixture: ComponentFixture<GroqSidenavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroqSidenavComponent], providers: TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroqSidenavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
