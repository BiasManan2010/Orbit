# Orbit Desktop

The Node.js + TypeScript background service for Orbit. Phases 1–2 provide the **Command Router**, **WebSocket** encrypted command channel, **QR Code Pairing**, durable device credentials, automatic session renewal, mDNS/Bonjour discovery, and an in-memory **Activity Log**. A TypeScript integration client exercises the channel while Orbit Mobile remains a later phase.

No feature handlers are registered yet. Clipboard Sync, File Transfer, App Launcher, Input Simulation, and Power & Session will be added one module at a time. The root [README](../README.md) remains the product scope reference.

## Test the Module

Requirements: Node.js 24 or newer and npm. No OpenSSL installation is needed. Windows uses its built-in PowerShell ACL APIs for private storage; Linux uses owner-only filesystem permissions.

```bash
cd desktop
npm ci
npm run typecheck
npm test
npm run test:lan
```

In PowerShell, use `npm.cmd` if local execution policy blocks `npm.ps1`.

The default suite generates temporary self-signed certificates and device credentials, runs real WSS servers on loopback, and removes its temporary files afterward. It covers certificate pinning, one-time enrollment, persistence, renewal, malformed messages, biometric gating, events, and dropped connections. It does not touch the OS clipboard, simulate input, or change power state.

`test:lan` additionally exercises real mDNS multicast discovery followed by pinned HTTPS pairing and authenticated WSS. It needs multicast access on the host; a sandbox or firewall blocking UDP 5353 causes a failure, not a skipped test. These are desktop/Node tests, not real-phone validation.

Approved runtime dependencies are `ws` (WebSocket), `zod` (boundary validation), `selfsigned` (certificate generation), `qrcode` (local SVG rendering), and `bonjour-service` (mDNS). Node supplies HTTPS, TLS, crypto, and the test runner. TypeScript and type definitions are development dependencies. Versions are pinned in `package-lock.json`.

## Run the Service

From `desktop/`, start the service in one PowerShell terminal:

```powershell
$env:ORBIT_HOST = "127.0.0.1"
$env:ORBIT_PORT = "8765"
$env:ORBIT_DATA_DIR = "$PWD/.local/service"
npm.cmd start -- --pair
```

First startup creates an owner-only data directory, a persistent service UUID, and an EC P-256 self-signed certificate signed with SHA-256. Certificates last 365 days and bind to the stable identity name `orbit-<service UUID>.local`. The client verifies that name and the QR pin; DHCP address changes do not require certificate replacement. An expired or corrupt identity fails closed and is never silently regenerated.

Normal startup leaves pairing closed. `--pair`, or entering `pair` in the running service terminal, explicitly opens one two-minute invitation. Open `.local/service/pairing.svg` to view the QR. The matching `pairing.json` is provided for this phase's integration client. Both files are private enrollment artifacts: do not commit, publish, or paste them into logs. A replacement invitation invalidates the old one, and redemption consumes it once. The files are removed at expiry or graceful shutdown.

In a second PowerShell terminal, also from `desktop/`, pair once:

```powershell
$env:ORBIT_CLIENT_DIR = "$PWD/.local/client"
npm.cmd run client -- pair .local/service/pairing.json
npm.cmd run client -- connect
```

The client discovers the public certificate through mDNS, checks the QR fingerprint, redeems the invitation over verified HTTPS, and saves its durable credential privately. Repeating the `pair` command with the same invitation must fail. Subsequent `connect` runs reuse the saved credential.

While connected, enter:

```json
{"type":"clipboard.sync","payload":{}}
```

Expect `Command rejected: UNKNOWN_COMMAND`: authentication and routing work, but Clipboard Sync is Phase 3 and no feature handler is registered yet. Leave the client connected for about four minutes to observe automatic `reconnecting` / `connected` status without another QR scan. Enter `quit` to stop either process. Restart the service while keeping the client running to exercise automatic reconnection with its durable credential.

For a second machine on the LAN, set `ORBIT_HOST` to the desktop's private IPv4 address before startup. The loopback default is for same-machine testing. Wildcard and public-address binds are rejected; IPv6 LAN discovery/binding remain unimplemented. mDNS uses UDP 5353 and WSS uses the configured port (8765 by default). The client re-resolves the same pinned desktop on reconnect. No firewall rules are changed by Orbit.

`identity.json` stores the private key and certificate together; `credentials.json` stores only SHA-256 hashes of random 32-byte, base64url device credentials. Writes use atomic replacement and flushed temporary files. `paired-desktop.json` in the client directory contains its credential and pinned public identity. Existing data directories must already be owner-only; Orbit rejects unsafe permissions instead of changing an existing directory's ACL. `.local/` is ignored by Git.

Only one service may use a data directory at a time. An exclusive `service.lock` prevents concurrent enrollment/identity writes. After an ungraceful process termination, inspect the recorded PID and verify that process is gone before manually removing the stale lock. Do not remove an active service's lock. Never delete or replace `identity.json` as a connection workaround: changing the certificate requires explicit re-pairing.

Phase 1's `ORBIT_TLS_CERT`, `ORBIT_TLS_KEY`, and `ORBIT_CREDENTIAL_STORE` overrides are rejected in this managed identity flow. Existing hand-provisioned identities are not automatically imported or rotated; use a separately named private data directory for Phase 2 testing and explicitly pair it. Production migration/recovery UI remains outside this phase.

## Connection and Message Protocol

1. Scan the locally requested QR: `version`, `desktopServiceId`, `displayName`, `endpoint`, `certificateFingerprint`, `pairingToken`, and `expiresAt` (Unix milliseconds). The WSS endpoint must be a local IP address with path `/v1/channel`.
2. Discover `_orbit._tcp` using mDNS. Its TXT fields contain `version`, `id`, `name`, `endpoint`, `parts`, and `cert0` … `certN`: at most eight 200-character base64 chunks of the public DER certificate. No tokens, private keys, or credentials are advertised. Discovery is untrusted; verify SHA-256 against the QR pin before opening HTTPS/WSS or transmitting a credential.
3. Send bodyless `POST /v1/pair` over pinned HTTPS with `Authorization: Bearer <one-time-pairing-token>`. Success returns `version`, `desktopServiceId`, `deviceId`, and a durable `credential`. Invalid/expired/reused invitations return 401. A storage failure returns 503 and consumes the invitation; request a new local QR rather than retrying redemption.
4. Send bodyless `POST /v1/session` over pinned HTTPS with `Authorization: Bearer <durable-device-credential>`. Success returns `version`, `deviceId`, `sessionId`, `expiresAt`, and `sessionToken`. Responses use `Cache-Control: no-store`.
5. Connect to WSS with `Authorization: Bearer <session-token>`. Every command uses this verified connection identity. Credentials/tokens are never accepted in URLs or feature payloads. The old `session.refresh` command is rejected.
6. At 80% of the token's lifetime, the integration client automatically exchanges its durable credential and opens a replacement WSS connection with the new Authorization header. A disconnect follows bounded exponential backoff with jitter (500 ms base, 30 s cap). Failed authentication stops retries and requires explicit recovery. No commands are queued or replayed. In-flight commands interrupted by renewal/disconnection reject with an unknown outcome.

TLS chain verification stays enabled. The public certificate that matches the QR fingerprint is the trust anchor, and each connection checks its stable service identity and fingerprint again. A changed discovery endpoint never changes the pin. React Native equivalents remain Phase 8.

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
- **Sensitive actions** — every `input.*` and `power.*` command passes through the biometric-confirmation hook. The default verifier denies execution. Input Simulation will require confirmation once per remote-control session; Power & Session will require confirmation per action. Neither policy's actual verifier/UI is implemented in Phase 2, and a client-provided boolean is not proof.
- **Pairing contract** — `src/protocol/pairing.ts` validates the approved QR and response shapes with Zod. The private service identity and credential hashes persist; invitations and session tokens do not survive a service restart.
- **Per-device permission scoping** remains v2. All registered nonsensitive v1 commands are available to an authenticated paired device. Restart power control, Panic Lock, and clipboard history are not implemented.
- **Activity Log** stores only timestamp, severity, event type, device/session identifiers, request ID, registered command type, and outcome. It has no persistence, payload fields, arbitrary error strings, or network export. The last 1,000 entries are held in memory to bound RAM usage; this is not a disk retention policy.

Operational limits are named in `src/config.ts`, `session-auth.ts`, and the transport/router modules: five-minute sessions, 30-second heartbeats, 64 KiB incoming messages, 256 KiB outbound buffering, 32 WebSocket connections, eight sessions per device, and 128 sessions total. A missed heartbeat terminates the peer. Expiry/revocation closes the socket with code `4001`; shutdown uses `1001` and a bounded close grace period. A new session beyond a device's eight-session limit invalidates its oldest session.

Session issuance and upgrade attempts are limited to 60 per peer IP per minute. The router remembers up to 4,096 request IDs per session and then returns `BUSY` until the client renews its session. File Transfer will define chunk sizing below the message limit when that module is built.
