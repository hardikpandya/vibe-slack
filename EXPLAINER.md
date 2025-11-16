# IT Operations Platform - Feature Explainer

This document provides a comprehensive visual guide to all features and capabilities of the IT Operations platform.

---

## 🗺️ Platform Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    IT Operations Platform                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │   Alerts    │──│Investigation │──│   Resolution       │     │
│  │  Management │  │   (RCA)      │  │   Workflow         │     │
│  └─────────────┘  └──────────────┘  └────────────────────┘     │
│         │                                                       │
│         ├─────────────────────────────┐                         │
│         │                             │                         │
│  ┌─────────────┐            ┌──────────────────┐               │
│  │ Prevention  │            │  Change Review   │               │
│  │   Center    │            │  & Approval      │               │
│  └─────────────┘            └──────────────────┘               │
│         │                                                       │
│         └─────────────────┐                                     │
│                           │                                     │
│                    ┌──────────────┐                             │
│                    │  Rovo Dev    │                             │
│                    │     CLI      │                             │
│                    └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📍 Navigation & Routes

| Route | Purpose | Key Features |
|-------|---------|--------------|
| `/alerts` | Alerts Dashboard | Real-time alerts, filtering, side panels |
| `/investigation/:incidentId` | Root Cause Analysis | AI hypotheses, correlation, workflow builder |
| `/prevention` | Prevention Center | Risk trends, proactive assessment |
| `/review/:changeId` | Change Review | File analysis, dependencies, approvals |
| `/rovo-dev` | Dev Assistant | AI chat, commits, risk assessment |
| `/present*` | Presentation Modes | Demo flows, automated sequences |

---

## 🔔 Module 1: Alerts Management

### Purpose
Centralized alerting dashboard with real-time anomaly detection and correlation analysis.

### Visual Layout

```
┌──────────────────────────────────────────────────────────────┐
│  🔔 Alerts Dashboard                                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Filters: [P0 ▼] [P1 ▼] [P2 ▼] [P3 ▼]  Search: [________]  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Priority │ Anomaly     │ Count │ First Seen │ Service │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ 🟥 P0    │ CPU Spik... │ 12    │ 2m ago     │ auth   │ │ ← Click →
│  │ 🟨 P1    │ Error sp... │ 8     │ 5m ago     │ api    │ │
│  │ 🟩 P2    │ Slow query  │ 4     │ 10m ago    │ db     │ │
│  │ 🟨 P1    │ Memory p... │ 6     │ 15m ago    │ cache  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌───────────────── Side Panel ──────────────────┐          │
│  │ Anomaly: CPU Spike                            │          │
│  │                                                │          │
│  │ [CPU Usage Chart]                             │          │
│  │                                                │          │
│  │ Correlations:                                  │          │
│  │ • Auth service errors +42%                    │          │
│  │ • Recent deployment: auth v2.1.0              │          │
│  │                                                │          │
│  │ [Acknowledge] [Investigate]                   │          │
│  └────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────┘
```

### Key Interactions

1. **Filter & Search**: Use priority filters and search bar
2. **Click Anomaly**: Opens detailed side panel
3. **View Correlations**: See related issues
4. **Acknowledge/Investigate**: Quick actions

### Features
- ✅ Real-time anomaly detection
- ✅ Priority-based classification (P0-P3)
- ✅ Correlation analysis
- ✅ Interactive side panels
- ✅ Service health monitoring
- ✅ Automated grouping

---

## 🔍 Module 2: Investigation (RCA)

### Purpose
AI-powered root cause analysis with hypothesis generation and workflow builder.

### Visual Layout

```
┌──────────────────────────────────────────────────────────────┐
│  🔍 Investigation: INC-123                                    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  AI-Generated Hypotheses:                                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ✅ Recent deployment to auth service                    │ │
│  │    Confidence: 87%                                       │ │
│  │    Evidence: Deployment 15m ago + CPU spike correlation │ │
│  │    [Confirm]                                             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Tabs: [Summary] [Correlation] [Dependencies] [Remediation]  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Correlation Data                                       │ │
│  │                                                          │ │
│  │  Logs        │ Error spike detected at 14:32           │ │
│  │  Metrics     │ CPU usage +340% from baseline           │ │
│  │  Traces      │ Auth requests timing out                │ │
│  │  Deployments │ auth v2.1.0 deployed at 14:30           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [Service Dependency Graph Visualization]                    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Investigation Flow

```
    Alert Detected
         │
         ▼
    AI Analysis
         │
         ▼
  Hypothesis 1 (87%) ──→ [Confirm]
  Hypothesis 2 (54%)      │
  Hypothesis 3 (23%)      ▼
                    Workflow Builder
                            │
                            ▼
                    Remediation Steps
                            │
                            ▼
                    Execute & Monitor
```

### Features
- ✅ AI-generated hypotheses with confidence scores
- ✅ Multi-dimensional correlation analysis
- ✅ Interactive service dependency graphs
- ✅ Real-time data visualization
- ✅ Workflow builder integration
- ✅ Streaming investigation summary

---

## 🛡️ Module 3: Prevention Center

### Purpose
Proactive risk assessment and trend analysis to prevent incidents before they occur.

### Visual Layout

```
┌──────────────────────────────────────────────────────────────┐
│  🛡️ Prevention Center                                        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  [Risk Trend Chart: Last 30 Days]                            │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  High Risk: 3   │  │  Medium: 12     │                   │
│  │  ⚠️ Investigate │  │  ⚠️ Monitor     │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                               │
│  Active Risk Assessments:                                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Database connection pool exhaustion                      │ │
│  │ Risk Level: 🟨 Medium                                   │ │
│  │ Trend: ↑ Increasing                                     │ │
│  │ Recommendation: Increase pool size, add monitoring      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Features
- ✅ Risk trend analysis
- ✅ Proactive vulnerability detection
- ✅ Service health predictions
- ✅ Prevention recommendations
- ✅ Integration with change management

---

## 📝 Module 4: Change Review

### Purpose
Comprehensive change analysis and approval workflow before deployment.

### Visual Layout

```
┌──────────────────────────────────────────────────────────────┐
│  📝 Change Review: CHG-189                                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Tabs: [Summary] [Files] [Dependencies] [Approval]          │
│                                                               │
│  ┌───────────────── Summary Tab ─────────────────┐          │
│  │                                                │          │
│  │  Change Type: Deployment                      │          │
│  │  Services: 3 affected                         │          │
│  │  Files: 47 changed                            │          │
│  │                                                │          │
│  │  [Streaming Analysis Content...]              │          │
│  │                                                │          │
│  │  Risk Score: ████████░░ (7/10 - MEDIUM)       │          │
│  └────────────────────────────────────────────────┘          │
│                                                               │
│  ┌───────────────── Files Tab ───────────────────┐          │
│  │  src/services/auth.js                         │          │
│  │     +45 lines, -12 lines                      │          │
│  │                                                │          │
│  │  src/utils/cache.js                           │          │
│  │     +30 lines, -5 lines                       │          │
│  └────────────────────────────────────────────────┘          │
│                                                               │
│  ┌───────────────── Approval Tab ────────────────┐          │
│  │  [Avatar] James McGill - Change Approver      │          │
│  │  [Avatar] Eve Park - QA Lead                  │          │
│  │                                                │          │
│  │  [Accept Change] [Reject]                     │          │
│  └────────────────────────────────────────────────┘          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Change Review Flow

```
    Change Initiated
         │
         ▼
    Automatic Analysis
         │
         ▼
    Risk Assessment
         │
         ▼
    Stream Summary ──→ Review Files ──→ Check Dependencies
         │                                    │
         │                                    ▼
         └───────────────→ Approval Workflow
                                │
                          [Accept/Reject]
```

### Features
- ✅ Multi-tab interface (Summary, Files, Dependencies, Approval)
- ✅ Real-time streaming analysis
- ✅ File diff visualization
- ✅ Service dependency mapping
- ✅ Approval workflow management
- ✅ Risk scoring and assessment

---

## 💻 Module 5: Rovo Dev CLI

### Purpose
AI-powered development assistant with terminal-style interface and intelligent workflows.

### Visual Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ██████╗  ██████╗ ██╗   ██╗ ██████╗     ██████╗ ███████╗██╗ │
│  ██╔══██╗██╔═══██╗██║   ██║██╔═══██╗    ██╔══██╗██╔════╝██║ │
│  ██████╔╝██║   ██║██║   ██║██║   ██║    ██║  ██║█████╗  ██║ │
│  ██╔══██╗██║   ██║╚██╗ ██╔╝██║   ██║    ██║  ██║██╔══╝  ╚██╗│
│  ██║  ██║╚██████╔╝ ╚████╔╝ ╚██████╔╝    ██████╔╝███████╗ ╚██│
│  ╚═╝  ╚═╝ ╚═════╝   ╚═══╝   ╚═════╝     ╚═════╝ ╚══════╝  ╚═│
│                                                               │
│  Build anything you want with the power of Rovo...          │
│  Brought to you by Atlassian, 2025.                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                               │
│  Hey Hardik, what can I help you create today?              │
│                                                               │
│  Hardik > Can you build a dashboard?                        │
│                                                               │
│  ┌─────────────────────────────────────┐                    │
│  │ 🟢 Rovo Dev                          │                    │
│  │                                       │                    │
│  │ Sure! I'll create a comprehensive... │                    │
│  └─────────────────────────────────────┘                    │
│                                                               │
│  Hardik > commit                                             │
│                                                               │
│  Rovo Dev is thinking... ▊                                  │
│                                                               │
│  ┌─────────────────────────────────────┐                    │
│  │ 🟢 Rovo Dev                          │                    │
│  │                                       │                    │
│  │ Commit: Dashboard implementation     │                    │
│  │                                       │                    │
│  │ Files changed:                       │                    │
│  │   dashboard.js      +120 -45        │                    │
│  │   charts.js         +80 -12         │                    │
│  │   auth.js           +45 -30         │                    │
│  └─────────────────────────────────────┘                    │
│                                                               │
│  Rovo Dev is connecting with Rovo Ops... ▊                  │
│                                                               │
│  ┌─────────────────────────────────────┐                    │
│  │ 🟡 Rovo Ops                          │                    │
│  │                                       │                    │
│  │ Risk Score: ███████░░░ (7/10 - HIGH)│                    │
│  │                                       │                    │
│  │ 🟥 Sensitive auth logic exposed      │                    │
│  │ 🟨 Missing error handling            │                    │
│  │                                       │                    │
│  │ [Jira Link for details]              │                    │
│  └─────────────────────────────────────┘                    │
│                                                               │
│  Hardik > sure                                               │
│                                                               │
│  ┌─────────────────────────────────────────┐                │
│  │ 🟢 Patch 1                               │                │
│  │                                          │                │
│  │ Files: auth.js                          │                │
│  │ Lines: +25 -8                           │                │
│  │                                          │                │
│  │ Summary: Add input validation...        │                │
│  └─────────────────────────────────────────┘                │
│                                                               │
│  [Accept] [Discard]                                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Hardik > type your message...              [✕ Stop]    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Type / for commands.            Uses AI. Verify results.     │
└──────────────────────────────────────────────────────────────┘
```

### Rovo Dev Workflows

#### Workflow 1: Commit + Risk Assessment

```
User: "commit"
    │
    ▼
Rovo Dev: Generate commit message
    │
    ▼
Rovo Dev: Stream commit details
    │
    ▼
Rovo Ops: Risk assessment
    │
    ▼
Display: Risk score + recommendations
```

#### Workflow 2: Patch Mitigation

```
Risks Identified
    │
    ▼
User: "sure"
    │
    ▼
Rovo Dev: Generate Patch 1
    │
    ▼
Stream: Patch details
    │
    ▼
User: "Accept"
    │
    ▼
Rovo Dev: Generate Patch 2
    │
    ▼
User: "Accept"
    │
    ▼
Re-assess: Risk reduced
```

### Features
- ✅ Terminal-style chat interface
- ✅ Character-by-character streaming
- ✅ Intelligent commit generation
- ✅ Automatic risk assessment
- ✅ Interactive patch workflow
- ✅ File change visualization
- ✅ Smart timing and delays
- ✅ Stop button for interruption

---

## 🎬 Presentation Modes

### Purpose
Demo-ready presentations with automated flows for showcasing platform capabilities.

### Available Modes

1. **Resolution Presentation** (`/present-resolution`)
   - Full investigation and resolution flow
   - Automated hypothesis generation
   - Workflow builder demonstration

2. **Prevention Presentation** (`/present-prevention`)
   - Proactive risk assessment
   - Prevention recommendations
   - Risk trend visualization

3. **Full Sequence** (`/present-sequence`)
   - End-to-end journey
   - All modules demonstrated
   - Complete user story

---

## 🎨 Design System Reference

### Color Palette

```
Primary Actions:    #2563eb (Blue)
Success States:     #10b981 (Green)
Warning/Rovo Ops:   #eab308 (Yellow)
Error/Danger:       #ef4444 (Red)
Dev Brand/Rovo Dev: #95C648 (Green)
Soft Grey:          #6b7280
Background:         #0a0e0f (Dark)
Text:               #e5e7eb (Light)
```

### Priority Colors

```
P0 (Critical):  🟥 Red    #ef4444
P1 (High):      🟨 Yellow #eab308
P2 (Medium):    🟩 Green  #10b981
P3 (Low):       🔵 Blue   #2563eb
```

### Typography

```
CLI Interface:    Menlo, "SF Mono", Monaco (Monospace)
Regular UI:       System font stack
Font Weights:     400 (Regular), 500 (Medium), 700 (Bold)
```

---

## 🧩 Technical Architecture

### State Management Flow

```
User Action
    │
    ▼
Component State (useState)
    │
    ▼
Global State (Zustand) [if needed]
    │
    ▼
Effect Handlers (useEffect)
    │
    ▼
UI Update
```

### Streaming Architecture

```
Message Creation
    │
    ▼
setTimeout (Character Delay)
    │
    ▼
Update State with Partial Content
    │
    ▼
Render with Cursor Indicator
    │
    ▼
Repeat Until Complete
```

### Loading Animation

```
Single loadingDots State
    │
    ▼
useEffect with setInterval (300ms)
    │
    ▼
Update All Loading Messages
    │
    ▼
Apply .replace('...', loadingDots)
```

---

## 📚 Key Concepts

### 1. **Streaming Behavior**
- Character-by-character message delivery
- Cursor indicator during streaming
- No layout shifts
- Clean state management

### 2. **Smart Delays**
- **Thinking steps**: 3-5 seconds (organic feel)
- **Fast actions**: 500-1500ms (responsive)
- Context-aware timing
- Randomized variations

### 3. **Box Styling**
- Green borders for Rovo Dev
- Yellow borders for Rovo Ops
- Cutout label styling
- Consistent dimensions

### 4. **Interaction Patterns**
- Click to view details
- Tabs for organization
- Streaming for progress
- Single-click actions

---

## 🚀 Getting Started for New Developers

### Step 1: Setup
```bash
git clone <repository>
cd skunk-works-ops
npm install
npm run dev
```

### Step 2: Explore
1. Start with `/alerts` to see alert management
2. Navigate to `/investigation` to explore RCA
3. Visit `/review/CHG-189` for change review
4. Try `/rovo-dev` for AI assistant

### Step 3: Understand
- Read this explainer document
- Review component structure
- Study state management patterns
- Examine styling approach

### Step 4: Contribute
- Pick a module to enhance
- Follow existing patterns
- Add comprehensive comments
- Test thoroughly

---

## 🔗 Quick Links

- **Main Repository**: [GitHub Link]
- **Documentation**: README.md
- **Component Guide**: src/components/
- **Page Examples**: src/pages/
- **Assets**: assets/ and public/assets/

---

**This platform represents a comprehensive approach to modern AI-native IT operations, combining reactive incident management with proactive risk assessment and AI-assisted development workflows.**


