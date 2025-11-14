import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { UserFacade } from './core/facade/user.facade';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  constructor(public facade: UserFacade) {}

  ngOnInit(): void {
    this.facade.hydrateFromLocalStorage();
    void this.facade.loadUser();
  }
}
