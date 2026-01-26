public interface IDevEmailStore
{
    void Save(string email, string confirmationLink);
    string? Get(string email);
}

public class DevEmailStore : IDevEmailStore
{
    private readonly Dictionary<string, string> _store = new(StringComparer.OrdinalIgnoreCase);

    public void Save(string email, string confirmationLink) => _store[email] = confirmationLink;
    public string? Get(string email) => _store.TryGetValue(email, out var link) ? link : null;
}
