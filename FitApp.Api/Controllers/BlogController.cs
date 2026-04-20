using FitApp.Api.Models.DTOs;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FitApp.Api.Controllers;

[ApiController]
[Route("api/blog")]
public class BlogController(BlogService blogService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var posts = await blogService.ListAsync();
        return Ok(posts);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var post = await blogService.GetAsync(id);
        if (post is null) return NotFound();
        return Ok(post);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] SaveBlogPostRequest req)
    {
        var post = await blogService.CreateAsync(req);
        return Created($"api/blog/{post.Id}", post);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] SaveBlogPostRequest req)
    {
        var post = await blogService.UpdateAsync(id, req);
        if (post is null) return NotFound();
        return Ok(post);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await blogService.DeleteAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }
}