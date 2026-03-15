namespace Fluxnote.Backend.Models;

/// <summary>
/// Roles possíveis de acesso de um membro a um documento.
/// </summary>
public enum DocumentRole
{
    /// <summary>Permissão apenas de leitura.</summary>
    Viewer = 0,

    /// <summary>Permissão de leitura e edição.</summary>
    Editor = 1,
}
