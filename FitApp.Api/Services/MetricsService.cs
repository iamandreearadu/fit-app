using FitApp.Api.Models.Entities;

namespace FitApp.Api.Services;

public class MetricsService
{
    public void CalculateAndApply(User user)
    {
        if (user.WeightKg <= 0 || user.HeightCm <= 0 || user.Age <= 0)
            return;

        var heightM = user.HeightCm / 100.0;
        user.Bmi = Math.Round(user.WeightKg / (heightM * heightM), 1);
        user.BmiCat = user.Bmi switch
        {
            < 18.5 => "Underweight",
            < 25 => "Normal weight",
            < 30 => "Overweight",
            _ => "Obese"
        };

        // Mifflin-St Jeor formula
        user.Bmr = user.Gender == "female"
            ? Math.Round(10 * user.WeightKg + 6.25 * user.HeightCm - 5 * user.Age - 161, 0)
            : Math.Round(10 * user.WeightKg + 6.25 * user.HeightCm - 5 * user.Age + 5, 0);

        double activityMultiplier = user.Activity switch
        {
            "sedentary" => 1.2,
            "light" => 1.375,
            "moderate" => 1.55,
            "active" => 1.725,
            "athlete" => 1.9,
            _ => 1.2
        };

        user.Tdee = Math.Round(user.Bmr.Value * activityMultiplier, 0);

        user.GoalCalories = user.Goal switch
        {
            "lose" => Math.Round(user.Tdee.Value - 500, 0),
            "gain" => Math.Round(user.Tdee.Value + 500, 0),
            _ => user.Tdee
        };

        user.WaterL = Math.Round(user.WeightKg * 0.033, 1);
        user.MetricsUpdatedAt = DateTime.UtcNow;
    }
}
