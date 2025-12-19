import { UserFirestore } from "../models/user-firestore.model";
import { Activity, Goal, Sex, UserProfile } from "../models/user.model";

export function mapFirestoreToProfile(fs: UserFirestore): UserProfile {
  return {
    id: fs.id,
    email: fs.email ?? '',
    fullName: fs.fullName ?? '',
    imageUrl: fs.imageUrl ?? '',
    heightCm: fs.heightCm ?? 0,
    weightKg: fs.weightKg ?? 0,
    age: fs.age ?? 0,
    gender: (fs.gender as Sex) ?? 'other',
    activity: (fs.activity as Activity) ?? 'moderate',
    goal: (fs.goal as Goal) ?? 'maintain',
  };
}
