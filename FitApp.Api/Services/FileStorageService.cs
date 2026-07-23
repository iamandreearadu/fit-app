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
        => await SaveBase64ImageAsync(base64Data, mimeType, "chat");

    public async Task<string?> NormalizeImageAsync(string? image, string category)
    {
        if (string.IsNullOrWhiteSpace(image)) return image;
        if (Uri.TryCreate(image, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps)
            return image;
        if (!image.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Image must be an HTTPS URL or a valid image data URI.");

        var semicolon = image.IndexOf(';');
        var comma = image.IndexOf(',');
        if (semicolon < 5 || comma < semicolon ||
            !image[semicolon..comma].Equals(";base64", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Invalid image data URI.");

        return await SaveBase64ImageAsync(image, image[5..semicolon], category);
    }

    private async Task<string> SaveBase64ImageAsync(string base64Data, string? mimeType, string category)
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
        var safeCategory = category switch
        {
            "avatars" or "posts" or "articles" or "chat" => category,
            _ => throw new InvalidOperationException("Invalid image category.")
        };
        var uploadDir = Path.Combine(webRoot, "uploads", safeCategory);
        Directory.CreateDirectory(uploadDir);
        var filePath = Path.Combine(uploadDir, fileName);

        await File.WriteAllBytesAsync(filePath, bytes);
        logger.LogInformation("Saved {Category} image: {FileName} ({Bytes} bytes)", safeCategory, fileName, bytes.Length);

        return $"/uploads/{safeCategory}/{fileName}";
    }
}
