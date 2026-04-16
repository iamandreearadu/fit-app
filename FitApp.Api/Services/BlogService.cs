using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Services;

public class BlogService(AppDbContext db)
{
    public async Task<List<BlogPostDto>> ListAsync()
    {
        // Only return admin-authored posts (AuthorId == null).
        // User-authored articles (AuthorId != null) are managed via SocialService
        // and displayed in the social feed, not the public blog listing.
        var posts = await db.BlogPosts
            .Where(b => b.AuthorId == null)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();
        return posts.Select(MapToDto).ToList();
    }

    public async Task<BlogPostDto?> GetAsync(int id)
    {
        // Only return admin-authored posts (AuthorId == null) — see ListAsync for rationale.
        var post = await db.BlogPosts.FirstOrDefaultAsync(b => b.Id == id && b.AuthorId == null);
        return post is null ? null : MapToDto(post);
    }

    public async Task<BlogPostDto> CreateAsync(SaveBlogPostRequest req)
    {
        var post = new BlogPost
        {
            Title = req.Title,
            Caption = req.Caption,
            Description = req.Description,
            Image = req.Image,
            Category = req.Category,
            Date = req.Date
        };
        db.BlogPosts.Add(post);
        await db.SaveChangesAsync();
        return MapToDto(post);
    }

    public async Task<BlogPostDto?> UpdateAsync(int id, SaveBlogPostRequest req)
    {
        var post = await db.BlogPosts.FindAsync(id);
        if (post is null) return null;

        post.Title = req.Title;
        post.Caption = req.Caption;
        post.Description = req.Description;
        post.Image = req.Image;
        post.Category = req.Category;
        post.Date = req.Date;
        post.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return MapToDto(post);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var post = await db.BlogPosts.FindAsync(id);
        if (post is null) return false;
        db.BlogPosts.Remove(post);
        await db.SaveChangesAsync();
        return true;
    }

    private static BlogPostDto MapToDto(BlogPost b) => new()
    {
        Id = b.Id,
        Title = b.Title,
        Caption = b.Caption,
        Description = b.Description,
        Image = b.Image,
        Category = b.Category,
        Date = b.Date,
        CreatedAt = b.CreatedAt,
        UpdatedAt = b.UpdatedAt
    };
}
