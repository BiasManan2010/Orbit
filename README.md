<p align="center">
  <br/>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-TBD-3F51B5.svg?style=for-the-badge&label=License&logoColor=000000&labelColor=ececec" alt="License"></a>
  <a href="https://github.com/BiasManan2010/orbit/stargazers"><img src="https://img.shields.io/github/stars/BiasManan2010/orbit?style=for-the-badge&color=A78BFA&labelColor=ececec" alt="Stars"></a>
  <a href="https://github.com/BiasManan2010/orbit/issues"><img src="https://img.shields.io/github/issues/BiasManan2010/orbit?style=for-the-badge&color=EC4899&labelColor=ececec" alt="Issues"></a>
  <a href="https://buymeachai.in/mananbharti"><img src="https://img.shields.io/badge/Support-Buy%20Me%20A%20Chai-FFDD00?style=for-the-badge&logoColor=000000&labelColor=ececec" alt="Buy Me A Chai"></a>
  <br/>
  <br/>
</p>

<p align="center">
  <!-- 🖼️ BOILERPLATE: Orbit logo — replace with design/orbit-logo.svg -->
  <img src="design/orbit-logo.svg" width="220" title="Orbit logo">
</p>

<h3 align="center">Continuity for every device — not just Apple's</h3>
<p align="center">Clipboard sync · File sharing · Remote control — between your phone and your PC, instantly.</p>

<br/>

<a href="https://github.com/BiasManan2010/orbit">
  <!-- 🖼️ BOILERPLATE: Product screenshot — mobile app + desktop tray, side by side -->
  <img src="design/orbit-screenshots.png" title="Orbit screenshots">
</a>

<br/>

> [!NOTE]
> Orbit is in active early development. Features listed below reflect the current build plan — check the [Roadmap](#roadmap) for what's shipped vs. planned.

> [!WARNING]
> ⚠️ Orbit is not a remote-desktop tool. It does not stream your screen or provide screen-sharing/remote-viewing — see [What Orbit Is Not](#what-orbit-is-not).

<br/>

## Links

- [What is Orbit?](#what-is-orbit)
- [Demo](#demo)
- [Features](#features)
- [Supported Platforms](#supported-platforms)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Roadmap](#roadmap)
- [What Orbit Is Not](#what-orbit-is-not)
- [Contributing](#contributing)
- [Support the Project](#support-the-project)
- [License](#license)

<br/>

## What is Orbit?

Apple's Continuity — Handoff, Universal Clipboard, AirDrop — only works between Apple devices. Mix an iPhone with a Windows or Linux PC, or an Android phone with any desktop, and that seamlessness disappears.

**Orbit brings it back, for any combination of devices.** A companion app for your phone and a lightweight service for your PC, connected over a fast local channel, giving you instant clipboard sync, direct file transfer, and full remote control — no cloud round-trips, no vendor lock-in.

<br/>

## Demo

<!-- 🖼️ BOILERPLATE: Add a hosted demo link or demo GIF once available -->
A live demo will be linked here once Orbit reaches a public beta. In the meantime, see the screenshot above for a preview.

<br/>

## Features

| Feature                                        | Mobile | Desktop |
| :---------------------------------------------- | :----- | :------ |
| Bidirectional clipboard sync                     | Yes    | Yes     |
| Clipboard history across devices                 | Yes    | Yes     |
| Direct file transfer (no cloud)                  | Yes    | Yes     |
| Native share-sheet integration                   | Yes    | N/A     |
| Drag-and-drop file drop zone                      | N/A    | Yes     |
| Auto-organize transferred files                  | N/A    | Yes     |
| Photo auto-backup to PC                          | Yes    | Yes     |
| Customizable app launcher grid                    | Yes    | N/A     |
| Context-aware launcher ("scenes")                | Yes    | N/A     |
| Full mouse/touchpad control                       | Yes    | N/A     |
| Gyroscope mouse mode                             | Yes    | N/A     |
| Full keyboard input + custom macros              | Yes    | N/A     |
| System volume & per-app audio mixer              | Yes    | Yes     |
| Power control (shutdown/sleep/restart/lock)      | Yes    | Yes     |
| Wake-on-LAN                                      | Yes    | N/A     |
| Display brightness & mode control                | Yes    | Yes     |
| Presentation mode (slides + laser pointer)       | Yes    | N/A     |
| Browser tab control                               | Yes    | Yes     |
| QR pairing + biometric confirmation              | Yes    | Yes     |
| Per-device permission scoping                    | N/A    | Yes     |
| Activity log & panic lock                         | Yes    | Yes     |
| Automation / scheduled actions                    | Yes    | Yes     |
| Multi-PC support                                 | Yes    | N/A     |
| Developer/terminal remote access                  | Yes    | Yes     |
| AI-driven natural-language PC control *(planned)* | —      | —       |

<br/>

## Supported Platforms

| | iOS | Android | Windows | Linux |
|---|:---:|:---:|:---:|:---:|
| **Orbit Mobile** | ✅ | ✅ | — | — |
| **Orbit Desktop** | — | — | ✅ | ✅ |

<br/>

## Architecture

<!-- 🖼️ BOILERPLATE: Architecture diagram -->
<p align="center">
  <img src="design/orbit-architecture.png" width="80%" title="Orbit architecture">
</p>

Orbit is made up of two components talking over one encrypted, low-latency channel:

- **Orbit Mobile** — React Native app (iOS/Android). Sends commands, receives clipboard/file events.
- **Orbit Desktop** — Node.js background service (Windows/Linux). Simulates input, handles file transfer, executes commands.

Discovery is handled via mDNS/Bonjour on the local network, with QR-code pairing for first connection and a push-notification channel (APNs/FCM) to wake the mobile connection for background events.

<br/>

## Getting Started

```bash
# Clone the repo
git clone https://github.com/BiasManan2010/orbit.git
cd orbit

# Desktop service
cd desktop && npm install && npm start

# Mobile app
cd ../mobile && npm install && npm run start
```

Full installation and pairing instructions will be published as the project stabilizes.

<br/>

## Roadmap

- [x] Core architecture design
- [ ] **v1** — Clipboard sync, file sharing, app launcher, mouse/keyboard control, power control, QR pairing
- [ ] **v2** — Clipboard history, continuity ("continue on PC"), context-aware launcher, security hardening, presentation mode
- [ ] **v3** — Automation, multi-device support, developer tools, accessibility modes
- [ ] **Future** — AI agent layer for natural-language PC control

<br/>

## What Orbit Is Not

Orbit deliberately does **not** include screen mirroring or remote-desktop viewing (no AnyDesk/TeamViewer-style video streaming). It's built for fast command-and-transfer actions, not remote screen access.

<br/>

## Repository Activity

<!-- Auto-generates once the repo has commit history -->
![Activity](https://repobeats.axiom.co/api/embed/PLACEHOLDER_REPOBEATS_ID.svg "Repobeats analytics image")

<br/>

## Contributing

Orbit is early-stage. Issues, feature ideas, and pull requests are welcome — open an issue to discuss before submitting larger changes.

<a href="https://github.com/BiasManan2010/orbit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=BiasManan2010/orbit" width="100%"/>
</a>

<br/>

## Support the Project

If Orbit saved you a few "email it to myself" moments, consider fueling the next build:

<p align="left">
  <a href="https://buymeachai.in/mananbharti"><img src="https://img.shields.io/badge/%F0%9F%8D%B5-Buy%20Me%20A%20Chai-FFDD00?style=for-the-badge" alt="Buy Me A Chai"></a>
</p>

<br/>

## License

License to be finalized — see [LICENSE](./LICENSE) once added.

<br/>

<p align="center">
  <sub>Built by <a href="https://github.com/BiasManan2010">Manan Bharti</a></sub>
</p>
