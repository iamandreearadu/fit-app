import { inject, Injectable } from "@angular/core";
import { UserProfile } from "../models/user.model";
import { DailyUserData } from "../models/daily-user-data.model";
import { LocalStorageService } from "./local-storage.service";

@Injectable({
    providedIn: 'root'
})

export class DailyUserDataService {
todayDate = new Date().toISOString().slice(0,10)
ls = inject(LocalStorageService);

caloriesIntake(protein:number,carbs:number,fats:number):number{
    return (protein*4)+(carbs*4)+(fats*9);
}

caloriesTotal(intake:number, burned:number):number{
    return (intake - burned);
}



keyForDate(iso:string){
    return `dailyPlan:${iso}`; 
}

async getDailyUserData(): Promise<DailyUserData | null> {
    const key = this.keyForDate(this.todayDate);
    return this.ls.get<DailyUserData>(key);
}

async setDailyUserData(patch:Partial< DailyUserData>): Promise<DailyUserData> {
    const existing = this.ls.get<DailyUserData>(this.keyForDate(this.todayDate));

    const updated: DailyUserData = {
        date: patch.date ?? existing?.date ?? new Date().toISOString(),
        waterConsumedL: patch.waterConsumedL ?? existing?.waterConsumedL ?? 0,
        activityType: patch.activityType ?? existing?.activityType ?? 'Rest Day',
        steps: patch.steps ?? existing?.steps ?? 0,
        stepTarget: patch.stepTarget ?? existing?.stepTarget ?? 3000,
        macrosPct:{
            protein: patch.macrosPct?.protein ?? existing?.macrosPct?.protein ?? 0,
            carbs: patch.macrosPct?.carbs ?? existing?.macrosPct?.carbs ?? 0,
            fats: patch.macrosPct?.fats ?? existing?.macrosPct?.fats ?? 0,
        },
        caloriesIntake: this.caloriesIntake(
        patch.macrosPct?.protein ?? existing?.macrosPct?.protein ?? 0,  
        patch.macrosPct?.carbs ?? existing?.macrosPct?.carbs ?? 0,  
        patch.macrosPct?.fats ?? existing?.macrosPct?.fats ?? 0  
        ),
        caloriesBurned: patch.caloriesBurned ?? existing?.caloriesBurned ?? 0,
        caloriesTotal:this.caloriesTotal(
            patch.caloriesIntake?? existing?.caloriesIntake ?? 0,
            patch.caloriesBurned ?? existing?.caloriesBurned ?? 0
        )
    };
    this.ls.set(this.keyForDate(this.todayDate), updated);  
    return updated;
}




}