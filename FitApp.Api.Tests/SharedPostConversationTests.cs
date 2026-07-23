using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace FitApp.Api.Tests;

public class SharedPostConversationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public SharedPostConversationTests(CustomWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task SharePost_RequiresAuthentication()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/conversations/share-post", new
        {
            targetUserId = "target",
            postId = 1
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SharePost_ReusesDirectConversation_AndPersistsStructuredMessage()
    {
        var (sender, senderUser) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "share-sender");
        var (_, targetUser) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "share-target");
        var postId = await CreatePostAsync(senderUser.Id, "A useful public post");

        var first = await sender.PostAsJsonAsync("/api/conversations/share-post", new
        {
            targetUserId = targetUser.Id,
            postId
        });
        var second = await sender.PostAsJsonAsync("/api/conversations/share-post", new
        {
            targetUserId = targetUser.Id,
            postId
        });

        first.EnsureSuccessStatusCode();
        second.EnsureSuccessStatusCode();
        var firstResult = await first.Content.ReadFromJsonAsync<SharePostToUserResponse>();
        var secondResult = await second.Content.ReadFromJsonAsync<SharePostToUserResponse>();

        Assert.Equal(firstResult!.ConversationId, secondResult!.ConversationId);
        Assert.Equal("shared_post", firstResult.Message.MessageType);
        Assert.Equal(postId, firstResult.Message.SharedPostId);
        Assert.True(firstResult.Message.SharedPost!.IsAvailable);
    }

    [Fact]
    public async Task SharePost_RejectsSelfMissingTargetAndUnavailablePost()
    {
        var (sender, senderUser) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "share-invalid");
        var postId = await CreatePostAsync(senderUser.Id, "Archived", isArchived: true);

        var self = await sender.PostAsJsonAsync("/api/conversations/share-post", new
        {
            targetUserId = senderUser.Id,
            postId
        });
        var missingTarget = await sender.PostAsJsonAsync("/api/conversations/share-post", new
        {
            targetUserId = "missing-user",
            postId
        });
        var (_, targetUser) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "share-invalid-target");
        var unavailable = await sender.PostAsJsonAsync("/api/conversations/share-post", new
        {
            targetUserId = targetUser.Id,
            postId
        });

        Assert.Equal(HttpStatusCode.BadRequest, self.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, missingTarget.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, unavailable.StatusCode);
    }

    [Fact]
    public async Task MessageHistory_ReturnsUnavailableFallback_WhenSharedPostIsArchived()
    {
        var (sender, senderUser) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "share-fallback");
        var (_, targetUser) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "share-fallback-target");
        var postId = await CreatePostAsync(senderUser.Id, "Available first");
        var share = await sender.PostAsJsonAsync("/api/conversations/share-post", new
        {
            targetUserId = targetUser.Id,
            postId
        });
        var result = await share.Content.ReadFromJsonAsync<SharePostToUserResponse>();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Posts.Where(p => p.Id == postId).ExecuteUpdateAsync(setters =>
                setters.SetProperty(p => p.IsArchived, true));
        }

        var history = await sender.GetFromJsonAsync<CursorPageResponse<DirectMessageResponse>>(
            $"/api/conversations/{result!.ConversationId}/messages");
        var message = Assert.Single(history!.Items);

        Assert.False(message.SharedPost!.IsAvailable);
        Assert.Null(message.SharedPost.Author);
        Assert.Null(message.SharedPost.Content);
        Assert.Null(message.SharedPost.ImageUrl);
    }

    [Fact]
    public async Task SharedPreview_DoesNotExposeLinkedFitnessData()
    {
        var (sender, senderUser) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "share-private");
        var (_, targetUser) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "share-private-target");
        var postId = await CreatePostAsync(senderUser.Id, "Safe summary");

        var response = await sender.PostAsJsonAsync("/api/conversations/share-post", new
        {
            targetUserId = targetUser.Id,
            postId
        });
        var json = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(json);
        var preview = document.RootElement.GetProperty("message").GetProperty("sharedPost");

        foreach (var forbidden in new[] { "calories", "macros", "weight", "bmi", "bmr", "tdee", "linkedMeal", "linkedWorkout", "linkedDailyEntry" })
            Assert.False(preview.TryGetProperty(forbidden, out _));
    }

    private async Task<int> CreatePostAsync(string userId, string content, bool isArchived = false)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var post = new Post
        {
            UserId = userId,
            Content = content,
            IsArchived = isArchived
        };
        db.Posts.Add(post);
        await db.SaveChangesAsync();
        return post.Id;
    }
}
