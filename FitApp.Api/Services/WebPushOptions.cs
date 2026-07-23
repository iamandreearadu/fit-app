namespace FitApp.Api.Services;

public sealed class WebPushOptions
{
    public const string SectionName = "Vapid";
    public string Subject { get; set; } = string.Empty;
    public string PublicKey { get; set; } = string.Empty;
    public string PrivateKey { get; set; } = string.Empty;
}
