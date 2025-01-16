# FloodPoint

FloodPoint is a Next.js application that allows you to create multiple simultaneous bot connections to ClassPoint sessions. It uses SignalR for WebSocket connections and provides a simple interface to manage multiple bot instances.

## Features

- Create multiple simultaneous connections to ClassPoint sessions
- Unique auto-generated usernames and participant IDs for each connection
- Real-time connection status monitoring
- Ability to disconnect all bots at once
- Responsive UI that works on both desktop and mobile

## Using Floodpoint
View the website live at [https://floodpoint.akean.dev](https://floodpoint.akean.dev)

## Technologies Used

- Next.js 15
- TypeScript
- SignalR
- Tailwind CSS
- UUID

## Running Floodpoint Locally

1. Clone the repository:
```bash
git clone https://github.com/InsanelyAvner/floodpoint.git
```

2. Install npm packages

```bash
npm install
```

3. Run the development server
```bash
npm run dev
```