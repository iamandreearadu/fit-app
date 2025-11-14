import { Injectable } from '@angular/core';
import { Activity, UserProfile } from '../models/user.model';
import { UserFitMetrics } from '../models/user-fit-metrics.model';

@Injectable({ 
  providedIn: 'root' 
})

export class UserMetricsService {

  compute(user: UserProfile | null): UserFitMetrics {
    if (!user) return {
      bmi: null,
      bmr: null, 
      bmiCat:null,
      tdee:null,
      waterL:null,
      goalCalories:null,
      idealWeightKgRange: null, 
      lastCalculatedAt: null };

    const heightM = user.heightCm > 0 ? user.heightCm / 100 : 0;
    const bmi = heightM > 0 ? +(user.weightKg / (heightM * heightM)) : null;

    let bmiCat: string | null = '' ;
    if(bmi) {
      if(bmi < 18.5){
      bmiCat = 'Underweight';
       } else if(bmi < 25) {
      bmiCat = 'Normal';
       } else if(bmi < 30) {
      bmiCat = 'Overweight';
       } else bmiCat = 'Obese';
      
    }


    // Mifflin-St Jeor
    let bmr: number | null = null;
    if (user.age > 0 && heightM > 0) {
      const hCm = user.heightCm;
      if (user.gender === 'male') {
        bmr = 10 * user.weightKg + 6.25 * hCm - 5 * user.age + 5;
      } else if (user.gender === 'female') {
        bmr = 10 * user.weightKg + 6.25 * hCm - 5 * user.age - 161;
      } else {
        bmr = 10 * user.weightKg + 6.25 * hCm - 5 * user.age; // neutral
      }
      bmr = Math.round(bmr);
    }


    let tdee: number | null = null;
    if(bmr) {
      const activity:Record<Activity,number> = {
        sedentary:1.2, light:1.375, moderate: 1.55, active: 1.725, athlete: 1.95
      }
        tdee = Math.round(bmr*activity[user.activity])
    }

    let waterL: number | null = +(user.weightKg*0.035).toFixed(1);
    

    let goalCalories: number | null = null;
    if(tdee){
      if(user.goal === 'lose'){
      goalCalories = tdee-400;  
      } else if(user.goal === 'gain') {
        goalCalories = tdee+300;
      } else  goalCalories=tdee;
    }


    let idealRange = null;
    if (heightM > 0) {
      const min = 18.5 * heightM * heightM;
      const max = 24.9 * heightM * heightM;
      idealRange = { min: Math.round(min), max: Math.round(max) };
    }

    return {
      bmi: bmi !== null ? Math.round((bmi + Number.EPSILON) * 10) / 10 : null,      
      bmr,
      bmiCat,
      tdee,
      waterL,
      goalCalories,
      idealWeightKgRange: idealRange,
      lastCalculatedAt: new Date().toISOString().slice(0,10),
    };
  }
}
