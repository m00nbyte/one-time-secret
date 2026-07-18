# One Time Secret

Zero-trust secure messaging. Your messages are encrypted end-to-end and destroyed immediately after the recipient reads them.

## ✨ Features

- **End-to-end encryption** — Messages are encrypted with AES-256-GCM directly in your browser before they reach the server.
- **Self-destructing links** — Secrets are permanently destroyed the moment they're read once.
- **Self-expiring** — Choose how long a link stays valid. Expired secrets are removed automatically.
- **Optional passphrase** — Add an extra layer of protection with a password to reveal the message.
- **Multiple views** — Need to share with more than one person? Allow a link to be opened up to 100 times before it disappears.
- **Brute-force protection** — After 5 failed passphrase attempts, the secret is automatically locked.
- **Rate limiting** — API endpoints enforce a per-client request limit with a lockout penalty for abusers.
- **No sign-up required** — Create and share secrets instantly, no account needed.
- **Anonymous by design** — No accounts, no IP logging, no tracking.
- **QR code sharing** — Generate a scannable QR code for any secret link.
- **Generous size limit** — Messages up to 2 MB of plaintext.
- **Installable PWA** — Add it to your home screen and use it like a native app.

## 🚀 Live Demo

[Check out the live demo here!](https://onetimesecret.eu/)

_(Please be aware that the demo is running on a free-tier server, so it may be slow or unavailable at times.)_

## 🛠️ Technologies Used

- [Next.js](https://nextjs.org/) - React framework for server-rendered applications.
- [React](https://reactjs.org/) - JavaScript library for building user interfaces.
- [TypeScript](https://www.typescriptlang.org/) - Typed superset of JavaScript.
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework.
- [Mongoose](https://mongoosejs.com/) - MongoDB object modeling for Node.js.

## 💻 Getting Started

### Prerequisites

- Node.js (v20 or higher)
- Yarn

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/m00nbyte/one-time-secret.git
    ```

2.  Install the dependencies:

    ```bash
    yarn install
    ```

3.  Set up your environment variables:

    ```bash
    cp .env.example .env
    ```

    You will need to add `MONGODB_URI` and `SECRET_ENCRYPTION_KEY` to your `.env` file.

### Running the Application

1.  Start the development server:

    ```bash
    yarn dev
    ```

2.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🤝 Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## :heart: Like my work?

This project needs a :star: from you.
Don't forget to leave a star.

<a href="https://www.buymeacoffee.com/m00nbyte" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="217" height="60">
</a>
