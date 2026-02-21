import { Component, computed, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../../core/material/material.module';
import { WorkoutPlan } from '../../../core/models/workout-plan.model';

@Component({
  standalone: true,
  selector: 'app-workouts-content',
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './workouts-content.component.html',
  styleUrls: ['./workouts-content.component.css']
})
export class WorkoutsContentComponent implements OnInit {
  private allPlans = signal<WorkoutPlan[]>([
    { id:'home-4w', title:'Home Training', subtitle:'No equipment, 4 weeks', image:'https://images.unsplash.com/photo-1674834727149-00812f907676?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'home', level:'beginner', weeks:4, price:19, perks:['30–40 min / session','3–4 sessions/week','Warm-up & cooldown'] },
    { id:'home-12w', title:'12 Weeks Fitness Plan', subtitle:'Progressive overload at home', image:'https://images.unsplash.com/photo-1674834727149-00812f907676?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'home', level:'intermediate', weeks:12, price:39, perks:['45–60 min / session','4–5 sessions/week','Video guidance'] },
    { id:'gym-12w', title:'Gym Strength 12W', subtitle:'Compound lifts focus', image:'https://images.unsplash.com/photo-1674834727149-00812f907676?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'gym', level:'intermediate', weeks:12, price:49, perks:['Periodization','Accessory work','Deload weeks'] },
    { id:'gym-24w', title:'3 Months Muscle Plan', subtitle:'Hypertrophy split', image:'https://images.unsplash.com/photo-1674834727149-00812f907676?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'gym', level:'advanced', weeks:12, price:59, perks:['Push/Pull/Legs','RPE-based','Nutrition tips'] },
    { id:'hyb-8w', title:'Hybrid Athlete 8W', subtitle:'Strength + Conditioning', image:'https://images.unsplash.com/photo-1674834727149-00812f907676?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'hybrid', level:'intermediate', weeks:8, price:35, perks:['2× strength, 2× cardio','Mobility add-ons','Pacing guides'] },
    { id:'home-6w', title:'Quick Home Shred', subtitle:'6-week fat loss', image:'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'home', level:'intermediate', weeks:6, price:25, perks:['30 min HIIT','No equipment','Meal plan'] },
    { id:'gym-8w', title:'Strength Starter 8W', subtitle:'Beginner gym program', image:'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'gym', level:'beginner', weeks:8, price:29, perks:['Technique focus','3× weekly','Coaching tips'] },
    { id:'hyb-12w', title:'Endurance Hybrid 12W', subtitle:'Run + strength', image:'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'hybrid', level:'intermediate', weeks:12, price:42, perks:['Run training','Strength 2× week','Recovery'] },
    { id:'gym-4w', title:'Beginner Gym 4W', subtitle:'Intro to compound lifts', image:'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'gym', level:'beginner', weeks:4, price:15, perks:['3× week','Form cues','Short sessions'] },
    { id:'home-10w', title:'Bodyweight Builder 10W', subtitle:'Progressive bodyweight', image:'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'home', level:'advanced', weeks:10, price:34, perks:['Strength progression','Skill work','Flexibility'] },
    { id:'hyb-4w', title:'Conditioning Blitz 4W', subtitle:'Short conditioning block', image:'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'hybrid', level:'beginner', weeks:4, price:12, perks:['High intensity','Quick sessions','Minimal gear'] },
    { id:'home-16w', title:'Progressive Home 16W', subtitle:'Long-term home plan', image:'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'home', level:'advanced', weeks:16, price:69, perks:['Periodization','Advanced progressions','Nutrition guide'] },
    { id:'gym-20w', title:'Mass Builder 20W', subtitle:'Hypertrophy long-term', image:'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'gym', level:'advanced', weeks:20, price:99, perks:['Volume cycles','Accessory plan','Support'] },
    { id:'hyb-6w', title:'Hybrid Strength 6W', subtitle:'Strength + mobility', image:'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'hybrid', level:'intermediate', weeks:6, price:27, perks:['Strength sessions','Mobility','Short cardio'] },
  ]);
  
  loading = signal<boolean>(false);
  showFiltersOverlay = signal<boolean>(false);

  search = signal<string>('');
  type = signal<'all'|'home'|'gym'|'hybrid'>('all');
  level = signal<'all'|'beginner'|'intermediate'|'advanced'>('all');
  sort = signal<'popular'|'price-asc'|'price-desc'|'weeks-asc'|'weeks-desc'>('popular');
  // Responsive flag
  isMobile = signal<boolean>(false);
  // Pagination
  page = signal<number>(1);
  pageSize = signal<number>(6);

  totalCount = computed(() => this.filtered().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.filtered().slice(start, end);
  });
  startIndex = computed(() => (this.page() - 1) * this.pageSize() + 1);
  endIndex = computed(() => Math.min(this.totalCount(), this.page() * this.pageSize()));
  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  filtered = computed(() => {
    let list = [...this.allPlans()];
    const term = this.search().trim().toLowerCase();
    if (term) {
      list = list.filter(p =>
        p.title.toLowerCase().includes(term) ||
        p.subtitle.toLowerCase().includes(term) ||
        p.perks.some(k => k.toLowerCase().includes(term))
      );
    }
    if (this.type() !== 'all')   list = list.filter(p => p.type === this.type());
    if (this.level() !== 'all')  list = list.filter(p => p.level === this.level());

    switch (this.sort()) {
      case 'price-asc':  list.sort((a,b)=>a.price-b.price); break;
      case 'price-desc': list.sort((a,b)=>b.price-a.price); break;
      case 'weeks-asc':  list.sort((a,b)=>a.weeks-b.weeks); break;
      case 'weeks-desc': list.sort((a,b)=>b.weeks-a.weeks); break;
      case 'popular':
      default:
        list.sort((a,b) => (a.price + Math.abs(a.weeks-8)) - (b.price + Math.abs(b.weeks-8)));
        break;
    }
    return list;
  });

  openFilters(): void { this.showFiltersOverlay.set(true); }
  closeFilters(): void { this.showFiltersOverlay.set(false); }
  resetFilters(): void {
    this.search.set('');
    this.type.set('all');
    this.level.set('all');
    this.sort.set('popular');
  }
  buy(p: WorkoutPlan) {
    alert(`Buying "${p.title}" — $${p.price}`);
  }

  setPage(n: number) {
    const t = this.totalPages();
    if (n < 1) n = 1;
    if (n > t) n = t;
    this.page.set(n);
    // scroll to top of list when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.page.set(1);
  }

  // Image fallback for plans without a valid image
  public fallbackImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="%23222"/><text x="50%" y="50%" fill="%23fff" font-family="Arial,Helvetica,sans-serif" font-size="28" text-anchor="middle" dominant-baseline="middle">No image</text></svg>';

  public onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img && img.src !== this.fallbackImage) {
      img.src = this.fallbackImage;
    }
  }

  constructor() {
    // Reset to first page whenever a filter/search/sort changes so mobile/desktop stay in sync
    effect(() => { this.search(); this.page.set(1); });
    effect(() => { this.type(); this.page.set(1); });
    effect(() => { this.level(); this.page.set(1); });
    effect(() => { this.sort(); this.page.set(1); });

    // Setup responsive listener for mobile breakpoint (<=640px)
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      const mq = window.matchMedia('(max-width: 640px)');
      this.isMobile.set(mq.matches);
      const handle = (e: MediaQueryListEvent) => this.isMobile.set(e.matches);
      if ('addEventListener' in mq) {
        // modern API
        mq.addEventListener('change', handle);
      } else if ('addListener' in mq) {
        // legacy
        // @ts-ignore
        mq.addListener(handle);
      }
    }
  }

  
  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      await new Promise<void>(r => setTimeout(() => r(), 400));
    } finally {
      this.loading.set(false);
    }
  }
}
