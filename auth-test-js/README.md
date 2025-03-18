# UniFi Auth Test (Node.js)

A Node.js utility for testing authentication against UniFi Network Controllers.

## Features

- Interactive password prompt with masked input
- SSL/TLS support with optional certificate verification bypass
- Site listing functionality
- Optional guest authorization testing

## Prerequisites

- Node.js
- Or use the provided Nix development environment

## Installation

```bash
# Using Nix Flakes
nix develop

# Install dependencies
pnpm install
```

## Configuration

Edit the `UNIFI_CONFIG` object in `unifi-auth-test.js`:

```javascript
const UNIFI_CONFIG = {
  controller: 'unifi.example.com',  // Your controller hostname/IP
  port: 8443,                       // Default UniFi controller port
  username: 'admin',                // Your UniFi admin username
  site: 'default',                  // Default site name
  insecure: true                    // Set to false if you have a valid SSL cert
};
```

## Usage

```bash
# Basic authentication test
node unifi-auth-test.js

# Test with guest authorization
node unifi-auth-test.js "00:11:22:33:44:55"
```

The script will:
1. Prompt for your password (with masked input)
2. Test authentication against the controller
3. List available sites
4. Test guest authorization (if MAC address provided)

## Security Notes

- Password input is masked in the terminal
- SSL certificate verification can be enabled/disabled via the `insecure` config option
- Credentials are only stored in memory during execution
