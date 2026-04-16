namespace FitApp.Api.Models.Entities;

public class MealEntry
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;               // Breakfast | Lunch | Dinner | Snack | Pre-workout | Post-workout | Other
    public string Date { get; set; } = string.Empty;               // ISO format
    public double TotalGrams { get; set; }
    public double TotalCalories { get; set; }
    public double TotalProtein_g { get; set; }
    public double TotalCarbs_g { get; set; }
    public double TotalFats_g { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public ICollection<FoodItem> Items { get; set; } = [];
}

public class FoodItem
{
    public int Id { get; set; }
    public int MealEntryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public double Grams { get; set; }
    public double Calories { get; set; }
    public double Protein_g { get; set; }
    public double Carbs_g { get; set; }
    public double Fats_g { get; set; }
    public int Order { get; set; }

    public MealEntry MealEntry { get; set; } = null!;
}
