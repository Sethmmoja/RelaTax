# TLS certificates

Caddy reads the origin certificate pair from this directory. Put exactly two
files here — both are gitignored, and the private key must never be committed:

```
origin.pem      # certificate
origin-key.pem  # private key
```

These are **Cloudflare Origin Certificates**, not Let's Encrypt. Generate them in
the Cloudflare dashboard under *SSL/TLS → Origin Server → Create Certificate*,
covering `relatax.org` and `*.relatax.org`. They are valid for 15 years and are
trusted only by Cloudflare, which is exactly what's wanted: the domain is proxied,
so nothing reaches this server except through Cloudflare.

Set the zone's SSL/TLS mode to **Full (strict)**. "Flexible" would leave the
Cloudflare→origin hop unencrypted, defeating the purpose of these certificates.

Without both files present, Caddy fails to start and neither the site nor the API
is served. See `../Caddyfile`.
