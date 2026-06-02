export const ARTICLE_CATEGORIES = [
  'Fitness',
  'Nutrition',
  'Wellness',
  'Training',
  'Motivation',
  'Recovery',
  'Mindset',
  'Recipes',
  'Progress',
  'Other',
] as const;

export interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface LinkedContentPreview {
  type: 'workout' | 'meal' | 'daily';
  title: string;
  subtitle: string;
}

export interface Post {
  id: number;
  author: UserSummary;
  content: string;
  imageUrl?: string;
  linkedContent?: LinkedContentPreview;
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  isFollowingAuthor: boolean;
  isOwnPost: boolean;
  isArchived: boolean;
  createdAt: string;
  // Article-type post fields
  articleId?: number;
  articleTitle?: string;
  articleCategory?: string;
  articleCaption?: string;
  articleDescription?: string;
  articleImage?: string;
}

export interface ArticleDetail {
  id: number;
  title: string;
  caption: string;
  description: string;
  image?: string;
  category: string;
  createdAt: string;
  author: UserSummary;
  isOwnArticle: boolean;
  linkedPostId?: number;
}

export interface Comment {
  id: number;
  author: UserSummary;
  content: string;
  createdAt: string;
  isOwnComment: boolean;
}

export interface UserSocialProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowedByMe: boolean;
  isOwnProfile: boolean;
}

export interface LikeToggleResponse {
  isLiked: boolean;
  likesCount: number;
}

export interface FollowToggleResponse {
  isFollowing: boolean;
  followersCount: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface CreatePostRequest {
  content: string;
  imageUrl?: string;
  linkedWorkoutId?: number;
  linkedMealId?: number;
  linkedDailyEntryId?: number;
}

export interface UpdatePostRequest {
  content: string;
  imageUrl?: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface UserSearchResult {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isFollowedByMe: boolean;
}

export interface ProfileWorkout {
  id: number;
  title: string;
  type: string;
  durationMin: number;
  caloriesEstimateKcal: number;
  createdAt: string;
  isArchived: boolean;
  isOwnWorkout: boolean;
}

export interface ProfileBlog {
  id: number;
  title: string;
  caption: string;
  description?: string;
  image?: string;
  category: string;
  createdAt: string;
  isArchived: boolean;
  isOwnBlog: boolean;
}

export interface ArchiveToggleResponse {
  isArchived: boolean;
}

export interface UpdateBioRequest {
  bio: string | null;
}

export interface CreateBlogRequest {
  title: string;
  caption: string;
  description: string;
  category: string;
  image?: string;
}

export interface UpdateBlogRequest {
  title: string;
  caption: string;
  description: string;
  category: string;
  image?: string;
}

// ── Fix 2 — Share to beSocial ────────────────────────────────────────────────

export interface PostFromWorkoutRequest {
  caption?: string;
}

export interface PostFromMealRequest {
  caption?: string;
}

export interface SharePostResponse {
  postId: number;
  previewText: string;
}

/**
 * Discriminated union for share bottom sheet input data.
 * PRIVACY: estimatedCaloriesKcal intentionally absent from workout variant.
 * PRIVACY: macro totals intentionally absent from meal variant.
 */
export type ShareToSocialData =
  | {
      type: 'workout';
      sessionId: number;
      templateTitle: string;
      durationMin: number;
      exerciseCount: number;
      // estimatedCaloriesKcal: INTENTIONALLY OMITTED — health metric
    }
  | {
      type: 'meal';
      mealId: number;
      mealName: string;
      mealType: string;
      // totalCalories / totalProtein_g / etc.: INTENTIONALLY OMITTED — health metrics
    };

export interface ShareSheetResult {
  published: boolean;
  postId?: number;
}

/** Returned by GET /api/social/discover/suggested — Fix 7 guided empty state */
export interface SuggestedUser {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  /** Raw User.Goal category: 'lose' | 'gain' | 'maintain'. null if not set. */
  fitnessGoal: 'lose' | 'gain' | 'maintain' | null;
  workoutsThisMonth: number;
}
