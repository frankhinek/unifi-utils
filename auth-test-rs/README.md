# UniFi Auth Test (Rust)

A command-line utility for testing authentication against UniFi Network
Controllers, written in Rust.

## Features

- Secure password input (either via command line or interactive prompt)
- SSL/TLS support with optional certificate verification bypass
- Site listing functionality
- Optional guest authorization testing

## Prerequisites

- Rust toolchain (rustc, cargo)
- Or use the provided Nix development environment

## Building

Using Nix Flakes:
```bash
nix develop
cargo build --release
```

Using Cargo:
```bash
cargo build --release
```

## Usage

```bash
# Basic usage with password prompt
./unifi-auth-test --controller unifi.example.com --username admin

# Specify all options
./unifi-auth-test \
    --controller unifi.example.com \
    --port 8443 \
    --username admin \
    --password "your-password" \
    --site default \
    --insecure \
    --test-mac "00:11:22:33:44:55"
```

### Command Line Options

- `--controller`: UniFi Controller hostname (default: unifi.openprotocol.xyz)
- `--port`: Controller port (default: 8443)
- `--username`: Admin username (default: testadmin)
- `--password`: Admin password (optional, will prompt if not provided)
- `--site`: Site name (default: default)
- `--insecure`: Skip SSL certificate verification
- `--test-mac`: MAC address for testing guest authorization (optional)

## Output

The tool will display:
1. Authentication status
2. List of available sites
3. Guest authorization results (if MAC address provided)
