import { Component, OnDestroy, OnInit } from '@angular/core';
import { HeaderComponent } from "../../shared/components/header/header.component";
import { GroqComponent } from './groq/groq.component';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../core/material/material.module';
import { GroqSidenavComponent } from './groq-sidenav/groq-sidenav.component';

@Component({
  selector: 'app-openai',
  imports: [HeaderComponent,GroqComponent, CommonModule, GroqComponent, GroqSidenavComponent,MaterialModule],
  templateUrl: './openai.component.html',
  styleUrl: './openai.component.css'
})
 export class OpenaiComponent  implements OnInit, OnDestroy {
  isHandset = false;
  sidebarOpen = true;

  private mq?: MediaQueryList;
  private onChange = (e: MediaQueryListEvent) => this.applyBreakpoint(e.matches);

  ngOnInit(): void {
    this.mq = window.matchMedia('(max-width: 768px)');
    this.applyBreakpoint(this.mq.matches);
    this.mq.addEventListener?.('change', this.onChange);
  }

  ngOnDestroy(): void {
    this.mq?.removeEventListener?.('change', this.onChange);
  }

  openSidebar(): void { this.sidebarOpen = true; }
  closeSidebar(): void { this.sidebarOpen = false; }

  private applyBreakpoint(isMobile: boolean): void {
    this.isHandset = isMobile;
    this.sidebarOpen = !isMobile; 
    }
}