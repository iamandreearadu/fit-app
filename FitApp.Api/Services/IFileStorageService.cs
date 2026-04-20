namespace FitApp.Api.Services;

public interface IFileStorageService
{
    /// <summary>Saves a base64-encoded chat image and returns its public URL path.</summary>
    Task<string> SaveChatImageAsync(string base64Data, string? mimeType);
}
