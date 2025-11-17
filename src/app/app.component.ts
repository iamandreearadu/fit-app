import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserFacade } from './core/facade/user.facade';
import { AccountFacade } from './core/facade/account.facade';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  constructor(public facade: UserFacade, private accountFacade: AccountFacade) {}

  ngOnInit(): void {
    this.facade.hydrateFromLocalStorage();
    void this.facade.loadUser();
    // sync auth state from local storage into authentication store
    this.syncPersist();
  }

  syncPersist() {
    this.accountFacade.hydrateFromLocalStorage();
  }
}
