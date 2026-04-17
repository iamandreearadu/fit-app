using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Services;

public class BlogService(AppDbContext db)
{
    public async Task<List<BlogPostDto>> ListAsync()
    {
        var posts = await db.BlogPosts
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();
        return posts.Select(MapToDto).ToList();
    }

    public async Task<BlogPostDto?> GetAsync(int id)
    {
        var post = await db.BlogPosts.FindAsync(id);
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
