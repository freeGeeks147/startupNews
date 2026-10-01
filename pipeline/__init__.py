# Use the operating system's certificate store so HTTPS works behind antivirus or
# corporate TLS inspection (common on Windows). Harmless on CI runners.
try:
    import truststore

    truststore.inject_into_ssl()
except ImportError:
    pass
