import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../core/material/material.module';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BlogFacade } from '../../../core/facade/blog.facade';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { HeaderComponent } from '../../../shared/components/header/header.component';

@Component({
  selector: 'app-blog-post-detail',
  imports: [CommonModule,MaterialModule, RouterModule,HeaderComponent,FooterComponent],
  templateUrl: './blog-post-detail.component.html',
  styleUrl: './blog-post-detail.component.css'
})
export class BlogPostDetailComponent implements OnInit {


  private readonly route = inject(ActivatedRoute);
  readonly facade = inject(BlogFacade);

  readonly post = computed(() => this.facade.selectedPost);
  readonly loading = computed(() => this.facade.loading);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.facade.getPost(id);
  }
}
