FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY FitApp.Api/FitApp.Api.csproj FitApp.Api/
RUN dotnet restore FitApp.Api/FitApp.Api.csproj
COPY FitApp.Api/ FitApp.Api/
RUN dotnet publish FitApp.Api/FitApp.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080 \
    ConnectionStrings__Default="Data Source=/app/data/fitapp.db"
EXPOSE 8080
VOLUME ["/app/data", "/app/wwwroot/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl --fail --silent http://localhost:8080/health || exit 1
ENTRYPOINT ["dotnet", "FitApp.Api.dll"]
