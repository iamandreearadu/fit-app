import { Component, computed, signal } from '@angular/core';
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
export class WorkoutsContentComponent {
  private allPlans = signal<WorkoutPlan[]>([
    { id:'home-4w', title:'Home Training', subtitle:'No equipment, 4 weeks', image:'https://images.unsplash.com/photo-1674834727149-00812f907676?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'home', level:'beginner', weeks:4, price:19, perks:['30–40 min / session','3–4 sessions/week','Warm-up & cooldown'] },
    { id:'home-12w', title:'12 Weeks Fitness Plan', subtitle:'Progressive overload at home', image:'https://images.unsplash.com/photo-1674834727149-00812f907676?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'home', level:'intermediate', weeks:12, price:39, perks:['45–60 min / session','4–5 sessions/week','Video guidance'] },
    { id:'gym-12w', title:'Gym Strength 12W', subtitle:'Compound lifts focus', image:'https://images.unsplash.com/photo-1674834727149-00812f907676?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'gym', level:'intermediate', weeks:12, price:49, perks:['Periodization','Accessory work','Deload weeks'] },
    { id:'gym-24w', title:'3 Months Muscle Plan', subtitle:'Hypertrophy split', image:'https://images.unsplash.com/photo-1674834727149-00812f907676?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'gym', level:'advanced', weeks:12, price:59, perks:['Push/Pull/Legs','RPE-based','Nutrition tips'] },
    { id:'hyb-8w', title:'Hybrid Athlete 8W', subtitle:'Strength + Conditioning', image:'https://images.unsplash.com/photo-1674834727149-00812f907676?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', type:'hybrid', level:'intermediate', weeks:8, price:35, perks:['2× strength, 2× cardio','Mobility add-ons','Pacing guides'] },
  ]);
 loading = signal<boolean>(false);
  showFiltersOverlay = signal<boolean>(false);

  search = signal<string>('');
  type = signal<'all'|'home'|'gym'|'hybrid'>('all');
  level = signal<'all'|'beginner'|'intermediate'|'advanced'>('all');
  sort = signal<'popular'|'price-asc'|'price-desc'|'weeks-asc'|'weeks-desc'>('popular');

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
}
