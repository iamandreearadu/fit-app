import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { SocialService } from '../../api/social.service';
import { StatsService } from '../../api/stats.service';
import { AlertService } from '../../shared/services/alert.service';
import { PaginatedResponse, Post, UserSocialProfile } from '../models/social.model';
import { SocialProfileFacade } from './social-profile.facade';

describe('SocialProfileFacade', () => {
  let facade: SocialProfileFacade;
  let social: jasmine.SpyObj<SocialService>;

  const profile = (id: string): UserSocialProfile => ({
    id,
    displayName: `User ${id}`,
    postsCount: 0,
    followersCount: 3,
    followingCount: 2,
    isFollowedByMe: false,
    isOwnProfile: false,
  });

  const post = (id: number): Post => ({
    id,
    author: { id: 'author', displayName: 'Author' },
    content: `Post ${id}`,
    likesCount: 0,
    commentsCount: 0,
    isLikedByMe: false,
    isSavedByMe: false,
    isFollowingAuthor: false,
    isOwnPost: false,
    isArchived: false,
    createdAt: '2026-07-21T00:00:00Z',
  });

  const page = <T>(items: T[], hasMore = false, pageNumber = 1): PaginatedResponse<T> => ({
    items,
    page: pageNumber,
    pageSize: 12,
    hasMore,
  });

  beforeEach(() => {
    social = jasmine.createSpyObj<SocialService>('SocialService', [
      'getProfile', 'getProfilePosts', 'getProfileWorkouts', 'getProfileBlogs',
      'getArchivedPosts', 'getArchivedWorkouts', 'getArchivedBlogs', 'toggleFollow',
      'updateBio', 'archivePost', 'archiveWorkout', 'deleteWorkout', 'archiveBlog',
      'deleteBlog', 'createBlog', 'updateBlogPost', 'getFollowers', 'getFollowing',
    ]);

    TestBed.configureTestingModule({
      providers: [
        SocialProfileFacade,
        { provide: SocialService, useValue: social },
        { provide: StatsService, useValue: jasmine.createSpyObj<StatsService>('StatsService', ['getPublicStats']) },
        { provide: AlertService, useValue: jasmine.createSpyObj<AlertService>('AlertService', ['error']) },
      ],
    });
    facade = TestBed.inject(SocialProfileFacade);
  });

  it('ignores stale responses after the active profile changes', async () => {
    const profileA$ = new Subject<UserSocialProfile>();
    const postsA$ = new Subject<PaginatedResponse<Post>>();
    social.getProfile.and.callFake(id => id === 'a' ? profileA$ : of(profile('b')));
    social.getProfilePosts.and.callFake(id => id === 'a' ? postsA$ : of(page([post(2)])));

    const firstLoad = facade.loadProfile('a');
    const secondLoad = facade.loadProfile('b');
    await secondLoad;
    profileA$.next(profile('a'));
    profileA$.complete();
    postsA$.next(page([post(1)]));
    postsA$.complete();
    await firstLoad;

    expect(facade.currentProfile()?.id).toBe('b');
    expect(facade.profilePosts().map(item => item.id)).toEqual([2]);
  });

  it('keeps profile identity usable when posts fail', async () => {
    social.getProfile.and.returnValue(of(profile('a')));
    social.getProfilePosts.and.returnValue(throwError(() => new Error('posts failed')));

    await facade.loadProfile('a');

    expect(facade.currentProfile()?.id).toBe('a');
    expect(facade.profileError()).toBeNull();
    expect(facade.profilePostsError()).toContain('Failed to load posts');
  });

  it('patches follow state and follower count atomically', async () => {
    social.getProfile.and.returnValue(of(profile('a')));
    social.getProfilePosts.and.returnValue(of(page([])));
    social.toggleFollow.and.returnValue(of({ isFollowing: true, followersCount: 4 }));
    await facade.loadProfile('a');

    await facade.toggleFollow('a');

    expect(facade.currentProfile()?.isFollowedByMe).toBeTrue();
    expect(facade.currentProfile()?.followersCount).toBe(4);
  });

  it('prevents duplicate mutations for the same action', async () => {
    const response$ = new Subject<{ isFollowing: boolean; followersCount: number }>();
    social.getProfile.and.returnValue(of(profile('a')));
    social.getProfilePosts.and.returnValue(of(page([])));
    social.toggleFollow.and.returnValue(response$);
    await facade.loadProfile('a');

    const first = facade.toggleFollow('a');
    const duplicate = facade.toggleFollow('a');
    expect(social.toggleFollow).toHaveBeenCalledTimes(1);
    response$.next({ isFollowing: true, followersCount: 4 });
    response$.complete();
    await Promise.all([first, duplicate]);

    expect(facade.pendingMutations().size).toBe(0);
  });

  it('loads further posts and removes duplicate records', async () => {
    social.getProfile.and.returnValue(of(profile('a')));
    social.getProfilePosts.and.returnValues(
      of(page([post(1)], true, 1)),
      of(page([post(1), post(2)], false, 2)),
    );
    await facade.loadProfile('a');

    await facade.loadMoreProfilePosts('a');

    expect(social.getProfilePosts.calls.mostRecent().args[1]).toBe(2);
    expect(facade.profilePosts().map(item => item.id)).toEqual([1, 2]);
    expect(facade.profilePostsHasMore()).toBeFalse();
  });
});
