using System.Net;
using System.Net.Http.Json;
using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace FitApp.Api.Tests;

public class SavedPostsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public SavedPostsTests(CustomWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task Endpoints_RequireJwt()
    {
        var response = await _factory.CreateClient().GetAsync("/api/social/saved-posts");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ToggleSave_SavesThenUnsavesTheSamePost()
    {
        var (client, user) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "saved-toggle");
        var postId = await AddPostAsync(user.Id);

        var saved = await (await client.PostAsync($"/api/social/posts/{postId}/save", null))
            .Content.ReadFromJsonAsync<SaveToggleResponse>();
        var unsaved = await (await client.PostAsync($"/api/social/posts/{postId}/save", null))
            .Content.ReadFromJsonAsync<SaveToggleResponse>();

        Assert.True(saved!.IsSaved);
        Assert.False(unsaved!.IsSaved);
    }

    [Fact]
    public async Task GetPost_ReflectsCurrentUsersPrivateSavedState()
    {
        var (client, user) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "saved-state");
        var postId = await AddPostAsync(user.Id);
        await client.PostAsync($"/api/social/posts/{postId}/save", null);

        var post = await client.GetFromJsonAsync<PostResponse>($"/api/social/posts/{postId}");
        Assert.True(post!.IsSavedByMe);
    }

    [Fact]
    public async Task SavedList_IsPrivateToAuthenticatedUser()
    {
        var (ownerClient, owner) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "saved-owner");
        var (otherClient, _) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "saved-other");
        var postId = await AddPostAsync(owner.Id);
        await ownerClient.PostAsync($"/api/social/posts/{postId}/save", null);

        var otherSaved = await otherClient.GetFromJsonAsync<PaginatedResponse<PostResponse>>("/api/social/saved-posts");
        Assert.DoesNotContain(otherSaved!.Items, post => post.Id == postId);
    }

    [Fact]
    public async Task SavedList_ClampsPaginationAndOrdersBySaveTime()
    {
        var (client, user) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "saved-page");
        var olderPostId = await AddPostAsync(user.Id, "Older save");
        var newerPostId = await AddPostAsync(user.Id, "Newer save");
        await client.PostAsync($"/api/social/posts/{olderPostId}/save", null);
        await Task.Delay(10);
        await client.PostAsync($"/api/social/posts/{newerPostId}/save", null);

        var page = await client.GetFromJsonAsync<PaginatedResponse<PostResponse>>(
            "/api/social/saved-posts?page=-4&pageSize=100");

        Assert.Equal(1, page!.Page);
        Assert.Equal(50, page.PageSize);
        Assert.Equal(newerPostId, page.Items[0].Id);
    }

    [Fact]
    public async Task ToggleSave_RejectsArchivedAndLegacyArticlePosts()
    {
        var (client, user) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "saved-invalid");
        var archivedId = await AddPostAsync(user.Id, "Archived", isArchived: true);
        var articleId = await AddLegacyArticlePostAsync(user.Id);

        var archived = await client.PostAsync($"/api/social/posts/{archivedId}/save", null);
        var article = await client.PostAsync($"/api/social/posts/{articleId}/save", null);

        Assert.Equal(HttpStatusCode.NotFound, archived.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, article.StatusCode);
    }

    [Fact]
    public async Task DeletingPost_CascadesSavedPost()
    {
        var (client, user) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "saved-cascade");
        var postId = await AddPostAsync(user.Id);
        await client.PostAsync($"/api/social/posts/{postId}/save", null);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Posts.Where(post => post.Id == postId).ExecuteDeleteAsync();

        Assert.False(await db.SavedPosts.AnyAsync(saved => saved.PostId == postId));
    }

    private async Task<int> AddPostAsync(
        string userId, string content = "Test post", bool isArchived = false)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var post = new Post { UserId = userId, Content = content, IsArchived = isArchived };
        db.Posts.Add(post);
        await db.SaveChangesAsync();
        return post.Id;
    }

    private async Task<int> AddLegacyArticlePostAsync(string userId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var article = new BlogPost
        {
            Title = "Legacy article",
            Caption = "Legacy",
            Description = "Legacy content",
            Category = "Fitness",
            AuthorId = userId
        };
        db.BlogPosts.Add(article);
        await db.SaveChangesAsync();

        var post = new Post { UserId = userId, Content = "Legacy article post", ArticleId = article.Id };
        db.Posts.Add(post);
        await db.SaveChangesAsync();
        return post.Id;
    }
}
