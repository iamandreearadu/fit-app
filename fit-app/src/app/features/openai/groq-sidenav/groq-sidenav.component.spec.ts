import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroqSidenavComponent } from './groq-sidenav.component';

describe('GroqSidenavComponent', () => {
  let component: GroqSidenavComponent;
  let fixture: ComponentFixture<GroqSidenavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroqSidenavComponent]
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
