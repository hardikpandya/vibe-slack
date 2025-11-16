# Slack Interface Prototype

A feature rich, pixel perfect Slack clone interface built with React and TypeScript. This prototype demonstrates a fully functional communication platform with channels, direct messages, rich media support, and contextual interactions.

## Overview

This project is a comprehensive Slack style communication interface prototype showcasing modern web UI/UX patterns, real time messaging simulation, and rich interactive features. Perfect for demonstrating communication platform capabilities, UI/UX design patterns, or as a foundation for building custom chat applications.

---

## Key Features

### Interface and Design

- **Pixel Perfect Slack Replication**: Faithfully recreates Slack's web interface with dark theme
- **Three Panel Layout**:
  - **Leftmost Panel**: Icon bar with company logo and user avatar
  - **Left Sidebar**: Chat list with sticky header, scrollable content, and hidden scrollbars
  - **Right Panel**: Full chat interface with tabs, message history, and composer
- **Dark Theme**: Matches Slack's dark mode color scheme (`#1a1d21`, `#000000`, `#2c2d30`)
- **Custom Typography**: Uses Lato font family for typography matching Slack's aesthetic
- **Smooth Scrolling**: Auto scrolls to latest messages with smooth behavior
- **Responsive Design**: Full screen layout optimized for modern displays

### Chat Features

#### Multiple Chat Types

- **Starred Channels**: Pinned important channels for quick access
- **Direct Messages**: Individual DMs with avatars, status indicators, and emoji statuses
- **Group DMs**: Multi person conversations with overlapping avatars
- **Channels**: Team channels organized by function and department

#### Rich User Profiles

- **Avatars**: Square avatars with rounded corners (6px border radius)
- **Online Offline Status**: Green/grey dots positioned at bottom right of avatars
- **Status Emojis**: Contextual emoji indicators (vacation, available, OOO, WFH, etc.)
- **Unread Badges**: Blue badges showing unread message counts
- **Static Status**: User online/offline statuses remain consistent

#### Message Features

- **Per Chat History**: Each chat maintains its own independent message history
- **Contextual Messages**: Channel specific and DM specific message content
- **Avatar Display**: Shows avatars for new messages or when sender changes
- **Message Spacing**: Increased spacing (20px) between different senders
- **HTML Support**: Messages support HTML formatting, links, and styled content
- **Link Rendering**: Automatic URL detection and rendering as clickable links
- **Rich Media**: Support for link embeds, file previews, and interactive content

### Interactive Features

- **Message Reactions**: Emoji reactions on messages
- **Action Buttons**: Interactive buttons for approvals, rejections, and other actions
- **Confirmation Messages**: Post action confirmation messages with italic styling
- **Keyboard Shortcuts**: 
  - Press `P` to trigger leave request workflow
  - Press `Q` to trigger expense report workflow
- **Message Composer**: Rich text input with Enter to send
- **Tab Navigation**: Switch between Messages, Threads, and Files tabs

### System Integrations

- **AI Assistant**: Built in AI assistant for automated responses and contextual help
- **HR System Integration**: HR system integration for HR related tasks and approvals
- **No Bot Status Badges**: System accounts (AI Assistant, HR System) don't show online/offline status

### Customization

- **Company Branding**: Fully customizable company name, logo, and branding
- **Team Configuration**: Customizable team members, roles, and avatars
- **Channel Setup**: Flexible channel naming and organization
- **Message Context**: Contextual message generation based on company and channel settings

---

## Tech Stack

### Core Technologies

- **React 19** with TypeScript
- **Vite** for fast development and building
- **React Router v7** for navigation

### Styling

- **CSS in JS**: Inline styles for component styling
- **Lato Font**: Custom font loading via `@font-face`
- **Custom Scrollbar Hiding**: CSS to hide scrollbars while maintaining scroll functionality

### State Management

- **React Hooks**: `useState`, `useRef`, `useEffect` for state management
- **Message Database**: In memory `Record<string, SlackMsg[]>` structure for per chat histories

---

## Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd vibe-slack

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will start at `http://localhost:5180` and automatically navigate to `/slack`.

**By default, the app runs with a fully populated example configuration** - no setup required!

### Customization (Optional)

To create your **custom** Slack environment, run:

```bash
npm run setup
```

This interactive wizard will guide you through:
- Company information (name, industry, size)
- Your profile (name, nationality, role)
- Team composition (nationalities - auto generates team members)
- Automatically infers channels, communication style, and topics

### Development Commands

```bash
npm run setup      # Interactive wizard to customize your Slack environment
npm run dev        # Start development server with hot reload
npm run generate   # Regenerate config files from company-context.json
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

---

## Project Structure

```
vibe-slack/
├── src/
│   ├── pages/
│   │   └── SlackPage.tsx          # Main Slack interface component
│   ├── components/
│   │   └── Layout.tsx              # App layout wrapper
│   ├── App.tsx                     # Root component with routing
│   ├── main.tsx                    # Application entry point
│   ├── index.css                   # Global styles and font definitions
│   ├── company.json                # Company configuration
│   ├── people.json                 # Team members configuration
│   └── channel-config.json         # Channel configuration
├── assets/                         # Static assets
│   ├── fonts/                      # Lato font files
│   ├── faces/                      # User avatar images
│   └── [logos and icons]           # Company logos and icons
├── public/                         # Public static assets
├── package.json                    # Dependencies and scripts
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # This file
```

---

## Usage Guide

### Navigation

1. **App Launch**: The app automatically opens to `/slack` route
2. **Select Chat**: Click any chat in the left sidebar to view its history
3. **Send Messages**: Type in the message composer at the bottom and press Enter
4. **Switch Tabs**: Use the tabs (Messages, Threads, Files) at the top of the chat panel

### Chat Types

#### Starred Channels
- **Purpose**: Quick access to important channels
- **Features**: Contextual channel specific messages

#### Direct Messages
- **Individual DMs**: One on one conversations with team members
- **Features**: 
  - Avatar with online/offline status indicator
  - Status emoji (vacation, available, OOO, etc.)
  - Personal conversation history
- **Special DMs**: AI assistant and HR system integrations

#### Group DMs
- **Purpose**: Multi person conversations
- **Features**: Overlapping avatars showing group members

#### Channels
- **Organization**: Channels organized by team/function
- **Categories**: Engineering, Operations, Security, Deployment, Business, etc.

### Message Features

- **Contextual History**: Each chat has its own message history
- **Auto Generated Messages**: Simulated incoming messages for active chats
- **Message Formatting**: Supports HTML formatting, links, and styled content
- **Avatar Display**: Shows avatars when sender changes or for new message groups
- **Reactions**: Click emoji reactions to add your reaction to messages
- **Link Embeds**: Automatic link detection and rich embed previews

### Keyboard Shortcuts

- **P Key**: Trigger leave request workflow (in HR system chat)
- **Q Key**: Trigger expense report workflow (in HR system chat)

---

## Design Details

### Color Palette

- **Background**: `#000000` (black) - Main background
- **Panel Background**: `#1a1d21` (dark grey) - Sidebar and chat panels
- **Borders**: `#2c2d30` (medium grey) - Separators and borders
- **Text Primary**: `#ffffff` (white) - Main text
- **Text Secondary**: `#d1d2d3` (light grey) - Secondary text
- **Text Tertiary**: `#9ca3af` (grey) - Timestamps and labels
- **Accent Blue**: `#1264a3` - Links and active states
- **Online Status**: `#2eb886` (green) - Online indicator
- **Offline Status**: `#9ca3af` (grey) - Offline indicator

### Typography

- **Font Family**: `Lato, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- **Font Weights**: 400 (regular), 600 (semibold), 700 (bold)
- **Font Sizes**: 
  - Title: 18px
  - Channel/Name: 15px
  - Message: 15px
  - Timestamp: 12px
  - Section Headers: 13px

### Layout Specifications

- **Leftmost Panel**: 60px width
- **Left Sidebar**: 260px width
- **Right Panel**: Flexible width (remaining space)
- **Avatar Sizes**: 
  - Sidebar: 20x20px
  - Messages: 36x36px
  - Status Dot: 6px (online), 5px (offline)
- **Border Radius**: 6px for avatars, 4px for icons

---

## Technical Implementation

### Message Database Structure

```typescript
type SlackMsg = {
  id: string
  who: string      // Sender name
  text: string     // Message content (HTML supported)
  when: string     // Timestamp
  actions?: Action[] // Optional action buttons
}

type ChatItem = {
  id: string
  name: string
  unread?: number
  type: 'starred' | 'dm' | 'channel'
  avatar?: string
  statusEmoji?: string
  isOnline?: boolean
}

// Message storage: Record<chatId, SlackMsg[]>
const chatMessages: Record<string, SlackMsg[]>
```

### Key Features Implementation

1. **Per Chat Message History**: Each chat maintains independent message array
2. **Contextual Message Generation**: Messages generated based on chat type and context
3. **Auto Scroll**: Automatically scrolls to bottom when new messages arrive
4. **Sticky Header**: Header remains fixed while content scrolls
5. **Hidden Scrollbars**: CSS hides scrollbars while maintaining scroll functionality
6. **Link Detection**: Automatic URL detection and conversion to clickable links
7. **Embed Support**: Rich link embeds with preview cards
8. **Reaction System**: Emoji reactions with click handlers

### State Management

- **Selected Chat**: `useState<string>` tracks currently active chat
- **Message Database**: `useState<Record<string, SlackMsg[]>>` stores all chat histories
- **Message Input**: `useState<string>` for composer input
- **Active Tab**: `useState<'messages' | 'threads' | 'files'>` for tab navigation

---

## Deployment

### Vercel Deployment

This project is configured for easy deployment on Vercel:

1. **Via GitHub**:
   - Push your code to GitHub
   - Go to [vercel.com](https://vercel.com) and import your repository
   - Vercel will auto detect Vite and deploy

2. **Via CLI**:
   ```bash
   npm i -g vercel
   vercel
   ```

The `vercel.json` configuration file handles build settings and SPA routing automatically.

---

## Performance Considerations

- **Message Limit**: Each chat stores maximum 40 messages (auto trimmed)
- **Lazy Loading**: Messages loaded per chat on selection
- **Optimized Rendering**: React memoization for chat list items
- **Efficient Scrolling**: Smooth scroll behavior with ref based scrolling

---

## Development Notes

### Key Design Decisions

1. **Single Page Focus**: Simplified to single `/slack` route for focused demo
2. **In Memory Storage**: Messages stored in component state (no backend)
3. **Simulated Streaming**: Auto generated messages simulate real time updates
4. **Contextual Content**: Messages tailored to chat context for realistic demo

### Code Organization

- **Component Structure**: Single large component (`SlackPage.tsx`) for simplicity
- **Data Generation**: Contextual message generation function for each chat
- **Effect Management**: Separate effects for initialization and message generation

---

## License

This project is licensed under the MIT License.

---

## Acknowledgments

- **Slack** for design inspiration and UI patterns
- **React** and **TypeScript** communities for excellent tooling
- **Lato Font** by Łukasz Dziedzic

---

## Support

For questions, issues, or contributions:
- **GitHub Issues**: Create an issue on the repository
- **Discussions**: Start a discussion for broader topics

---

**Built with ❤️ for the developer community**

*A comprehensive prototype demonstrating modern communication platform UI/UX patterns*
