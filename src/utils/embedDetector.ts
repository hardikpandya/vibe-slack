import peopleData from '../people.json'

export type EmbedType = 'notion' | 'figma' | 'jira' | 'confluence' | 'loom' | 'workday'

export interface EmbedConfig {
  type: EmbedType
  url: string
  title: string
  owner: string
}

type Person = { name: string; avatar: string; gender?: string; country?: string; me?: boolean; "emoji-heavy"?: boolean; verbose?: boolean; role?: string }

// Embed type configuration - easily extensible
// To add a new embed type:
// 1. Add the type to EmbedType union above
// 2. Add configuration here with regex pattern, app info, and title generators
export interface EmbedTypeConfig {
  type: EmbedType
  regex: RegExp
  appInfo: {
    name: string
    icon: string
    color: string
    logoUrl: string
    thumbnailUrl?: string
  }
  titleExtractor: (url: string, seed: number) => string
}

// Generate a deterministic seed from URL hash
const getUrlSeed = (url: string): number => {
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

// Title generators for each embed type
const titleGenerators = {
  notion: (url: string, seed: number): string => {
    const match = url.match(/notion\.(?:so|site)\/(?:[^\/]+\/)?([^\/\?#]+)/i)
    if (match) {
      const extracted = decodeURIComponent(match[1].replace(/-/g, ' ').replace(/%20/g, ' '))
        .split('?')[0]
        .split('#')[0]
      if (extracted && extracted.length >= 5) {
        return extracted.charAt(0).toUpperCase() + extracted.slice(1)
      }
    }
    const titles = [
      'Product Requirements Document: Q4 Feature Roadmap',
      'Engineering Design Doc: API Architecture Overview',
      'Product Strategy: Customer Feedback Analysis',
      'Technical Specification: Database Migration Plan',
      'Product Brief: New User Onboarding Flow',
      'Engineering Runbook: Incident Response Procedures',
      'Product Planning: Feature Prioritization Framework',
      'Technical Documentation: Service Architecture Guide',
      'Product Research: User Behavior Analytics Report',
      'Engineering Guide: Deployment Best Practices'
    ]
    return titles[seed % titles.length]
  },
  
  figma: (url: string, seed: number): string => {
    const match = url.match(/figma\.com\/file\/[^\/]+\/([^\/\?#]+)/i)
    if (match) {
      const extracted = decodeURIComponent(match[1].replace(/-/g, ' ').replace(/%20/g, ' '))
        .split('?')[0]
        .split('#')[0]
      if (extracted && extracted.length >= 5) {
        return extracted.charAt(0).toUpperCase() + extracted.slice(1)
      }
    }
    const titles = [
      'Design System: Component Library and Style Guide',
      'Mobile App UI: User Interface Mockups and Prototypes',
      'Web Dashboard: Admin Panel Design Components',
      'Design System: Color Palette and Typography Scale',
      'Mobile Screens: User Onboarding Flow Designs',
      'Web Components: Button and Form Element Library',
      'Design System: Icon Set and Illustration Guidelines',
      'Mobile UI: Navigation and Layout Patterns',
      'Web Interface: Dashboard and Analytics Views',
      'Design Components: Card and Modal Patterns'
    ]
    return titles[seed % titles.length]
  },
  
  jira: (url: string, seed: number): string => {
    const match = url.match(/browse\/([A-Z]+-\d+)|selectedIssue=([A-Z]+-\d+)/i)
    const issueId = match ? (match[1] || match[2]) : null
    if (!issueId) {
      const issueMatch = url.match(/([A-Z]+-\d+)/i)
      if (issueMatch) {
        const id = issueMatch[1]
        const titles = [
          `${id}: Fix authentication token expiration issue`,
          `${id}: Implement rate limiting for API endpoints`,
          `${id}: Add error handling for database connection failures`,
          `${id}: Optimize query performance for user dashboard`,
          `${id}: Resolve memory leak in background job processor`,
          `${id}: Update third-party library dependencies`,
          `${id}: Improve logging and monitoring for production`,
          `${id}: Refactor legacy code for better maintainability`,
          `${id}: Add comprehensive test coverage for critical paths`,
          `${id}: Enhance security measures for user data access`
        ]
        return titles[seed % titles.length]
      }
    } else {
      const titles = [
        `${issueId}: Fix authentication token expiration issue`,
        `${issueId}: Implement rate limiting for API endpoints`,
        `${issueId}: Add error handling for database connection failures`,
        `${issueId}: Optimize query performance for user dashboard`,
        `${issueId}: Resolve memory leak in background job processor`,
        `${issueId}: Update third-party library dependencies`,
        `${issueId}: Improve logging and monitoring for production`,
        `${issueId}: Refactor legacy code for better maintainability`,
        `${issueId}: Add comprehensive test coverage for critical paths`,
        `${issueId}: Enhance security measures for user data access`
      ]
      return titles[seed % titles.length]
    }
    return 'ENG-123: Fix critical bug in authentication flow'
  },
  
  confluence: (url: string, seed: number): string => {
    const match = url.match(/pages\/viewpage\.action\?pageId=\d+|spaces\/[^\/]+\/pages\/([^\/\?#]+)/i)
    if (match && match[1]) {
      const extracted = decodeURIComponent(match[1].replace(/-/g, ' ').replace(/%20/g, ' '))
        .split('?')[0]
        .split('#')[0]
      if (extracted && extracted.length >= 5) {
        return extracted.charAt(0).toUpperCase() + extracted.slice(1)
      }
    }
    const titles = [
      'Engineering Runbook: Production Incident Response Guide',
      'Technical Documentation: API Integration Best Practices',
      'Engineering Playbook: Database Migration Procedures',
      'Technical Guide: Microservices Architecture Overview',
      'Engineering Documentation: CI/CD Pipeline Configuration',
      'Technical Runbook: Monitoring and Alerting Setup',
      'Engineering Guide: Code Review and Deployment Process',
      'Technical Documentation: Security Best Practices',
      'Engineering Playbook: Performance Optimization Strategies',
      'Technical Guide: Troubleshooting Common Production Issues'
    ]
    return titles[seed % titles.length]
  },
  
  loom: (url: string, seed: number): string => {
    const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/i)
    if (match) {
      const videoId = match[1]
      const titles = [
        'Product Demo: New Feature Walkthrough',
        'Engineering Tutorial: API Integration Guide',
        'Design Review: UI Component Showcase',
        'Team Update: Sprint Planning Discussion',
        'Technical Explanation: Architecture Deep Dive',
        'User Feedback: Feature Testing Session',
        'Design Presentation: Design System Overview',
        'Engineering Walkthrough: Deployment Process',
        'Product Overview: Feature Announcement',
        'Technical Demo: Performance Optimization'
      ]
      return titles[seed % titles.length]
    }
    const titles = [
      'Product Demo: New Feature Walkthrough',
      'Engineering Tutorial: API Integration Guide',
      'Design Review: UI Component Showcase',
      'Team Update: Sprint Planning Discussion',
      'Technical Explanation: Architecture Deep Dive',
      'User Feedback: Feature Testing Session',
      'Design Presentation: Design System Overview',
      'Engineering Walkthrough: Deployment Process',
      'Product Overview: Feature Announcement',
      'Technical Demo: Performance Optimization'
    ]
    return titles[seed % titles.length]
  },
  
  workday: (url: string, seed: number): string => {
    const titles = [
      'Employee Profile: Production Team Member',
      'Performance Review: Manufacturing Operations',
      'Time Tracking: Plant Operations Schedule',
      'Payroll Report: Global Manufacturing Team',
      'Employee Directory: Engineering Department',
      'Benefits Enrollment: Q4 Open Enrollment',
      'Training Record: Quality Control Certification',
      'Workforce Analytics: Production Efficiency Report',
      'Recruitment: Plant Operations Positions',
      'Employee Development: Career Growth Plan'
    ]
    return titles[seed % titles.length]
  }
}

// Embed type configurations - add new types here
export const EMBED_CONFIGS: Record<EmbedType, EmbedTypeConfig> = {
  notion: {
    type: 'notion',
    regex: /https?:\/\/(?:www\.)?(?:notion\.so|notion\.site)\/[^\s<>"']+/gi,
    appInfo: {
      name: 'Notion',
      icon: '📝',
      color: '#ffffff',
      logoUrl: '/assets/notion.png'
    },
    titleExtractor: titleGenerators.notion
  },
  
  figma: {
    type: 'figma',
    regex: /https?:\/\/(?:www\.)?figma\.com\/[^\s<>"']+/gi,
    appInfo: {
      name: 'Figma',
      icon: '🎨',
      color: '#0acf83',
      logoUrl: '/assets/figma.png',
      thumbnailUrl: '/assets/figma-thumbnail.jpg'
    },
    titleExtractor: titleGenerators.figma
  },
  
  jira: {
    type: 'jira',
    regex: /https?:\/\/[^\s<>"']*jira[^\s<>"']*\/[^\s<>"']+/gi,
    appInfo: {
      name: 'Jira',
      icon: '🎫',
      color: '#0052cc',
      logoUrl: '/assets/jira.png'
    },
    titleExtractor: titleGenerators.jira
  },
  
  confluence: {
    type: 'confluence',
    regex: /https?:\/\/[^\s<>"']*confluence[^\s<>"']*\/[^\s<>"']+/gi,
    appInfo: {
      name: 'Confluence',
      icon: '📚',
      color: '#172b4d',
      logoUrl: '/assets/confluence.png'
    },
    titleExtractor: titleGenerators.confluence
  },
  
  loom: {
    type: 'loom',
    regex: /https?:\/\/(?:www\.)?loom\.com\/[^\s<>"']+/gi,
    appInfo: {
      name: 'Loom',
      icon: '🎥',
      color: '#625DF5',
      logoUrl: '/assets/loom.svg',
      thumbnailUrl: '/assets/loom-thumbnail.jpg'
    },
    titleExtractor: titleGenerators.loom
  },
  
  workday: {
    type: 'workday',
    regex: /https?:\/\/[^\s<>"']*workday[^\s<>"']*\/[^\s<>"']+/gi,
    appInfo: {
      name: 'Workday',
      icon: '💼',
      color: '#FF6B35',
      logoUrl: '/assets/workday.png'
    },
    titleExtractor: titleGenerators.workday
  }
}

// Get deterministic owner name from people.json based on URL hash
// If forcedOwner is provided, use that instead (for Merc AI-created documents)
const getOwnerForUrl = (url: string, forcedOwner?: string): string => {
  if (forcedOwner) {
    return forcedOwner
  }
  
  const allPeople = (peopleData as Person[])
  if (allPeople.length === 0) return 'James McGill'
  
  const seed = getUrlSeed(url)
  const index = seed % allPeople.length
  return allPeople[index]?.name || 'James McGill'
}

/**
 * Detects embed links in message text and returns an array of embed configurations
 * @param text - The message text to scan for embed links
 * @param messageSender - Optional: The name of the person who sent the message (for determining owner)
 * @returns Array of embed configurations
 */
export const detectEmbedLinks = (text: string, messageSender?: string): EmbedConfig[] => {
  const embeds: EmbedConfig[] = []
  const seenUrls = new Set<string>() // Track URLs to prevent duplicates
  
  // Include all embed types
  const displayableTypes: EmbedType[] = ['notion', 'figma', 'loom', 'jira', 'confluence', 'workday']
  
  // Check if message sender is AI Assistant (Merc AI or any AI Assistant)
  const allPeople = (peopleData as Person[])
  const aiAssistant = allPeople.find(p => p.role === 'AI Assistant')
  const aiAssistantName = aiAssistant?.name || 'Merc AI'
  const isFromAI = messageSender === aiAssistantName || messageSender === 'Merc AI'
  
  // Get current user name (the person marked as "me")
  const currentUser = allPeople.find(p => p.me === true)
  const currentUserName = currentUser?.name || 'James McGill'
  
  // Iterate through all configured embed types
  Object.values(EMBED_CONFIGS).forEach(config => {
    // Only process displayable types
    if (!displayableTypes.includes(config.type)) {
      return
    }
    
    const matches = text.match(config.regex)
    if (matches) {
      matches.forEach(url => {
        // Skip if we've already seen this URL (prevent duplicate embeds)
        if (seenUrls.has(url)) {
          return
        }
        seenUrls.add(url)
        
        const seed = getUrlSeed(url)
        const title = config.titleExtractor(url, seed)
        
        // If message is from AI Assistant and it's a Confluence link, use current user as owner
        // (because Merc AI creates documents on behalf of the user)
        let owner: string
        if (isFromAI && config.type === 'confluence') {
          owner = currentUserName
        } else {
          owner = getOwnerForUrl(url)
        }
        
        embeds.push({ 
          type: config.type, 
          url, 
          title, 
          owner 
        })
      })
    }
  })
  
  return embeds
}

/**
 * Get app info for a given embed type
 * @param type - The embed type
 * @returns App info configuration
 */
export const getEmbedAppInfo = (type: EmbedType) => {
  return EMBED_CONFIGS[type]?.appInfo || {
    name: 'Link',
    icon: '🔗',
    color: '#cccccc',
    logoUrl: ''
  }
}
