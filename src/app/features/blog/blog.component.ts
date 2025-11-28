import { Component } from '@angular/core';
import { HeaderComponent } from '../../shared/components/header.component';
import { CommonModule } from '@angular/common';
import { BlogContentComponent } from './blog-content/blog-content.component';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule,HeaderComponent,BlogContentComponent],
  templateUrl: './blog.component.html',
  styleUrl: './blog.component.css'
})
export class BlogComponent {
searchTerm ='';
selectedCategory ='all';

}
