#!/usr/bin/env python3
"""Create a local Dex issuer and wire OTV OIDC env. Secrets stay on the VPS."""
from pathlib import Path
import crypt
import re
import secrets
import string

ROOT = Path("/home/administrator/deployments/opentrust-verify")
OIDC_DIR = ROOT / "infra/oidc"
ENV = ROOT / ".env"
DEX_YAML = OIDC_DIR / "dex.yaml"
LOGIN = OIDC_DIR / "SSO_LOGIN.txt"
CADDY = Path("/home/administrator/hosting/edge-proxy/Caddyfile")
SNIPPET = Path("/home/administrator/hosting/edge-proxy/otv.poptrust.me.caddy")
ISSUER = "https://otv.poptrust.me/dex"
CLIENT_ID = "otv-web"
EMAIL = "sso@poptrust.me"
DEX_HANDLE = """\thandle /dex* {
\t\treverse_proxy host.docker.internal:5556 {
\t\t\theader_up Host {host}
\t\t\theader_up X-Forwarded-Proto https
\t\t\theader_up X-Forwarded-Host {host}
\t\t\theader_up X-Forwarded-Port 443
\t\t}
\t}

"""


def read_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.is_file():
        return out
    for line in path.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v
    return out


def upsert_env(path: Path, updates: dict[str, str]) -> None:
    lines = path.read_text().splitlines() if path.is_file() else []
    seen: set[str] = set()
    next_lines: list[str] = []
    for line in lines:
        key = line.split("=", 1)[0] if "=" in line and not line.startswith("#") else ""
        if key in updates:
            next_lines.append(f"{key}={updates[key]}")
            seen.add(key)
        else:
            next_lines.append(line)
    for key, value in updates.items():
        if key not in seen:
            next_lines.append(f"{key}={value}")
    path.write_text("\n".join(next_lines) + "\n")


def insert_dex_handle(path: Path) -> bool:
    if not path.is_file():
        return False
    text = path.read_text()
    if "handle /dex*" in text:
        return False
    updated, n = re.subn(r"(otv\.poptrust\.me \{\n\tencode gzip\n\n)", r"\1" + DEX_HANDLE, text, count=1)
    if n != 1:
        raise SystemExit(f"could not patch {path}")
    path.write_text(updated)
    return True


def main() -> None:
    OIDC_DIR.mkdir(parents=True, exist_ok=True)
    env = read_env(ENV)
    client_secret = env.get("OIDC_CLIENT_SECRET") or secrets.token_hex(24)
    if LOGIN.is_file():
        password = ""
        for line in LOGIN.read_text().splitlines():
            if line.startswith("password="):
                password = line.split("=", 1)[1]
        if not password:
            password = secrets.token_urlsafe(18)
    else:
        alphabet = string.ascii_letters + string.digits
        password = "".join(secrets.choice(alphabet) for _ in range(20))

    hashed = crypt.crypt(password, crypt.mksalt(crypt.METHOD_BLOWFISH))
    DEX_YAML.write_text(
        f"""issuer: {ISSUER}
storage:
  type: sqlite3
  config:
    file: /var/dex/dex.db
web:
  http: 0.0.0.0:5556
logger:
  level: info
oauth2:
  skipApprovalScreen: true
  passwordConnector: local
staticClients:
  - id: {CLIENT_ID}
    redirectURIs:
      - https://otv.poptrust.me/v1/auth/oidc/callback
    name: OpenTrust Verify
    secret: {client_secret}
enablePasswordDB: true
staticPasswords:
  - email: {EMAIL}
    hash: '{hashed}'
    username: sso
    userID: "1906"
"""
    )
    DEX_YAML.chmod(0o644)
    LOGIN.write_text(
        f"issuer={ISSUER}\nemail={EMAIL}\npassword={password}\nclient_id={CLIENT_ID}\n"
    )
    LOGIN.chmod(0o600)
    upsert_env(
        ENV,
        {
            "OIDC_ISSUER": ISSUER,
            "OIDC_CLIENT_ID": CLIENT_ID,
            "OIDC_CLIENT_SECRET": client_secret,
            "OIDC_REDIRECT_URI": "https://otv.poptrust.me/v1/auth/oidc/callback",
            "OIDC_SCOPE": "openid email profile",
        },
    )
    patched = insert_dex_handle(CADDY)
    insert_dex_handle(SNIPPET)
    print("dex_config_written")
    print("caddy_patched", patched)
    print("sso_email", EMAIL)
    print("sso_password_file", str(LOGIN))


if __name__ == "__main__":
    main()
