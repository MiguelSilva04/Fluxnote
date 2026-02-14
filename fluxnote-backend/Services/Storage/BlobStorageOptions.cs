namespace Fluxnote.Backend.Services.Storage;

public class BlobStorageOptions
{
    public string ConnectionString { get; set; } = string.Empty;
    public string ContainerName { get; set; } = "images";
}
