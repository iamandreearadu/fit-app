import { Component, inject, OnInit, effect } from '@angular/core';
import { UserFacade } from '../../../core/facade/user.facade';
import { DailyUserData } from '../../../core/models/daily-user-data.model';
import { CommonModule, NgFor } from '@angular/common';
import { MaterialModule } from '../../../core/material/material.module';

@Component({
  selector: 'app-previous-daily-user-data',
  standalone: true,
  imports: [CommonModule, NgFor, MaterialModule],
  templateUrl: './previous-daily-user-data.component.html',
  styleUrl: './previous-daily-user-data.component.css'
})
export class PreviousDailyUserDataComponent implements OnInit {

  selectedDay: DailyUserData | null = null;
  showModal = false;
  showCreateOverlay = false;

  public facade = inject(UserFacade);

  history = this.facade.history;

  ngOnInit(): void {
    this.facade.loadDailyHistory();
  }

  openDay(day: DailyUserData) {
    this.selectedDay = day;
    this.showModal =! this.showModal;
    this.showCreateOverlay = true;

  }

  closeModal() {
   this.selectedDay = null;
    this.showModal = false;
  }



}
