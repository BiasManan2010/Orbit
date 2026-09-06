# Orbit Desktop

The Node.js + TypeScript background service for Orbit. This first module provides the **Command Router**, **WebSocket** encrypted command channel, short-lived session authentication, and an in-memory **Activity Log**.

No feature handlers are registered yet. Clipboard Sync, File Transfer, App Launcher, Input Simulation, and Power & Session will be added one module at a time. The root [README](../README.md) remains the product scope reference.

## Test the Module

Requirements: Node.js 24 or newer, npm, and OpenSSL for the integration tests. On Windows, the tests also find OpenSSL bundled with Git for Windows. Set `ORBIT_TEST_OPENSSL` to its executable path if needed.

```bash
cd desktop
npm ci
npm run typecheck
npm test
```

In PowerShell, use `npm.cmd` if local execution policy blocks `npm.ps1`.

The tests generate temporary self-signed certificates and device credentials, run a real WSS server on loopback, and remove their temporary files afterward. They test certificate pinning, authentication, renewal, malformed messages, biometric gating, events, and dropped connections. They do not touch the OS clipboard, simulate input, or change power state. No phone or QR setup is needed to run them.

The only runtime dependency is `ws`, which implements WebSocket framing, upgrades, and control frames. Node supplies HTTPS, TLS, crypto, and the test runner. TypeScript and the Node/`ws` type definitions are development dependencies. Versions are pinned in `package-lock.json`.

## Run the Service

Supply a persistent local TLS certificate and matching private key. There is no cleartext fallback. A changed certificate requires a newly verified pin on the mobile device.

Example development certificate creation from `desktop/`:

```bash
mkdir .local
openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" -keyout .local/private-key.pem -out .local/certificate.pem
```

PowerShell configuration:

```powershell
$env:ORBIT_TLS_CERT = "$PWD/.local/certificate.pem"
$env:ORBIT_TLS_KEY = "$PWD/.local/private-key.pem"
$env:ORBIT_HOST = "127.0.0.1"
$env:ORBIT_PORT = "8765"
npm.cmd start
```

For a phone on the same LAN, bind `ORBIT_HOST` to the desktop's private IPv4 address and include that address in the certificate's subjectAltName. Wildcard and public-address binds are rejected. This initial transport supports private/link-local IPv4 and loopback; IPv6 LAN discovery and binding remain unimplemented. Keep the private key and any credential store in an OS-protected local directory. `.local/` is ignored by Git.

Without `ORBIT_CREDENTIAL_STORE`, the service authorizes no devices. QR enrollment is a separate module and is not implemented here. The optional store is an adapter for credentials provisioned by pairing; it must never be populated from an unauthenticated network request. Its JSON format is an array of `{ "deviceId": "<UUID>", "credentialHash": "<64 lowercase hex characters>" }`. The hash is SHA-256 of a randomly generated 32-byte credential encoded as unpadded base64url. The mobile device retains the original credential in secure storage.

The file adapter loads at startup. Restart after changing it; durable credentials survive restarts, while sessions do not. The `PairedCredentialStore` interface also permits a future pairing module to expose current credential/revocation state. No credential generation or pairing endpoint is exposed by this module.

## Connection and Message Protocol

1. Verify the desktop's QR-pinned SHA-256 certificate fingerprint **before transmitting credentials**. `certificateFingerprint` is lowercase hex of the DER certificate hash. The Node integration client trusts that exact self-signed certificate and checks its fingerprint and endpoint identity; it never disables TLS verification. Orbit Mobile will need equivalent native certificate pinning.
2. Send `POST /v1/session` over HTTPS with `Authorization: Bearer <durable-device-credential>` and no body. A successful response contains `version`, `deviceId`, `sessionId`, `expiresAt` (Unix milliseconds), and `sessionToken`. Responses use `Cache-Control: no-store`.
3. Connect to `wss://<desktop>:<port>/v1/channel` with `Authorization: Bearer <session-token>`. Credentials and tokens are never accepted in URLs. The authenticated identity is bound to the socket; every command checks that its session is still valid.
4. Before expiry, exchange the durable credential for a new session token and send `session.refresh` over the existing socket. Its payload is `{ "sessionToken": "<new-token>" }`. The new session must belong to the same device. This does not require another QR scan. The later Orbit Mobile transport will schedule renewal automatically, ideally one minute before expiry.
5. After a disconnect, Orbit Mobile will reconnect with bounded exponential backoff and jitter, obtaining another session when needed. The desktop remains listening and cleans up the old connection. It does not initiate outbound connections or replay commands.

Feature command envelope:

```json
{
  "version": 1,
  "type": "<module.command>",
  "requestId": "<UUID>",
  "payload": {}
}
```

Each handler will define its command names and validate its payload. Extra envelope fields, binary frames, malformed JSON, and unsupported versions are rejected. `session.*` is reserved for transport authentication and cannot be registered as a feature command.

Responses use the same version and request ID, with `type: "response"` and either `payload: { "ok": true, "result": ... }` or `payload: { "ok": false, "error": { "code": "..." } }`. A malformed envelope gets a null request ID. Error codes are defined in `src/protocol/errors.ts`; internal exceptions are never sent to the client.

Desktop events use `{ "version": 1, "type": "event", "requestId": null, "payload": { "eventType": "<module.event>", "data": ... } }`. Feature modules call `transport.publish(deviceId, eventType, data)`; only that device's currently authenticated connections receive the event. Events are not persisted or queued for offline devices.

Only one feature command executes at a time per socket; overlapping requests receive `BUSY`. Clients should await completion or coalesce input before sending another request. The router rejects duplicate request IDs for the lifetime of a session, including reconnects. This is not an exactly-once guarantee across session renewal or service restarts: never automatically resend a command whose outcome is unknown.

## Security & Activity Log

- **LAN-only** — no APNs/FCM, cloud routes, analytics, or telemetry. Native requests carrying a browser Origin are rejected.
- **Sensitive actions** — every `input.*` and `power.*` command passes through the biometric-confirmation hook. The default verifier denies execution. A client-provided boolean is not proof. The later biometric module must define command-bound verification before these handlers can execute.
- **Pairing contract** — `src/protocol/pairing.ts` reserves protocol version, desktop service ID, display name, WSS endpoint, certificate fingerprint, one-time token, and expiry. QR generation, token consumption, durable enrollment, and mDNS are not implemented in this module.
- **Per-device permission scoping** remains v2. All registered nonsensitive v1 commands are available to an authenticated paired device. Restart power control, Panic Lock, and clipboard history are not implemented.
- **Activity Log** stores only timestamp, severity, event type, device/session identifiers, request ID, registered command type, and outcome. It has no persistence, payload fields, arbitrary error strings, or network export. The last 1,000 entries are held in memory to bound RAM usage; this is not a disk retention policy.

Operational limits are named in `src/config.ts`, `session-auth.ts`, and the transport/router modules: five-minute sessions, 30-second heartbeats, 64 KiB incoming messages, 256 KiB outbound buffering, 32 WebSocket connections, eight sessions per device, and 128 sessions total. A missed heartbeat terminates the peer. Expiry/revocation closes the socket with code `4001`; shutdown uses `1001` and a bounded close grace period. A new session beyond a device's eight-session limit invalidates its oldest session.

Session issuance and upgrade attempts are limited to 60 per peer IP per minute. The router remembers up to 4,096 request IDs per session and then returns `BUSY` until the client renews its session. File Transfer will define chunk sizing below the message limit when that module is built.
