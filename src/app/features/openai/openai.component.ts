import { Component, inject } from '@angular/core';
import { HeaderComponent } from "../../shared/components/header/header.component";
import { FooterComponent } from "../../shared/components/footer/footer.component";
import { GroqComponent } from './groq/groq.component';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../core/material/material.module';
import { GroqSidenavComponent } from './groq-sidenav/groq-sidenav.component';

@Component({
  selector: 'app-openai',
  imports: [HeaderComponent, FooterComponent,GroqComponent, CommonModule, GroqComponent, GroqSidenavComponent,MaterialModule],
  templateUrl: './openai.component.html',
  styleUrl: './openai.component.css'
})
export class OpenaiComponent {


}
