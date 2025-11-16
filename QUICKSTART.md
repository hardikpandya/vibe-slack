# 🚀 Quick Start Guide - Run Locally

## Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher (comes with Node.js)

## Installation & Setup

### Step 1: Clone or Download the Repository

```bash
# If using git
git clone <repository-url>
cd chat-ops-slack

# Or download and extract the ZIP file, then navigate to the folder
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages (React, Vite, TypeScript, etc.)

### Step 3: Run the Development Server

```bash
npm run dev
```

**🎉 That's it!** The app will run with the **default Atlassian configuration** - fully populated with:
- Atlassian company branding
- ITOM-4412 incident channel
- Team members (James McGill, Alice Carlysle, Bob Jenkins, Carol Diaz, etc.)
- Rovo AI assistant
- All channels and chat history

### Step 4: Customize Your Slack Environment (Optional)

**Only if you want to customize**, run the interactive setup wizard:

```bash
npm run setup
```

Or use the shorter alias:
```bash
npm run get-started
```

This wizard will:
- Ask about your company (name, industry, size)
- Ask about you (name, nationality, role)
- Ask about your team's nationalities (auto-generates team members)
- Automatically infer channels, communication style, and topics
- Generate all configuration files automatically

**💡 Tip**: You can skip customization and use the default Atlassian example, or customize later by running `npm run setup` anytime.

The app will start and you'll see output like:
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5180/
  ➜  Network: use --host to expose
```

### Step 4: Open in Browser

Open your browser and navigate to:
```
http://localhost:5180
```

The app will automatically route to `/slack` and show the Slack interface.

## Available Commands

```bash
npm run setup    # Interactive wizard to customize your Slack environment
npm run dev      # Start development server with hot reload
npm run generate # Regenerate config files from company-context.json
npm run build    # Build for production
npm run preview  # Preview production build locally
npm run lint     # Run ESLint to check code quality
```

## Troubleshooting

### Port Already in Use

If port 5180 is already in use, Vite will automatically try the next available port. Check the terminal output for the actual port number.

Or manually specify a different port:
```bash
npm run dev -- --port 3000
```

### Node.js Version Issues

Check your Node.js version:
```bash
node -v
```

If you need to upgrade:
- Visit https://nodejs.org/ and download the latest LTS version
- Or use a version manager like `nvm`:
  ```bash
  nvm install 18
  nvm use 18
  ```

### Dependencies Won't Install

Try a clean install:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Assets Not Loading

The `predev` script automatically copies assets before starting. If assets are missing:

```bash
# Manually copy assets
rm -rf public/assets
mkdir -p public
cp -R assets public/assets

# Then run dev again
npm run dev
```

## What You'll See

- **Slack-like interface** with channels, DMs, and messages
- **Real-time message generation** with contextual conversations
- **Theme switcher** in the bottom left (chevron icon)
- **Interactive features**: reactions, file embeds, link embeds
- **Rovo AI assistant** for automated responses

## Development Tips

- **Hot Reload**: Changes to code will automatically refresh in the browser
- **TypeScript**: The project uses TypeScript - check for type errors in the terminal
- **Assets**: Add new images to `assets/` directory - they'll be copied to `public/assets/` automatically
- **Configuration**: Edit `src/company.json`, `src/people.json`, `src/channel-config.json` to customize

## Need Help?

- Check `README.md` for detailed documentation
- Review `EXPLAINER.md` for feature explanations
- Check the terminal for error messages

---

**Happy coding! 🎉**
