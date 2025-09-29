# Contributing to SizeKit

Thank you for your interest in contributing to SizeKit! This is part of the 4TRACK application ecosystem.

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/cosmicguruman/sizekit.git
cd sizekit
```

2. Generate SSL certificates for local HTTPS testing:
```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"
```

3. Start the HTTPS server:
```bash
python3 serve_https.py
```

4. Access on mobile (same WiFi): `https://YOUR_LOCAL_IP:8443`

## Project Structure

```
sizekit/
├── index.html          # Main UI with screen management
├── styles.css          # Mobile-first responsive styles
├── camera.js           # Camera API logic and error handling
├── serve_https.py      # Python HTTPS server for testing
├── server.js           # Node.js HTTPS server (alternative)
└── README.md           # Documentation
```

## Testing Requirements

Before submitting a PR, please test on:
- ✅ iOS Safari (primary target)
- ✅ iOS Chrome
- ✅ Android Chrome
- ✅ Verify back camera opens (not front camera)
- ✅ Test error handling (deny permissions, etc.)

## Code Standards

- Use vanilla JavaScript (no frameworks for Phase 1)
- Keep code readable and well-commented
- Follow mobile-first design principles
- Ensure HTTPS compatibility
- Handle errors gracefully with user-friendly messages

## Commit Message Format

Use conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

Example:
```
feat: add camera flash toggle

- Implemented torch mode for better scanning
- Added UI toggle button
- Tested on iOS and Android
```

## Phase Roadmap

- ✅ **Phase 1:** Back camera access (CURRENT)
- 🔜 **Phase 2:** Image capture functionality
- 🔜 **Phase 3:** Image processing and measurement
- 🔜 **Phase 4:** Customer data input
- 🔜 **Phase 5:** Artist dashboard integration

## Questions?

Open an issue or reach out to the maintainers.

## License

MIT License - See [LICENSE](LICENSE) file for details.
