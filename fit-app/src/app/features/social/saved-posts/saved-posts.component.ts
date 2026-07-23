import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SavedPostsFacade } from '../../../core/facade/saved-posts.facade';

@Component({ selector:'app-saved-posts', standalone:true, imports:[RouterLink,MatIconModule], providers:[SavedPostsFacade], templateUrl:'./saved-posts.component.html', styleUrl:'./saved-posts.component.css' })
export class SavedPostsComponent implements OnInit {
  readonly facade=inject(SavedPostsFacade); private readonly router=inject(Router);
  readonly brokenImages = new Set<number>();
  ngOnInit():void{void this.facade.load()}
  openPost(id:number):void{void this.router.navigate(['/social/post',id], { state: { returnUrl: '/social/saved' } })}
}
