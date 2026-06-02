import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NutritionTabFacade } from '../../../../core/facade/nutrition-tab.facade';
import { RecentFoodItem } from '../../../../core/models/nutrition-tab.model';

@Component({
  selector: 'app-recent-foods',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './recent-foods.component.html',
  styleUrl: './recent-foods.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentFoodsListComponent {
  @Output() foodSelected = new EventEmitter<RecentFoodItem>();

  protected readonly facade = inject(NutritionTabFacade);

  /** Reads from NutritionTabFacade — parent triggers loadRecentFoods() in ngOnInit. */
  readonly recentFoods = this.facade.recentFoods;
  readonly recentLoading = this.facade.recentLoading;

  onChipClick(item: RecentFoodItem): void {
    this.foodSelected.emit(item);
  }

  onChipKeydown(event: KeyboardEvent, item: RecentFoodItem): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.foodSelected.emit(item);
    }
  }

  sourceBadgeLabel(source?: string): string {
    if (source === 'search') return 'USDA';
    if (source === 'ai_analyzer') return 'AI';
    return '';
  }

  showSourceBadge(source?: string): boolean {
    return source === 'search' || source === 'ai_analyzer';
  }
}
