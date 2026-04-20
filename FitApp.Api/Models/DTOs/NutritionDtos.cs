namespace FitApp.Api.Models.DTOs;

public class MealEntryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public List<FoodItemDto> Items { get; set; } = [];
    public double TotalGrams { get; set; }
    public double TotalCalories { get; set; }
    public double TotalProtein_g { get; set; }
    public double TotalCarbs_g { get; set; }
    public double TotalFats_g { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class FoodItemDto
{
    public string Name { get; set; } = string.Empty;
    public double Grams { get; set; }
    public double Calories { get; set; }
    public double Protein_g { get; set; }
    public double Carbs_g { get; set; }
    public double Fats_g { get; set; }
}

public class SaveMealRequest
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public List<FoodItemDto> Items { get; set; } = [];
    public string? Notes { get; set; }
}
