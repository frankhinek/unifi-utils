# UniFi Controller Utilities

A collection of utilities for working with UniFi Network Controllers. This
repository contains various tools to help manage and interact with UniFi
controllers and their APIs.

## Available Utilities

### Authentication Testing Tools
Tools for verifying UniFi Controller authentication and API access:

- **auth-test-rs**: A Rust implementation with command-line arguments and
                    structured output
- **auth-test-js**: A Node.js implementation with interactive password prompt

Both authentication testers provide:
- Controller authentication verification
- Site listing functionality
- Optional guest authorization testing

## Project Structure

```
.
├── auth-test-rs/ # Rust implementation
├── auth-test-js/ # Node.js implementation
└── README.md # This file
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.
