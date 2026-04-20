export interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface LinkedContentPreview {
  type: 'workout' | 'meal' | 'daily';
  title: string;
  subtitle: string;
  badgeColor: string;
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
