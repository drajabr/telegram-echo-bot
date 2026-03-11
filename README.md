# Telgram Message Forwarder Bot

A simple telegram bot to forward messages from one channel to another channel or group. Written in pure Telegram Bot API using grammy framework.
This bot uses webhooks to receive updates from telegram servers. So, you need a server with a public IP address and a domain name to run this bot. This bot can be deployed on serverless platforms like Vercel, Render, Cyclic etc.

## Features

-   Forward messages from one channel to another channel or group
-   Forward messages from multiple channels to multiple channels or groups
-   Forward messages from multiple channels to a single channel or group
-   Forward messages from a single channel to multiple channels or groups
-   Configurations through commands
-   Owner only commands, so no one can misuse the bot
-   Easy to clone and create your own bot withing minutes
-   Control forwarding behavior via bot name (protect content, remove captions)

## Commands

-   `/start` - Start the bot
-   `/help` - Show help message
-   `/set` - Add a channel to forward messages from
-   `/rem` - Remove a channel from forwarding messages
-   `/get` - List all the channels added
-   `/set_owner` - Set the owner of the bot

## Bot Name Modifiers

You can control forwarding behavior by adding special characters to your bot's name (via [BotFather](https://t.me/BotFather)):

-   `~` - Enable protected content (forwarded messages cannot be forwarded further or saved)
-   `|` - Remove captions from forwarded messages

For example, if your bot is named `MyForwarder~`, all forwarded messages will have content protection enabled. You can combine modifiers, e.g., `MyBot~|` for both protected content and no captions.

## Configurations

Configurations are added in environment variables or [`.env.sample`](./.env.sample) file and rename it to `.env`. The following environment variables are required to run the bot.

-   `BOT_TOKEN` - Telegram bot token received from [BotFather](https://t.me/BotFather)
-   `REDIS_URI` - Redis database URI. When you use the provided Docker Compose file the default is `redis://redis:6379` (the bundled `redis` service); you may override it in `.env` if you need a remote Redis instance.
-   `WEBHOOK_HOST` - URL of the server where the bot is running (Traefik will forward your public domain to port **3000** inside the container)

*The bot listens on port 3000 internally; the reverse proxy (Traefik) maps your public hostname to that port.*

## Deploying

### Deploying on Vercel, Render, Cyclic, Heroku etc.

-   Fork this repository
-   Create a new app on the platform you want to deploy
-   Connect your forked repository to the app
-   Set environment variables in the project settings
-   (Optional) Set the `PORT` environment variable to the port number provided by the platform or set it to 3000

### Self-Hosting

Not recommended for beginners.

Note: You need SSL certificates and a public IP address to run the bot. As this bot works on webhooks, you need a domain name to set the webhook URL. You can use [Cloudflare Tunnel](https://try.cloudflare.com/) to get a free temporary domain name and SSL certificates.

#### Using Docker

*The compose file now includes a Traefik reverse proxy that automatically obtains TLS certificates via Cloudflare DNS.*

-   Clone this repository

```sh
git clone <repo-url> <project-name>
cd <project-name>
```

-   Create a `.env` file with your environment variables (see [`.env.sample`](./.env.sample)).
    - If you plan to use the bundled Redis service, set `REDIS_URI=redis://redis:6379` or omit it entirely and the compose file will default to that value.
    - To enable HTTPS with Traefik and Cloudflare DNS challenge, set `DOMAIN=<yourdomain.com>`, add a Cloudflare API token with DNS-edit permissions as `CLOUDFLARE_API_TOKEN`, and optionally provide `CF_EMAIL` for certificate registration. Set `WEBHOOK_HOST` to `https://<yourdomain.com>`.

-   Run with Docker Compose (the `redis` and `traefik` services will start automatically and proxy to the bot on port 3000):

```sh
# start bot + redis + reverse proxy in background
docker-compose up -d
```

-   (Optional) you can still build and run the bot image manually if you prefer:

```sh
docker build -t telegram-forwarder-bot .
docker run -d --env-file .env -p 3000:3000 telegram-forwarder-bot
```#### Manual Deployment

-   Clone this repository

```sh
git clone <repo-url> <project-name>
cd <project-name>
```

-   Install dependencies

```sh
bun install
```

-   Build the project

```sh
bun run build
```

-   Set environment variables

-   Start the bot

```sh
bun start
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the GPL-3.0-or-later - see the [LICENSE](LICENSE) file for details
