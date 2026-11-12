# Hope ERP

## Run

Open `index.html` in a current browser. No package installation or database server is needed. The sign-in and account creation pages use the browser's IndexedDB database named `HopeERP`.

You can also open `login.html` or `create-user.html`; both route to the matching panel in `index.html`.

## Account database

The database creates a `users` object store with an auto-incrementing `id` and a unique `email` index. Each account stores its name, normalized email, creation time, a random salt, and a PBKDF2-SHA-256 password hash. Passwords are not stored directly. The same browser profile and device are required to see an account again.

Use a modern browser with IndexedDB and Web Crypto enabled. If browser security settings block password hashing, run the site from `localhost` or HTTPS.

This is a local prototype, not a production authentication service: data is not shared across devices, and there is no server-side authorization or account recovery. Do not use it to protect real business or sensitive data. A production ERP needs a server-backed database and authentication service.
