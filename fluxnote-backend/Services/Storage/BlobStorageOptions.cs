namespace Fluxnote.Backend.Services.Storage;

public class BlobStorageOptions
{
    public string ConnectionString { get; set; } = string.Empty;
    /// <summary>Container público para imagens do editor.</summary>
    public string ContainerName { get; set; } = "images";
    /// <summary>Container privado para ficheiros de contexto de IA.</summary>
    public string ContextContainerName { get; set; } = "context";
}
