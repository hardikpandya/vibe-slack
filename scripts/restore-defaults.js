#!/usr/bin/env node

/**
 * Restore Default Atlassian Configuration
 * 
 * This script restores the default Atlassian IT Ops setup by:
 * 1. Backing up custom company-context.json (if exists)
 * 2. Removing custom config files
 * 3. Creating default Atlassian config files
 * 
 * Usage:
 *   node scripts/restore-defaults.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const contextPath = path.join(rootDir, 'company-context.json');
const backupPath = path.join(rootDir, 'company-context.json.backup');

// Backup custom context if it exists
if (fs.existsSync(contextPath)) {
  fs.copyFileSync(contextPath, backupPath);
  console.log('✅ Backed up custom company-context.json to company-context.json.backup');
}

// Remove custom context
if (fs.existsSync(contextPath)) {
  fs.unlinkSync(contextPath);
  console.log('✅ Removed custom company-context.json');
}

// Default Atlassian company.json
const defaultCompanyJson = {
  name: "Atlassian",
  logo: "/assets/atlassian-blue.png",
  description: "IT Operations and Service Management platform specializing in incident management, change management, infrastructure monitoring, and IT service delivery. We manage critical production systems, handle incident response, coordinate change requests, monitor system health, and ensure service reliability for enterprise customers.",
  industry: "Software Development",
  companySize: "Large Enterprise",
  channels: {
    types: [
      {
        type: "engineering",
        description: "Technical discussions, code reviews, architecture decisions",
        examples: ["#engineering", "#backend", "#frontend"]
      },
      {
        type: "operations",
        description: "Incident management, on-call rotations, infrastructure updates",
        examples: ["#itom-4412", "#incidents", "#alerts"]
      },
      {
        type: "cross-functional",
        description: "Company-wide announcements, team updates, cross-team collaboration",
        examples: ["#general"]
      }
    ],
    namingConventions: {
      engineering: "Lowercase with hyphens",
      product: "Lowercase with hyphens",
      operations: "Lowercase with hyphens",
      general: "Lowercase with hyphens or numbers"
    }
  },
  roles: [],
  topics: ["incidents", "alerts", "deployments", "monitoring"],
  communicationStyle: {
    tone: "Professional yet collaborative",
    formality: "Moderately formal",
    commonPatterns: [
      "Incident updates",
      "Status reports",
      "Technical discussions",
      "Post-mortems"
    ]
  },
  fileTemplates: []
};

// Default Atlassian people.json
const defaultPeopleJson = [
      {
        name: "James McGill",
        avatar: "/assets/faces/james-mcgill.jpg",
        initials: "JM",
        gender: "male",
        country: "United States",
        role: "Head of Engineering",
        me: true
      },
  {
    name: "Alice Carlysle",
    avatar: "/assets/faces/alice-carlysle.jpg",
    initials: "AC",
    gender: "female",
    country: "United States",
    role: "Software Engineer"
  },
  {
    name: "Bob Jenkins",
    avatar: "/assets/faces/bob-jenkins.jpg",
    initials: "BJ",
    gender: "male",
    country: "United States",
    role: "DevOps Engineer"
  },
  {
    name: "Carol Diaz",
    avatar: "/assets/faces/carol-diaz.jpg",
    initials: "CD",
    gender: "female",
    country: "United States",
    role: "SRE"
  },
  {
    name: "David Chen",
    avatar: "/assets/faces/david-chen.jpg",
    initials: "DC",
    gender: "male",
    country: "United States",
    role: "Software Engineer"
  },
  {
    name: "Eve Park",
    avatar: "/assets/faces/eve-park.jpg",
    initials: "EP",
    gender: "female",
    country: "United States",
    role: "Product Manager"
  },
  {
    name: "James Bryant",
    avatar: "/assets/faces/james-bryant.jpg",
    initials: "JB",
    gender: "male",
    country: "United Kingdom",
    role: "Engineering Manager"
  },
  {
    name: "Priya Shah",
    avatar: "/assets/faces/priya-shah.jpg",
    initials: "PS",
    gender: "female",
    country: "India",
    role: "SRE"
  },
  {
    name: "Sarah Kim",
    avatar: "/assets/faces/sarah-kim.jpg",
    initials: "SK",
    gender: "female",
    country: "United States",
    role: "Software Engineer"
  },
  {
    name: "Mike Rodriguez",
    avatar: "/assets/faces/mike-rodriguez.jpg",
    initials: "MR",
    gender: "male",
    country: "United States",
    role: "DevOps Engineer"
  },
  {
    name: "Emma Wilson",
    avatar: "/assets/faces/emma-wilson.jpg",
    initials: "EW",
    gender: "female",
    country: "United Kingdom",
    role: "Product Manager"
  },
  {
    name: "Alex Thompson",
    avatar: "/assets/faces/alex-thompson.jpg",
    initials: "AT",
    gender: "male",
    country: "United States",
    role: "Software Engineer"
  },
  {
    name: "Lisa Anderson",
    avatar: "/assets/faces/lisa-anderson.jpg",
    initials: "LA",
    gender: "female",
    country: "United States",
    role: "Engineering Manager"
  },
  {
    name: "Chris Martinez",
    avatar: "/assets/faces/chris-martinez.jpg",
    initials: "CM",
    gender: "male",
    country: "United States",
    role: "DevOps Engineer"
  },
  {
    name: "Jordan Lee",
    avatar: "/assets/faces/jordan-lee.jpg",
    initials: "JL",
    gender: "male",
    country: "United States",
    role: "Software Engineer"
  },
  {
    name: "Rovo",
    avatar: "/assets/rovo-icon.svg",
    initials: "RO",
    gender: "neutral",
    country: "Global",
    role: "AI Assistant"
  }
];

// Default Atlassian channel-config.json
// These channels have hardcoded message generators in SlackPage.tsx
// CHG-189 has keypress P action message functionality
const defaultChannelConfig = {
  starred: [
    {
      id: "itom-4412",
      name: "#itom-4412",
      isPrivate: false,
      description: "IT Operations incident channel",
      topics: ["incidents", "alerts", "monitoring", "resolutions"]
    }
  ],
  public: [
    {
      id: "general",
      name: "#general",
      description: "Company-wide announcements and discussions",
      topics: ["announcements", "company updates", "all-hands", "team news"]
    },
    {
      id: "incidents",
      name: "#incidents",
      description: "Incident management and coordination",
      topics: ["incidents", "on-call", "escalations", "post-mortems"]
    },
    {
      id: "alerts",
      name: "#alerts",
      description: "System alerts and monitoring",
      topics: ["alerts", "monitoring", "thresholds", "notifications"]
    },
    {
      id: "itom-alerts",
      name: "#itom-alerts",
      description: "ITOM alert notifications and escalations",
      topics: ["itom alerts", "notifications", "escalations", "monitoring"]
    },
    {
      id: "itsm-incidents",
      name: "#itsm-incidents",
      description: "ITSM incident tracking and resolution",
      topics: ["incidents", "tickets", "resolution", "escalation"]
    },
    {
      id: "chg-review",
      name: "#chg-review",
      description: "Change review and approval",
      topics: ["changes", "reviews", "approvals", "deployments"]
    },
    {
      id: "CHG-189",
      name: "#CHG-189",
      description: "Change request review - Database index optimization",
      topics: ["change review", "risk assessment", "approval", "deployment"]
    },
    {
      id: "dev-ops",
      name: "#dev-ops",
      description: "DevOps and infrastructure",
      topics: ["deployments", "infrastructure", "CI/CD", "scaling"]
    },
    {
      id: "on-call",
      name: "#on-call",
      description: "On-call rotations and escalations",
      topics: ["on-call", "rotations", "escalations", "coverage"]
    },
    {
      id: "monitoring",
      name: "#monitoring",
      description: "System monitoring and observability",
      topics: ["monitoring", "metrics", "dashboards", "alerts"]
    },
    {
      id: "sre",
      name: "#sre",
      description: "Site Reliability Engineering discussions",
      topics: ["reliability", "slo", "error budgets", "post-mortems"]
    },
    {
      id: "infrastructure",
      name: "#infrastructure",
      description: "Infrastructure management and updates",
      topics: ["infrastructure", "servers", "networking", "updates"]
    }
  ],
  private: [
    {
      id: "itom-critical",
      name: "#itom-critical",
      isPrivate: true,
      description: "Critical ITOM incidents and escalations",
      topics: ["critical incidents", "p1", "escalations", "executive updates"]
    },
    {
      id: "itsm-security",
      name: "#itsm-security",
      isPrivate: true,
      description: "Security-related ITSM incidents",
      topics: ["security", "vulnerabilities", "incidents", "compliance"]
    },
    {
      id: "change-approval",
      name: "#change-approval",
      isPrivate: true,
      description: "Change approval board discussions",
      topics: ["change approval", "risk assessment", "governance", "compliance"]
    },
    {
      id: "leadership-ops",
      name: "#leadership-ops",
      isPrivate: true,
      description: "Operations leadership discussions",
      topics: ["strategy", "planning", "budget", "priorities"]
    },
    {
      id: "post-mortems",
      name: "#post-mortems",
      isPrivate: true,
      description: "Post-incident review discussions",
      topics: ["post-mortems", "root cause", "action items", "lessons learned"]
    }
  ],
  messageThemes: {},
  groupDMs: [
    {
      id: "group-1",
      name: "David Chen, Carol Diaz, Bob Jenkins, Mike Rodriguez",
      members: ["David Chen", "Carol Diaz", "Bob Jenkins", "Mike Rodriguez"]
    },
    {
      id: "group-2",
      name: "Alice Carlysle, Sarah Kim, Alex Thompson, James Bryant",
      members: ["Alice Carlysle", "Sarah Kim", "Alex Thompson", "James Bryant"]
    },
    {
      id: "group-3",
      name: "Eve Park, Emma Wilson, Lisa Anderson, Priya Shah",
      members: ["Eve Park", "Emma Wilson", "Lisa Anderson", "Priya Shah"]
    }
  ]
};

// Write default files
fs.writeFileSync(
  path.join(rootDir, 'src/company.json'),
  JSON.stringify(defaultCompanyJson, null, 2)
);
console.log('✅ Restored default src/company.json');

fs.writeFileSync(
  path.join(rootDir, 'src/people.json'),
  JSON.stringify(defaultPeopleJson, null, 2)
);
console.log('✅ Restored default src/people.json');

fs.writeFileSync(
  path.join(rootDir, 'src/channel-config.json'),
  JSON.stringify(defaultChannelConfig, null, 2)
);
console.log('✅ Restored default src/channel-config.json');

// Update default selectedChat in SlackPage.tsx to 'CHG-189' (original default)
const slackPagePath = path.join(rootDir, 'src/pages/SlackPage.tsx');
if (fs.existsSync(slackPagePath)) {
  let slackPageContent = fs.readFileSync(slackPagePath, 'utf-8');
  slackPageContent = slackPageContent.replace(
    /const \[selectedChat, setSelectedChat\] = useState<string>\('.*?'\)/,
    `const [selectedChat, setSelectedChat] = useState<string>('CHG-189')`
  );
  fs.writeFileSync(slackPagePath, slackPageContent);
  console.log('✅ Updated default selected chat to CHG-189');
}

// Download avatars for default people
console.log('\n📥 Downloading avatars for default Atlassian people...');
try {
  execSync('node scripts/download-default-avatars.js', { cwd: rootDir, stdio: 'inherit' });
} catch (error) {
  console.warn('⚠️  Warning: Avatar download failed, but continuing...');
  console.warn('   You can run "npm run download-default-avatars" later to download avatars.');
}

console.log('\n🎉 Default Atlassian configuration restored!');
console.log('   Run: npm run dev');
console.log('\n💡 To customize again, run: npm run setup');
if (fs.existsSync(backupPath)) {
  console.log(`   Your custom config is backed up at: company-context.json.backup`);
}

