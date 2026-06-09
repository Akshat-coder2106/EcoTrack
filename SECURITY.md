# Security Policy

We take the security of our application and user data seriously.

## API Key Storage

For the privacy and security of our users, this application does not store any API keys on a centralized backend server. 

Instead, API keys (such as the OpenRouter API key) are stored **only in the browser's `sessionStorage`**. This ensures that the key is only retained for the duration of your session and is cleared when the tab or window is closed.

## Data Transmission

The API key is never sent to any backend server operated by this application. It is only sent directly to **OpenRouter** to authenticate your requests.

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please send an e-mail to the maintainers. All security vulnerabilities will be promptly addressed.
