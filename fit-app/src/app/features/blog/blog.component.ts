import { Component } from '@angular/core';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { CommonModule } from '@angular/common';
import { BlogContentComponent } from './blog-content/blog-content.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule,HeaderComponent,BlogContentComponent, FooterComponent],
  templateUrl: './blog.component.html',
  styleUrl: './blog.component.css'
})
export class BlogComponent {
searchTerm ='';
selectedCategory ='all';

}
