using System.ComponentModel.DataAnnotations;

namespace FitApp.Api.Models.DTOs;

public sealed record PushSubscriptionKeysRequest(
    [Required, MaxLength(512), RegularExpression(@"^[A-Za-z0-9_-]+$")] string P256dh,
    [Required, MaxLength(256), RegularExpression(@"^[A-Za-z0-9_-]+$")] string Auth);

public sealed record PushSubscriptionRequest(
    [Required, MaxLength(4096), HttpsUrl] string Endpoint,
    [Required] PushSubscriptionKeysRequest Keys);

public sealed record DeletePushSubscriptionRequest(
    [Required, MaxLength(4096), HttpsUrl] string Endpoint);

public sealed class HttpsUrlAttribute : ValidationAttribute
{
    public override bool IsValid(object? value) =>
        value is string text && Uri.TryCreate(text, UriKind.Absolute, out var uri)
        && uri.Scheme == Uri.UriSchemeHttps;
}
