namespace FitApp.Api.Services;

public class FileStorageService(IWebHostEnvironment env, ILogger<FileStorageService> logger) : IFileStorageService
{
    private static readonly HashSet<string> AllowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    private static readonly Dictionary<string, string> MimeToExt = new()
    {
        ["image/jpeg"] = "jpg",
        ["image/png"]  = "png",
        ["image/webp"] = "webp",
        ["image/gif"]  = "gif"
    };

    public async Task<string> SaveChatImageAsync(string base64Data, string? mimeType)
    {
        var mime = mimeType?.ToLower() ?? "image/jpeg";

        if (!AllowedMimeTypes.Contains(mime))
            throw new InvalidOperationException($"Unsupported image type: {mime}. Allowed: jpeg, png, webp, gif.");

        byte[] bytes;
        try
        {
            // Strip data URI prefix if present (data:image/jpeg;base64,...)
            var comma = base64Data.IndexOf(',');
            var raw = comma >= 0 ? base64Data[(comma + 1)..] : base64Data;
            bytes = Convert.FromBase64String(raw);
        }
        catch (FormatException)
        {
            throw new InvalidOperationException("Invalid base64 image data.");
        }

        const long maxBytes = 5 * 1024 * 1024; // 5 MB
        if (bytes.Length > maxBytes)
            throw new InvalidOperationException("Image exceeds the 5 MB size limit.");

        var ext = MimeToExt.GetValueOrDefault(mime, "jpg");
        var fileName = $"{Guid.NewGuid()}.{ext}";
        var webRoot = env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var uploadDir = Path.Combine(webRoot, "uploads", "chat");
        Directory.CreateDirectory(uploadDir);
        var filePath = Path.Combine(uploadDir, fileName);

        await File.WriteAllBytesAsync(filePath, bytes);
        logger.LogInformation("Saved chat image: {FileName} ({Bytes} bytes)", fileName, bytes.Length);

        return $"/uploads/chat/{fileName}";
    }
}
