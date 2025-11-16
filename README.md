# Chat Ops Slack - AIOps Communication Interface

A pixel-perfect Slack clone interface built specifically for IT Operations and AIOps (Artificial Intelligence for IT Operations) teams. This project provides a full-screen Slack-like communication interface that integrates seamlessly with incident management, alerting, and operational workflows.

## 🎯 Overview

This is a prototype demonstration of how modern IT operations teams can leverage Slack-style communication interfaces for operational coordination. The interface replicates Slack's web UI with a dark theme, featuring channels, direct messages, and contextual chat histories tailored for DevOps and SRE workflows.

**Key Focus**: This project showcases how communication tools can be embedded within AIOps platforms to provide seamless context switching between incident management, alerting, and team collaboration.

---

## ✨ Features

### 🎨 UI/UX Features

- **Pixel-Perfect Slack Replication**: Faithfully recreates Slack's web interface with dark theme
- **Three-Panel Layout**:
  - **Leftmost Panel**: Icon bar with Atlassian logo and user avatar
  - **Left Sidebar**: Chat list with sticky header, scrollable content, and hidden scrollbars
  - **Right Panel**: Full chat interface with tabs, message history, and composer
- **Dark Theme**: Matches Slack's dark mode color scheme (`#1a1d21`, `#000000`, `#2c2d30`)
- **Lato Font Family**: Uses Lato font for typography matching Slack's aesthetic
- **Smooth Scrolling**: Auto-scrolls to latest messages with smooth behavior
- **Responsive Design**: Full-screen layout optimized for operational dashboards

### 💬 Chat Features

- **Multiple Chat Types**:
  - **Starred Channels**: Pinned important channels (e.g., `#itom-4412`, `#incidents`, `#alerts`)
  - **Direct Messages**: Individual DMs with avatars, status indicators, and emoji statuses
  - **Group DMs**: Multi-person conversations with overlapping avatars
  - **Channels**: Team channels organized by function (engineering, infrastructure, security, etc.)

- **Rich User Profiles**:
  - **Avatars**: Square avatars with rounded corners (6px border-radius)
  - **Online/Offline Status**: Green/grey dots positioned at bottom-right of avatars
  - **Status Emojis**: Contextual emoji indicators (🏖️ vacation, 💬 available, 🚫 OOO, 🏠 WFH, etc.)
  - **Unread Badges**: Blue badges showing unread message counts

- **Message Features**:
  - **Per-Chat History**: Each chat maintains its own independent message history
  - **Contextual Messages**: Channel-specific and DM-specific message content
  - **Avatar Display**: Shows avatars for new messages or when sender changes
  - **Message Spacing**: Increased spacing (20px) between different senders
  - **HTML Support**: Messages support HTML formatting and links

### 🎯 Operational Context

- **IT Operations Focus**: Channels and conversations tailored for DevOps/SRE teams
- **Incident Management**: Dedicated channels for incidents, alerts, and change reviews
- **Team Organization**: Channels organized by function (backend, frontend, infrastructure, security, etc.)
- **AI Assistant Integration**: Rovo AI assistant available as a DM contact

---

## 🛠️ Tech Stack

### Core Technologies

- **React 19** with TypeScript
- **Vite** for fast development and building
- **React Router v7** for navigation

### Styling

- **CSS-in-JS**: Inline styles for component styling
- **Lato Font**: Custom font loading via `@font-face`
- **Custom Scrollbar Hiding**: CSS to hide scrollbars while maintaining scroll functionality

### State Management

- **React Hooks**: `useState`, `useRef`, `useEffect` for state management
- **Message Database**: In-memory `Record<string, SlackMsg[]>` structure for per-chat histories

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd chat-ops-slack

# Install dependencies
npm install

# Start development server (runs with default Atlassian configuration)
npm run dev
```

The application will start at `http://localhost:5180` and automatically navigate to `/slack`.

**By default, the app runs with a fully populated Atlassian Slack instance** - no setup required!

**📖 For detailed setup instructions, see [QUICKSTART.md](./QUICKSTART.md)**

### Customization (Optional)

To create your **custom** Slack environment, run:

```bash
npm run setup
```

This interactive wizard will guide you through:
- Company information (name, industry, size)
- Your profile (name, nationality, role)
- Team composition (nationalities - auto-generates team members)
- Automatically infers channels, communication style, and topics

**Works in both local environments and Replit!**

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

## 📁 Project Structure

```
chat-ops-slack/
├── src/
│   ├── pages/
│   │   └── SlackPage.tsx          # Main Slack interface component
│   ├── components/
│   │   └── Layout.tsx              # App layout wrapper (minimal)
│   ├── App.tsx                     # Root component with routing
│   ├── main.tsx                    # Application entry point
│   └── index.css                   # Global styles and font definitions
├── assets/                         # Static assets
│   ├── fonts/                      # Lato font files
│   ├── faces/                      # User avatar images
│   ├── atlassian.svg              # Atlassian logo
│   └── rovo-icon.svg              # Rovo AI assistant icon
├── public/                         # Public static assets
├── package.json                    # Dependencies and scripts
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # This file
```

---

## 🎮 Usage Guide

### Navigation

1. **App Launch**: The app automatically opens to `/slack` route
2. **Select Chat**: Click any chat in the left sidebar to view its history
3. **Send Messages**: Type in the message composer at the bottom and press Enter
4. **Switch Tabs**: Use the tabs (Messages, Threads, Files) at the top of the chat panel

### Chat Types

#### Starred Channels
- **Purpose**: Quick access to important operational channels
- **Examples**: `#itom-4412` (incident), `#incidents`, `#alerts`
- **Features**: Contextual incident-related messages

#### Direct Messages
- **Individual DMs**: One-on-one conversations with team members
- **Features**: 
  - Avatar with online/offline status indicator
  - Status emoji (vacation, available, OOO, etc.)
  - Personal conversation history
- **Special DM**: Rovo AI assistant for operational queries

#### Group DMs
- **Purpose**: Multi-person conversations
- **Features**: Overlapping avatars showing group members

#### Channels
- **Organization**: Channels organized by team/function
- **Categories**:
  - **Engineering**: `#engineering`, `#backend`, `#frontend`
  - **Operations**: `#dev-ops`, `#infrastructure`, `#sre`, `#oncall`
  - **Security**: `#security`
  - **Deployment**: `#deployments`, `#ci-cd`, `#kubernetes`
  - **Business**: `#product`, `#sales`, `#support`, `#marketing`

### Message Features

- **Contextual History**: Each chat has its own message history
- **Auto-Generated Messages**: Simulated incoming messages every 8-12 seconds for active chats
- **Message Formatting**: Supports HTML formatting, links, and styled content
- **Avatar Display**: Shows avatars when sender changes or for new message groups

---

## 🎨 Design Details

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

## 🔧 Technical Implementation

### Message Database Structure

```typescript
type SlackMsg = {
  id: string
  who: string      // Sender name
  text: string     // Message content (HTML supported)
  when: string      // Timestamp
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

1. **Per-Chat Message History**: Each chat maintains independent message array
2. **Contextual Message Generation**: Messages generated based on chat type and context
3. **Auto-Scroll**: Automatically scrolls to bottom when new messages arrive
4. **Sticky Header**: Atlassian header remains fixed while content scrolls
5. **Hidden Scrollbars**: CSS hides scrollbars while maintaining scroll functionality

### State Management

- **Selected Chat**: `useState<string>` tracks currently active chat
- **Message Database**: `useState<Record<string, SlackMsg[]>>` stores all chat histories
- **Message Input**: `useState<string>` for composer input
- **Active Tab**: `useState<'messages' | 'threads' | 'files'>` for tab navigation

---

## 🎯 Use Cases

### IT Operations Teams

- **Incident Coordination**: Real-time communication during incidents
- **Alert Discussion**: Collaborative discussion around alerts and anomalies
- **Change Management**: Coordination for deployments and changes
- **Team Collaboration**: Cross-functional team communication

### AIOps Integration

- **Context Switching**: Seamless transition between alerts, incidents, and chat
- **AI Assistant**: Direct access to Rovo AI assistant for operational queries
- **Operational Context**: Channels and messages tailored for operational workflows

---

## 🚀 Future Enhancements

### Planned Features

- [ ] Thread support (currently UI-only)
- [ ] File uploads and sharing
- [ ] Real-time message synchronization
- [ ] Search functionality
- [ ] Notifications and mentions
- [ ] Integration with external Slack workspaces
- [ ] Message reactions and emoji picker
- [ ] Rich text formatting toolbar
- [ ] Voice/video call integration
- [ ] Screen sharing capabilities

### Integration Opportunities

- **Atlassian Jira**: Link incidents and issues in messages
- **Atlassian Confluence**: Share documentation links
- **Monitoring Tools**: Embed alert details and metrics
- **CI/CD Systems**: Show deployment status and logs
- **Incident Management**: Direct integration with incident workflows

---

## 📊 Performance Considerations

- **Message Limit**: Each chat stores maximum 40 messages (auto-trimmed)
- **Lazy Loading**: Messages loaded per chat on selection
- **Optimized Rendering**: React memoization for chat list items
- **Efficient Scrolling**: Smooth scroll behavior with ref-based scrolling

---

## 🧪 Development Notes

### Key Design Decisions

1. **Single Page Focus**: Simplified to single `/slack` route for focused demo
2. **In-Memory Storage**: Messages stored in component state (no backend)
3. **Simulated Streaming**: Auto-generated messages simulate real-time updates
4. **Contextual Content**: Messages tailored to chat context for realistic demo

### Code Organization

- **Component Structure**: Single large component (`SlackPage.tsx`) for simplicity
- **Data Generation**: Contextual message generation function for each chat
- **Effect Management**: Separate effects for initialization and message generation

---

## 📝 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **Slack** for design inspiration and UI patterns
- **Atlassian** for design system principles
- **React** and **TypeScript** communities for excellent tooling
- **Lato Font** by Łukasz Dziedzic

---

## 📞 Support

For questions, issues, or contributions:
- **GitHub Issues**: Create an issue on the repository
- **Discussions**: Start a discussion for broader topics

---

**Built with ❤️ for the AIOps and DevOps community**

*A prototype demonstrating seamless integration of communication tools within operational platforms*
