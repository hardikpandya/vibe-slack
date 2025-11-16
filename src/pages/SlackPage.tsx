import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'
import peopleData from '../people.json'
import channelConfig from '../channel-config.json'
import themeData from '../theme.json'
import companyData from '../company.json'
import { LinkEmbed } from '../components/LinkEmbed'
import { detectEmbedLinks } from '../utils/embedDetector'

type MessageAction = {
  id: string
  label: string
  type: 'primary' | 'secondary'
  emoji?: string
  confirmationText: string
}

type SlackMsg = { 
  id: string
  who: string
  text: string
  when: string
  reactions?: Record<string, number>
  actions?: MessageAction[]
}
type ChatItem = { id: string; name: string; unread?: number; type: 'starred' | 'dm' | 'channel'; avatar?: string; statusEmoji?: string; isOnline?: boolean; isPrivate?: boolean }
type Person = { name: string; avatar: string; initials: string; gender?: string; country?: string; role?: string; me?: boolean; "emoji-heavy"?: boolean; verbose?: boolean }
type ThemeColors = {
  leftmostPanel: string
  mainBackground: string
  sidebarBackground: string
  chatBackground: string
  iconContainer: string
  separator: string
  border: string
  borderLight: string
  borderFocus: string
  textPrimary: string
  textSecondary: string
  textTertiary: string
  hoverBackground: string
  activeBackground: string
  composeBackground: string
  composeBorder: string
  composeBorderFocus: string
  unreadPill: string
  unreadPillText: string
  buttonPrimary: string
  buttonPrimaryHover: string
  buttonPrimaryText: string
  onlineStatus: string
  offlineStatus: string
  avatarBorder: string
  tabActiveBorder: string
  tabInactive: string
  tabHover: string
  sectionHeader: string
}
type Theme = {
  name: string
  type: 'dark' | 'light'
  colors: ThemeColors
}

export default function SlackPage() {
  const [selectedChat, setSelectedChat] = useState<string>('production-line-sindelfingen')
  const [chatMessages, setChatMessages] = useState<Record<string, SlackMsg[]>>({})
  const slackRootRef = useRef<HTMLDivElement | null>(null)
  const prevSelectedChatRef = useRef<string>(selectedChat)
  const scrollAnchorRef = useRef<{ scrollHeight: number; scrollTop: number; clientHeight: number } | null>(null)
  const composeContainerRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [isComposeFocused, setIsComposeFocused] = useState(false)
  const [activeTab, setActiveTab] = useState<'messages' | 'add-canvas' | 'files'>('messages')
  const [selectedLeftIcon, setSelectedLeftIcon] = useState<string>('home')
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    starred: false,
    directMessages: false,
    channels: false
  })
  const [userReactions, setUserReactions] = useState<Record<string, Set<string>>>({}) // messageId -> Set of emojis user has reacted with
  const [completedActions, setCompletedActions] = useState<Record<string, string>>({}) // messageId -> actionId that was completed
  
  // Common emojis for quick reaction
  const commonEmojis = ['👍', '❤️', '😄', '🎉', '🔥', '👏', '😮', '😢', '🙏', '✅']
  
  // State for sidebar width and resizing
  const [sidebarWidth, setSidebarWidth] = useState<number>(338)
  const [isResizing, setIsResizing] = useState<boolean>(false)
  const resizeRef = useRef<HTMLDivElement | null>(null)
  
  // State for unread counts - will be initialized from static arrays
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  
  // State for online status - tracks which users are online/offline
  // STATIC - statuses never change after initial load
  const [onlineStatus] = useState<Record<string, boolean>>({
    'merc-ai': true,
    'alice': false,
    'bob': false,
    'carol': true,
    'eve': false,
    'james': false,
    'priya': false,
    'david': false,
    'sarah': true,
    'mike': true,
  })
  
  // Theme state - load from theme.json
  const [currentThemeId, setCurrentThemeId] = useState<string>((themeData as any).defaultTheme || 'midnight-express')
  
  // Get current theme
  const currentTheme = React.useMemo(() => {
    const themes = (themeData as any).themes || {}
    return themes[currentThemeId] || themes['midnight-express']
  }, [currentThemeId]) as Theme
  
  // Get neutral text colors based on theme type (not themed colors)
  const getTextColor = {
    primary: currentTheme.type === 'dark' ? '#ffffff' : '#1d1c1d',
    secondary: currentTheme.type === 'dark' ? '#d1d2d3' : '#616061',
    tertiary: currentTheme.type === 'dark' ? '#9ca3af' : '#868686',
    sectionHeader: currentTheme.type === 'dark' ? '#9ca3af' : '#868686',
    tabInactive: currentTheme.type === 'dark' ? '#9ca3af' : '#868686',
    tabHover: currentTheme.type === 'dark' ? '#d1d2d3' : '#616061',
  }

  // Update document title with company name
  useEffect(() => {
    document.title = `${companyData.name} - Slack`
  }, [])

  // Update body/html background to match theme
  useEffect(() => {
    const backgroundColor = currentTheme.colors.leftmostPanel
    document.body.style.backgroundColor = backgroundColor
    document.body.style.color = currentTheme.type === 'dark' ? '#ffffff' : '#1d1c1d'
    document.documentElement.style.backgroundColor = backgroundColor
    
    return () => {
      // Cleanup on unmount
      document.body.style.backgroundColor = ''
      document.body.style.color = ''
      document.documentElement.style.backgroundColor = ''
    }
  }, [currentTheme])

  // Get all available themes
  const availableThemes = React.useMemo(() => {
    const themes = (themeData as any).themes || {}
    return Object.keys(themes).map(id => ({
      id,
      ...themes[id]
    }))
  }, [])

  const people = React.useMemo(() => {
    return (peopleData as Person[]).map(p => ({ n: p.name, a: p.avatar }))
  }, [])

  // Current user - get from JSON
  const currentUserName = React.useMemo(() => {
    const currentUser = (peopleData as Person[]).find(p => p.me === true)
    return currentUser?.name || 'James McGill'
  }, [])

  // Helper to get person from people data
  const getPerson = (name: string): Person | undefined => {
    return (peopleData as Person[]).find(p => p.name === name)
  }

  // Helper to get avatar from people data
  const getAvatar = (name: string): string | null => {
    const person = getPerson(name)
    // Return avatar if found, otherwise null
    return person?.avatar || null
  }
  
  // Helper to get initials from name
  const getInitials = (name: string): string => {
    const person = getPerson(name)
    // Always use stored initials from people.json if available
    if (person?.initials) {
      return person.initials
    }
    
    // Fallback: generate initials from name
    const nameParts = name.split(' ')
    return nameParts.length >= 2 
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase()
  }
  
  // Helper to get avatar color based on name (consistent hash)
  const getAvatarColor = (name: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
      '#E74C3C', '#3498DB', '#9B59B6', '#1ABC9C', '#F39C12'
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  // Helper to get current user (James McGill)
  const getCurrentUser = React.useMemo(() => {
    return (peopleData as Person[]).find(p => p.me === true)?.name || 'James McGill'
  }, [])

  // Helper to get people excluding current user
  const getOtherPeople = React.useMemo(() => {
    // Filter out current user, AI Assistant, and system accounts like Workday
    return people.filter(p => {
      const person = peopleData.find((pp: Person) => pp.name === p.n)
      return p.n !== getCurrentUser && 
             person?.role !== 'AI Assistant' && 
             person?.role !== 'HR System'
    })
  }, [people, getCurrentUser])

  // Helper to get person name from chat ID
  const getPersonNameFromChatId = (chatId: string): string | null => {
    // First check if it's the AI assistant
    const aiAssistant = peopleData.find((p: Person) => p.role === 'AI Assistant')
    const aiAssistantName = aiAssistant?.name || 'Merc AI'
    const aiAssistantId = aiAssistantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (chatId === aiAssistantId || chatId === 'merc-ai' || chatId === 'bottleneckbot' || chatId === 'astra') {
      return aiAssistantName
    }
    
    // Try to find person by matching chatId to their name slug
    const person = peopleData.find((p: Person) => {
      const nameSlug = p.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      return nameSlug === chatId
    })
    if (person) {
      return person.name
    }
    
    // Fallback to hardcoded map for default setup
    const chatMap: Record<string, string> = {
      'merc-ai': 'Merc AI',
      'hannah': 'Hannah Wolf',
      'felix': 'Felix Schäfer',
      'mia': 'Mia Zimmermann',
      'eve': 'Eve Park',
      'james': 'James Bryant',
      'priya': 'Priya Shah',
      'alexander': 'Alexander Schneider',
      'sarah': 'Sarah Kim',
      'paul': 'Paul Bauer',
    }
    return chatMap[chatId] || null
  }

  // Helper to get group members from group chat name
  const getGroupMembers = (groupName: string): string[] => {
    return groupName.split(', ').map(name => name.trim()).filter(name => name !== getCurrentUser)
  }

  // Handle sidebar resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = e.clientX - 60 // Subtract leftmost panel width
      if (newWidth >= 200 && newWidth <= 500) {
        setSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  // Helper to add emojis to a message
  const addEmojis = (text: string, pickFn: <T,>(arr: T[]) => T): string => {
    const emojis = ['😊', '👍', '🎉', '🚀', '✨', '💯', '🔥', '⭐', '💪', '🙌', '👏', '🎯', '💡', '🌟', '😎', '🤩', '💫', '🎊', '🏆', '✅']
    const numEmojis = Math.floor(Math.random() * 4) + 2 // 2-5 emojis
    const selectedEmojis = []
    for (let i = 0; i < numEmojis; i++) {
      selectedEmojis.push(pickFn(emojis))
    }
    // Add emojis at the end, sometimes in the middle
    if (Math.random() > 0.5) {
      return `${text} ${selectedEmojis.join(' ')}`
    } else {
      const words = text.split(' ')
      const insertPos = Math.floor(words.length / 2)
      words.splice(insertPos, 0, selectedEmojis[0])
      return `${words.join(' ')} ${selectedEmojis.slice(1).join(' ')}`
    }
  }

  // Helper to generate verbose message
  const generateVerboseMessage = (baseText: string, pickFn: <T,>(arr: T[]) => T): string => {
    const verboseAdditions = [
      ' Let me provide some additional context here.',
      ' I wanted to make sure we\'re all on the same page.',
      ' This is important for our overall strategy.',
      ' I think it\'s worth discussing in more detail.',
      ' There are a few nuances we should consider.',
      ' Let me break this down for clarity.',
      ' I\'ve been thinking about this quite a bit.',
      ' This aligns with our broader objectives.',
      ' We should definitely keep this in mind going forward.',
      ' I\'d love to hear your thoughts on this as well.',
    ]
    const additions = []
    const numAdditions = Math.floor(Math.random() * 3) + 1 // 1-3 additions
    for (let i = 0; i < numAdditions; i++) {
      additions.push(pickFn(verboseAdditions))
    }
    return baseText + additions.join('')
  }

  // Helper to get reactions for important/celebratory messages
  const getReactionsForMessage = (text: string, chatId: string, chatName: string, pickFn: <T,>(arr: T[]) => T, senderName?: string): Record<string, number> | undefined => {
    // Skip reactions for bot/system accounts (Workday, Merc AI)
    if (senderName) {
      const personObj = getPerson(senderName)
      const isBotAccount = personObj?.role === 'AI Assistant' || personObj?.role === 'HR System' || senderName === 'Workday' || senderName === 'Merc AI'
      if (isBotAccount) {
        return undefined
      }
    }
    
    // Strip HTML tags for keyword detection
    const textWithoutHtml = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
    const lowerText = textWithoutHtml.toLowerCase()
    const isGeneral = chatId === 'general'
    const isLargeChannel = ['general', 'engineering', 'dev-ops', 'infrastructure', 'security', 'itom-4412', 'incidents', 'alerts'].includes(chatId)
    
    // Check for celebratory/important keywords
    const celebratoryKeywords = ['excited', 'thrilled', 'announce', 'launch', 'complete', 'success', 'congratulations', 'welcome', 'achievement', 'upgrade', 'results', 'recognition', 'innovation', 'breakthrough', 'strategic', 'initiative', 'milestone', 'major', 'company-wide', 'q1', 'q2', 'quarter', 'growth', 'expansion', 'new', 'team members', 'features', 'improvements', 'performance']
    const importantKeywords = ['major', 'strategic', 'initiative', 'milestone', 'achievement', 'results', 'recognition', 'announcement', 'upgrade', 'complete']
    
    const hasCelebratory = celebratoryKeywords.some(keyword => lowerText.includes(keyword))
    const hasImportant = importantKeywords.some(keyword => lowerText.includes(keyword))
    const hasEmoji = text.includes('🚀') || text.includes('🎉') || text.includes('🏆') || text.includes('💡') || text.includes('📢') || text.includes('✅')
    
    // General channel messages ALWAYS get reactions (they're all company-wide announcements)
    if (isGeneral) {
      // Always add reactions to general channel messages
    } else {
      // Only add reactions to some messages (not all) for other channels
      if (!hasCelebratory && !hasImportant && !hasEmoji) return undefined
      
      // More reactions in large channels - make it more likely
      const reactionChance = isLargeChannel ? 0.7 : 0.5
      if (Math.random() > reactionChance) return undefined
    }
    
    const reactions: Record<string, number> = {}
    const reactionEmojis = ['👍', '❤️', '🎉', '🔥', '👏', '😮', '🙏', '✅', '🚀', '💯']
    
    // General channel messages get more reactions (3-6 reactions) since they're important announcements
    // Other channels get fewer reactions (1-3 reactions)
    const numReactions = isGeneral ? Math.floor(Math.random() * 4) + 3 : Math.floor(Math.random() * 2) + 1
    
    for (let i = 0; i < numReactions; i++) {
      const availableEmojis = reactionEmojis.filter(e => !reactions[e])
      if (availableEmojis.length === 0) break
      const emoji = pickFn(availableEmojis)
      reactions[emoji] = Math.floor(Math.random() * 5) + 1 // 1-5 reactions per emoji
    }
    
    return Object.keys(reactions).length > 0 ? reactions : undefined
  }

  // Helper to add italics and URLs to messages
  // Helper to convert plain URLs to clickable links
  const convertUrlsToLinks = (text: string): string => {
    // Don't convert if already contains HTML anchor tags
    if (text.includes('<a href')) {
      return text
    }
    
    // Regex to match URLs (http://, https://, www.)
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi
    return text.replace(urlRegex, (url) => {
      // Don't double-wrap if already a link
      if (url.includes('<a')) return url
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #1D9BD1; text-decoration: underline;">${url}</a>`
    })
  }

  const addFormattingAndLinks = (text: string, pickFn: <T,>(arr: T[]) => T): string => {
    // Skip formatting for HTML messages (rich text announcements)
    if (text.includes('<strong>') || text.includes('<br>') || text.includes('<ul>') || text.includes('<li>')) {
      // Still convert plain URLs to links even in HTML messages
      return convertUrlsToLinks(text)
    }
    
    let formatted = text
    
    // Convert any plain URLs to links first
    formatted = convertUrlsToLinks(formatted)
    
    // Add occasional italics (20% chance)
    if (Math.random() < 0.2) {
      const italicPhrases = [
        'really important',
        'super critical',
        'just a heads up',
        'FYI',
        'quick note',
        'important',
        'critical',
        'urgent',
        'just so you know',
        'by the way',
        'fyi',
        'heads up',
        'quick update',
        'side note',
        'btw'
      ]
      const phrase = pickFn(italicPhrases)
      if (formatted.toLowerCase().includes(phrase.toLowerCase())) {
        formatted = formatted.replace(new RegExp(`(${phrase})`, 'gi'), '<em>$1</em>')
      }
    }
    
    // Add occasional URLs (15% chance)
    if (Math.random() < 0.15) {
      const urlTemplates = [
        { url: 'https://wiki.company.com/postmortems/{id}', text: 'post-mortem doc', bold: false },
        { url: 'https://github.com/company/repo/pull/{id}', text: 'PR #{id}', bold: false },
        { url: 'https://docs.company.com/api/v2', text: 'API docs', bold: false },
        { url: 'https://dashboard.company.com/incidents/{id}', text: 'incident dashboard', bold: false },
        { url: 'https://monitoring.company.com/metrics/payment-api', text: 'monitoring dashboard', bold: false },
        { url: 'https://jira.company.com/browse/ENG-{id}', text: 'JIRA ticket', bold: false },
        { url: 'https://confluence.company.com/engineering/playbooks', text: 'playbook', bold: false },
        { url: 'https://grafana.company.com/d/{id}', text: 'Grafana dashboard', bold: false },
        { url: 'https://datadog.company.com/apm/trace/{id}', text: 'Datadog trace', bold: false },
        { url: 'https://slack.company.com/archives/{channel}', text: 'Slack thread', bold: false },
        { url: 'https://wiki.company.com/runbooks/db-scaling', text: '<strong>runbook</strong>', bold: true },
        { url: 'https://docs.company.com/deployment-guide', text: '<strong>deployment guide</strong>', bold: true },
      ]
      
      const template = pickFn(urlTemplates)
      const id = Math.floor(Math.random() * 5000) + 1000
      const url = template.url.replace('{id}', id.toString()).replace('{channel}', pickFn(['C12345', 'C67890', 'C11111']))
      let linkText = template.text.replace('{id}', id.toString())
      
      // Insert URL in the message - append at the end or replace placeholder text
      const linkHtml = template.bold 
        ? `<a href="${url}" style="color: #1D9BD1; text-decoration: underline;"><strong>${linkText.replace(/<strong>|<\/strong>/g, '')}</strong></a>`
        : `<a href="${url}" style="color: #1D9BD1; text-decoration: underline;">${linkText}</a>`
      
      // Try to find a placeholder or append at the end
      if (formatted.includes('post-mortem doc') || formatted.includes('postmortem')) {
        formatted = formatted.replace(/post-mortem doc|postmortem/gi, linkHtml)
      } else if (formatted.includes('PR') || formatted.includes('pull request')) {
        formatted = formatted.replace(/PR #?\d+|pull request/gi, linkHtml)
      } else if (formatted.includes('dashboard')) {
        formatted = formatted.replace(/dashboard/gi, linkHtml)
      } else {
        // Append at the end
        formatted = formatted + ' - ' + linkHtml
      }
    }
    
    return formatted
  }

  // Helper to enhance message based on person traits
  const enhanceMessage = (text: string, person: Person, pickFn: <T,>(arr: T[]) => T): string => {
    // Always convert plain URLs to links first
    let enhanced = convertUrlsToLinks(text)
    
    // Skip enhancement for HTML messages (rich text announcements)
    if (text.includes('<strong>') || text.includes('<br>') || text.includes('<ul>') || text.includes('<li>')) {
      return enhanced
    }
    
    // Add formatting (italics and URLs)
    enhanced = addFormattingAndLinks(enhanced, pickFn)
    
    // Occasionally make messages longer for everyone
    if (Math.random() < 0.15) { // 15% chance
      enhanced = generateVerboseMessage(enhanced, pickFn)
    }
    
    // Add emojis for emoji-heavy people
    if (person['emoji-heavy']) {
      enhanced = addEmojis(enhanced, pickFn)
    }
    
    // Make verbose people's messages longer
    if (person.verbose) {
      if (Math.random() < 0.7) { // 70% chance for verbose people
        enhanced = generateVerboseMessage(enhanced, pickFn)
      }
    }
    
    return enhanced
  }

                                                            // Initialize unread counts from static data
  useEffect(() => {
    const allChannelIds = [
      ...(channelConfig.starred || []).map(c => c.id),
      ...(channelConfig.public || []).map(c => c.id),
      ...(channelConfig.private || []).map(c => c.id),
      aiAssistantId,
      ...["group-1","group-2","group-3"],
      ...(peopleData.filter((p: Person) => !p.me && p.name !== aiAssistantName).map((emp: Person) => 
        emp.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      ))
    ];
    const initialUnreads: Record<string, number> = {};
    
    // Set 30-40% of chats to have unread messages (target ~35%)
    const targetUnreadPercentage = 0.35
    const totalChats = allChannelIds.length
    const targetUnreadCount = Math.floor(totalChats * targetUnreadPercentage)
    
    // Shuffle array to randomly select which chats get unread
    const shuffledIds = [...allChannelIds].sort(() => Math.random() - 0.5)
    const unreadChatIds = shuffledIds.slice(0, targetUnreadCount)
    
    allChannelIds.forEach(id => {
      if (unreadChatIds.includes(id)) {
        // Chats with unread: 1-8 unread messages
        initialUnreads[id] = Math.floor(Math.random() * 8) + 1
      } else {
        // Chats without unread: 0
        initialUnreads[id] = 0
      }
    });
    setUnreadCounts(initialUnreads)
  }, [])

  // Get AI assistant info early
  const aiAssistant = (peopleData as Person[]).find(p => p.role === 'AI Assistant');
  const aiAssistantName = aiAssistant?.name || 'Merc AI';
  const aiAssistantId = aiAssistantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  // Chat list items organized by sections (unread counts come from state)
  const starredChats: ChatItem[] = (channelConfig.starred || []).map(ch => ({
    id: ch.id,
    name: ch.name,
    unread: unreadCounts[ch.id] || 0,
    type: 'starred' as const,
    isPrivate: ch.isPrivate || false
  }))
  
  // Get starred chat IDs to filter them out from other sections
  const starredChatIds = new Set(starredChats.map(c => c.id))
  
  // Generate DM chats dynamically from people.json (excluding current user and AI assistant)
  const dmChats: ChatItem[] = React.useMemo(() => {
    const allPeople = (peopleData as Person[])
    const aiAssistant = allPeople.find(p => p.role === 'AI Assistant')
    const aiAssistantName = aiAssistant?.name || 'Merc AI'
    const aiAssistantId = aiAssistantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const currentUser = allPeople.find(p => p.me === true)
    const currentUserName = currentUser?.name || 'James McGill'
    
    // Filter out current user and AI assistant, get other people for DMs
    const dmPeople = allPeople.filter(p => !p.me && p.role !== 'AI Assistant')
    
    // Create individual DMs
    const individualDMs: ChatItem[] = dmPeople.map(person => {
      const chatId = person.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      // Don't show online status for system accounts (HR System, etc.)
      const isSystemAccount = person.role === 'HR System' || person.role === 'AI Assistant'
      return {
        id: chatId,
        name: person.name,
        unread: unreadCounts[chatId] || 0,
        type: 'dm' as const,
        avatar: getAvatar(person.name) || undefined,
        // Static online status - use stored value or default to true (online)
        // No random assignment - statuses are fixed
        isOnline: isSystemAccount ? undefined : (onlineStatus[chatId] ?? true)
      }
    })
    
    // Add AI assistant DM at the top
    const aiDM: ChatItem = {
      id: aiAssistantId,
      name: aiAssistantName,
      unread: unreadCounts[aiAssistantId] || 0,
      type: 'dm',
      avatar: getAvatar(aiAssistantName) || undefined,
      isOnline: undefined // No online status for AI assistant
    }
    
    // Create group DMs from channel-config.json if available
    const groupDMs: ChatItem[] = ((channelConfig.groupDMs as Array<{ id: string; name: string; members?: string[] }> | undefined) || []).map(group => ({
      id: group.id,
      name: group.name,
      unread: unreadCounts[group.id] || 0,
      type: 'dm' as const
    }))
    
    return [aiDM, ...individualDMs, ...groupDMs]
  }, [peopleData, unreadCounts, onlineStatus, channelConfig])
  
    const channelChats: ChatItem[] = ([
    ...(channelConfig.public || []).map(ch => ({
      id: ch.id,
      name: ch.name,
      unread: unreadCounts[ch.id] || 0,
      type: 'channel' as const,
      isPrivate: false
    })),
    ...(channelConfig.private || []).map(ch => ({
      id: ch.id,
      name: ch.name,
      unread: unreadCounts[ch.id] || 0,
      type: 'channel' as const,
      isPrivate: true
    }))
  ] as ChatItem[]).filter(chat => !starredChatIds.has(chat.id))

  // Generate realistic DM messages with natural conversation flow
  // Generate fully contextual DM messages using ALL company context
  const generateContextualDMMessage = (
    personName: string, 
    currentUserName: string, 
    conversationHistory: SlackMsg[],
    pick: <T,>(arr: T[]) => T
  ): { who: string, text: string } => {
    const companyDesc = companyData.description || ''
    const companyName = companyData.name || 'the company'
    const industry = companyData.industry || ''
    const communicationStyle = companyData.communicationStyle || {}
    const tone = communicationStyle.tone || 'Casual'
    const useEmojis = communicationStyle.commonPatterns?.includes('Emoji usage common') || false
    
    // Get person's role and traits for context
    const person = getPerson(personName)
    const personRole = person?.role || ''
    const personEmojiHeavy = person?.['emoji-heavy'] || false
    const personVerbose = person?.verbose || false
    const currentUserPerson = getPerson(currentUserName)
    const currentUserRole = currentUserPerson?.role || ''
    
    // Check if this is an AI Assistant conversation
    const aiAssistant = peopleData.find((p: Person) => p.role === 'AI Assistant')
    const aiAssistantName = aiAssistant?.name || 'Merc AI'
    if (personName === aiAssistantName || personRole === 'AI Assistant') {
      return generateAIAssistantMessage(currentUserName, conversationHistory, companyDesc, companyName, industry, pick)
    }
    
    // Determine conversation context from history
    const lastMessage = conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1] : null
    const lastSender = lastMessage?.who || null
    const isPersonTurn = lastSender === currentUserName || lastSender === null
    
    // Generate role-specific messages based on actual company context
    return generateRoleBasedDMMessage(
      personName, currentUserName, isPersonTurn, personRole, currentUserRole,
      companyDesc, companyName, industry, personEmojiHeavy, personVerbose, useEmojis, pick
    )
  }
  
  // Generate contextual AI Assistant messages (productivity, summarization, scheduling, tasks)
  const generateAIAssistantMessage = (
    currentUserName: string,
    conversationHistory: SlackMsg[],
    companyDesc: string,
    companyName: string,
    industry: string,
    pick: <T,>(arr: T[]) => T
  ): { who: string, text: string } => {
    const aiAssistant = peopleData.find((p: Person) => p.role === 'AI Assistant')
    const aiAssistantName = aiAssistant?.name || 'Merc AI'
    const descLower = companyDesc.toLowerCase()
    
    // Determine if user or AI is speaking
    const lastMessage = conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1] : null
    const lastSender = lastMessage?.who || null
    const isAITurn = lastSender === currentUserName || lastSender === null
    
    if (isAITurn) {
      // AI Assistant responses
      const hasITSM = descLower.includes('incident') || descLower.includes('itom') || descLower.includes('itsm') || descLower.includes('service management') || descLower.includes('change management') || descLower.includes('monitoring') || descLower.includes('operations')
      const hasAutomotive = descLower.includes('automotive') || descLower.includes('vehicle') || descLower.includes('manufacturing') || descLower.includes('production') || descLower.includes('assembly') || industry.toLowerCase().includes('automotive')
      
      // Check if last user message was asking for a Confluence doc
      const lastUserMessage = conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].who === currentUserName 
        ? conversationHistory[conversationHistory.length - 1].text.toLowerCase()
        : ''
      const askedForConfluence = lastUserMessage.includes('confluence') && (lastUserMessage.includes('doc') || lastUserMessage.includes('page') || lastUserMessage.includes('create'))
      
      if (askedForConfluence) {
        // Generate specific Confluence doc response with embed link
        const hasAutomotive = descLower.includes('automotive') || descLower.includes('vehicle') || descLower.includes('manufacturing') || descLower.includes('production') || descLower.includes('assembly') || industry.toLowerCase().includes('automotive')
        const confluenceTopics = hasAutomotive ? [
          { topic: 'production line efficiency improvements', docId: 45231 },
          { topic: 'quality control process optimization', docId: 46892 },
          { topic: 'supply chain coordination best practices', docId: 47561 },
          { topic: 'plant operations best practices', docId: 48923 },
          { topic: 'vehicle assembly procedures', docId: 49245 }
        ] : hasITSM ? [
          { topic: 'incident response runbook improvements', docId: 45231 },
          { topic: 'change management process optimization', docId: 46892 },
          { topic: 'post-incident review best practices', docId: 47561 },
          { topic: 'infrastructure monitoring best practices', docId: 48923 },
          { topic: 'on-call rotation procedures', docId: 49245 }
        ] : [
          { topic: 'platform improvements', docId: 45231 },
          { topic: 'feature roadmap', docId: 46892 },
          { topic: 'technical documentation', docId: 47561 }
        ]
        
        const selectedTopic = pick(confluenceTopics)
        const confluenceUrl = `https://confluence.company.com/pages/viewpage.action?pageId=${selectedTopic.docId}`
        
        return {
          who: aiAssistantName,
          text: `I've created a Confluence document outlining ideas for ${selectedTopic.topic}. Here's the link: <a href="${confluenceUrl}" target="_blank" rel="noopener noreferrer" style="color: #1D9BD1; text-decoration: underline;">${confluenceUrl}</a>`
        }
      }
      
      const responses = hasAutomotive ? [
        `I've summarized the key points from ${companyName}'s production planning review. The main focus areas are: improving production line efficiency, enhancing quality control processes, and optimizing supply chain coordination. Should I create a detailed action plan?`,
        `Here's your task summary for this week: ${Math.floor(Math.random() * 5) + 3} items pending review, ${Math.floor(Math.random() * 3) + 2} meetings scheduled, and ${Math.floor(Math.random() * 4) + 1} production line reviews in progress. Want me to prioritize these?`,
        `I've analyzed the production metrics from last week. Manufacturing performance is stable with quality rates within target. The main improvement areas are assembly line optimization and supplier coordination. Should I prepare a detailed report?`,
        `Reminder: You have a production review meeting in ${Math.floor(Math.random() * 2) + 1} hours. Agenda includes reviewing plant operations and discussing quality control improvements. I've prepared talking points based on recent discussions.`,
        `I've compiled a summary of all production-related discussions from #production-alerts this week. Key topics: production line efficiency improvements, quality control process updates, and supply chain coordination enhancements. Want the full breakdown?`,
        `Your calendar shows ${Math.floor(Math.random() * 3) + 2} meetings today. I've identified ${Math.floor(Math.random() * 2) + 1} potential conflicts and ${Math.floor(Math.random() * 3) + 1} follow-up tasks from yesterday's production review. Should I help reschedule?`,
        `I've tracked ${Math.floor(Math.random() * 10) + 5} action items from last week's manufacturing planning session. ${Math.floor(Math.random() * 5) + 3} are completed, ${Math.floor(Math.random() * 3) + 2} are in progress, and ${Math.floor(Math.random() * 2) + 1} need attention. Here's the status update.`,
        `Quick summary of ${companyName}'s production performance: All plants operational, quality metrics within target, no critical production issues reported. Manufacturing shows stable performance across all global facilities.`,
        `I've prepared a briefing for your upcoming plant operations review meeting. It includes recent production metrics, quality control updates, and recommended discussion points. Should I share it now?`,
        `Task reminder: Production line optimization review is due ${Math.floor(Math.random() * 3) + 1} days from now. I've gathered the relevant context and can help you prepare.`
      ] : hasITSM ? [
        `I've summarized the key points from ${companyName}'s incident management review. The main focus areas are: improving incident response times, enhancing change management processes, and optimizing infrastructure monitoring. Should I create a detailed action plan?`,
        `Here's your task summary for this week: ${Math.floor(Math.random() * 5) + 3} items pending review, ${Math.floor(Math.random() * 3) + 2} meetings scheduled, and ${Math.floor(Math.random() * 4) + 1} change request reviews in progress. Want me to prioritize these?`,
        `I've analyzed the infrastructure monitoring metrics from last week. System performance is stable with response times within SLA. The main improvement areas are alert threshold optimization and incident detection accuracy. Should I prepare a detailed report?`,
        `Reminder: You have a change management review meeting in ${Math.floor(Math.random() * 2) + 1} hours. Agenda includes reviewing pending change requests and discussing infrastructure improvements. I've prepared talking points based on recent discussions.`,
        `I've compiled a summary of all incident-related discussions from #incidents this week. Key topics: incident response improvements, change management process updates, and monitoring dashboard enhancements. Want the full breakdown?`,
        `Your calendar shows ${Math.floor(Math.random() * 3) + 2} meetings today. I've identified ${Math.floor(Math.random() * 2) + 1} potential conflicts and ${Math.floor(Math.random() * 3) + 1} follow-up tasks from yesterday's incident review. Should I help reschedule?`,
        `I've tracked ${Math.floor(Math.random() * 10) + 5} action items from last week's change management planning session. ${Math.floor(Math.random() * 5) + 3} are completed, ${Math.floor(Math.random() * 3) + 2} are in progress, and ${Math.floor(Math.random() * 2) + 1} need attention. Here's the status update.`,
        `Quick summary of ${companyName}'s infrastructure performance: All systems operational, response times within SLA, no active incidents reported. Monitoring shows stable performance across all regions.`,
        `I've prepared a briefing for your upcoming operations review meeting. It includes recent incident metrics, change management updates, and recommended discussion points. Should I share it now?`,
        `Task reminder: Incident response runbook update is due ${Math.floor(Math.random() * 3) + 1} days from now. I've gathered the relevant context and can help you prepare.`
      ] : [
        `I've summarized the key points from ${companyName}'s Q2 planning meeting. The main focus areas are: ${descLower.includes('video') ? 'video processing optimization' : descLower.includes('content') ? 'content discovery improvements' : 'platform scalability'}, ${descLower.includes('social') ? 'social engagement features' : 'user experience enhancements'}, and infrastructure scaling. Should I create a detailed action plan?`,
        `Here's your task summary for this week: ${Math.floor(Math.random() * 5) + 3} items pending review, ${Math.floor(Math.random() * 3) + 2} meetings scheduled, and ${Math.floor(Math.random() * 4) + 1} ${descLower.includes('video') ? 'video processing' : descLower.includes('content') ? 'content moderation' : 'deployment'} tasks in progress. Want me to prioritize these?`,
        `I've analyzed the ${descLower.includes('video') ? 'video upload' : descLower.includes('content') ? 'content engagement' : 'platform'} metrics from last week. ${descLower.includes('video') ? 'Video processing times improved by 15%' : descLower.includes('content') ? 'Content engagement increased by 22%' : 'Platform performance is stable'}. The main improvement areas are ${descLower.includes('video') ? 'CDN optimization' : descLower.includes('content') ? 'content discovery algorithm' : 'API response times'}. Should I prepare a detailed report?`,
        `Reminder: You have a team sync meeting in ${Math.floor(Math.random() * 2) + 1} hours. Agenda includes ${descLower.includes('video') ? 'video feature roadmap' : descLower.includes('content') ? 'content strategy updates' : 'platform improvements'}. I've prepared talking points based on recent discussions.`,
        `I've compiled a summary of all ${descLower.includes('video') ? 'video-related' : descLower.includes('content') ? 'content-related' : 'platform'} discussions from #engineering this week. Key topics: ${descLower.includes('video') ? 'video encoding optimization' : descLower.includes('content') ? 'content moderation updates' : 'deployment pipeline improvements'}, ${descLower.includes('video') ? 'CDN scaling' : descLower.includes('content') ? 'engagement metrics' : 'performance monitoring'}, and ${descLower.includes('video') ? 'reel feature updates' : descLower.includes('content') ? 'content discovery' : 'infrastructure changes'}. Want the full breakdown?`,
        `Your calendar shows ${Math.floor(Math.random() * 3) + 2} meetings today. I've identified ${Math.floor(Math.random() * 2) + 1} potential conflicts and ${Math.floor(Math.random() * 3) + 1} follow-up tasks from yesterday's discussions. Should I help reschedule?`,
        `I've tracked ${Math.floor(Math.random() * 10) + 5} action items from last week's ${descLower.includes('video') ? 'video feature' : descLower.includes('content') ? 'content strategy' : 'platform'} planning session. ${Math.floor(Math.random() * 5) + 3} are completed, ${Math.floor(Math.random() * 3) + 2} are in progress, and ${Math.floor(Math.random() * 2) + 1} need attention. Here's the status update.`,
        `Quick summary of ${companyName}'s ${descLower.includes('video') ? 'video platform' : descLower.includes('content') ? 'content platform' : 'platform'} performance: ${descLower.includes('video') ? 'Video upload success rate at 98.5%' : descLower.includes('content') ? 'Content engagement up 18%' : 'All systems operational'}, ${descLower.includes('video') ? 'average processing time 2.3s' : descLower.includes('content') ? 'content moderation queue healthy' : 'response times within SLA'}. No critical issues detected.`,
        `I've prepared a briefing for your upcoming ${descLower.includes('video') ? 'video feature' : descLower.includes('content') ? 'content strategy' : 'platform'} review meeting. It includes recent metrics, team updates, and recommended discussion points. Should I share it now?`,
        `Task reminder: ${descLower.includes('video') ? 'Video encoding optimization review' : descLower.includes('content') ? 'Content moderation policy update' : 'Platform deployment planning'} is due ${Math.floor(Math.random() * 3) + 1} days from now. I've gathered the relevant context and can help you prepare.`
      ]
      return { who: aiAssistantName, text: pick(responses) }
    } else {
      // User messages to AI Assistant
      const hasITSM = descLower.includes('incident') || descLower.includes('itom') || descLower.includes('itsm') || descLower.includes('service management') || descLower.includes('change management') || descLower.includes('monitoring') || descLower.includes('operations')
      const hasAutomotive = descLower.includes('automotive') || descLower.includes('vehicle') || descLower.includes('manufacturing') || descLower.includes('production') || descLower.includes('assembly') || industry.toLowerCase().includes('automotive')
      
      const userMessages = hasAutomotive ? [
        `Can you summarize the key points from the production planning discussion in #production-alerts?`,
        `What are my pending tasks for this week?`,
        `Give me a summary of ${companyName}'s production metrics`,
        `Remind me about my meetings today`,
        `What action items came out of last week's quality control review?`,
        `Can you prepare a briefing for my plant operations review meeting?`,
        `Summarize the production line updates from this week`,
        `What's on my calendar for tomorrow?`,
        `Help me prioritize my tasks for manufacturing work`,
        `Can you create a summary of production efficiency metrics?`,
        `Can you create a quick Confluence doc about drafting some ideas for improving our production line efficiency? I want to document best practices for quality control`,
        `Create a Confluence page with ideas for optimizing our supply chain coordination process`,
        `I need a Confluence doc outlining our plant operations process improvements`
      ] : hasITSM ? [
        `Can you summarize the key points from the incident management discussion in #incidents?`,
        `What are my pending tasks for this week?`,
        `Give me a summary of ${companyName}'s infrastructure monitoring metrics`,
        `Remind me about my meetings today`,
        `What action items came out of last week's change management review?`,
        `Can you prepare a briefing for my operations review meeting?`,
        `Summarize the deployment updates from this week`,
        `What's on my calendar for tomorrow?`,
        `Help me prioritize my tasks for infrastructure work`,
        `Can you create a summary of incident response metrics?`,
        `Can you create a quick Confluence doc about drafting some ideas for improving our incident response runbook? I want to document best practices for handling P1 incidents`,
        `Create a Confluence page with ideas for optimizing our change management process`,
        `I need a Confluence doc outlining our post-incident review process improvements`
      ] : [
        `Can you summarize the key points from the ${descLower.includes('video') ? 'video feature' : descLower.includes('content') ? 'content strategy' : 'platform'} discussion in #engineering?`,
        `What are my pending tasks for this week?`,
        `Give me a summary of ${companyName}'s ${descLower.includes('video') ? 'video platform' : descLower.includes('content') ? 'content engagement' : 'platform'} performance metrics`,
        `Remind me about my meetings today`,
        `What action items came out of last week's planning session?`,
        `Can you prepare a briefing for my ${descLower.includes('video') ? 'video feature' : descLower.includes('content') ? 'content strategy' : 'platform'} review meeting?`,
        `Summarize the ${descLower.includes('video') ? 'video processing' : descLower.includes('content') ? 'content moderation' : 'deployment'} updates from this week`,
        `What's on my calendar for tomorrow?`,
        `Help me prioritize my tasks for ${descLower.includes('video') ? 'video feature' : descLower.includes('content') ? 'content' : 'platform'} work`,
        `Can you create a summary of ${descLower.includes('video') ? 'video upload' : descLower.includes('content') ? 'content engagement' : 'platform'} metrics?`
      ]
      return { who: currentUserName, text: pick(userMessages) }
    }
  }
  
  // Generate messages based on employee roles and company context
  const generateRoleBasedDMMessage = (
    personName: string,
    currentUserName: string,
    isPersonTurn: boolean,
    personRole: string,
    currentUserRole: string,
    companyDesc: string,
    companyName: string,
    industry: string,
    personEmojiHeavy: boolean,
    personVerbose: boolean,
    useEmojis: boolean,
    pick: <T,>(arr: T[]) => T
  ): { who: string, text: string } => {
    const descLower = companyDesc.toLowerCase()
    const roleLower = personRole.toLowerCase()
    const currentRoleLower = currentUserRole.toLowerCase()
    
    // Extract key company features from description
    const hasVideo = descLower.includes('video') || descLower.includes('reel')
    const hasPhotos = descLower.includes('photo') || descLower.includes('image')
    const hasMessaging = descLower.includes('message') || descLower.includes('chat')
    const hasContent = descLower.includes('content') || descLower.includes('shortform')
    const hasSocial = descLower.includes('social') || descLower.includes('friend')
    const hasITSM = descLower.includes('incident') || descLower.includes('itom') || descLower.includes('itsm') || descLower.includes('service management') || descLower.includes('change management') || descLower.includes('monitoring') || descLower.includes('operations')
    
    if (isPersonTurn) {
      // Messages from the other person
      let messages: string[] = []
      
      // Role-specific message generation
      if (roleLower.includes('engineer') || roleLower.includes('developer')) {
        if (hasITSM) {
          // ITSM/ITOM specific messages for engineers
          messages = [
            `Hey ${currentUserName}! Quick question - are you seeing the spike in incident alerts? We're getting way more than normal`,
            `Morning! I wanted to follow up on that change request from yesterday. The deployment went smoothly`,
            `Hey! Just wanted to say thanks for helping debug that production issue yesterday. Your suggestion about the database connection pool was spot on`,
            `Quick heads up - I'm deploying some infrastructure changes around 2 PM today. Should be low risk but want to give you a heads up`,
            `Hey ${currentUserName}! I saw your message in #incidents. Want to sync up on the root cause analysis?`,
            `Morning! Quick question about the monitoring dashboard - are you seeing the same latency spikes I am?`,
            `Hey! I'm investigating that alert from last night. The error rate spiked around 3 AM. Want to sync up?`,
            `Thanks for the code review on that change request! Your feedback about the rollback strategy was really helpful`,
            `Hey ${currentUserName}! Quick update - the database index optimization is ready for review. Can you take a look?`,
            `Morning! I'm seeing some performance degradation in the API. Response times are up ${Math.floor(Math.random() * 30) + 10}ms. Investigating now`,
            `Hey! That incident from yesterday - I've updated the runbook with the fix. Want to review it?`,
            `Quick question - are you free for a call? I want to discuss the infrastructure scaling we're planning for next week`,
            `Hey ${currentUserName}! The post-mortem for last week's incident is ready. Can you review it?`,
            `Morning! I'm seeing some anomalies in the monitoring metrics. CPU usage is higher than expected. Investigating`,
            `Hey! Quick update - the change request was approved. Deploying to staging now`
          ]
        } else if (hasVideo) {
          messages = [
            `Hey ${currentUserName}! Quick question - are you seeing the spike in video upload failures? We're getting like 3x the normal error rate`,
            `Morning! The new reel feature is live and engagement is crazy - ${Math.floor(Math.random() * 30) + 15}% higher than expected. Want to sync on scaling?`,
            `Hey! User reports are coming in about video playback being slow. I'm seeing some performance issues in the processing pipeline`,
            `Quick heads up - we're hitting our CDN limits with all the video traffic. Need to discuss upgrading before the weekend`,
            `Hey ${currentUserName}! The video encoding optimization is ready for review. Can you take a look at the PR?`,
            `Morning! Video processing queue is backed up - ${Math.floor(Math.random() * 100) + 50} videos pending. Might need more workers`,
            `Hey! Quick question - are you free for a quick call? I want to discuss the video compression changes we're planning`,
            `Thanks for helping debug that video upload issue yesterday! Your suggestion about the chunking was spot on`,
            `Hey ${currentUserName}! The new video filters are causing some performance issues. Seeing higher latency`,
            `Morning! Video engagement metrics are way up - ${Math.floor(Math.random() * 40) + 20}% increase in views. The algorithm changes are working`
          ]
        } else if (hasPhotos) {
          messages = [
            `Hey ${currentUserName}! Quick question - are you seeing the spike in photo upload failures? We're getting way more errors than normal`,
            `Morning! Photo processing is lagging - ${Math.floor(Math.random() * 50) + 20} images stuck in queue. Might be the compression settings`,
            `Hey! User reports are coming in about photo filters being slow. I'm seeing some performance issues in the image processing pipeline`,
            `Quick heads up - we're hitting our storage limits with all the photo uploads. Need to discuss upgrading`,
            `Hey ${currentUserName}! The new photo editing feature is ready for review. Can you take a look?`,
            `Morning! Photo engagement is way up - ${Math.floor(Math.random() * 30) + 15}% increase in likes. The new filters are working`,
            `Hey! Quick question - are you free for a call? I want to discuss the image compression optimization we're planning`,
            `Thanks for helping debug that photo upload issue yesterday! Your fix worked perfectly`,
            `Hey ${currentUserName}! The new photo filters are causing some performance issues. Seeing higher load times`,
            `Morning! Photo processing queue is back to normal. The scaling helped a lot`
          ]
        } else {
          messages = [
            `Hey ${currentUserName}! Quick question - do you have a minute to look at the PR I just opened?`,
            `Morning! I wanted to follow up on yesterday's deployment. Everything went smoothly`,
            `Hey! Just wanted to say thanks for helping debug that issue yesterday. Your suggestion was spot on`,
            `Quick heads up - I'm deploying some changes around 2 PM today. Should be low risk`,
            `Hey ${currentUserName}! I saw your message in #engineering. Want to sync up on this?`,
            `Morning! Quick question about the monitoring dashboard - are you seeing the same metrics I am?`,
            `Hey! I'm working on a new feature and wanted your input. When are you free to chat?`,
            `Thanks for the code review! Your feedback was really helpful`,
            `Hey ${currentUserName}! Quick update - the deployment went smoothly. No issues so far`,
            `Morning! I'm investigating that alert from last night. Want to confirm with you before closing it`
          ]
        }
      } else if (roleLower.includes('product') || roleLower.includes('manager')) {
        if (hasContent || hasSocial) {
          messages = [
            `Hey ${currentUserName}! Quick question - are you seeing the engagement spike? We're getting ${Math.floor(Math.random() * 50) + 20}% more interactions than expected`,
            `Morning! The new content discovery feature is live and users are loving it - ${Math.floor(Math.random() * 40) + 25}% increase in time spent`,
            `Hey! User feedback on the new feed is really positive. Engagement metrics are way up`,
            `Quick heads up - we're planning to launch the new recommendation feature next week. Want to sync on the rollout?`,
            `Hey ${currentUserName}! The content moderation updates are ready for review. Can you take a look?`,
            `Morning! User engagement is through the roof - ${Math.floor(Math.random() * 50) + 20}% increase. The algorithm changes are working great`,
            `Hey! Quick question - are you free for a call? I want to discuss the content strategy we're planning`,
            `Thanks for helping with that feature launch yesterday! The rollout went smoothly`,
            `Hey ${currentUserName}! The new content discovery algorithm is ready for testing. Want to give it a try?`,
            `Morning! User feedback on the platform updates is really positive. Usage is way up`
          ]
        } else {
          messages = [
            `Hey ${currentUserName}! Quick question - can you review the product roadmap I just shared?`,
            `Morning! User feedback on the new feature is really positive. Engagement is up ${Math.floor(Math.random() * 30) + 10}%`,
            `Hey! Quick question - are you free for a call? I want to discuss the feature prioritization`,
            `Thanks for helping with that product launch yesterday! Everything went smoothly`,
            `Hey ${currentUserName}! The new feature is ready for review. Can you take a look?`,
            `Morning! User metrics are looking great - ${Math.floor(Math.random() * 25) + 10}% increase in engagement`,
            `Hey! Quick update - the feature rollout is going well. No issues so far`,
            `Quick question - are you available for a quick call around 3 PM?`,
            `Hey ${currentUserName}! Just wanted to check in - how's the product planning going?`,
            `Morning! I saw the metrics improved after the changes yesterday. Nice work!`
          ]
        }
      } else if (roleLower.includes('devops') || roleLower.includes('sre') || roleLower.includes('operations')) {
        if (hasITSM) {
          // ITSM/ITOM specific messages for DevOps/SRE
          messages = [
            `Hey ${currentUserName}! Quick question - are you seeing the incident spike? We've got ${Math.floor(Math.random() * 5) + 2} P1 incidents open`,
            `Morning! Infrastructure scaling completed - added ${Math.floor(Math.random() * 5) + 2} more instances. Should handle the traffic spike from the incident`,
            `Hey! Quick heads up - we're doing some maintenance around 4 PM today for that change request. Shouldn't affect production`,
            `Quick question - are you free for a call? I want to discuss the infrastructure upgrades we're planning for next week's change window`,
            `Thanks for helping with that deployment issue yesterday! Your fix worked perfectly and we avoided an incident`,
            `Hey ${currentUserName}! The new monitoring dashboard is ready for review. It includes better alerting for incident detection`,
            `Morning! System performance is looking good - all metrics within normal ranges. No incidents so far today`,
            `Hey! Quick update - the infrastructure upgrade went smoothly. No incidents reported`,
            `Quick question - are you seeing the same alert spike I am? We might need to adjust thresholds to reduce false positives`,
            `Morning! I'm investigating that performance issue from last night. Could be related to the change we deployed`,
            `Hey ${currentUserName}! That incident from yesterday - I've updated the runbook with the resolution steps`,
            `Quick update - the change request was approved. Deploying to production now`,
            `Morning! I'm seeing some anomalies in the monitoring. CPU usage spiked during the incident. Investigating`,
            `Hey! The post-mortem for last week's incident is ready. Can you review it before we publish?`,
            `Quick question - are you available for on-call coverage this weekend? We've got a change window scheduled`
          ]
        } else {
          messages = [
            `Hey ${currentUserName}! Quick question - are you seeing the deployment spike? We're hitting our CI/CD limits`,
            `Morning! Infrastructure scaling completed - added ${Math.floor(Math.random() * 5) + 2} more instances. Should handle the traffic now`,
            `Hey! Quick heads up - we're doing some maintenance around 4 PM today. Shouldn't affect anything`,
            `Quick question - are you free for a call? I want to discuss the infrastructure upgrades we're planning`,
            `Thanks for helping with that deployment issue yesterday! Your fix worked perfectly`,
            `Hey ${currentUserName}! The new monitoring dashboard is ready for review. Can you take a look?`,
            `Morning! System performance is looking good - all metrics within normal ranges`,
            `Hey! Quick update - the infrastructure upgrade went smoothly. No issues so far`,
            `Quick question - are you seeing the same alert spike I am? We might need to adjust thresholds`,
            `Morning! I'm investigating that performance issue from last night. Want to sync up?`
          ]
        }
      } else {
        // Generic messages for other roles
        messages = [
          `Hey ${currentUserName}! Quick question - do you have a minute?`,
          `Morning! Just wanted to follow up on yesterday's discussion`,
          `Hey! Quick question - are you free for a call?`,
          `Thanks for helping with that yesterday!`,
          `Hey ${currentUserName}! Quick update - everything is going well`,
          `Morning! Just wanted to check in - how's your project going?`,
          `Hey! Quick question - are you available around 3 PM?`,
          `Thanks for the help yesterday!`,
          `Hey ${currentUserName}! Just wanted to sync up on something`,
          `Morning! Quick update - no issues so far`
        ]
      }
      
      // Add emojis if person is emoji-heavy or company uses emojis
      if (personEmojiHeavy || useEmojis) {
        messages = messages.map(m => {
          if (m.includes('!')) return m.replace('!', '! 👋')
          if (m.includes('?')) return m.replace('?', '? 🤔')
          return m + ' 👍'
        })
      }
      
      // Make verbose if person is verbose
      if (personVerbose && Math.random() > 0.5) {
        messages = messages.map(m => m + ' Let me know what you think and we can discuss further.')
      }
      
      return { who: personName, text: pick(messages) }
    } else {
      // Messages from current user
      let messages: string[] = []
      
      if (currentRoleLower.includes('engineer') || currentRoleLower.includes('developer')) {
        if (hasITSM) {
          messages = [
            `Yeah, I'm seeing it too. Let me check the incident logs`,
            `That's awesome! Yeah, the change deployment went smoothly`,
            `I'll take a look. Might be related to the change we deployed yesterday`,
            `Good catch. Let's discuss the incident response plan`,
            `Sure! I'll review the change request this afternoon`,
            `That's great news! The monitoring improvements are working better than expected`,
            `I'm free around 2 PM if that works?`,
            `No problem! Happy to help with the incident`,
            `I'll investigate. Might be related to the infrastructure change`,
            `That's awesome! The system is performing well after the fix`,
            `Let me check the monitoring dashboard and get back to you`,
            `I'll review the post-mortem and add my notes`,
            `Good to hear the deployment went smoothly`,
            `I'll sync up with the on-call team about this`,
            `Let me pull the logs and see what's happening`
          ]
        } else {
          messages = [
            `Yeah, I'm seeing it too. Let me check the logs`,
            `That's awesome! Yeah, we should definitely talk about scaling`,
            `I'll take a look. Might be related to the recent changes`,
            `Good catch. Let's discuss options`,
            `Sure! I'll review it this afternoon`,
            `That's great news! The changes are working better than expected`,
            `I'm free around 2 PM if that works?`,
            `No problem! Happy to help`,
            `I'll investigate. Might be related to the deployment`,
            `That's awesome! Users seem to really like it`
          ]
        }
      } else if (currentRoleLower.includes('product') || currentRoleLower.includes('manager')) {
        messages = [
          `Yeah, I'm seeing it too. The metrics look great`,
          `That's awesome! Yeah, the feature is performing really well`,
          `I'll take a look. Excited to see the results`,
          `Good catch. Let's discuss the rollout plan`,
          `Sure! I'll review it this afternoon`,
          `That's great news! The engagement is better than expected`,
          `I'm free around 2 PM if that works?`,
          `No problem! Happy to help`,
          `I'll check it out. Looks promising`,
          `That's awesome! Users are really engaging with it`
        ]
      } else {
        messages = [
          `Yeah, I'm seeing it too. Let me check`,
          `That's awesome! Yeah, we should sync up`,
          `I'll take a look`,
          `Good catch. Let's discuss`,
          `Sure! I'll review it`,
          `That's great news!`,
          `I'm free around 2 PM if that works?`,
          `No problem! Happy to help`,
          `I'll investigate`,
          `That's awesome!`
        ]
      }
      
      // Add emojis if company uses emojis
      if (useEmojis && Math.random() > 0.3) {
        messages = messages.map(m => {
          if (m.includes('!')) return m.replace('!', '! 👍')
          return m
        })
      }
      
      return { who: currentUserName, text: pick(messages) }
    }
  }
  
  // Social media platform specific DM messages
  const generateSocialMediaDMMessage = (
    personName: string,
    currentUserName: string,
    isPersonTurn: boolean,
    messageCount: number,
    pick: <T,>(arr: T[]) => T
  ): { who: string, text: string } => {
    if (isPersonTurn) {
      const messages = [
        `Hey ${currentUserName}! Quick question - are you seeing the spike in video upload failures? We're getting like 3x the normal error rate`,
        `Morning! The new reel feature is live and engagement is crazy - ${Math.floor(Math.random() * 30) + 15}% higher than expected. Want to sync on scaling?`,
        `Hey! User reports are coming in about the photo filters being slow. I'm seeing some performance issues in the image processing pipeline`,
        `Quick heads up - we're hitting our CDN limits with all the video traffic. Need to discuss upgrading before the weekend`,
        `Hey ${currentUserName}! The influencer partnership feature is ready for review. Can you take a look at the PR?`,
        `Morning! Engagement metrics are way up - ${Math.floor(Math.random() * 50) + 20}% increase in likes and comments. The algorithm changes are working`,
        `Hey! Quick question - are you free for a quick call? I want to discuss the content moderation updates we're planning`,
        `Thanks for helping debug that video playback issue yesterday! Your suggestion about the cache headers was spot on`,
        `Hey ${currentUserName}! The new messaging feature is causing some performance issues. Seeing higher latency in the chat service`,
        `Morning! User feedback on the new short-form content feed is really positive. ${Math.floor(Math.random() * 40) + 20}% increase in time spent`,
        `Hey! I'm working on the friend recommendation algorithm and wanted your input. When are you free?`,
        `Quick update - the photo upload service is back to normal. The scaling helped a lot`,
        `Hey ${currentUserName}! The content discovery feature is ready for testing. Want to give it a try?`,
        `Morning! I saw your message about the video encoding. I've been seeing similar issues - want to sync up?`,
        `Hey! The new filters are live and users are loving them. Engagement is up ${Math.floor(Math.random() * 25) + 10}%`,
        `Quick question - are you seeing the same spike in API requests I am? We might need to rate limit more aggressively`
      ]
      return { who: personName, text: pick(messages) }
    } else {
      const messages = [
        `Yeah, I'm seeing it too. Looks like the video processing queue is backed up. Let me check the worker pool`,
        `That's awesome! Yeah, we should definitely talk about scaling. The traffic is way higher than projected`,
        `I'll take a look. Might be the image compression settings - we changed those last week`,
        `Good catch. Let's discuss options - we might need to add more edge locations`,
        `Sure! I'll review it this afternoon. Excited to see how you implemented it`,
        `That's great news! The algorithm tweaks are definitely working better than expected`,
        `I'm free around 2 PM if that works?`,
        `No problem! Happy to help. The cache headers were definitely the issue`,
        `I'll investigate. Might be related to the recent changes we made to the messaging service`,
        `That's awesome! Users seem to really like the new feed layout`,
        `I'm free this afternoon. Let's sync up`,
        `Good to hear! The scaling should help with the weekend traffic too`,
        `Definitely! I'll check it out and give you feedback`,
        `Yeah, let's sync up. I have some ideas on how to optimize it`,
        `That's great! Users are really engaging with the new features`,
        `Yeah, I'm seeing it. We might need to adjust the rate limits or add more capacity`
      ]
      return { who: currentUserName, text: pick(messages) }
    }
  }
  
  // E-commerce specific DM messages
  const generateEcommerceDMMessage = (
    personName: string,
    currentUserName: string,
    isPersonTurn: boolean,
    messageCount: number,
    pick: <T,>(arr: T[]) => T
  ): { who: string, text: string } => {
    if (isPersonTurn) {
      const messages = [
        `Hey ${currentUserName}! Quick question - are you seeing the spike in checkout failures? We're getting way more errors than normal`,
        `Morning! Sales are up ${Math.floor(Math.random() * 40) + 20}% this week. The new product recommendations are working really well`,
        `Hey! The inventory sync is lagging again. Orders are showing out of stock when we actually have items`,
        `Quick heads up - we're hitting our payment processor limits. Need to discuss upgrading before the holiday rush`,
        `Hey ${currentUserName}! The new search feature is ready for review. Can you take a look?`,
        `Morning! Customer service tickets are way down - ${Math.floor(Math.random() * 30) + 15}% decrease. The new help system is working`,
        `Hey! Quick question - are you free for a call? I want to discuss the shipping integration we're planning`,
        `Thanks for helping with that order processing issue yesterday! Your fix worked perfectly`,
        `Hey ${currentUserName}! The new product page is causing some performance issues. Seeing higher load times`,
        `Morning! User feedback on the checkout flow is really positive. Conversion rate is up ${Math.floor(Math.random() * 15) + 5}%`,
        `Hey! I'm working on the recommendation engine and wanted your input. When are you free?`,
        `Quick update - the inventory system is back to normal. The sync fix helped`,
        `Hey ${currentUserName}! The new wishlist feature is ready for testing. Want to give it a try?`,
        `Morning! I saw your message about the payment gateway. I've been seeing similar issues - want to sync up?`,
        `Hey! The new product filters are live and users are loving them. Engagement is way up`,
        `Quick question - are you seeing the same spike in API requests I am? We might need to optimize the product search`
      ]
      return { who: personName, text: pick(messages) }
    } else {
      const messages = [
        `Yeah, I'm seeing it too. Looks like the payment gateway is having issues. Let me check`,
        `That's awesome! Yeah, the recommendations are definitely helping with sales`,
        `I'll take a look. Might be the inventory sync service - we changed that recently`,
        `Good catch. Let's discuss options - we definitely need more capacity for the holidays`,
        `Sure! I'll review it this afternoon`,
        `That's great news! The new help system is working better than expected`,
        `I'm free around 2 PM if that works?`,
        `No problem! Happy to help`,
        `I'll investigate. Might be related to the new product images we're loading`,
        `That's awesome! The checkout improvements are definitely working`,
        `I'm free this afternoon. Let's sync up`,
        `Good to hear! The sync should be more reliable now`,
        `Definitely! I'll check it out`,
        `Yeah, let's sync up. I have some ideas`,
        `That's great! Users are really engaging with the new features`,
        `Yeah, I'm seeing it. We might need to add caching or optimize the queries`
      ]
      return { who: currentUserName, text: pick(messages) }
    }
  }
  
  // Healthcare specific DM messages
  const generateHealthcareDMMessage = (
    personName: string,
    currentUserName: string,
    isPersonTurn: boolean,
    messageCount: number,
    pick: <T,>(arr: T[]) => T
  ): { who: string, text: string } => {
    if (isPersonTurn) {
      const messages = [
        `Hey ${currentUserName}! Quick question - are you seeing the spike in appointment booking failures? We're getting more errors than normal`,
        `Morning! Patient portal usage is up ${Math.floor(Math.random() * 30) + 15}% this week. The new interface is working well`,
        `Hey! The scheduling system is lagging again. Appointments are showing as available when they're actually booked`,
        `Quick heads up - we're hitting our system limits with all the patient data. Need to discuss scaling`,
        `Hey ${currentUserName}! The new patient messaging feature is ready for review. Can you take a look?`,
        `Morning! Patient satisfaction scores are up - ${Math.floor(Math.random() * 20) + 10}% increase. The new features are helping`,
        `Hey! Quick question - are you free for a call? I want to discuss the compliance updates we're planning`,
        `Thanks for helping with that patient data issue yesterday! Your fix worked perfectly`,
        `Hey ${currentUserName}! The new appointment reminder system is causing some performance issues`,
        `Morning! Patient feedback on the portal is really positive. Usage is way up`,
        `Hey! I'm working on the patient records system and wanted your input. When are you free?`,
        `Quick update - the scheduling system is back to normal. The sync fix helped`,
        `Hey ${currentUserName}! The new telehealth feature is ready for testing. Want to give it a try?`,
        `Morning! I saw your message about the patient portal. I've been seeing similar issues - want to sync up?`,
        `Hey! The new appointment booking flow is live and patients are loving it`,
        `Quick question - are you seeing the same spike in API requests I am? We might need to optimize`
      ]
      return { who: personName, text: pick(messages) }
    } else {
      const messages = [
        `Yeah, I'm seeing it too. Looks like the booking service is having issues. Let me check`,
        `That's awesome! Yeah, the new interface is definitely helping`,
        `I'll take a look. Might be the scheduling sync service`,
        `Good catch. Let's discuss options - we definitely need more capacity`,
        `Sure! I'll review it this afternoon`,
        `That's great news! The new features are working better than expected`,
        `I'm free around 2 PM if that works?`,
        `No problem! Happy to help`,
        `I'll investigate. Might be related to the reminder system we deployed`,
        `That's awesome! The portal improvements are definitely working`,
        `I'm free this afternoon. Let's sync up`,
        `Good to hear! The sync should be more reliable now`,
        `Definitely! I'll check it out`,
        `Yeah, let's sync up. I have some ideas`,
        `That's great! Patients are really engaging with the new features`,
        `Yeah, I'm seeing it. We might need to add caching or optimize`
      ]
      return { who: currentUserName, text: pick(messages) }
    }
  }
  
  // Generic tech company DM messages
  const generateTechDMMessage = (
    personName: string,
    currentUserName: string,
    isPersonTurn: boolean,
    messageCount: number,
    personRole: string,
    currentUserRole: string,
    pick: <T,>(arr: T[]) => T
  ): { who: string, text: string } => {
    if (isPersonTurn) {
      const messages = [
        `Hey ${currentUserName}! Quick question - do you have a minute to look at the PR I just opened?`,
        `Morning! I wanted to follow up on yesterday's deployment. Everything went smoothly`,
        `Hey! Just wanted to say thanks for helping debug that issue yesterday. Your suggestion was spot on`,
        `Quick heads up - I'm deploying some changes around 2 PM today. Should be low risk`,
        `Hey ${currentUserName}! I saw your message in #engineering. Want to sync up on this?`,
        `Morning! Quick question about the monitoring dashboard - are you seeing the same metrics I am?`,
        `Hey! I'm working on a new feature and wanted your input. When are you free to chat?`,
        `Thanks for the code review! Your feedback was really helpful`,
        `Hey ${currentUserName}! Quick update - the deployment went smoothly. No issues so far`,
        `Morning! I'm investigating that alert from last night. Want to confirm with you before closing it`,
        `Hey! I noticed you're working on something similar. Want to sync up?`,
        `Quick question - are you available for a quick call around 3 PM?`,
        `Hey ${currentUserName}! Just wanted to check in - how's your project going?`,
        `Morning! I saw the metrics improved after your changes yesterday. Nice work!`,
        `Hey! Quick heads up - I'm doing some maintenance around 4 PM. Shouldn't affect anything`
      ]
      return { who: personName, text: pick(messages) }
    } else {
      const messages = [
        `Sure thing! I'll take a look this afternoon`,
        `Thanks for the heads up! I'll keep an eye on it`,
        `No problem at all - happy to help!`,
        `Sounds good, thanks for letting me know`,
        `Yeah, let's sync up later today`,
        `Good catch! I'll investigate on my end as well`,
        `I'm free around 2 PM if that works for you`,
        `Glad I could help! Let me know if you need anything else`,
        `Great to hear it went smoothly!`,
        `Yeah, I agree it looks fine. The metrics are back to normal now`,
        `That would be helpful! I'm free this afternoon`,
        `3 PM works for me!`,
        `Going well so far, thanks for checking in!`,
        `Thanks! Yeah, it worked better than expected`,
        `Got it, thanks for the heads up!`
      ]
      return { who: currentUserName, text: pick(messages) }
    }
  }
  
  // Generate fully contextual group DM messages using ALL company context
  const generateContextualGroupDMMessage = (
    groupMembers: string[],
    currentUserName: string,
    conversationHistory: SlackMsg[],
    pick: <T,>(arr: T[]) => T
  ): { who: string, text: string } => {
    const companyDesc = companyData.description || ''
    const companyName = companyData.name || 'the company'
    const communicationStyle = companyData.communicationStyle || {}
    const useEmojis = communicationStyle.commonPatterns?.includes('Emoji usage common') || false
    
    // Get actual group members from channel-config.json if available
    const groupDMConfig = (channelConfig.groupDMs as Array<{ id: string; name: string; members?: string[] }> | undefined)?.find(g => {
      const configMembers = g.members || []
      return configMembers.length === groupMembers.length && 
             configMembers.every((m: string) => groupMembers.includes(m))
    })
    const actualMembers = groupDMConfig?.members || groupMembers
    
    // Determine who should speak next (ensure all participate)
    const lastSender = conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1].who : null
    const allParticipants = [...actualMembers, currentUserName].filter((v, i, a) => a.indexOf(v) === i)
    
    // Find who has spoken least
    const participantCounts: Record<string, number> = {}
    allParticipants.forEach(p => participantCounts[p] = 0)
    conversationHistory.forEach(msg => {
      if (participantCounts[msg.who] !== undefined) {
        participantCounts[msg.who]++
      }
    })
    
    const minCount = Math.min(...allParticipants.map(p => participantCounts[p] || 0))
    const leastActive = allParticipants.filter(p => (participantCounts[p] || 0) === minCount && p !== lastSender)
    const nextSpeaker = leastActive.length > 0 ? pick(leastActive) : pick(allParticipants.filter(p => p !== lastSender))
    
    // Get speaker's role and traits
    const speaker = getPerson(nextSpeaker)
    const speakerRole = speaker?.role || ''
    const speakerEmojiHeavy = speaker?.['emoji-heavy'] || false
    const speakerVerbose = speaker?.verbose || false
    const roleLower = speakerRole.toLowerCase()
    
    // Extract key company features from description
    const descLower = companyDesc.toLowerCase()
    const hasVideo = descLower.includes('video') || descLower.includes('reel')
    const hasPhotos = descLower.includes('photo') || descLower.includes('image')
    const hasMessaging = descLower.includes('message') || descLower.includes('chat')
    const hasContent = descLower.includes('content') || descLower.includes('shortform')
    const hasSocial = descLower.includes('social') || descLower.includes('friend')
    
    // Generate role-based group messages
    let messages: string[] = []
    
    if (roleLower.includes('engineer') || roleLower.includes('developer')) {
      if (hasVideo) {
        messages = [
          `Hey team! Quick question - are you all seeing the video upload spike? We're getting way more traffic than expected`,
          `Morning everyone! The new reel feature is live and engagement is through the roof. ${Math.floor(Math.random() * 30) + 15}% higher than projected`,
          `Hey! Video processing queue is backed up - ${Math.floor(Math.random() * 100) + 50} videos pending. Might need more workers`,
          `Quick heads up - we're hitting CDN limits with all the video traffic. Need to discuss scaling before the weekend`,
          `The video encoding optimization is ready for review. Can everyone take a look?`,
          `Video engagement metrics are way up - ${Math.floor(Math.random() * 50) + 20}% increase. The algorithm changes are working great`,
          `Anyone free for a quick call? I want to discuss the video compression changes we're planning`,
          `Thanks for helping debug that video playback issue! The cache header fix worked`,
          `The new video filters are causing some latency. Anyone have ideas on optimization?`,
          `User feedback on video features is really positive. ${Math.floor(Math.random() * 40) + 20}% increase in views`
        ]
      } else if (hasPhotos) {
        messages = [
          `Hey team! Quick question - anyone seeing the photo upload spike? We're getting way more traffic`,
          `Morning everyone! Photo processing is lagging - ${Math.floor(Math.random() * 50) + 20} images stuck in queue`,
          `Hey! User reports are coming in about photo filters being slow. Anyone else seeing performance issues?`,
          `Quick heads up - we're hitting storage limits with all the photo uploads. Need to discuss upgrading`,
          `The new photo editing feature is ready for review. Can everyone take a look?`,
          `Photo engagement is way up - ${Math.floor(Math.random() * 30) + 15}% increase in likes. The new filters are working`,
          `Anyone free for a call? I want to discuss the image compression optimization`,
          `Thanks for helping with the photo upload issue! The fix worked perfectly`,
          `The new photo filters are causing some performance issues. Anyone have optimization ideas?`,
          `Photo processing queue is back to normal. The scaling helped a lot`
        ]
      } else {
        messages = [
          `Hey team! Quick question - does anyone have a minute to look at the PR I just opened?`,
          `Morning everyone! Wanted to follow up on yesterday's deployment. Everything went smoothly`,
          `Hey! Just wanted to say thanks for helping debug that issue. Your suggestions were spot on`,
          `Quick heads up - deploying some changes around 2 PM today. Should be low risk`,
          `I saw the message in #engineering. Want to sync up on this?`,
          `Quick question about the monitoring dashboard - is everyone seeing the same metrics?`,
          `I'm working on a new feature and wanted everyone's input. When are people free?`,
          `Thanks for the code reviews! Feedback was really helpful`,
          `Quick update - deployment went smoothly. No issues so far`,
          `Investigating that alert from last night. Want to confirm with everyone before closing it`
        ]
      }
    } else if (roleLower.includes('product') || roleLower.includes('manager')) {
      if (hasContent || hasSocial) {
        messages = [
          `Hey team! Quick question - are you all seeing the engagement spike? We're getting ${Math.floor(Math.random() * 50) + 20}% more interactions than expected`,
          `Morning everyone! The new content discovery feature is live and users are loving it - ${Math.floor(Math.random() * 40) + 25}% increase in time spent`,
          `Hey! User feedback on the new feed is really positive. Engagement metrics are way up`,
          `Quick heads up - we're planning to launch the new recommendation feature next week. Want to sync on the rollout?`,
          `The content moderation updates are ready for review. Can everyone take a look?`,
          `User engagement is through the roof - ${Math.floor(Math.random() * 50) + 20}% increase. The algorithm changes are working great`,
          `Anyone free for a call? I want to discuss the content strategy we're planning`,
          `Thanks for helping with that feature launch! The rollout went smoothly`,
          `The new content discovery algorithm is ready for testing. Everyone should try it out`,
          `User feedback on the platform updates is really positive. Usage is way up`
        ]
      } else {
        messages = [
          `Hey team! Quick question - can everyone review the product roadmap I just shared?`,
          `Morning everyone! User feedback on the new feature is really positive. Engagement is up ${Math.floor(Math.random() * 30) + 10}%`,
          `Hey! Quick question - is anyone free for a call? I want to discuss the feature prioritization`,
          `Thanks for helping with that product launch! Everything went smoothly`,
          `The new feature is ready for review. Can everyone take a look?`,
          `User metrics are looking great - ${Math.floor(Math.random() * 25) + 10}% increase in engagement`,
          `Quick update - the feature rollout is going well. No issues so far`,
          `Anyone available for a quick call around 3 PM?`,
          `Just wanted to check in - how's everyone's product planning going?`,
          `I saw the metrics improved after the changes yesterday. Nice work team!`
        ]
      }
    } else if (roleLower.includes('devops') || roleLower.includes('sre') || roleLower.includes('operations')) {
      messages = [
        `Hey team! Quick question - is anyone seeing the deployment spike? We're hitting our CI/CD limits`,
        `Morning everyone! Infrastructure scaling completed - added ${Math.floor(Math.random() * 5) + 2} more instances. Should handle the traffic now`,
        `Hey! Quick heads up - we're doing some maintenance around 4 PM today. Shouldn't affect anything`,
        `Anyone free for a call? I want to discuss the infrastructure upgrades we're planning`,
        `Thanks for helping with that deployment issue! The fix worked perfectly`,
        `The new monitoring dashboard is ready for review. Can everyone take a look?`,
        `System performance is looking good - all metrics within normal ranges`,
        `Quick update - the infrastructure upgrade went smoothly. No issues so far`,
        `Anyone seeing the same alert spike I am? We might need to adjust thresholds`,
        `I'm investigating that performance issue from last night. Want to sync up?`
      ]
    } else {
      // Generic messages for other roles
      messages = [
        `Hey team! Quick question - does anyone have a minute?`,
        `Morning everyone! Just wanted to follow up on yesterday's discussion`,
        `Hey! Quick question - is anyone free for a call?`,
        `Thanks for helping with that yesterday!`,
        `Quick update - everything is going well`,
        `Just wanted to check in - how's everyone's projects going?`,
        `Anyone available around 3 PM?`,
        `Thanks for the help yesterday!`,
        `Just wanted to sync up on something`,
        `Quick update - no issues so far`
      ]
    }
    
    // Add emojis if speaker is emoji-heavy or company uses emojis
    if (speakerEmojiHeavy || useEmojis) {
      messages = messages.map(m => {
        if (m.includes('!')) return m.replace('!', '! 👋')
        if (m.includes('?')) return m.replace('?', '? 🤔')
        return m + ' 👍'
      })
    }
    
    // Make verbose if speaker is verbose
    if (speakerVerbose && Math.random() > 0.5) {
      messages = messages.map(m => m + ' Let me know what everyone thinks and we can discuss further.')
    }
    
    return { who: nextSpeaker, text: pick(messages) }
  }
  
  // Generate contextual channel messages using channel descriptions and topics
  const generateContextualChannelMessage = (
    chatId: string,
    channelInfo: { id: string; description?: string; topics?: string[]; name?: string },
    pick: <T,>(arr: T[]) => T,
    conversationHistory?: SlackMsg[]
  ): { who: string, text: string } => {
    const companyDesc = companyData.description || ''
    const companyName = companyData.name || 'the company'
    const communicationStyle = companyData.communicationStyle || {}
    const useEmojis = communicationStyle.commonPatterns?.includes('Emoji usage common') || false
    
    const description = channelInfo.description || ''
    const topics = channelInfo.topics || []
    const channelName = channelInfo.name?.replace('#', '') || chatId
    
    // Get participants who would naturally be in this channel based on their roles
    const relevantPeople = people.filter(p => {
      const person = getPerson(p.n)
      const role = (person?.role || '').toLowerCase()
      const descLower = description.toLowerCase()
      const topicsLower = topics.join(' ').toLowerCase()
      
      // Match roles to channel topics
      if (descLower.includes('manufacturing') || topicsLower.includes('production') || topicsLower.includes('assembly') || topicsLower.includes('plant')) {
        return role.includes('manufacturing') || role.includes('production') || role.includes('engineer') || role.includes('manager') || role.includes('supervisor')
      }
      if (descLower.includes('quality') || topicsLower.includes('inspection') || topicsLower.includes('defect')) {
        return role.includes('quality') || role.includes('engineer') || role.includes('inspector') || role.includes('manager')
      }
      if (descLower.includes('supply chain') || topicsLower.includes('supplier') || topicsLower.includes('logistics')) {
        return role.includes('supply') || role.includes('logistics') || role.includes('procurement') || role.includes('manager')
      }
      if (descLower.includes('engineering') || topicsLower.includes('code') || topicsLower.includes('pr') || topicsLower.includes('r-d') || topicsLower.includes('design')) {
        return role.includes('engineer') || role.includes('developer') || role.includes('design')
      }
      if (descLower.includes('product') || topicsLower.includes('feature') || topicsLower.includes('roadmap')) {
        return role.includes('product') || role.includes('manager')
      }
      if (descLower.includes('operation') || topicsLower.includes('deployment') || topicsLower.includes('infrastructure')) {
        return role.includes('devops') || role.includes('sre') || role.includes('operation') || role.includes('manager')
      }
      if (descLower.includes('design') || topicsLower.includes('ui') || topicsLower.includes('ux')) {
        return role.includes('design')
      }
      return true // Default: include everyone
    }).map(p => p.n).filter(n => n !== getCurrentUser)
    
    // CRITICAL: Exclude last sender to prevent consecutive messages
    const lastSender = conversationHistory && conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1].who : null
    const availableSpeakers = relevantPeople.length > 0 
      ? relevantPeople.filter(p => p !== lastSender)
      : people.map(p => p.n).filter(n => {
        const person = peopleData.find((pp: Person) => pp.name === n)
        return n !== getCurrentUser && n !== lastSender && 
               person?.role !== 'AI Assistant' && 
               person?.role !== 'HR System'
      })
    
    // If no available speakers (edge case), use all speakers
    const speakerCandidates = availableSpeakers.length > 0 ? availableSpeakers : (relevantPeople.length > 0 ? relevantPeople : people.map(p => p.n).filter(n => {
      const person = peopleData.find((pp: Person) => pp.name === n)
      return n !== getCurrentUser && 
             person?.role !== 'AI Assistant' && 
             person?.role !== 'HR System'
    }))
    const speaker = pick(speakerCandidates)
    const speakerPerson = getPerson(speaker)
    const speakerEmojiHeavy = speakerPerson?.['emoji-heavy'] || false
    
    // Generate messages based on channel topics and description
    let messages: string[] = []
    
    // Use topics to generate relevant messages
    if (topics.length > 0) {
      topics.forEach(topic => {
        const topicLower = topic.toLowerCase()
        // Manufacturing and automotive topics
        if (topicLower.includes('production') || topicLower.includes('manufacturing')) {
          const plant = pick(['Sindelfingen', 'Tuscaloosa', 'Beijing', 'Pune', 'East London'])
          const vehicleModel = pick(['E-Class', 'S-Class', 'C-Class', 'GLE', 'EQS', 'EQE'])
          messages.push(`Production update from ${plant} plant: Line ${Math.floor(Math.random() * 5) + 1} running at ${Math.floor(Math.random() * 10) + 90}% efficiency`)
          messages.push(`${vehicleModel} production target met - ${Math.floor(Math.random() * 50) + 200} units completed today`)
          messages.push(`Production line ${Math.floor(Math.random() * 3) + 1} scheduled maintenance completed. Resuming normal operations`)
          messages.push(`Global production status: ${Math.floor(Math.random() * 5) + 8} plants operational, ${Math.floor(Math.random() * 500) + 2000} vehicles produced today`)
        }
        if (topicLower.includes('quality') || topicLower.includes('inspection') || topicLower.includes('defect')) {
          messages.push(`Quality control report: ${Math.floor(Math.random() * 5) + 95}% pass rate on final inspection`)
          messages.push(`Defect rate reduced to ${Math.floor(Math.random() * 2) + 0.1}% - excellent work team!`)
          messages.push(`Quality inspection completed: ${Math.floor(Math.random() * 100) + 50} vehicles checked, all standards met`)
          messages.push(`Quality alert: Minor issue detected in ${pick(['paint finish', 'interior trim', 'electrical systems', 'engine assembly'])}. Investigation in progress`)
        }
        if (topicLower.includes('supply chain') || topicLower.includes('supplier') || topicLower.includes('logistics')) {
          const supplier = pick(['Bosch', 'Continental', 'ZF', 'Magna', 'Lear'])
          const part = pick(['brake systems', 'transmission components', 'electronics', 'seats', 'batteries'])
          messages.push(`Supply chain update: ${supplier} delivery on schedule. ${part} inventory at ${Math.floor(Math.random() * 20) + 80}% capacity`)
          messages.push(`Global logistics: ${Math.floor(Math.random() * 10) + 5} shipments en route from ${pick(['Germany', 'China', 'USA', 'Mexico'])}`)
          messages.push(`Supplier coordination: ${supplier} confirmed delivery of ${part} for next week's production run`)
          messages.push(`Supply chain alert: Potential delay from ${supplier}. Exploring alternative suppliers`)
        }
        if (topicLower.includes('assembly') || topicLower.includes('line')) {
          messages.push(`Assembly line ${Math.floor(Math.random() * 5) + 1}: ${Math.floor(Math.random() * 20) + 40} vehicles per hour - target exceeded`)
          messages.push(`Line balancing update: Workstation ${Math.floor(Math.random() * 20) + 1} optimized. Cycle time reduced by ${Math.floor(Math.random() * 10) + 5}%`)
          messages.push(`Assembly quality check: ${Math.floor(Math.random() * 100) + 200} vehicles assembled today, zero defects`)
          messages.push(`Assembly line status: All ${Math.floor(Math.random() * 5) + 3} lines operational. Production running smoothly`)
        }
        if (topicLower.includes('plant') || topicLower.includes('facility') || topicLower.includes('operations')) {
          const plant = pick(['Sindelfingen', 'Tuscaloosa', 'Beijing', 'Pune', 'East London', 'Hambach'])
          messages.push(`${plant} plant operations: All shifts running normally. Safety metrics excellent`)
          messages.push(`Plant maintenance scheduled for ${pick(['weekend', 'next week', 'next month'])}. Production plan adjusted`)
          messages.push(`Global plant coordination: ${plant} plant sharing best practices with ${pick(['Tuscaloosa', 'Beijing', 'Pune'])}`)
          messages.push(`Plant operations update: ${plant} facility operating at ${Math.floor(Math.random() * 10) + 90}% capacity`)
        }
        if (topicLower.includes('electric') || topicLower.includes('ev') || topicLower.includes('battery')) {
          messages.push(`EV production update: EQS and EQE lines running at full capacity. ${Math.floor(Math.random() * 50) + 100} EVs produced today`)
          messages.push(`Battery assembly: Quality checks passed. ${Math.floor(Math.random() * 100) + 200} battery packs assembled`)
          messages.push(`Electric vehicle delivery: ${Math.floor(Math.random() * 50) + 50} EVs shipped to ${pick(['Europe', 'North America', 'Asia'])} this week`)
          messages.push(`EV charging infrastructure: ${Math.floor(Math.random() * 10) + 5} new charging stations installed at ${pick(['Sindelfingen', 'Tuscaloosa'])} plant`)
        }
        if (topicLower.includes('vehicle') || topicLower.includes('delivery') || topicLower.includes('shipping')) {
          const model = pick(['E-Class', 'S-Class', 'C-Class', 'GLE', 'EQS', 'GLC'])
          messages.push(`Vehicle delivery: ${Math.floor(Math.random() * 100) + 200} ${model} units shipped to ${pick(['dealers', 'customers', 'distribution centers'])}`)
          messages.push(`Global delivery status: ${Math.floor(Math.random() * 1000) + 5000} vehicles in transit across ${pick(['Europe', 'Americas', 'Asia-Pacific'])}`)
          messages.push(`Customer delivery coordination: ${Math.floor(Math.random() * 50) + 100} vehicles ready for customer pickup this week`)
        }
        if (topicLower.includes('content') || topicLower.includes('moderation')) {
          messages.push(`Content moderation update: ${Math.floor(Math.random() * 50) + 10} items reviewed today`)
          messages.push(`New content feature is ready for review. Can everyone take a look?`)
        }
        if (topicLower.includes('feature') || topicLower.includes('release')) {
          messages.push(`New feature release: Enhanced ${channelName} functionality deployed`)
          messages.push(`Feature rollout is going well - ${Math.floor(Math.random() * 30) + 10}% increase in usage`)
        }
        if (topicLower.includes('engagement') || topicLower.includes('user')) {
          messages.push(`User engagement metrics: ${Math.floor(Math.random() * 30) + 5}% increase this week`)
          messages.push(`User feedback on ${channelName} is really positive. Engagement is way up`)
        }
        if (topicLower.includes('code') || topicLower.includes('review') || topicLower.includes('pr')) {
          messages.push(`Code review needed for PR #${Math.floor(Math.random() * 5000) + 1000}`)
          messages.push(`PR approved and merged. Great work team!`)
        }
        if (topicLower.includes('architecture') || topicLower.includes('technical')) {
          messages.push(`Architecture discussion: ${channelName} improvements`)
          messages.push(`Technical design doc is ready for review`)
        }
        if (topicLower.includes('deployment') || topicLower.includes('infrastructure')) {
          messages.push(`Deployment completed successfully: v${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`)
          messages.push(`Infrastructure scaling completed - added ${Math.floor(Math.random() * 5) + 2} more instances`)
        }
        if (topicLower.includes('monitoring') || topicLower.includes('performance')) {
          messages.push(`Performance optimization: Reduced latency by ${Math.floor(Math.random() * 30) + 10}%`)
          messages.push(`Monitoring shows all systems operational. Response times within targets`)
        }
        if (topicLower.includes('announcement') || topicLower.includes('update')) {
          messages.push(`Update on ${channelName}: ${Math.floor(Math.random() * 30) + 10}% improvement in metrics`)
          messages.push(`Company update: New initiatives launching next quarter`)
        }
      })
    }
    
    // Fallback messages based on description
    if (messages.length === 0) {
      const descLower = description.toLowerCase()
      if (descLower.includes('content') || descLower.includes('platform')) {
        messages = [
          `Content platform update: ${Math.floor(Math.random() * 50) + 10}% increase in engagement`,
          `New platform feature is ready for review`,
          `User feedback on platform updates is really positive`,
          `Platform performance: All systems operational`
        ]
      } else if (descLower.includes('engineering') || descLower.includes('technical')) {
        messages = [
          `Engineering update: Code review needed for PR #${Math.floor(Math.random() * 5000) + 1000}`,
          `Deployment completed successfully`,
          `Architecture discussion: Technical improvements`,
          `Performance optimization: Reduced latency by ${Math.floor(Math.random() * 30) + 10}%`
        ]
      } else if (descLower.includes('operation') || descLower.includes('infrastructure')) {
        messages = [
          `Operations update: All systems running smoothly`,
          `Infrastructure scaling completed`,
          `Deployment pipeline running successfully`,
          `Monitoring shows stable performance`
        ]
      } else {
        // Check for manufacturing/automotive context
        const descLower = companyDesc.toLowerCase()
        const hasManufacturing = descLower.includes('manufacturing') || descLower.includes('automotive') || descLower.includes('production') || descLower.includes('vehicle') || descLower.includes('plant')
        const hasITSM = descLower.includes('incident') || descLower.includes('itom') || descLower.includes('itsm') || descLower.includes('service management') || descLower.includes('change management') || descLower.includes('monitoring') || descLower.includes('operations')
        
        if (hasManufacturing) {
          const plant = pick(['Sindelfingen', 'Tuscaloosa', 'Beijing', 'Pune', 'East London'])
          const model = pick(['E-Class', 'S-Class', 'C-Class', 'GLE', 'EQS', 'EQE'])
          messages = [
            `${plant} plant operations: Production running smoothly. All lines operational`,
            `Global manufacturing update: ${Math.floor(Math.random() * 5) + 8} plants operational worldwide`,
            `Quality control: ${Math.floor(Math.random() * 5) + 95}% pass rate on vehicle inspections`,
            `Supply chain status: All suppliers delivering on schedule`,
            `${model} production: ${Math.floor(Math.random() * 100) + 200} units completed today`,
            `Plant operations: All shifts running normally. Safety metrics excellent`,
            `Vehicle delivery: ${Math.floor(Math.random() * 100) + 200} vehicles shipped globally`,
            `Production planning: Next week's schedule confirmed. Capacity at ${Math.floor(Math.random() * 10) + 90}%`
          ]
        } else if (hasITSM) {
          messages = [
            `Monitoring shows all systems operational. No incidents reported`,
            `Change request review completed. Ready for deployment`,
            `Infrastructure metrics within normal ranges. All checks passing`,
            `Incident response team on standby. No active incidents`,
            `System health check completed. All services operational`,
            `Change window scheduled for next week. Reviewing impact assessment`,
            `Post-incident review completed. Action items documented`,
            `Monitoring dashboard updated. New alert thresholds configured`
          ]
        } else {
          messages = [
            `Update on ${channelName}`,
            `Discussion about ${topics[0] || 'team updates'}`,
            `Status update: Progress looking good`,
            `New information regarding ${topics[0] || 'updates'}`
          ]
        }
      }
    }
    
    // Add emojis if speaker is emoji-heavy or company uses emojis
    if (speakerEmojiHeavy || useEmojis) {
      messages = messages.map(m => {
        if (m.includes('!')) return m.replace('!', '! ✅')
        return m
      })
    }
    
    return { who: speaker, text: pick(messages) }
  }

  // Sophisticated message generator with realistic variation, length, and channel-specific content
  const generateRealisticMessage = (chatId: string, chatName: string, isChannel: boolean, isGroupDM: boolean, pick: <T,>(arr: T[]) => T, conversationHistory?: SlackMsg[]): { who: string, text: string } => {
    // For custom setups, use channel descriptions and topics from channel-config.json
    const allChannels = [...(channelConfig.starred || []), ...(channelConfig.public || []), ...((channelConfig.private || []) as Array<{ id: string; description?: string; topics?: string[] }>)]
    const channelInfo = allChannels.find(c => c.id === chatId)
    
    // If this is a custom channel (not hardcoded Atlassian channels), use contextual generation
    if (channelInfo && !['itom-4412', 'incidents', 'alerts', 'chg-review', 'dev-ops'].includes(chatId)) {
      return generateContextualChannelMessage(chatId, channelInfo, pick, conversationHistory)
    }
    
    // Hardcoded Atlassian instance channels (only for default setup)
    const channelMessageGenerators: Record<string, () => { who: string, text: string }> = {
      'itom-4412': () => {
        const incidentId = Math.floor(Math.random() * 5000) + 4000
        const plant = pick(['Sindelfingen', 'Tuscaloosa', 'Beijing', 'Pune', 'East London'])
        const scenarios = [
          {
            who: 'Merc AI',
            text: `Production alert #${incidentId} detected: Assembly line ${Math.floor(Math.random() * 5) + 1} stoppage at ${plant} plant. Line efficiency dropped from ${Math.floor(Math.random() * 10) + 90}% to ${Math.floor(Math.random() * 20) + 40}%. Affecting ${pick(['E-Class', 'S-Class', 'C-Class', 'GLE', 'EQS'])} production. Root cause analysis in progress.`
          },
          {
            who: pick(['Hannah Wolf', 'Felix Schäfer', 'Mia Zimmermann']),
            text: `Checking production monitoring systems. Seeing ${pick(['robotic arm malfunction', 'conveyor belt sensor failure', 'quality control station alert', 'component supply interruption'])} - current line status: ${pick(['stopped', 'reduced speed', 'manual operation'])}. Also noticing ${pick(['increased defect rate', 'component alignment issues', 'paint finish problems'])} in recent quality checks.`
          },
          {
            who: pick(['Felix Schäfer', 'Alexander Schneider', 'Sarah Kim']),
            text: `I can see the ${pick(['welding station', 'paint booth', 'assembly workstation', 'quality inspection point'])} is showing ${pick(['equipment error codes', 'sensor failures', 'component shortages'])}. Cycle time increased by ${Math.floor(Math.random() * 30) + 15} seconds. Should we ${pick(['switch to backup equipment', 'adjust production schedule', 'notify maintenance team'])}?`
          },
          {
            who: 'Merc AI',
            text: `Auto-correlation suggests ${pick(['component supply chain delay', 'equipment maintenance overdue', 'quality control threshold exceeded', 'workstation calibration needed'])} is the primary bottleneck. Recommending: ${pick(['activate backup production line', 'adjust component sourcing', 'schedule immediate maintenance', 'recalibrate quality sensors'])}. Estimated resolution time: ${Math.floor(Math.random() * 60) + 30} minutes.`
          },
          {
            who: pick(['Mia Zimmermann', 'Paul Bauer', 'Alex Thompson']),
            text: `On it. ${pick(['Coordinating with maintenance team', 'Contacting supplier for expedited delivery', 'Switching to backup equipment', 'Adjusting production schedule'])} now. ETA ${Math.floor(Math.random() * 45) + 15} minutes. Will monitor production metrics closely during resolution.`
          },
          {
            who: pick(['Eve Park', 'James Bryant', 'Priya Shah']),
            text: `Line efficiency improved to ${Math.floor(Math.random() * 10) + 85}% after ${pick(['maintenance completed', 'component delivery', 'equipment switch', 'calibration'])} ✅ Production back to normal. Monitoring shows stable performance. Incident resolved.`
          },
          {
            who: pick(['Sarah Kim', 'Alexander Schneider', 'Mia Zimmermann']),
            text: `Post-production review scheduled for tomorrow at ${Math.floor(Math.random() * 4) + 2} PM. I'll send out the incident timeline and root cause analysis doc by EOD. Key learnings: need better ${pick(['predictive maintenance scheduling', 'supplier coordination protocols', 'quality control monitoring', 'equipment redundancy'])}. <a href="https://wiki.mercedes-benz.com/postmortems/${Math.floor(Math.random() * 5000) + 4000}" target="_blank" rel="noopener noreferrer" style="color: #1D9BD1; text-decoration: underline;">Doc link here</a>.`
          },
          {
            who: pick(['Merc AI', 'Hannah Wolf', 'Felix Schäfer']),
            text: `Monitoring shows stable production over the past ${Math.floor(Math.random() * 3) + 2} hours. All lines operational within normal parameters. Incident #${incidentId} can be marked as resolved.`
          }
        ]
        return pick(scenarios)
      },
      'incidents': () => {
        const incidentId = Math.floor(Math.random() * 5000) + 4000
        const plant = pick(['Sindelfingen', 'Tuscaloosa', 'Beijing', 'Pune', 'East London'])
        const scenarios = [
          {
            who: pick(['Eve Park', 'James Bryant', 'Merc AI']),
            text: `New production incident opened: #${incidentId} - ${pick(['Assembly line stoppage', 'Quality control threshold exceeded', 'Component supply delay', 'Equipment malfunction', 'Production line efficiency drop'])} at ${plant} plant. Severity: ${pick(['P1', 'P2', 'P3'])}. Assigning to production operations team.`
          },
          {
            who: pick(['James Bryant', 'Priya Shah', 'Eve Park']),
            text: `Incident #${incidentId} status update: ${pick(['Investigating', 'Identified', 'Monitoring', 'Resolved'])}. ${pick(['Root cause identified', 'Mitigation in progress', 'Stable for 30 minutes', 'All production lines operational'])}. ETA for resolution: ${Math.floor(Math.random() * 60) + 15} minutes.`
          },
          {
            who: pick(['Merc AI', 'Hannah Wolf', 'Alexander Schneider']),
            text: `Initial assessment for #${incidentId}: ${pick(['Component supply chain interruption', 'Equipment maintenance overdue', 'Quality control sensor failure', 'Workstation calibration needed'])}. Mitigation in progress. Impact: ${Math.floor(Math.random() * 15) + 5}% of ${pick(['daily production target', 'vehicle assembly capacity', 'quality inspection throughput', 'component processing'])}.`
          },
          {
            who: pick(['Sarah Kim', 'Paul Bauer', 'Emma Wilson']),
            text: `Incident #${incidentId} post-production review completed. Root cause: ${pick(['insufficient preventive maintenance scheduling', 'supplier delivery delay', 'equipment wear beyond tolerance', 'quality control threshold calibration issue'])}. Action items: ${pick(['implement predictive maintenance schedule', 'establish backup supplier agreements', 'upgrade equipment monitoring systems', 'enhance quality control protocols'])}. <a href="https://wiki.mercedes-benz.com/postmortems/${incidentId}" target="_blank" rel="noopener noreferrer" style="color: #1D9BD1; text-decoration: underline;">Doc link here</a>`
          }
        ]
        return pick(scenarios)
      },
      'alerts': () => {
        const plant = pick(['Sindelfingen', 'Tuscaloosa', 'Beijing', 'Pune', 'East London'])
        const scenarios = [
          {
            who: pick(['Merc AI', 'Alexander Schneider', 'Sarah Kim']),
            text: `Alert: Production line ${Math.floor(Math.random() * 5) + 1} efficiency dropped below threshold (${Math.floor(Math.random() * 10) + 70}% < 85%) at ${plant} plant. Duration: ${Math.floor(Math.random() * 30) + 10} minutes. Investigating root cause.`
          },
          {
            who: pick(['Alexander Schneider', 'Alex Thompson', 'Lisa Anderson']),
            text: `Acknowledged. Investigating root cause. Initial checks show ${pick(['equipment utilization at 92%', 'increased defect rate in quality control', 'component inventory dropped to 65%', 'assembly workstation showing error codes'])}. Will update as I find more. Check the <a href="https://dashboard.mercedes-benz.com/production/${Math.floor(Math.random() * 5000) + 4000}" target="_blank" rel="noopener noreferrer" style="color: #1D9BD1; text-decoration: underline;">production dashboard</a> for live updates.`
          },
          {
            who: pick(['Sarah Kim', 'Mia Zimmermann', 'Paul Bauer']),
            text: `Found ${pick(['component supply shortage', 'equipment calibration issue', 'quality control threshold exceeded', 'workstation maintenance needed'])}. ${pick(['Coordinating with suppliers', 'Scheduling maintenance', 'Switching to backup equipment', 'Adjusting production schedule'])}. ETA ${Math.floor(Math.random() * 45) + 15} minutes.`
          },
          {
            who: pick(['Merc AI', 'Eve Park', 'James Bryant']),
            text: `Alert cleared: Production line efficiency back to normal (${Math.floor(Math.random() * 10) + 88}%). Monitoring for ${Math.floor(Math.random() * 30) + 15} minutes shows stable performance. All metrics within thresholds.`
          },
          {
            who: pick(['Alexander Schneider', 'Alex Thompson']),
            text: `New alert: Component inventory at ${Math.floor(Math.random() * 10) + 80}% capacity. Current stock: ${Math.floor(Math.random() * 20) + 85}/${Math.floor(Math.random() * 10) + 90} units. Recommend ${pick(['expediting supplier delivery', 'activating backup supplier', 'investigating supply chain delays'])}.`
          },
          {
            who: pick(['Sarah Kim', 'Paul Bauer']),
            text: `Alert threshold adjusted based on new baseline. ${pick(['Line efficiency', 'Defect rate', 'Component inventory', 'Quality pass rate'])} threshold updated from ${Math.floor(Math.random() * 10) + 80}% to ${Math.floor(Math.random() * 10) + 85}% to reduce false positives. Historical data shows this is more appropriate for current production patterns.`
          }
        ]
        return pick(scenarios)
      },
      'chg-review': () => {
        const changeId = Math.floor(Math.random() * 1000) + 1000
        const plant = pick(['Sindelfingen', 'Tuscaloosa', 'Beijing', 'Pune', 'East London'])
        const scenarios = [
          {
            who: pick(['Paul Bauer', 'Emma Wilson', 'Alex Thompson']),
            text: `Production change request: ${pick(['Modify assembly line configuration for EQS', 'Update quality control thresholds', 'Adjust component sourcing protocol', 'Implement new workstation calibration', 'Update production scheduling algorithm'])} at ${plant} plant. Risk level: ${pick(['Low', 'Medium', 'High'])}. Requested by ${pick(['Production team', 'Quality Control team', 'Engineering team'])}.`
          },
          {
            who: pick(['Emma Wilson', 'Lisa Anderson', 'Chris Martinez']),
            text: `Reviewed and ${pick(['approved', 'approved with conditions', 'requested more information'])}. ${pick(['Low risk change', 'Standard production procedure', 'Requires additional testing', 'Needs rollback plan'])}. ${pick(['Implementation scheduled', 'Pending approval', 'Ready for implementation'])} for ${pick(['2:00 PM UTC', '6:00 PM UTC', '10:00 PM UTC', 'tomorrow morning'])}. See <a href="https://jira.mercedes-benz.com/browse/PROD-${Math.floor(Math.random() * 5000) + 1000}" target="_blank" rel="noopener noreferrer" style="color: #1D9BD1; text-decoration: underline;">Production ticket</a> for details.`
          },
          {
            who: pick(['Alex Thompson', 'Jordan Lee', 'Eve Park']),
            text: `Implementation scheduled for ${pick(['2:00 PM UTC', '6:00 PM UTC', '10:00 PM UTC'])}. ${pick(['Rollback plan documented', 'Production monitoring in place', 'Plant operations team notified', 'Stakeholders informed'])}. Change window: ${Math.floor(Math.random() * 60) + 30} minutes. <em>Important:</em> All team members should be available during this window.`
          },
          {
            who: pick(['Paul Bauer', 'Sarah Kim']),
            text: `Change #${changeId} completed successfully ✅ ${pick(['No production issues detected', 'All quality checks passing', 'Production metrics within normal ranges', 'Zero defects in post-change inspection'])}. Monitoring for next ${Math.floor(Math.random() * 4) + 2} hours.`
          }
        ]
        return pick(scenarios)
      },
      'dev-ops': () => {
        const plant = pick(['Sindelfingen', 'Tuscaloosa', 'Beijing', 'Pune', 'East London'])
        const scenarios = [
          {
            who: pick(['Lisa Anderson', 'Chris Martinez', 'Alex Thompson']),
            text: `New production process configured for ${pick(['EQS battery assembly', 'S-Class interior installation', 'C-Class paint application', 'GLE quality inspection', 'E-Class final assembly'])} at ${plant} plant. ${pick(['Quality tests passing', 'Efficiency benchmarks met', 'Safety protocols verified', 'Component integration validated'])}. Ready for ${pick(['production implementation', 'pilot testing', 'full rollout'])}.`
          },
          {
            who: pick(['Chris Martinez', 'Jordan Lee', 'Lisa Anderson']),
            text: `Production process optimization complete. Cycle time reduced by ${Math.floor(Math.random() * 30) + 15}% (from ${Math.floor(Math.random() * 20) + 10}min to ${Math.floor(Math.random() * 10) + 5}min). ${pick(['Parallel workstation operations enabled', 'Component flow optimized', 'Quality checkpoints streamlined', 'Automation enhanced'])}.`
          },
          {
            who: pick(['Alex Thompson', 'Paul Bauer']),
            text: `Production process update running for ${pick(['Line 1', 'Line 2', 'Line 3', 'Quality Station A', 'Assembly Station B'])}. ${pick(['Pilot testing successful', 'Quality checks passing', 'Gradual rollout in progress', 'Full implementation initiated'])}. ETA ${Math.floor(Math.random() * 60) + 30} minutes.`
          },
          {
            who: pick(['Lisa Anderson', 'Chris Martinez']),
            text: `Production update successful ✅ ${pick(['All production lines healthy', 'Zero quality issues', 'Rollback not required', 'Efficiency metrics stable'])}. Monitoring continues for next shift.`
          }
        ]
        return pick(scenarios)
      },
      'general': () => {
        // Use contextual announcements from channel-config.json if available
        const contextualTemplates = (channelConfig.messageThemes as Record<string, any>)?.['general']
        if (contextualTemplates && contextualTemplates.length > 0) {
          const announcement = pick(contextualTemplates) as { who?: string; text?: string } | null
          if (announcement && typeof announcement === 'object' && announcement.who && announcement.text) {
            return { who: announcement.who, text: announcement.text }
          }
        }
        // Fallback - contextual based on company description
        const descLower = (companyData.description || '').toLowerCase()
        const hasITSM = descLower.includes('incident') || descLower.includes('itom') || descLower.includes('itsm')
        if (hasITSM) {
          return { 
            who: pick(people.map(p => p.n).filter(n => {
              const person = peopleData.find((pp: Person) => pp.name === n)
              return n !== getCurrentUser && 
                     person?.role !== 'AI Assistant' && 
                     person?.role !== 'HR System'
            })), 
            text: pick([
              'Company-wide update: All systems operational. No active incidents reported',
              'Team announcement: Change management process updated. Review new procedures',
              'Operations update: Infrastructure monitoring shows stable performance across all regions',
              'Status update: Incident response team fully staffed. On-call rotation updated'
            ])
          }
        }
        return { 
          who: pick(people.map(p => p.n).filter(n => n !== getCurrentUser)), 
          text: 'Company-wide update: All systems operational' 
        }
      },
      'content-updates': () => {
        // Contextual messages for content/social media companies
        const companyDesc = companyData.description?.toLowerCase() || ''
        if (companyDesc.includes('social') || companyDesc.includes('content') || companyDesc.includes('media')) {
          return {
            who: pick(people.map(p => p.n).filter(n => {
              const person = peopleData.find((pp: Person) => pp.name === n)
              return n !== getCurrentUser && 
                     person?.role !== 'AI Assistant' && 
                     person?.role !== 'HR System'
            })),
            text: pick([
              `Video uploads are spiking - we're seeing ${Math.floor(Math.random() * 50) + 20}% more than usual. Might need to scale the processing pipeline`,
              `The new reel feature is getting crazy engagement - ${Math.floor(Math.random() * 40) + 25}% increase in views. Users are loving it`,
              `Photo filters are running slow again. Image processing queue is backed up - anyone else seeing this?`,
              `CDN is hitting limits with all the video traffic. We need to discuss scaling before the weekend rush`,
              `Content moderation queue is backed up - ${Math.floor(Math.random() * 100) + 50} items pending review`,
              `User engagement is way up - ${Math.floor(Math.random() * 30) + 15}% increase in likes and comments. The algorithm changes are working`,
              `The new messaging feature is causing some latency issues. Seeing higher response times in the chat service`,
              `Short-form content feed is performing really well - ${Math.floor(Math.random() * 35) + 20}% increase in time spent`,
              `Friend recommendation algorithm is ready for testing. Would love feedback from the team`,
              `Photo upload service is back to normal after scaling. Should handle the weekend traffic now`
            ])
          }
        }
        // Fallback - contextual based on company description
        const descLower = (companyData.description || '').toLowerCase()
        const hasITSM = descLower.includes('incident') || descLower.includes('itom') || descLower.includes('itsm')
        if (hasITSM) {
          return { 
            who: pick(people.map(p => p.n).filter(n => {
              const person = peopleData.find((pp: Person) => pp.name === n)
              return n !== getCurrentUser && 
                     person?.role !== 'AI Assistant' && 
                     person?.role !== 'HR System'
            })), 
            text: pick([
              'Monitoring shows all systems operational. No incidents reported',
              'Change request review completed. Ready for deployment',
              'Infrastructure metrics within normal ranges'
            ])
          }
        }
        return { 
          who: pick(people.map(p => p.n).filter(n => n !== getCurrentUser)), 
          text: 'Platform update: All systems running smoothly' 
        }
      },
      'engineering': () => {
        const prId = Math.floor(Math.random() * 2000) + 1000
        const scenarios = [
          {
            who: pick(['Bob Jenkins', 'Carol Diaz', 'David Chen']),
            text: `Code review needed for PR #${prId}: ${pick(['Add connection pool monitoring', 'Implement retry logic for payment API', 'Optimize database queries', 'Add circuit breaker pattern', 'Refactor error handling'])}. ${pick(['Ready for review', 'Needs discussion', 'Blocked on design decision'])}.`
          },
          {
            who: pick(['Carol Diaz', 'Sarah Kim', 'Mike Rodriguez']),
            text: `I'll take a look this ${pick(['afternoon', 'morning', 'evening'])}. ${pick(['Should be able to review by EOD', 'Will prioritize this', 'Might need until tomorrow', 'Can review in the next hour'])}.`
          },
          {
            who: pick(['Bob Jenkins', 'David Chen', 'Emma Wilson']),
            text: `PR #${prId} ${pick(['approved', 'approved with minor comments', 'needs changes'])}. ${pick(['Great work!', 'Nice implementation', 'A few suggestions in the comments', 'Please address the feedback'])}. ${pick(['Ready to merge', 'LGTM', 'Will merge after CI passes'])}.`
          },
          {
            who: pick(['Alex Thompson', 'Lisa Anderson']),
            text: `Standup notes: ${pick(['Working on payment API optimization', 'Investigating connection pool issues', 'Reviewing PRs', 'Deploying new features'])}. ${pick(['Blocked on', 'Unblocked', 'Need help with'])} ${pick(['database performance', 'API design', 'deployment process', 'testing strategy'])}.`
          }
        ]
        return pick(scenarios)
      },
      'backend': () => {
        const scenarios = [
          {
            who: pick(['David Chen', 'Sarah Kim', 'Bob Jenkins']),
            text: `Backend services health check: ${pick(['All systems operational', 'Minor degradation in payment service', 'All services healthy', 'One service showing elevated error rates'])}. ${pick(['Response times normal', 'No anomalies detected', 'Monitoring closely', 'Investigating'])}.`
          },
          {
            who: pick(['Sarah Kim', 'David Chen', 'Carol Diaz']),
            text: `Monitoring shows ${pick(['stable performance', 'improved response times', 'slight increase in latency', 'all metrics green'])}. ${pick(['P95 latency', 'Error rate', 'Throughput'])} at ${pick(['180ms', '0.02%', '12k req/s', 'normal levels'])}.`
          },
          {
            who: pick(['Bob Jenkins', 'Mike Rodriguez']),
            text: `Deployed ${pick(['new API version', 'performance improvements', 'bug fixes', 'feature updates'])} to ${pick(['staging', 'production', 'canary'])}. ${pick(['No issues so far', 'Monitoring metrics', 'All tests passing', 'Performance improved'])}.`
          }
        ]
        return pick(scenarios)
      },
      'frontend': () => {
        const scenarios = [
          {
            who: pick(['Mike Rodriguez', 'Emma Wilson', 'Alex Thompson']),
            text: `Frontend deployment completed successfully ✅ ${pick(['No issues reported', 'All tests passing', 'Performance metrics improved', 'Zero errors in production'])}. ${pick(['Monitoring user feedback', 'Tracking error rates', 'Watching performance metrics'])}.`
          },
          {
            who: pick(['Emma Wilson', 'Lisa Anderson', 'Chris Martinez']),
            text: `${pick(['New component library', 'Design system updates', 'Performance optimizations', 'Accessibility improvements'])} ${pick(['ready for review', 'deployed to staging', 'merged to main', 'in production'])}. ${pick(['Would love feedback', 'Check it out', 'Let me know thoughts'])}.`
          },
          {
            who: pick(['Alex Thompson', 'Mike Rodriguez']),
            text: `Frontend performance improvements: ${pick(['Bundle size reduced by 15%', 'Lighthouse score improved to 95', 'First contentful paint down to 1.2s', 'Time to interactive improved by 30%'])}. ${pick(['Great work team!', 'Nice optimization', 'Significant improvement'])}.`
          }
        ]
        return pick(scenarios)
      },
      'infrastructure': () => {
        const scenarios = [
          {
            who: pick(['Alex Thompson', 'Lisa Anderson', 'Carol Diaz']),
            text: `Infrastructure scaling completed for ${pick(['payment-api', 'user-service', 'analytics pipeline', 'CDN edge locations'])}. ${pick(['All nodes healthy', 'Monitoring continues', 'Performance improved', 'Zero downtime'])}. ${pick(['Added', 'Scaled'])} ${Math.floor(Math.random() * 5) + 2} ${pick(['instances', 'nodes', 'replicas'])}.`
          },
          {
            who: pick(['Lisa Anderson', 'Chris Martinez', 'Alex Thompson']),
            text: `Infrastructure health check: ${pick(['All systems operational', 'One region showing elevated latency', 'All regions healthy', 'Minor issues in us-west-2'])}. ${pick(['Monitoring continues', 'Investigating', 'No action needed', 'Will update'])}.`
          },
          {
            who: pick(['Carol Diaz', 'Mike Rodriguez']),
            text: `Kubernetes cluster ${pick(['scaling', 'upgrade', 'maintenance'])} ${pick(['completed', 'in progress', 'scheduled'])}. ${pick(['All pods running', 'Zero downtime achieved', 'Rolling update in progress', 'Health checks passing'])}.`
          }
        ]
        return pick(scenarios)
      },
      'security': () => {
        const scenarios = [
          {
            who: pick(['Chris Martinez', 'Jordan Lee', 'Eve Park']),
            text: `Security scan completed. ${pick(['No vulnerabilities found', '2 low-severity issues identified', 'All critical vulnerabilities patched', 'Security posture improved'])}. ${pick(['Report available', 'Action items documented', 'All clear', 'Monitoring'])}.`
          },
          {
            who: pick(['Jordan Lee', 'Chris Martinez']),
            text: `${pick(['Security audit', 'Penetration test', 'Vulnerability assessment'])} ${pick(['completed', 'in progress', 'scheduled'])}. ${pick(['No critical issues', 'Minor findings documented', 'All findings addressed', 'Report pending'])}.`
          },
          {
            who: pick(['Eve Park', 'James Bryant']),
            text: `Security update: ${pick(['MFA now mandatory', 'New security policies implemented', 'Access controls updated', 'Security training completed'])}. ${pick(['Effective immediately', 'Rolling out this week', 'Please review', 'Action required'])}.`
          }
        ]
        return pick(scenarios)
      },
      'sre': () => {
        const scenarios = [
          {
            who: pick(['Eve Park', 'James Bryant', 'Priya Shah']),
            text: `SRE team meeting scheduled for ${Math.floor(Math.random() * 4) + 2} PM. Agenda: ${pick(['Incident review and post-mortem', 'Reliability improvements', 'On-call rotation discussion', 'Monitoring improvements', 'Capacity planning'])}.`
          },
          {
            who: pick(['James Bryant', 'Eve Park', 'David Chen']),
            text: `Reliability metrics update: ${pick(['SLO compliance at 99.9%', 'MTTR improved to 15 minutes', 'Incident count down 30%', 'All services meeting targets'])}. ${pick(['Great work team', 'Keep it up', 'Excellent progress'])}.`
          },
          {
            who: pick(['Priya Shah', 'Sarah Kim']),
            text: `On-call rotation updated for ${pick(['next week', 'next month', 'Q2'])}. ${pick(['Schedule posted', 'Calendar invites sent', 'Please confirm availability'])}.`
          }
        ]
        return pick(scenarios)
      },
      'oncall': () => {
        const scenarios = [
          {
            who: pick(['Priya Shah', 'David Chen', 'Sarah Kim']),
            text: `On-call rotation updated for ${pick(['next week', 'next month'])}. ${pick(['Schedule posted in calendar', 'Please confirm availability', 'Handoff meeting scheduled'])}.`
          },
          {
            who: pick(['David Chen', 'Mike Rodriguez', 'Carol Diaz']),
            text: `On-call handoff: ${pick(['All quiet', 'One open incident', 'Monitoring ongoing issue', 'All clear'])}. ${pick(['No action needed', 'Please monitor', 'Will update', 'Status stable'])}.`
          }
        ]
        return pick(scenarios)
      },
      'deployments': () => {
        const scenarios = [
          {
            who: pick(['Sarah Kim', 'Mike Rodriguez', 'Emma Wilson']),
            text: `Deployment pipeline running for v${Math.floor(Math.random() * 3) + 2}.${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 10)}. ${pick(['Staging deployment successful', 'Production deployment in progress', 'Canary deployment active', 'Blue-green switch completed'])}.`
          },
          {
            who: pick(['Mike Rodriguez', 'Alex Thompson', 'Lisa Anderson']),
            text: `Deployment successful ✅ ${pick(['Monitoring for issues', 'All health checks passing', 'Zero errors detected', 'Performance stable'])}. ${pick(['Will continue monitoring', 'All clear', 'No rollback needed'])}.`
          },
          {
            who: pick(['Emma Wilson', 'Sarah Kim']),
            text: `Deployment ${pick(['scheduled', 'completed', 'in progress'])} for ${pick(['payment-api', 'user-service', 'frontend', 'backend services'])}. ${pick(['ETA 30 minutes', 'All systems go', 'Monitoring closely'])}.`
          }
        ]
        return pick(scenarios)
      },
      'monitoring': () => {
        const scenarios = [
          {
            who: pick(['Emma Wilson', 'Alex Thompson', 'David Chen']),
            text: `Monitoring dashboard updated with ${pick(['new metrics', 'improved alerting', 'better visualization', 'additional data sources'])}. ${pick(['Check it out', 'Feedback welcome', 'Let me know thoughts'])}.`
          },
          {
            who: pick(['Alex Thompson', 'Sarah Kim', 'Mike Rodriguez']),
            text: `Alert thresholds ${pick(['adjusted', 'updated', 'optimized'])} based on ${pick(['new baseline', 'historical data', 'traffic patterns', 'performance improvements'])}. ${pick(['Should reduce false positives', 'More accurate alerts', 'Better signal-to-noise ratio'])}.`
          },
          {
            who: pick(['David Chen', 'Emma Wilson']),
            text: `Monitoring shows ${pick(['all systems healthy', 'improved performance', 'stable metrics', 'no anomalies'])}. ${pick(['P95 latency', 'Error rates', 'Throughput'])} ${pick(['within normal ranges', 'improved', 'stable'])}.`
          }
        ]
        return pick(scenarios)
      },
      'ci-cd': () => {
        const scenarios = [
          {
            who: pick(['Lisa Anderson', 'Chris Martinez', 'Alex Thompson']),
            text: `CI/CD pipeline ${pick(['optimized', 'updated', 'improved'])}. ${pick(['Build times reduced by 20%', 'Test execution parallelized', 'Deployment automation enhanced', 'Pipeline reliability improved'])}. ${pick(['Great work', 'Nice improvement', 'Excellent'])}.`
          },
          {
            who: pick(['Chris Martinez', 'Jordan Lee']),
            text: `CI/CD ${pick(['tests passing', 'pipeline green', 'deployment successful'])} for ${pick(['PR #1234', 'main branch', 'release branch'])}. ${pick(['Ready to merge', 'All checks passed', 'Deployment approved'])}.`
          }
        ]
        return pick(scenarios)
      },
      'kubernetes': () => {
        const scenarios = [
          {
            who: pick(['Jordan Lee', 'Eve Park', 'Alex Thompson']),
            text: `K8s cluster health check: ${pick(['All pods running', 'One pod restarting', 'All nodes healthy', 'Cluster stable'])}. ${pick(['No issues detected', 'Monitoring continues', 'All systems operational'])}.`
          },
          {
            who: pick(['Eve Park', 'James Bryant', 'Carol Diaz']),
            text: `Kubernetes ${pick(['deployment', 'scaling', 'upgrade'])} ${pick(['completed', 'in progress', 'scheduled'])}. ${pick(['Rolling update successful', 'Zero downtime', 'Health checks passing', 'All replicas healthy'])}.`
          }
        ]
        return pick(scenarios)
      },
      'aws': () => {
        const scenarios = [
          {
            who: pick(['James Bryant', 'Priya Shah', 'Alex Thompson']),
            text: `AWS ${pick(['cost optimization', 'resource review', 'infrastructure audit'])} ${pick(['completed', 'in progress'])}. ${pick(['Estimated savings: $500/month', 'No changes needed', 'Recommendations documented', 'Optimization opportunities identified'])}.`
          },
          {
            who: pick(['Priya Shah', 'James Bryant']),
            text: `AWS ${pick(['service health', 'region status', 'account status'])}: ${pick(['All services operational', 'One region showing issues', 'All regions healthy'])}. ${pick(['Monitoring', 'No action needed', 'Will update'])}.`
          }
        ]
        return pick(scenarios)
      },
      'database': () => {
        const scenarios = [
          {
            who: pick(['David Chen', 'Sarah Kim', 'Bob Jenkins']),
            text: `Database ${pick(['backup', 'maintenance', 'optimization'])} ${pick(['completed successfully', 'in progress', 'scheduled'])}. ${pick(['Backup verified', 'Performance improved', 'No issues', 'All checks passed'])}.`
          },
          {
            who: pick(['Sarah Kim', 'David Chen', 'Carol Diaz']),
            text: `Database ${pick(['performance', 'health', 'metrics'])}: ${pick(['Stable', 'Improved', 'Within normal ranges'])}. ${pick(['Query times normal', 'Connection pool healthy', 'No slow queries', 'All metrics green'])}.`
          }
        ]
        return pick(scenarios)
      },
      'api': () => {
        const scenarios = [
          {
            who: pick(['Mike Rodriguez', 'Emma Wilson', 'David Chen']),
            text: `API ${pick(['documentation', 'version', 'endpoint'])} ${pick(['updated', 'released', 'deprecated'])} for v${Math.floor(Math.random() * 3) + 2}.${Math.floor(Math.random() * 5)}. ${pick(['Check docs', 'Breaking changes documented', 'Migration guide available'])}.`
          },
          {
            who: pick(['Emma Wilson', 'Mike Rodriguez']),
            text: `API ${pick(['performance', 'usage', 'metrics'])}: ${pick(['Stable', 'Improved', 'Within limits'])}. ${pick(['Response times good', 'Rate limits appropriate', 'No issues', 'All endpoints healthy'])}.`
          }
        ]
        return pick(scenarios)
      },
      'mobile': () => {
        const scenarios = [
          {
            who: pick(['Alex Thompson', 'Lisa Anderson', 'Emma Wilson']),
            text: `Mobile app ${pick(['release', 'update', 'build'])} v${Math.floor(Math.random() * 2) + 1}.${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 10)} ${pick(['submitted to stores', 'in review', 'approved', 'released'])}. ${pick(['App Store review in progress', 'Google Play approved', 'Both stores approved', 'Release scheduled'])}.`
          },
          {
            who: pick(['Lisa Anderson', 'Alex Thompson']),
            text: `Mobile app ${pick(['performance', 'metrics', 'feedback'])}: ${pick(['Crash rate down 40%', 'User ratings improved', 'Performance metrics stable', 'No critical issues'])}. ${pick(['Great work', 'Nice improvement', 'Keep it up'])}.`
          }
        ]
        return pick(scenarios)
      },
      'qa': () => {
        const scenarios = [
          {
            who: pick(['Chris Martinez', 'Jordan Lee', 'Emma Wilson']),
            text: `QA test suite ${pick(['passed', 'completed', 'in progress'])} for ${pick(['payment-api changes', 'user-service updates', 'frontend features', 'backend improvements'])}. ${pick(['Ready for production deployment', 'All tests green', 'No blockers', 'Minor issues documented'])}.`
          },
          {
            who: pick(['Jordan Lee', 'Chris Martinez']),
            text: `QA ${pick(['test coverage', 'automation', 'process'])} ${pick(['improved', 'updated', 'enhanced'])}. ${pick(['Coverage increased to 85%', 'New test cases added', 'Automation expanded', 'Process streamlined'])}.`
          }
        ]
        return pick(scenarios)
      },
      'design': () => {
        const scenarios = [
          {
            who: pick(['Eve Park', 'James Bryant', 'Lisa Anderson']),
            text: `New ${pick(['design system components', 'UI patterns', 'design tokens', 'component library updates'])} ${pick(['ready for review', 'deployed', 'available'])}. ${pick(['Check Figma', 'Feedback welcome', 'Let me know thoughts', 'Ready to implement'])}.`
          },
          {
            who: pick(['James Bryant', 'Eve Park']),
            text: `Design ${pick(['system', 'components', 'patterns'])} ${pick(['updated', 'improved', 'expanded'])}. ${pick(['New components added', 'Accessibility improved', 'Consistency enhanced', 'Documentation updated'])}.`
          }
        ]
        return pick(scenarios)
      },
      'product': () => {
        const scenarios = [
          {
            who: pick(['Priya Shah', 'David Chen', 'Emma Wilson']),
            text: `Product roadmap ${pick(['updated', 'reviewed', 'shared'])} for ${pick(['Q2', 'next quarter', 'H2'])}. ${pick(['Key initiatives documented', 'Priorities set', 'Timeline shared', 'Feedback welcome'])}.`
          },
          {
            who: pick(['David Chen', 'Priya Shah']),
            text: `Product ${pick(['metrics', 'analytics', 'feedback'])}: ${pick(['User engagement up 25%', 'Feature adoption strong', 'NPS score improved', 'Usage metrics positive'])}. ${pick(['Great progress', 'Nice work', 'Keep it up'])}.`
          }
        ]
        return pick(scenarios)
      },
      'sales': () => {
        const scenarios = [
          {
            who: pick(['Sarah Kim', 'Mike Rodriguez', 'Emma Wilson']),
            text: `Sales metrics ${pick(['looking strong', 'improved', 'on track'])} this ${pick(['quarter', 'month', 'week'])}. ${pick(['Revenue up', 'Deals closed', 'Pipeline healthy', 'Targets met'])}. ${pick(['Great work team', 'Keep it up', 'Excellent progress'])}.`
          }
        ]
        return pick(scenarios)
      },
      'support': () => {
        const scenarios = [
          {
            who: pick(['Emma Wilson', 'Alex Thompson', 'Sarah Kim']),
            text: `Support ticket volume ${pick(['decreased', 'increased', 'stable'])} ${Math.floor(Math.random() * 20) + 10}% this ${pick(['week', 'month'])}. ${pick(['That\'s excellent progress', 'Investigating increase', 'Monitoring trends', 'All good'])}.`
          },
          {
            who: pick(['Alex Thompson', 'Emma Wilson']),
            text: `Support ${pick(['team', 'metrics', 'process'])} ${pick(['improved', 'updated', 'optimized'])}. ${pick(['Response time down', 'Satisfaction up', 'Process streamlined', 'Efficiency improved'])}.`
          }
        ]
        return pick(scenarios)
      },
      'marketing': () => {
        const scenarios = [
          {
            who: pick(['Lisa Anderson', 'Chris Martinez', 'Emma Wilson']),
            text: `Marketing campaign ${pick(['launched', 'completed', 'in progress'])} ${pick(['successfully', 'on schedule'])}. ${pick(['Early metrics look promising', 'Strong engagement', 'Good initial response', 'Monitoring results'])}.`
          },
          {
            who: pick(['Chris Martinez', 'Lisa Anderson']),
            text: `Marketing ${pick(['analytics', 'metrics', 'campaign'])}: ${pick(['Traffic up 30%', 'Conversion improved', 'Engagement strong', 'ROI positive'])}. ${pick(['Great work', 'Nice results', 'Keep it up'])}.`
          }
        ]
        return pick(scenarios)
      }
    }
    
    const generator = channelMessageGenerators[chatId]
    if (generator) {
      return generator()
    }
    
    // Default fallback - contextual based on company description
    const descLower = (companyData.description || '').toLowerCase()
    const hasITSM = descLower.includes('incident') || descLower.includes('itom') || descLower.includes('itsm')
    const availablePeople = people.map(p => p.n).filter(n => n !== getCurrentUser)
    
    if (hasITSM) {
      return {
        who: pick(availablePeople),
        text: pick([
          `Monitoring shows all systems operational for ${chatName}`,
          `Change request review completed for ${chatName}`,
          `Infrastructure metrics within normal ranges for ${chatName}`,
          `System health check completed. All services operational`
        ])
      }
    }
    
    return {
      who: pick(availablePeople),
      text: `Status update: ${chatName} is running smoothly`
    }
  }

  // Generate contextual messages for each chat
  const generateContextualMessages = (chatId: string, chat: ChatItem): SlackMsg[] => {
    const allChats = [...starredChats, ...dmChats, ...channelChats]
    const chatData = allChats.find(c => c.id === chatId) || chat
    const chatName = chatData.name.replace('#', '')
    const isChannel = chatData.type === 'channel' || chatData.type === 'starred'
    const isDM = chatData.type === 'dm'
    const isGroupDM = chatData.id?.startsWith('group-')
    
    const messages: SlackMsg[] = []
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
    
    // Track how many embeds we've added to this chat (target: 2-3 for healthy distribution)
    let embedCount = 0
    const targetEmbedCount = Math.floor(Math.random() * 2) + 2 // 2-3 embeds per chat
    // Track which embed types we've used to ensure equal distribution
    const usedEmbedTypes: ('notion' | 'figma' | 'loom' | 'jira' | 'confluence')[] = []
    
    // Helper to check if a date is a weekend
    const isWeekend = (date: Date): boolean => {
      const day = date.getDay()
      return day === 0 || day === 6 // Sunday or Saturday
    }
    
    // Helper to get next weekday (skip weekends)
    const getNextWeekday = (date: Date): Date => {
      const next = new Date(date)
      next.setDate(next.getDate() + 1)
      while (isWeekend(next)) {
        next.setDate(next.getDate() + 1)
      }
      return next
    }
    
    // Generate messages over multiple weeks (2-4 weeks ago)
    const weeksAgo = Math.floor(Math.random() * 3) + 2 // 2-4 weeks
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (weeksAgo * 7))
    
    // Ensure we start on a weekday
    while (isWeekend(startDate)) {
      startDate.setDate(startDate.getDate() + 1)
    }
    
    let currentDate = new Date(startDate)
    const endDate = new Date()
    endDate.setHours(17, 0, 0, 0) // End of today
    
    // Base message templates for different chat types
    const getMessageTemplates = (): (string | MessageAction[])[][] => {
      if (isChannel) {
        // Channel-specific messages
        const channelMessages: Record<string, (string | MessageAction[])[][]> = {
        'itom-4412': [
          ['Merc AI', 'Production alert #4412 detected: Assembly line 2 stoppage at Sindelfingen plant. Line efficiency dropped from 92% to 45%. Affecting E-Class production.'],
          ['Hannah Wolf', 'Checking production monitoring systems. Seeing robotic arm malfunction - current line status: stopped.'],
          ['Felix Schäfer', 'I can see the welding station is showing equipment error codes. Cycle time increased by 20 seconds. Should we switch to backup equipment?'],
          ['Merc AI', 'Auto-correlation suggests component supply chain delay. Recommending: activate backup production line. Estimated resolution time: 45 minutes.'],
          ['Mia Zimmermann', 'On it. Coordinating with maintenance team now. ETA 20 minutes.'],
        ],
        'incidents': [
          ['Eve Park', 'New production incident opened: #4412 - Assembly line stoppage'],
          ['James Bryant', 'Assigning to production operations team.'],
          ['Merc AI', 'Initial assessment: Component supply chain interruption. Mitigation in progress.'],
        ],
        'alerts': [
          ['Merc AI', 'Alert: Production line 1 efficiency dropped below threshold (78% < 85%)'],
          ['Alexander Schneider', 'Acknowledged. Investigating root cause.'],
          ['Sarah Kim', 'Found component supply shortage. Coordinating with suppliers.'],
        ],
        'chg-review': [
          ['Paul Bauer', 'Production change request: Modify assembly line configuration for EQS'],
          ['Emma Wilson', 'Reviewed and approved. Low risk change.'],
          ['Alex Thompson', 'Implementation scheduled for 2:00 PM UTC.'],
        ],
        'CHG-189': [
          ['Sarah Kim', 'This production change looks risky - we\'re modifying the EQS battery assembly process. Need to be extra careful here.'],
          ['Paul Bauer', 'I agree. The change touches critical production paths. We should have a comprehensive rollback plan.'],
          ['Emma Wilson', 'I\'ve reviewed the production process changes. The risk is medium-high. We need to ensure all quality checkpoints are covered.'],
          ['Alex Thompson', 'The quality testing coverage looks good, but I\'m concerned about the impact on current production runs.'],
          ['Lisa Anderson', 'We should consider a gradual rollout - maybe one production line first, then 50%, then full implementation.'],
          ['Chris Martinez', 'Good point. Also need to make sure our production monitoring is in place before we implement.'],
          ['Jordan Lee', 'I\'ve added additional quality checkpoints around the assembly process. That should help us catch any issues early.'],
          ['Eve Park', 'Quality control team has reviewed and approved, but with conditions - we need to monitor for 48 hours post-implementation.'],
        ],
        'dev-ops': [
          ['Lisa Anderson', 'New deployment pipeline configured for payment-api'],
          ['Chris Martinez', 'CI/CD tests passing. Ready for production.'],
        ],
        'general': [
          ['Emma Wilson', `<strong>📢 Company-Wide Announcement: Q2 Strategic Initiatives</strong><br><br>
We're excited to share our strategic roadmap for Q2! This quarter, we're focusing on three key pillars:<br><br>
<strong>1. Platform Scalability</strong><br>
• Infrastructure expansion across all regions<br>
• Enhanced monitoring and observability capabilities<br>
• Performance optimization initiatives<br><br>
<strong>2. Product Innovation</strong><br>
• Launch of our new AI-powered analytics suite<br>
• Enhanced user experience improvements<br>
• Mobile app v2.0 release<br><br>
<strong>3. Team Growth</strong><br>
• Expanding our engineering teams by 30%<br>
• New office openings in Sydney and Bangalore<br>
• Enhanced learning and development programs<br><br>
We'll be hosting an all-hands meeting next Friday at 2 PM to dive deeper into these initiatives. Looking forward to your questions and feedback!`],
          ['James Bryant', `<strong>🚀 Major Infrastructure Upgrade Complete</strong><br><br>
I'm thrilled to announce that we've successfully completed our largest infrastructure upgrade to date! Here's what changed:<br><br>
<strong>Performance Improvements:</strong><br>
• API response times reduced by 45%<br>
• Database query performance improved by 60%<br>
• CDN optimization resulting in 30% faster page loads<br>
• 99.99% uptime achieved across all regions<br><br>
<strong>New Capabilities:</strong><br>
• Multi-region failover now active<br>
• Real-time analytics dashboard launched<br>
• Enhanced security protocols implemented<br>
• Automated scaling for peak traffic periods<br><br>
This upgrade positions us perfectly for the growth we're expecting in Q2. Huge thanks to the infrastructure team for their incredible work!`],
          ['Ananya Reddy', `<strong>🎉 Welcome to Our New Team Members!</strong><br><br>
We're excited to welcome 15 new team members who joined us this month across various departments:<br><br>
<strong>Engineering:</strong><br>
• 5 Backend Engineers<br>
• 3 Frontend Engineers<br>
• 2 DevOps Specialists<br>
• 1 Security Engineer<br><br>
<strong>Product & Design:</strong><br>
• 2 Product Managers<br>
• 1 UX Designer<br>
• 1 UI Designer<br><br>
<strong>Operations:</strong><br>
• 2 SRE Engineers<br>
• 1 Data Engineer<br><br>
Please make them feel welcome! They'll be introducing themselves in their respective team channels. We're also hosting a welcome lunch next Wednesday - details to follow!`],
          ['Charlotte Brown', `<strong>📅 Upcoming Company Events & Important Dates</strong><br><br>
Mark your calendars for these important dates:<br><br>
<strong>March:</strong><br>
• March 15: Q2 Planning All-Hands (2 PM - 4 PM)<br>
• March 22: Engineering Hackathon<br>
• March 28: Monthly Town Hall<br><br>
<strong>April:</strong><br>
• April 5: New Office Opening - Sydney<br>
• April 12: Product Launch Event<br>
• April 19: Team Building Day<br>
• April 26: Q1 Retrospective Meeting<br><br>
<strong>May:</strong><br>
• May 3: Company-Wide Training Day<br>
• May 10: Customer Success Summit<br>
• May 17: Engineering Conference Attendance<br>
• May 24: Memorial Day (US Office Closed)<br><br>
All events will be hybrid - join in person or remotely. Calendar invites will be sent out separately.`],
          ['Vikram Singh', `<strong>💡 Innovation Spotlight: New AI Features Launch</strong><br><br>
We're launching groundbreaking AI-powered features that will transform how our customers interact with our platform:<br><br>
<strong>AI Assistant:</strong><br>
• Natural language query interface<br>
• Intelligent recommendations based on usage patterns<br>
• Proactive issue detection and resolution<br>
• Multi-language support (15 languages at launch)<br><br>
<strong>Predictive Analytics:</strong><br>
• Forecast future trends with 95% accuracy<br>
• Anomaly detection in real-time<br>
• Automated report generation<br>
• Customizable ML models<br><br>
<strong>Smart Automation:</strong><br>
• Auto-scaling based on predictive models<br>
• Intelligent resource allocation<br>
• Automated workflow optimization<br>
• Self-healing infrastructure components<br><br>
These features represent over 6 months of R&D work from our AI/ML team. Early beta testers have seen 40% improvement in operational efficiency. Full rollout begins next week!`],
          ['Lisa Anderson', `<strong>🏆 Q1 Results & Recognition</strong><br><br>
What an incredible Q1! Here are some highlights:<br><br>
<strong>Business Metrics:</strong><br>
• Revenue growth: 125% YoY<br>
• Customer acquisition: 250 new enterprise clients<br>
• Customer retention: 98.5%<br>
• NPS score: 72 (up from 58)<br><br>
<strong>Team Achievements:</strong><br>
• Zero critical incidents this quarter<br>
• 99.99% uptime maintained<br>
• 15 major features shipped<br>
• 3 patents filed<br><br>
<strong>Individual Recognition:</strong><br>
• Employee of the Quarter: Sarah Kim (Engineering)<br>
• Innovation Award: David Chen (Product)<br>
• Customer Impact Award: Mike Rodriguez (Support)<br>
• Team Player Award: Carol Diaz (DevOps)<br><br>
Congratulations to everyone for an outstanding quarter! Your hard work and dedication are what make these achievements possible.`],
          ['Michael Chen', `<strong>🌍 Global Expansion Update: New Regions & Data Centers</strong><br><br>
I'm excited to share major updates on our global infrastructure expansion:<br><br>
<strong>New Data Center Locations:</strong><br>
• Singapore: Fully operational as of last week, serving APAC region with <50ms latency<br>
• Frankfurt: European expansion complete, GDPR-compliant infrastructure<br>
• São Paulo: Latin America region now live, supporting Portuguese and Spanish markets<br>
• Mumbai: India data center launching next month, expected to serve 50M+ users<br><br>
<strong>Performance Improvements:</strong><br>
• Global CDN now covers 95% of world population<br>
• Average latency reduced by 60% in new regions<br>
• Disaster recovery capabilities enhanced with multi-region replication<br>
• Compliance certifications achieved: SOC 2, ISO 27001, GDPR, HIPAA<br><br>
<strong>What This Means:</strong><br>
• Faster response times for international customers<br>
• Enhanced data sovereignty and compliance<br>
• Improved resilience and disaster recovery<br>
• Better support for global enterprise clients<br><br>
This expansion represents a $50M investment in our infrastructure and positions us as a truly global platform. Thank you to the infrastructure and operations teams for making this happen!`],
          ['Rachel Thompson', `<strong>📊 Annual Company Survey Results & Action Plan</strong><br><br>
Thank you to all 742 team members who participated in our annual company survey! Here's what we learned and what we're doing about it:<br><br>
<strong>Key Findings:</strong><br>
• 94% of employees feel proud to work here (up from 87% last year)<br>
• 91% believe in our company mission and values<br>
• 88% feel their work has meaningful impact<br>
• 85% are satisfied with work-life balance<br>
• 82% feel they have opportunities for growth<br><br>
<strong>Areas for Improvement:</strong><br>
• Communication across departments (we're implementing monthly cross-functional meetings)<br>
• Career development paths (new mentorship program launching next month)<br>
• Remote work tools and processes (enhanced collaboration tools being rolled out)<br>
• Recognition and rewards (expanding our recognition program)<br><br>
<strong>Action Items (Next 90 Days):</strong><br>
• Launch company-wide mentorship program<br>
• Implement new internal communication platform<br>
• Roll out enhanced performance review process<br>
• Increase budget for professional development by 40%<br>
• Establish employee resource groups (ERGs) for diversity and inclusion<br><br>
Your feedback drives our decisions. Keep it coming!`],
          ['Robert Martinez', `<strong>🔒 Security & Compliance: Major Milestones Achieved</strong><br><br>
Our security and compliance teams have been working tirelessly, and I'm thrilled to share some major achievements:<br><br>
<strong>New Certifications:</strong><br>
• SOC 2 Type II: Completed comprehensive audit, full certification achieved<br>
• ISO 27001: Information security management system certified<br>
• GDPR: Full compliance verified across all EU operations<br>
• HIPAA: Healthcare data handling certified for enterprise clients<br>
• PCI DSS Level 1: Payment card industry compliance maintained<br><br>
<strong>Security Enhancements:</strong><br>
• Multi-factor authentication (MFA) now mandatory for all employees<br>
• Zero-trust architecture implemented across all systems<br>
• Advanced threat detection using AI/ML algorithms<br>
• 24/7 security operations center (SOC) monitoring<br>
• Quarterly penetration testing and vulnerability assessments<br>
• Employee security training program with 98% completion rate<br><br>
<strong>Incident Response:</strong><br>
• Mean time to detect (MTTD): Reduced to 2 minutes<br>
• Mean time to respond (MTTR): Reduced to 15 minutes<br>
• Zero data breaches in the past 18 months<br>
• 100% of security incidents resolved within SLA<br><br>
Security is everyone's responsibility. Thank you for your vigilance and commitment to keeping our platform and data secure!`],
          ['Jennifer Park', `<strong>💼 Executive Leadership Update: New Hires & Organizational Changes</strong><br><br>
I'm pleased to announce several exciting leadership additions and organizational updates:<br><br>
<strong>New Executive Hires:</strong><br>
• Chief Revenue Officer: Amanda Foster (formerly VP Sales at TechCorp, 15 years experience)<br>
• VP of Engineering: Dr. Rajesh Kumar (ex-Google, led teams of 200+ engineers)<br>
• Chief Marketing Officer: Marcus Johnson (previously CMO at GrowthCo, 3x revenue growth)<br>
• VP of People Operations: Lisa Wang (built world-class HR at ScaleUp Inc.)<br><br>
<strong>Organizational Structure Updates:</strong><br>
• Engineering reorganized into 4 focused divisions: Platform, Product Engineering, Infrastructure, and Security<br>
• New Customer Success organization established, reporting directly to CEO<br>
• Sales organization restructured into 3 regions: Americas, EMEA, and APAC<br>
• Product organization expanded with dedicated teams for Enterprise, SMB, and Developer products<br><br>
<strong>Reporting Structure:</strong><br>
• All engineering VPs now report to Dr. Kumar<br>
• Regional sales VPs report to Amanda Foster<br>
• Product teams aligned with customer segments<br>
• Support and success teams unified under Customer Success<br><br>
These changes position us for our next phase of growth. Please join me in welcoming our new leaders!`],
          ['David Kim', `<strong>🎓 Learning & Development: New Programs & Opportunities</strong><br><br>
We're significantly expanding our learning and development programs based on your feedback:<br><br>
<strong>New Programs:</strong><br>
• Technical Leadership Academy: 6-month program for senior engineers transitioning to leadership<br>
• Product Management Certification: Partnership with Stanford Continuing Studies<br>
• Data Science Bootcamp: In-house program with industry experts<br>
• Cloud Architecture Mastery: AWS, GCP, and Azure certification tracks<br>
• Executive Coaching: Available for all managers and above<br><br>
<strong>Learning Budget:</strong><br>
• Increased from $2,000 to $5,000 per employee per year<br>
• Conference attendance fully funded (up to 2 per year)<br>
• Book budget: $500/year for professional development books<br>
• Online course subscriptions: Udemy Business, Pluralsight, Coursera Plus<br>
• Internal training sessions: Weekly tech talks, monthly workshops<br><br>
<strong>Mentorship Program:</strong><br>
• Launching company-wide mentorship matching<br>
• Cross-functional mentorship encouraged<br>
• Executive mentorship for high-potential employees<br>
• Reverse mentorship program (junior employees mentoring executives on new trends)<br><br>
<strong>Career Development:</strong><br>
• New career pathing framework with clear progression tracks<br>
• Individual development plans (IDPs) for all employees<br>
• Quarterly career conversations with managers<br>
• Internal mobility program: 30% of open roles filled internally<br><br>
Investing in your growth is investing in our future. Take advantage of these opportunities!`],
          ['Sarah Williams', `<strong>🌱 Sustainability & Social Impact: Our Commitment</strong><br><br>
As we grow, we're committed to being a force for good. Here's what we're doing:<br><br>
<strong>Environmental Initiatives:</strong><br>
• Carbon neutral operations achieved this quarter<br>
• 100% renewable energy for all data centers<br>
• Zero-waste office initiatives in all locations<br>
• Sustainable procurement policies implemented<br>
• Employee carbon offset program for business travel<br><br>
<strong>Social Impact:</strong><br>
• $2M annual commitment to education nonprofits<br>
• Tech apprenticeship program: 20 underprivileged students per year<br>
• Volunteer time off: 40 hours per employee per year<br>
• Matching employee donations up to $1,000/year<br>
• Pro bono services for 10 nonprofits annually<br><br>
<strong>Diversity & Inclusion:</strong><br>
• 45% women in leadership (target: 50% by end of year)<br>
• 30% underrepresented minorities in tech roles<br>
• 5 employee resource groups (ERGs) established<br>
• Unconscious bias training for all employees<br>
• Diverse hiring panels for all open positions<br><br>
<strong>Community Engagement:</strong><br>
• Sponsoring 5 local tech meetups per month<br>
• Hosting free workshops for local developers<br>
• Open source contributions: 50+ projects<br>
• Scholarship program: $100K annually for STEM students<br><br>
Together, we're building not just a great company, but a better world. Thank you for being part of this journey!`],
        ],
        'engineering': [
          ['Bob Jenkins', 'Code review needed for PR #1234'],
          ['Carol Diaz', 'I\'ll take a look this afternoon.'],
        ],
        'backend': [
          ['David Chen', 'Backend services health check: All systems operational'],
          ['Sarah Kim', 'Monitoring shows stable performance.'],
        ],
        'frontend': [
          ['Mike Rodriguez', 'Frontend deployment completed successfully'],
          ['Emma Wilson', 'No issues reported.'],
        ],
        'infrastructure': [
          ['Alex Thompson', 'Infrastructure scaling completed for payment-api'],
          ['Lisa Anderson', 'All nodes healthy. Monitoring continues.'],
        ],
        'security': [
          ['Chris Martinez', 'Security scan completed. No vulnerabilities found.'],
          ['Jordan Lee', 'Great! Thanks for the update.'],
        ],
        'sre': [
          ['Eve Park', 'SRE team meeting scheduled for 3 PM'],
          ['James Bryant', 'Agenda: Incident review and post-mortem.'],
        ],
        'oncall': [
          ['Priya Shah', 'On-call rotation updated for next week'],
          ['David Chen', 'Thanks for organizing!'],
        ],
        'deployments': [
          ['Sarah Kim', 'Deployment pipeline running for v2.3.1'],
          ['Mike Rodriguez', 'Deployment successful. Monitoring for issues.'],
        ],
        'monitoring': [
          ['Emma Wilson', 'Monitoring dashboard updated with new metrics'],
          ['Alex Thompson', 'Alert thresholds adjusted based on baseline.'],
        ],
        'ci-cd': [
          ['Lisa Anderson', 'CI/CD pipeline optimized. Build times reduced by 20%'],
          ['Chris Martinez', 'Excellent work!'],
        ],
        'kubernetes': [
          ['Jordan Lee', 'K8s cluster health check: All pods running'],
          ['Eve Park', 'No issues detected.'],
        ],
        'aws': [
          ['James Bryant', 'AWS cost optimization review completed'],
          ['Priya Shah', 'Estimated savings: $500/month.'],
        ],
        'database': [
          ['David Chen', 'Database backup completed successfully'],
          ['Sarah Kim', 'Backup verified. Retention policy updated.'],
        ],
        'api': [
          ['Mike Rodriguez', 'API documentation updated for v2.3'],
          ['Emma Wilson', 'Thanks for keeping it current!'],
        ],
        'mobile': [
          ['Alex Thompson', 'Mobile app release v1.2.0 submitted to stores'],
          ['Lisa Anderson', 'App Store review in progress.'],
        ],
        'qa': [
          ['Chris Martinez', 'QA test suite passed for payment-api changes'],
          ['Jordan Lee', 'Ready for production deployment.'],
        ],
        'design': [
          ['Eve Park', 'New design system components ready for review'],
          ['James Bryant', 'Looking forward to seeing them!'],
        ],
        'product': [
          ['Priya Shah', 'Product roadmap updated for Q2'],
          ['David Chen', 'Thanks for sharing!'],
        ],
        'sales': [
          ['Sarah Kim', 'Sales metrics looking strong this quarter'],
          ['Mike Rodriguez', 'Great to hear!'],
        ],
        'support': [
          ['Emma Wilson', 'Support ticket volume decreased 15% this week'],
          ['Alex Thompson', 'That\'s excellent progress!'],
        ],
        'marketing': [
          ['Lisa Anderson', 'Marketing campaign launched successfully'],
          ['Chris Martinez', 'Early metrics look promising.'],
        ],
      }
      
        // Fallback templates - contextual based on company description
        const descLower = (companyData.description || '').toLowerCase()
        const hasITSM = descLower.includes('incident') || descLower.includes('itom') || descLower.includes('itsm')
        
        if (hasITSM) {
          return channelMessages[chatId] || channelMessages['general'] || [
            ['Alice Carlysle', `Monitoring shows all systems operational for ${chatName}`],
            ['Bob Jenkins', `Change request review completed for ${chatName}`],
            ['Carol Diaz', `Infrastructure metrics within normal ranges for ${chatName}`],
            ['David Chen', `System health check completed. All services operational`],
            ['Sarah Kim', `Incident response team on standby. No active incidents`],
          ]
        }
        
        return channelMessages[chatId] || channelMessages['general'] || [
          ['Alice Carlysle', `Status update: ${chatName} is running smoothly`],
          ['Bob Jenkins', `Reviewing ${chatName} performance metrics`],
          ['Carol Diaz', `Update on ${chatName} operations`],
          ['David Chen', `System check completed for ${chatName}`],
          ['Sarah Kim', `Reviewing ${chatName} metrics`],
        ]
      } else if (isGroupDM) {
        const groupMembers = chatData.name.split(', ').map(name => name.trim()).filter(name => name !== getCurrentUser)
        return [
          [pick(groupMembers), 'Hey team!'],
          [pick(groupMembers), 'What do you think?'],
          [pick(groupMembers), 'Sounds good to me.'],
          [pick(groupMembers), 'Let\'s sync up.'],
          [pick(groupMembers), 'Thanks everyone!'],
        ]
      } else {
        // Individual DM
        const personName = getPersonNameFromChatId(chatId)
        const aiAssistant = peopleData.find((p: Person) => p.role === 'AI Assistant')
        const aiAssistantName = aiAssistant?.name || 'Merc AI'
        const aiAssistantId = aiAssistantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        
        // Check if this is AI assistant conversation
        if (personName === aiAssistantName || chatId === aiAssistantId || chatId === 'merc-ai' || chatId === 'bottleneckbot' || chatId === 'astra') {
          // Use contextual AI assistant messages - these will be generated properly in generateContextualMessages
          return []
        } else if (personName === 'Workday' || chatId === 'workday') {
          // Workday HR app integration - task notifications with manager responses
          // Shows HR asks sent to manager with their responses/actions
          // Last message is Workday acknowledging user's response
          return [
            ['Workday', '📋 <strong>Leave Request Pending Approval</strong><br><br>Employee: <span style="color: #1D9BD1 !important; font-weight: 600;">Hannah Wolf</span><br>Type: Vacation Leave<br>Start Date: December 20, 2024<br>End Date: December 27, 2024<br>Duration: 5 business days<br><br>Reason: Family holiday vacation.<br><br>This request requires your approval as her manager.'],
            [currentUserName, 'Approved.'],
            ['Workday', 'Leave request approved. Hannah Wolf and the HR team have been notified.'],
            ['Workday', '📋 <strong>Performance Review Due</strong><br><br>Employee: <span style="color: #1D9BD1 !important; font-weight: 600;">Felix Schäfer</span><br>Review Period: Q4 2024<br>Due Date: December 15, 2024<br>Status: Pending manager review.<br><br>Please complete the performance review by the due date.'],
            [currentUserName, 'Will complete by end of week.'],
            ['Workday', 'Performance review deadline acknowledged. Reminder will be sent on December 13, 2024.'],
            ['Workday', '💰 <strong>Expense Report Approval Required</strong><br><br>Employee: <span style="color: #1D9BD1 !important; font-weight: 600;">Mia Zimmermann</span><br>Report ID: EXP-2024-1247<br>Total Amount: €2,450.00<br>Submitted: December 10, 2024<br>Categories:<br>• Business Travel: €1,200.00<br>• Meals & Entertainment: €850.00<br>• Accommodation: €400.00<br><br>This expense report requires your approval before reimbursement processing.'],
            [currentUserName, 'Approved.'],
            ['Workday', 'Expense report approved. Finance team has been notified. Reimbursement will be processed within 3-5 business days.'],
            ['Workday', '📋 <strong>Leave Request Pending Approval</strong><br><br>Employee: <span style="color: #1D9BD1 !important; font-weight: 600;">Mia Zimmermann</span><br>Type: Sick Leave<br>Start Date: November 28, 2024<br>End Date: December 2, 2024<br>Duration: 3 business days<br><br>Reason: Medical appointment and recovery.<br><br>This request requires your approval as her manager.'],
            [currentUserName, 'Approved.'],
            ['Workday', 'Leave request approved. Mia Zimmermann and the HR team have been notified.'],
            ['Workday', '⏰ <strong>Time Entry Approval Required</strong><br><br>Employee: <span style="color: #1D9BD1 !important; font-weight: 600;">Alexander Schneider</span><br>Week Ending: December 8, 2024<br>Total Hours: 42.5<br>Overtime Hours: 2.5<br><br>Time entry requires your approval.'],
            [currentUserName, 'Approved.'],
            ['Workday', 'Time entry approved. Payroll has been notified.'],
            ['Workday', '💰 <strong>Expense Report Approval Required</strong><br><br>Employee: <span style="color: #1D9BD1 !important; font-weight: 600;">Felix Schäfer</span><br>Report ID: EXP-2024-1189<br>Total Amount: €1,850.00<br>Submitted: November 15, 2024<br>Categories:<br>• Business Travel: €1,200.00<br>• Meals: €450.00<br>• Accommodation: €200.00<br><br>This expense report requires your approval before reimbursement processing.'],
            [currentUserName, 'Request revision. Accommodation expense exceeds policy limit.'],
            ['Workday', 'Revision requested. Felix Schäfer has been notified to update the expense report.'],
            ['Workday', '📋 <strong>Leave Request Pending Approval</strong><br><br>Employee: <span style="color: #1D9BD1 !important; font-weight: 600;">Hannah Wolf</span><br>Type: Personal Leave<br>Start Date: November 5, 2024<br>End Date: November 6, 2024<br>Duration: 2 business days<br>Reason: Personal matters.<br><br>This request requires your approval as her manager.'],
            [currentUserName, 'Rejected. Conflicts with critical production schedule.'],
            ['Workday', 'Leave request rejected. Hannah Wolf has been notified.'],
          ]
        } else if (personName) {
          return [
            [personName, pick(['Hey! How\'s production going?', 'Hi! Any updates on the assembly line?', 'Hello! How are things at the plant?', 'Hey! How\'s the quality control going?'])],
            [currentUserName, pick(['Pretty good!', 'All systems operational!', 'Running smoothly!', 'Going well!'])],
            [personName, pick(['Thanks for your help with the production issue earlier!', 'Appreciate your support on the quality control review!', 'Thanks for coordinating the supplier delivery!', 'Thanks for your help!'])],
            [currentUserName, 'No problem!'],
            [personName, pick(['Let me know if you need anything else.', 'Keep me posted on any production updates.', 'Reach out if you need support with the plant operations.'])],
          ]
        }
      }
      return [['Hannah Wolf', 'Hey!']]
    }
    
    const templates = getMessageTemplates()
    let templateIndex = 0
    let messageId = 0
    
    // Debug: Ensure CHG-189 has templates - if not, return fallback messages
    if (chatId === 'CHG-189' && (!templates || templates.length === 0)) {
      console.warn('CHG-189: No templates found, using fallback')
      const baseTime = Date.now() - 3600000 // 1 hour ago
      return [
        {
          id: 'CHG-189-1',
          who: 'Sarah Kim',
          text: 'This production change looks risky - we\'re modifying the EQS battery assembly process. Need to be extra careful here.',
          when: new Date(baseTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          _timestamp: baseTime
        } as SlackMsg & { _timestamp: number },
        {
          id: 'CHG-189-2',
          who: 'Paul Bauer',
          text: 'I agree. The change touches critical production paths. We should have a comprehensive rollback plan.',
          when: new Date(baseTime + 300000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          _timestamp: baseTime + 300000
        } as SlackMsg & { _timestamp: number },
        {
          id: 'CHG-189-3',
          who: 'Emma Wilson',
          text: 'I\'ve reviewed the production process changes. The risk is medium-high. We need to ensure all quality checkpoints are covered.',
          when: new Date(baseTime + 600000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          _timestamp: baseTime + 600000
        } as SlackMsg & { _timestamp: number },
        {
          id: 'CHG-189-4',
          who: 'Alex Thompson',
          text: 'The quality testing coverage looks good, but I\'m concerned about the impact on current production runs.',
          when: new Date(baseTime + 900000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          _timestamp: baseTime + 900000
        } as SlackMsg & { _timestamp: number },
        {
          id: 'CHG-189-5',
          who: 'Lisa Anderson',
          text: 'We should consider a gradual rollout - maybe 10% first, then 50%, then full deployment.',
          when: new Date(baseTime + 1200000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          _timestamp: baseTime + 1200000
        } as SlackMsg & { _timestamp: number },
        {
          id: 'CHG-189-6',
          who: 'Chris Martinez',
          text: 'Good point. Also need to make sure our monitoring is in place before we deploy.',
          when: new Date(baseTime + 1500000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          _timestamp: baseTime + 1500000
        } as SlackMsg & { _timestamp: number },
        {
          id: 'CHG-189-7',
          who: 'Jordan Lee',
          text: 'I\'ve added additional logging around the auth flow. That should help us catch any issues early.',
          when: new Date(baseTime + 1800000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          _timestamp: baseTime + 1800000
        } as SlackMsg & { _timestamp: number },
        {
          id: 'CHG-189-8',
          who: 'Eve Park',
          text: 'Security team has reviewed and approved, but with conditions - we need to monitor for 48 hours post-deployment.',
          when: new Date(baseTime + 2100000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          _timestamp: baseTime + 2100000
        } as SlackMsg & { _timestamp: number }
      ]
    }
    
    // Generate messages across multiple days - ensure at least 40 messages total
    // For DMs and group DMs, ensure even more for realistic conversations
    // Get person name early to check for Workday
    const personName = isDM && !isGroupDM ? getPersonNameFromChatId(chatId) : null
    // CRITICAL: Workday uses fixed templates only - don't generate extra messages
    const isWorkdayChat = (personName === 'Workday' || chatId === 'workday')
    // General channel is quiet - only generate a few messages (5-8 total)
    const minMessages = isWorkdayChat ? templates.length : (chatId === 'general' ? Math.floor(Math.random() * 4) + 5 : (isDM || isGroupDM ? 50 : 40))
    let totalMessagesGenerated = 0
    
    // Get all participants for this chat
    let participants: string[] = []
    if (isChannel) {
      // For general channel, restrict to executives, managers, and leadership roles only
      if (chatId === 'general') {
        const allowedRoles = ['Head of', 'Manager', 'VP', 'Director', 'Chief', 'Executive', 'Product Manager', 'Engineering Manager']
        participants = people
          .map(p => p.n)
          .filter(n => {
            const person = getPerson(n)
            const role = person?.role || ''
            return n !== getCurrentUser && 
                   person?.role !== 'AI Assistant' && 
                   person?.role !== 'HR System' &&
                   (allowedRoles.some(allowedRole => role.includes(allowedRole)) || 
                    role.includes('Manager') || 
                    role.includes('Head'))
          })
        // If no managers found, fallback to a few key people
        if (participants.length === 0) {
          participants = people
            .map(p => p.n)
            .filter(n => {
              const person = getPerson(n)
              return n !== getCurrentUser && 
                     person?.role !== 'AI Assistant' && 
                     person?.role !== 'HR System' &&
                     (n.includes('James') || n.includes('Emma') || n.includes('Lisa') || n.includes('James Bryant'))
            })
        }
      } else {
        // For other channels, use all people (excluding current user for now, they'll be added naturally)
        participants = people.map(p => p.n).filter(n => n !== getCurrentUser)
      }
    } else if (isGroupDM) {
      // Get actual group members from channel-config.json
      const groupDMConfig = (channelConfig.groupDMs as Array<{ id: string; name: string; members?: string[] }> | undefined)?.find(g => g.id === chatId)
      if (groupDMConfig && groupDMConfig.members) {
        participants = groupDMConfig.members.filter((name: string) => name !== getCurrentUser)
      } else {
        // Fallback to parsing name
        const groupMembers = chatData.name.split(', ').map(name => name.trim()).filter(name => name !== getCurrentUser)
        participants = groupMembers.length > 0 ? groupMembers : people.slice(0, 3).map(p => p.n)
      }
    } else {
      // 1:1 DM - both participants
      if (personName) {
        participants = [personName, getCurrentUser]
      } else {
        participants = [getCurrentUser]
      }
    }
    
    // Track participant message counts to ensure distribution
    const participantCounts: Record<string, number> = {}
    participants.forEach(p => participantCounts[p] = 0)
    
    while (currentDate < endDate && totalMessagesGenerated < minMessages) {
      if (!isWeekend(currentDate)) {
        // Vary messages per day based on channel type and activity level
        // Increase message count to ensure we reach minimum
        let messagesPerDay: number
        if (chatId === 'general') {
          // General channel is quiet - only 1 message every 3-5 days (very infrequent)
          // Use a deterministic but sparse pattern to keep it quiet
          const daysSinceStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          // Post on days 0, 4, 9, 14, 19, etc. (roughly every 4-5 days)
          const postInterval = 4 + (daysSinceStart % 2) // Alternates between 4 and 5 days
          const shouldPost = daysSinceStart % postInterval === 0 && daysSinceStart >= 0
          messagesPerDay = shouldPost ? 1 : 0 // Only 1 message when posting
        } else if (chatId === 'CHG-189') {
          // CHG-189 has 8 pre-existing discussion messages - only generate on first day
          if (currentDate.getTime() === startDate.getTime()) {
            messagesPerDay = templates.length // Use all 8 templates on first day only
          } else {
            messagesPerDay = 0 // No messages on other days
          }
        } else if (['itom-4412', 'incidents', 'alerts'].includes(chatId)) {
          messagesPerDay = Math.floor(Math.random() * 10) + 6 // 6-15 per day for high-activity channels
        } else if (isChannel) {
          messagesPerDay = Math.floor(Math.random() * 10) + 6 // 6-15 per day for regular channels
        } else if (isGroupDM) {
          messagesPerDay = Math.floor(Math.random() * 8) + 5 // 5-12 per day for group DMs (more active)
        } else {
          // Workday uses templates only - generate all templates on first day
          if (isWorkdayChat) {
            if (currentDate.getTime() === startDate.getTime()) {
              messagesPerDay = templates.length // Use all templates on first day only
            } else {
              messagesPerDay = 0 // No messages on other days for Workday
            }
          } else {
            messagesPerDay = Math.floor(Math.random() * 7) + 4 // 4-10 per day for 1:1 DMs (more conversation)
          }
        }
        
        // If we're below minimum, increase messages for this day
        if (totalMessagesGenerated + messagesPerDay < minMessages && currentDate < endDate) {
          const remaining = minMessages - totalMessagesGenerated
          messagesPerDay = Math.max(messagesPerDay, Math.min(remaining, messagesPerDay + 5))
        }
        
        const startHour = 8 + Math.floor(Math.random() * 2) // 8-9 AM
        const endHour = 17 // 5 PM
        
        for (let i = 0; i < messagesPerDay; i++) {
          const hour = startHour + Math.floor((endHour - startHour) * (i / messagesPerDay))
          const minute = Math.floor(Math.random() * 60)
          
          const msgTime = new Date(currentDate)
          msgTime.setHours(hour, minute, 0, 0)
          
          let who: string
          let text: string
          
          // Track last sender to prevent consecutive messages from same person
          const lastSender = messages.length > 0 ? messages[messages.length - 1].who : null
          
          // Ensure all participants contribute - prioritize participants with fewer messages
          // CRITICAL: Never allow consecutive messages from the same person
          const getNextParticipant = (): string => {
            if (participants.length === 0) return people[0]?.n || 'User'
            
            // CRITICAL: Exclude last sender to prevent consecutive messages
            const availableParticipants = participants.filter(p => p !== lastSender)
            if (availableParticipants.length === 0) {
              // Fallback: if somehow all participants are the same, use all participants
              return pick(participants)
            }
            
            // Find participants with least messages (excluding last sender)
            const minCount = Math.min(...availableParticipants.map(p => participantCounts[p] || 0))
            const leastActive = availableParticipants.filter(p => (participantCounts[p] || 0) === minCount)
            
            // Randomly pick from least active, ensuring no consecutive messages
            return pick(leastActive.length > 0 ? leastActive : availableParticipants)
          }
          
          // Per-member single message limit in long conversations
          // If conversation is long (>30 messages), ensure each person speaks only once per "round"
          const conversationLength = messages.length
          const isLongConversation = conversationLength > 30
          const recentSpeakers = isLongConversation ? messages.slice(-participants.length).map(m => m.who) : []
          
          const getNextParticipantWithLimit = (): string => {
            const next = getNextParticipant()
            // In long conversations, if this person already spoke in recent round, pick someone else
            if (isLongConversation && recentSpeakers.includes(next)) {
              const notRecent = participants.filter(p => p !== lastSender && !recentSpeakers.includes(p))
              if (notRecent.length > 0) {
                return pick(notRecent)
              }
            }
            return next
          }
          
          // Use realistic message generator for channels (except general and CHG-189 which have special long-form messages)
          if (isChannel && chatId !== 'general' && chatId !== 'CHG-189') {
            const msg = generateRealisticMessage(chatId, chatName, isChannel, isGroupDM, pick, messages)
            // CRITICAL: Ensure no consecutive messages from same person
            if (msg.who === lastSender || !participants.includes(msg.who)) {
              who = getNextParticipantWithLimit()
              // Regenerate message with correct speaker
              const channelInfo = [...(channelConfig.starred || []), ...(channelConfig.public || []), ...((channelConfig.private || []) as Array<{ id: string; description?: string; topics?: string[] }>)].find(c => c.id === chatId)
              if (channelInfo) {
                const newMsg = generateContextualChannelMessage(chatId, channelInfo, pick, messages)
                who = newMsg.who
                text = newMsg.text
              } else {
                text = msg.text
              }
            } else {
              who = msg.who
              text = msg.text
            }
          } else if (chatId === 'general' || chatId === 'CHG-189') {
            // Use contextual announcements from channel-config.json if available
            const contextualTemplates = (channelConfig.messageThemes as Record<string, any>)?.[chatId]
            if (contextualTemplates && contextualTemplates.length > 0) {
              // Check if it's an array of objects with 'who' and 'text' properties (from generate script)
              if (typeof contextualTemplates[0] === 'object' && contextualTemplates[0].who) {
                const announcement = contextualTemplates[templateIndex % contextualTemplates.length] as { who: string, text: string }
                who = announcement.who
                text = announcement.text
                templateIndex++
              } else {
                // Fallback to string array format
                const template = templates[templateIndex % templates.length]
                templateIndex++
                who = template[0] as string
                text = template[1] as string
              }
            } else {
              // Fallback to existing templates
              const template = templates[templateIndex % templates.length]
              templateIndex++
              who = template[0] as string
              text = template[1] as string
              // Handle actions if present (third element)
              if (template.length > 2 && template[2]) {
                const actions = template[2] as unknown as MessageAction[]
                const person = people.find(p => p.n === who) || people[0]
                messages.push({
                  id: `${chatId}-${messageId++}`,
                  who: template[0] as string,
                  text: template[1] as string,
                  when: msgTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                  actions,
                  _timestamp: msgTime.getTime()
                } as SlackMsg & { _timestamp: number })
                continue // Skip the normal message creation below
              }
            }
          } else if (isDM && !isGroupDM) {
            // Use contextual DM generator for individual DMs - proper back-and-forth
            const personName = getPersonNameFromChatId(chatId)
            
            // CRITICAL: Check if this is Workday - use templates directly, don't generate dynamically
            if (personName === 'Workday' || chatId === 'workday') {
              // Use Workday templates directly from getMessageTemplates()
              if (templates.length > 0 && templateIndex < templates.length) {
                const template = templates[templateIndex]
                templateIndex++
                who = template[0] as string
                text = template[1] as string
                // Handle actions if present (third element)
                if (template.length > 2 && template[2]) {
                  const actions = template[2] as unknown as MessageAction[]
                  messages.push({
                    id: `${chatId}-${messageId++}`,
                    who: template[0] as string,
                    text: template[1] as string,
                    when: msgTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                    actions,
                    _timestamp: msgTime.getTime()
                  } as SlackMsg & { _timestamp: number })
                  continue // Skip the normal message creation below
                }
              } else {
                // Fallback if templates exhausted
                who = getNextParticipant()
                text = 'No pending HR tasks.'
              }
            } else if (personName) {
              const msg = generateContextualDMMessage(personName, currentUserName, messages, pick)
              who = msg.who
              text = msg.text
            } else {
              // Fallback - generate contextual message even if person name not found
              who = getNextParticipant()
              const person = getPerson(who)
              const personRole = person?.role || ''
              const roleLower = personRole.toLowerCase()
              const descLower = (companyData.description || '').toLowerCase()
              const hasITSM = descLower.includes('incident') || descLower.includes('itom') || descLower.includes('itsm') || descLower.includes('service management')
              
              if (hasITSM) {
                if (roleLower.includes('engineer') || roleLower.includes('developer')) {
                  text = `Hey ${currentUserName}! Quick question - are you seeing the same incident alerts I am?`
                } else if (roleLower.includes('devops') || roleLower.includes('sre')) {
                  text = `Hey ${currentUserName}! Quick update - monitoring shows all systems operational`
                } else {
                  text = `Hey ${currentUserName}! Quick question - do you have a minute to discuss something?`
                }
              } else {
                text = `Hey ${currentUserName}! Quick question - do you have a minute?`
              }
            }
          } else if (isGroupDM) {
            // Group DMs - generate contextual group conversation
            const groupDMConfig = (channelConfig.groupDMs as Array<{ id: string; name: string; members?: string[] }> | undefined)?.find(g => g.id === chatId)
            const groupMembers = groupDMConfig?.members || chatData.name.split(', ').map((name: string) => name.trim()).filter((name: string) => name !== getCurrentUser)
            const msg = generateContextualGroupDMMessage(groupMembers, currentUserName, messages, pick)
            // CRITICAL: Ensure no consecutive messages from same person
            if (msg.who === lastSender) {
              // Regenerate with different speaker
              const allGroupMembers = [...groupMembers, currentUserName].filter((v, i, a) => a.indexOf(v) === i)
              const otherMembers = allGroupMembers.filter(m => m !== lastSender)
              if (otherMembers.length > 0) {
                const alternateSpeaker = pick(otherMembers)
                // Generate a response message from alternate speaker
                const speakerPerson = getPerson(alternateSpeaker)
                const speakerRole = speakerPerson?.role || ''
                const roleLower = speakerRole.toLowerCase()
                const companyDesc = companyData.description || ''
                const descLower = companyDesc.toLowerCase()
                
                // Generate contextual response based on last message
                const lastMsgText = messages.length > 0 ? messages[messages.length - 1].text.toLowerCase() : ''
                if (lastMsgText.includes('question') || lastMsgText.includes('?')) {
                  text = roleLower.includes('engineer') ? 
                    `I can help with that. Let me check...` :
                    `Good question. I think we should...`
                } else if (lastMsgText.includes('thanks') || lastMsgText.includes('appreciate')) {
                  text = `No problem! Happy to help.`
                } else {
                  text = `That makes sense. I agree.`
                }
                who = alternateSpeaker
              } else {
                who = msg.who
                text = msg.text
              }
            } else {
              who = msg.who
              text = msg.text
            }
          } else {
            // Fallback
            who = getNextParticipantWithLimit()
            const template = templates[templateIndex % templates.length]
            templateIndex++
            text = template[1] as string || `Update ${i + 1}`
          }
          
          // CRITICAL SANITY CHECK: Never allow consecutive messages from same person
          if (who === lastSender && messages.length > 0) {
            // Force a different speaker
            const availableSpeakers = participants.filter(p => p !== lastSender)
            if (availableSpeakers.length > 0) {
              who = pick(availableSpeakers)
              // Regenerate text for this speaker if needed
              if (isChannel) {
                const channelInfo = [...(channelConfig.starred || []), ...(channelConfig.public || []), ...((channelConfig.private || []) as Array<{ id: string; description?: string; topics?: string[] }>)].find(c => c.id === chatId)
                if (channelInfo) {
                  const newMsg = generateContextualChannelMessage(chatId, channelInfo, pick, messages)
                  who = newMsg.who
                  text = newMsg.text
                }
              }
            }
          }
          
          // CRITICAL: Prevent duplicate consecutive message text
          if (messages.length > 0 && messages[messages.length - 1].text === text) {
            // Regenerate message text to avoid exact duplicates
            if (isChannel && chatId !== 'general' && chatId !== 'CHG-189') {
              const channelInfo = [...(channelConfig.starred || []), ...(channelConfig.public || []), ...((channelConfig.private || []) as Array<{ id: string; description?: string; topics?: string[] }>)].find(c => c.id === chatId)
              if (channelInfo) {
                const newMsg = generateContextualChannelMessage(chatId, channelInfo, pick, messages)
                text = newMsg.text
              } else {
                text = `${text} (update)`
              }
            } else if (isGroupDM) {
              // Generate alternate response
              const lastMsgText = messages.length > 0 ? messages[messages.length - 1].text.toLowerCase() : ''
              if (lastMsgText.includes('question') || lastMsgText.includes('?')) {
                text = `I can help with that.`
              } else if (lastMsgText.includes('thanks') || lastMsgText.includes('appreciate')) {
                text = `No problem!`
              } else {
                text = `That makes sense.`
              }
            } else if (isDM && !isGroupDM) {
              // Generate alternate response for DM
              const lastMsgText = messages.length > 0 ? messages[messages.length - 1].text.toLowerCase() : ''
              if (lastMsgText.includes('question') || lastMsgText.includes('?')) {
                text = `Sure, I can help with that.`
              } else {
                text = `Got it, thanks!`
              }
            } else {
              text = `${text} (update)`
            }
          }
          
          // Update participant count
          participantCounts[who] = (participantCounts[who] || 0) + 1
          
          // Find person object
          const person = people.find(p => p.n === who) || people[0]
          const personObj = getPerson(who)
          
          // Enhance message based on person traits (skip for HTML/rich text)
          if (!text.includes('<strong>') && !text.includes('<br>')) {
            text = enhanceMessage(text, personObj || { name: who, avatar: person.a }, pick)
          }
          
          // Add reactions to interesting/notable messages across all chats
          // Skip reactions for bot/system accounts (Workday, Merc AI) and Workday chat entirely
          const isBotAccount = personObj?.role === 'AI Assistant' || personObj?.role === 'HR System' || who === 'Workday' || who === 'Merc AI'
          const isWorkdayChat = chatId === 'workday' || chatId?.toLowerCase().includes('workday')
          
          let reactions: Record<string, number> | undefined = undefined
          const textWithoutHtml = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').toLowerCase()
          
          // NO reactions in Workday chat - it's a system chat
          if (isWorkdayChat) {
            reactions = undefined
          }
          // General channel messages ALWAYS get reactions (they're all company-wide announcements)
          else if (chatId === 'general' && !isBotAccount) {
            reactions = getReactionsForMessage(text, chatId, chatName, pick, who) || {}
            // Ensure general channel messages have at least 3-6 reactions
            if (Object.keys(reactions).length === 0) {
              const reactionEmojis = ['👍', '❤️', '🎉', '🔥', '👏', '😮', '🙏', '✅', '🚀', '💯']
              const numReactions = Math.floor(Math.random() * 4) + 3 // 3-6 reactions
              for (let i = 0; i < numReactions; i++) {
                const emoji = pick(reactionEmojis.filter(e => !reactions![e]))
                if (emoji) {
                  reactions![emoji] = Math.floor(Math.random() * 5) + 2 // 2-6 reactions per emoji
                }
              }
            }
          }
          
          // Determine if message is interesting based on content and context
          const isInteresting = (): boolean => {
            // Celebratory/positive messages
            if (textWithoutHtml.includes('success') || textWithoutHtml.includes('complete') || 
                textWithoutHtml.includes('great') || textWithoutHtml.includes('excellent') ||
                textWithoutHtml.includes('awesome') || textWithoutHtml.includes('thanks') ||
                textWithoutHtml.includes('appreciate') || textWithoutHtml.includes('congrats')) {
              return true
            }
            
            // Technical achievements
            if (textWithoutHtml.includes('deployed') || textWithoutHtml.includes('resolved') ||
                textWithoutHtml.includes('fixed') || textWithoutHtml.includes('improved') ||
                textWithoutHtml.includes('optimized') || textWithoutHtml.includes('scaled') ||
                textWithoutHtml.includes('operational') || textWithoutHtml.includes('healthy')) {
              return true
            }
            
            // Action items and decisions
            if (textWithoutHtml.includes('approved') || textWithoutHtml.includes('scheduled') ||
                textWithoutHtml.includes('ready') || textWithoutHtml.includes('done') ||
                textWithoutHtml.includes('finished') || textWithoutHtml.includes('reviewed')) {
              return true
            }
            
            // Questions or requests that got responses
            if (textWithoutHtml.includes('?') && (textWithoutHtml.includes('can') || 
                textWithoutHtml.includes('should') || textWithoutHtml.includes('need'))) {
              return Math.random() > 0.6 // 40% chance for questions
            }
            
            // Emojis indicate interesting content
            if (text.includes('🚀') || text.includes('🎉') || text.includes('✅') || 
                text.includes('🔥') || text.includes('💡') || text.includes('🏆')) {
              return true
            }
            
            // Important announcements (always get reactions)
            if (text.includes('Company-Wide') || text.includes('Major') || 
                text.includes('Strategic') || text.includes('Announcement')) {
              return true
            }
            
            // For CHG-189, reactions on risk discussions and approvals
            if (chatId === 'CHG-189') {
              if (textWithoutHtml.includes('risk') || textWithoutHtml.includes('approved') ||
                  textWithoutHtml.includes('review') || textWithoutHtml.includes('security')) {
                return true
              }
            }
            
            // For incident channels, reactions on resolutions
            if (chatId === 'itom-4412' || chatId === 'incidents' || chatId === 'alerts') {
              if (textWithoutHtml.includes('resolved') || textWithoutHtml.includes('mitigation') ||
                  textWithoutHtml.includes('fixed') || textWithoutHtml.includes('scaling')) {
                return true
              }
            }
            
            return false
          }
          
          // Don't add reactions to bot/system account messages
          // General channel reactions are already set above, so skip this logic for general
          if (chatId === 'general') {
            // Reactions already set above for general channel - keep them
          } else if (isBotAccount) {
            reactions = undefined
          } else if (isInteresting()) {
            reactions = {}
            const reactionEmojis: string[] = []
            
            // Context-appropriate emojis based on chat type and content
            if (chatId === 'general' || textWithoutHtml.includes('announce') || textWithoutHtml.includes('welcome')) {
              reactionEmojis.push('👍', '❤️', '🎉', '🔥', '👏', '🚀', '💯', '🙌')
            } else if (chatId === 'itom-4412' || chatId === 'incidents' || chatId === 'alerts') {
              reactionEmojis.push('👍', '✅', '🎉', '🔥', '👏')
            } else if (chatId === 'CHG-189') {
              reactionEmojis.push('👍', '✅', '👏', '💯')
            } else if (textWithoutHtml.includes('deploy') || textWithoutHtml.includes('release')) {
              reactionEmojis.push('👍', '✅', '🚀', '🎉', '🔥')
            } else if (textWithoutHtml.includes('thanks') || textWithoutHtml.includes('appreciate')) {
              reactionEmojis.push('👍', '❤️', '🙏', '👏')
            } else {
              // Default reactions for other interesting messages
              reactionEmojis.push('👍', '✅', '🔥', '👏', '💯')
            }
            
            // Add 1-3 reactions (fewer for DMs, more for channels)
            const numReactions = isDM && !isGroupDM ? 
              Math.floor(Math.random() * 2) + 1 : // 1-2 for DMs
              Math.floor(Math.random() * 3) + 1    // 1-3 for channels
            
            for (let i = 0; i < numReactions; i++) {
              const availableEmojis = reactionEmojis.filter(e => !reactions![e])
              if (availableEmojis.length === 0) break
              const emoji = pick(availableEmojis)
              // Reaction counts: For 1:1 DMs, usually 1 reaction (rarely 2 if both people reacted)
              // For channels, 1-4 reactions per emoji
              if (isDM && !isGroupDM) {
                // 90% chance of 1 reaction, 10% chance of 2 reactions (both people reacted)
                reactions![emoji] = Math.random() < 0.9 ? 1 : 2
              } else {
                reactions![emoji] = Math.floor(Math.random() * 4) + 1
              }
            }
            
            // If no reactions were added, return undefined
            if (Object.keys(reactions).length === 0) {
              reactions = undefined
            }
          }
          
          // Add link embeds (all 5 types: Notion, Figma, Loom, Jira, Confluence) in equal proportions
          // Add embeds until we reach target count for this chat
          if (embedCount < targetEmbedCount && Math.random() < 0.35) {
            // All 5 embed types
            const allEmbedTypes: ('notion' | 'figma' | 'loom' | 'jira' | 'confluence')[] = ['notion', 'figma', 'loom', 'jira', 'confluence']
            
            // Prefer types we haven't used yet for equal distribution
            const availableTypes = allEmbedTypes.filter(type => !usedEmbedTypes.includes(type))
            const embedTypesToChooseFrom = availableTypes.length > 0 ? availableTypes : allEmbedTypes
            const embedType = pick(embedTypesToChooseFrom)
            
            let embedUrl = ''
            switch (embedType) {
              case 'notion':
                embedUrl = `https://notion.so/${pick(['product-roadmap-q2', 'engineering-design-doc', 'api-architecture-overview', 'database-migration-plan', 'user-onboarding-flow', 'incident-response-procedures', 'feature-prioritization-framework', 'service-architecture-guide', 'user-behavior-analytics', 'deployment-best-practices'])}`
                break
              case 'figma':
                embedUrl = `https://figma.com/file/${pick(['abc123', 'def456', 'ghi789', 'jkl012', 'mno345'])}/${pick(['design-system-components', 'mobile-app-ui', 'web-dashboard', 'color-palette', 'onboarding-flow', 'button-library', 'icon-set', 'navigation-patterns', 'dashboard-views', 'card-patterns'])}`
                break
              case 'loom':
                embedUrl = `https://loom.com/share/${pick(['a1b2c3d4', 'e5f6g7h8', 'i9j0k1l2', 'm3n4o5p6', 'q7r8s9t0', 'u1v2w3x4', 'y5z6a7b8', 'c9d0e1f2'])}`
                break
              case 'jira':
                embedUrl = `https://jira.company.com/browse/${pick(['ENG', 'PROD', 'DEV', 'OPS', 'SEC'])}-${Math.floor(Math.random() * 5000) + 1000}`
                break
              case 'confluence':
                embedUrl = `https://confluence.company.com/pages/viewpage.action?pageId=${Math.floor(Math.random() * 90000) + 10000}`
                break
            }
            
            // Append embed link to message text
            text = `${text} ${embedUrl}`
            embedCount++
            usedEmbedTypes.push(embedType)
          }
          
          messages.push({
            id: `${chatId}-${messageId++}`,
            who: person.n,
            text,
            when: msgTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            reactions,
            _timestamp: msgTime.getTime() // Store timestamp for sorting
          } as SlackMsg & { _timestamp: number })
          
          totalMessagesGenerated++
        }
      }
      
      // Move to next weekday
      currentDate = getNextWeekday(currentDate)
    }
    
    // If we still don't have enough messages, generate more on the last day
    if (totalMessagesGenerated < minMessages) {
      const remaining = minMessages - totalMessagesGenerated
      const lastDate = new Date(endDate)
      lastDate.setDate(lastDate.getDate() - 1)
      
      // Helper function for fallback section
      // CRITICAL: Never allow consecutive messages from same person
      const getNextParticipantFallback = (): string => {
        if (participants.length === 0) return people[0]?.n || 'User'
        const lastSenderFallback = messages.length > 0 ? messages[messages.length - 1].who : null
        const availableParticipants = participants.filter(p => p !== lastSenderFallback)
        if (availableParticipants.length === 0) {
          return pick(participants)
        }
        const minCount = Math.min(...availableParticipants.map(p => participantCounts[p] || 0))
        const leastActive = availableParticipants.filter(p => (participantCounts[p] || 0) === minCount)
        return pick(leastActive.length > 0 ? leastActive : availableParticipants)
      }
      
      for (let i = 0; i < remaining; i++) {
        const hour = 9 + Math.floor((17 - 9) * (i / remaining))
        const minute = Math.floor(Math.random() * 60)
        const msgTime = new Date(lastDate)
        msgTime.setHours(hour, minute, 0, 0)
        
        let who: string
        let text: string
        
        // CRITICAL: Track last sender to prevent consecutive messages
        const lastSenderFallback = messages.length > 0 ? messages[messages.length - 1].who : null
        
        if (isChannel && chatId !== 'general' && chatId !== 'CHG-189') {
          const msg = generateRealisticMessage(chatId, chatName, isChannel, isGroupDM, pick, messages)
          // CRITICAL: Ensure no consecutive messages
          if (msg.who === lastSenderFallback || !participants.includes(msg.who)) {
            who = getNextParticipantFallback()
            const channelInfo = [...(channelConfig.starred || []), ...(channelConfig.public || []), ...((channelConfig.private || []) as Array<{ id: string; description?: string; topics?: string[] }>)].find(c => c.id === chatId)
            if (channelInfo) {
              const newMsg = generateContextualChannelMessage(chatId, channelInfo, pick, messages)
              who = newMsg.who
              text = newMsg.text
            } else {
              text = msg.text
            }
          } else {
            who = msg.who
            text = msg.text
          }
        } else if (isDM && !isGroupDM) {
          const personName = getPersonNameFromChatId(chatId)
          if (personName) {
            const msg = generateContextualDMMessage(personName, currentUserName, messages, pick)
            // CRITICAL: Ensure no consecutive messages
            if (msg.who === lastSenderFallback) {
              // Force alternate speaker
              who = msg.who === currentUserName ? personName : currentUserName
              // Regenerate message for alternate speaker
              const alternateMsg = generateContextualDMMessage(personName, currentUserName, messages, pick)
              who = alternateMsg.who
              text = alternateMsg.text
            } else {
              who = msg.who
              text = msg.text
            }
          } else {
            // Fallback - generate contextual message
            who = getNextParticipantFallback()
            const person = getPerson(who)
            const personRole = person?.role || ''
            const roleLower = personRole.toLowerCase()
            const descLower = (companyData.description || '').toLowerCase()
            const hasITSM = descLower.includes('incident') || descLower.includes('itom') || descLower.includes('itsm') || descLower.includes('service management')
            
            if (hasITSM) {
              if (roleLower.includes('engineer') || roleLower.includes('developer')) {
                text = `Hey ${currentUserName}! Quick question - are you seeing the same incident alerts I am?`
              } else if (roleLower.includes('devops') || roleLower.includes('sre')) {
                text = `Hey ${currentUserName}! Quick update - monitoring shows all systems operational`
              } else {
                text = `Hey ${currentUserName}! Quick question - do you have a minute to discuss something?`
              }
            } else {
              text = `Hey ${currentUserName}! Quick question - do you have a minute?`
            }
          }
        } else if (isGroupDM) {
          const groupDMConfig = (channelConfig.groupDMs as Array<{ id: string; name: string; members?: string[] }> | undefined)?.find(g => g.id === chatId)
          const groupMembers = groupDMConfig?.members || chatData.name.split(', ').map((name: string) => name.trim()).filter((name: string) => name !== getCurrentUser)
          const msg = generateContextualGroupDMMessage(groupMembers, currentUserName, messages, pick)
          // CRITICAL: Ensure no consecutive messages
          if (msg.who === lastSenderFallback) {
            const allGroupMembers = [...groupMembers, currentUserName].filter((v, i, a) => a.indexOf(v) === i)
            const otherMembers = allGroupMembers.filter(m => m !== lastSenderFallback)
            if (otherMembers.length > 0) {
              who = pick(otherMembers)
              const speakerPerson = getPerson(who)
              const roleLower = (speakerPerson?.role || '').toLowerCase()
              const lastMsgText = messages.length > 0 ? messages[messages.length - 1].text.toLowerCase() : ''
              if (lastMsgText.includes('question') || lastMsgText.includes('?')) {
                text = roleLower.includes('engineer') ? `I can help with that. Let me check...` : `Good question. I think we should...`
              } else {
                text = `That makes sense. I agree.`
              }
            } else {
              who = msg.who
              text = msg.text
            }
          } else {
            who = msg.who
            text = msg.text
          }
        } else {
          // Fallback - generate contextual channel message
          who = getNextParticipantFallback()
          const channelInfo = [...(channelConfig.starred || []), ...(channelConfig.public || []), ...((channelConfig.private || []) as Array<{ id: string; description?: string; topics?: string[]; name?: string }>)].find(c => c.id === chatId)
          if (channelInfo) {
            const msg = generateContextualChannelMessage(chatId, channelInfo, pick, messages)
            who = msg.who
            text = msg.text
          } else {
            // Last resort fallback - still contextual
            const descLower = (companyData.description || '').toLowerCase()
            const hasITSM = descLower.includes('incident') || descLower.includes('itom') || descLower.includes('itsm')
            if (hasITSM) {
              text = `Monitoring shows all systems operational. No incidents reported`
            } else {
              text = `Status update: All systems running smoothly`
            }
          }
        }
        
        // CRITICAL SANITY CHECK: Never allow consecutive messages from same person
        if (who === lastSenderFallback && messages.length > 0) {
          const availableSpeakers = participants.filter(p => p !== lastSenderFallback)
          if (availableSpeakers.length > 0) {
            who = pick(availableSpeakers)
            if (isChannel) {
              const channelInfo = [...(channelConfig.starred || []), ...(channelConfig.public || []), ...((channelConfig.private || []) as Array<{ id: string; description?: string; topics?: string[] }>)].find(c => c.id === chatId)
              if (channelInfo) {
                const newMsg = generateContextualChannelMessage(chatId, channelInfo, pick, messages)
                who = newMsg.who
                text = newMsg.text
              }
            }
          }
        }
        
        // CRITICAL: Prevent duplicate consecutive message text
        if (messages.length > 0 && messages[messages.length - 1].text === text) {
          // Regenerate message text to avoid exact duplicates
          if (isChannel && chatId !== 'general' && chatId !== 'CHG-189') {
            const channelInfo = [...(channelConfig.starred || []), ...(channelConfig.public || []), ...((channelConfig.private || []) as Array<{ id: string; description?: string; topics?: string[] }>)].find(c => c.id === chatId)
            if (channelInfo) {
              const newMsg = generateContextualChannelMessage(chatId, channelInfo, pick, messages)
              text = newMsg.text
            } else {
              text = `${text} (update)`
            }
          } else if (isGroupDM) {
            const lastMsgText = messages.length > 0 ? messages[messages.length - 1].text.toLowerCase() : ''
            if (lastMsgText.includes('question') || lastMsgText.includes('?')) {
              text = `I can help with that.`
            } else {
              text = `That makes sense.`
            }
          } else if (isDM && !isGroupDM) {
            const lastMsgText = messages.length > 0 ? messages[messages.length - 1].text.toLowerCase() : ''
            if (lastMsgText.includes('question') || lastMsgText.includes('?')) {
              text = `Sure, I can help with that.`
            } else {
              text = `Got it, thanks!`
            }
          } else {
            text = `${text} (update)`
          }
        }
        
        // Update participant count
        participantCounts[who] = (participantCounts[who] || 0) + 1
        
        const person = people.find(p => p.n === who) || people[0]
        const personObj = getPerson(who)
        if (!text.includes('<strong>') && !text.includes('<br>')) {
          text = enhanceMessage(text, personObj || { name: who, avatar: person.a }, pick)
        }
        
        messages.push({
          id: `${chatId}-${messageId++}`,
          who: person.n,
          text,
          when: msgTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          _timestamp: msgTime.getTime()
        } as SlackMsg & { _timestamp: number })
      }
    }
    
    // CRITICAL: For Merc AI/AI Assistant chats, ensure conversation always ends with Merc AI's response
    const aiAssistant = peopleData.find((p: Person) => p.role === 'AI Assistant')
    const aiAssistantName = aiAssistant?.name || 'Merc AI'
    const aiAssistantId = aiAssistantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const isMercAIChat = (isDM && !isGroupDM && (chatId === aiAssistantId || chatId === 'merc-ai' || chatId === 'bottleneckbot' || chatId === 'astra'))
    
    if (isMercAIChat && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      // If last message is from user, add Merc AI's response
      if (lastMessage.who === currentUserName) {
        const mercAIResponse = generateAIAssistantMessage(currentUserName, messages, companyData.description || '', companyData.name || '', companyData.industry || '', pick)
        const mercAIMsgTime = new Date(endDate)
        mercAIMsgTime.setHours(16, 30, 0, 0)
        messages.push({
          id: `${chatId}-${messageId++}`,
          who: mercAIResponse.who,
          text: mercAIResponse.text,
          when: mercAIMsgTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          _timestamp: mercAIMsgTime.getTime()
        } as SlackMsg & { _timestamp: number })
      }
    }
    
    // Sort messages by timestamp (oldest first)
    messages.sort((a, b) => {
      const aTime = (a as any)._timestamp || 0
      const bTime = (b as any)._timestamp || 0
      return aTime - bTime
    })
    
    // Remove _timestamp before returning
    return messages.slice(-200).map((msg: any) => {
      const { _timestamp, ...rest } = msg
      return rest as SlackMsg
    }) // Keep last 200 messages
  }

  // Handle chat selection - clear unread count with delay
  const handleChatSelect = (chatId: string) => {
    setSelectedChat(chatId)
    // Delay clearing unread count by 300ms for smooth transition
    setTimeout(() => {
      setUnreadCounts(prev => ({ ...prev, [chatId]: 0 }))
    }, 300)
  }

  // Close reaction picker when clicking outside
  useEffect(() => {
    if (!showReactionPicker) return
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Check if click is outside the reaction picker and emoji button
      if (!target.closest('[data-reaction-picker]') && !target.closest('[data-emoji-button]')) {
        setShowReactionPicker(null)
        // Also clear hover state when closing picker
        setHoveredMessageId(null)
        // Clear hover background from the message
        const messageElement = document.querySelector(`[data-message-id="${showReactionPicker}"]`) as HTMLElement
        if (messageElement) {
          messageElement.style.background = 'transparent'
        }
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showReactionPicker])

  // Keyboard shortcut: Press 'P' to trigger Merc AI's message in CHG-189 or Workday leave request
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      
      if (e.key === 'p' || e.key === 'P') {
        if (selectedChat === 'CHG-189') {
          // Check if Merc AI's message already exists
          const currentMessages = chatMessages['CHG-189'] || []
          const mercAIMessageExists = currentMessages.some(m => 
            m.who === 'Merc AI' && m.text.includes('Risk validation complete')
          )
          
          if (!mercAIMessageExists) {
            const mercAIMessage: SlackMsg = {
              id: `CHG-189-merc-ai-${Date.now()}`,
              who: 'Merc AI',
              text: `Risk validation complete. All 4 risk pillars are showing 🟢 green status:<br><br>🟢 Technical<br>🟢 Operational<br>🟢 Compliance<br>🟢 Business<br><br>I've validated the usual risk procedures across all pillars.<br><br>🔒 <em>Only <span style="color: #1D9BD1 !important; font-weight: 600;">@JamesMc</span> can approve this change.</em>`,
              when: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
              actions: [
                {
                  id: 'approve-change',
                  label: 'Approve change',
                  type: 'primary' as const,
                  emoji: '✅',
                  confirmationText: '{actor} has approved the change. The respective stakeholders have been notified.'
                },
                {
                  id: 'keep-open',
                  label: 'Keep it open',
                  type: 'secondary' as const,
                  confirmationText: '{actor} has chosen to keep the change open for further review.'
                }
              ]
            }
            
            // Add message with a small delay for smooth appearance (like periodic messages)
            setTimeout(() => {
              setChatMessages(prev => {
                const current = prev['CHG-189'] || []
                return { ...prev, 'CHG-189': [...current, mercAIMessage] }
              })
            }, 200)
          }
        } else if (selectedChat === 'workday' || selectedChat?.toLowerCase().includes('workday')) {
          // Allow unlimited leave requests - they can be from different employees
          const leaveRequestMessage: SlackMsg = {
              id: `workday-leave-request-${Date.now()}`,
              who: 'Workday',
              text: `📋 <strong>Leave Request Pending Approval</strong><br><br>Employee: <span style="color: #1D9BD1 !important; font-weight: 600;">Hannah Wolf</span><br>Type: Vacation Leave<br>Start Date: December 20, 2024<br>End Date: December 27, 2024<br>Duration: 5 business days<br><br>Reason: Family holiday vacation<br><br>This request requires your approval as her manager.`,
              when: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
              actions: [
                {
                  id: 'approve-leave',
                  label: 'Approve',
                  type: 'primary' as const,
                  emoji: '✅',
                  confirmationText: '<em>You have approved the leave request. Hannah Wolf and the HR team have been notified.</em>'
                },
                {
                  id: 'reject-leave',
                  label: 'Reject',
                  type: 'secondary' as const,
                  confirmationText: '<em>You have rejected the leave request. Hannah Wolf has been notified.</em>'
                }
              ]
            }
            
            setTimeout(() => {
              setChatMessages(prev => {
                const current = prev['workday'] || []
                return { ...prev, 'workday': [...current, leaveRequestMessage] }
              })
            }, 200)
        }
      } else if (e.key === 'q' || e.key === 'Q') {
        if (selectedChat === 'workday' || selectedChat?.toLowerCase().includes('workday')) {
          // Allow unlimited expense requests - they can be from different employees
          const expenseRequestMessage: SlackMsg = {
              id: `workday-expense-request-${Date.now()}`,
              who: 'Workday',
              text: `💰 <strong>Expense Report Approval Required</strong><br><br>Employee: <span style="color: #1D9BD1 !important; font-weight: 600;">Felix Schäfer</span><br>Report ID: EXP-2024-1247<br>Total Amount: €2,450.00<br>Submitted: December 10, 2024<br><br>Categories:<br>• Business Travel: €1,200.00<br>• Meals & Entertainment: €850.00<br>• Accommodation: €400.00<br><br>This expense report requires your approval before reimbursement processing.`,
              when: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
              actions: [
                {
                  id: 'approve-expense',
                  label: 'Approve',
                  type: 'primary' as const,
                  emoji: '✅',
                  confirmationText: '<em>You have approved the expense report. Finance team has been notified and reimbursement will be processed within 3-5 business days.</em>'
                },
                {
                  id: 'request-revision',
                  label: 'Request Revision',
                  type: 'secondary' as const,
                  confirmationText: '<em>You have requested revision of the expense report. Felix Schäfer has been notified.</em>'
                },
                {
                  id: 'reject-expense',
                  label: 'Reject',
                  type: 'secondary' as const,
                  confirmationText: '<em>You have rejected the expense report. Felix Schäfer has been notified.</em>'
                }
              ]
            }
            
            setTimeout(() => {
              setChatMessages(prev => {
                const current = prev['workday'] || []
                return { ...prev, 'workday': [...current, expenseRequestMessage] }
              })
            }, 200)
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [selectedChat, chatMessages])

  // Initialize messages for all chats
  useEffect(() => {
    const allChats = [...starredChats, ...dmChats, ...channelChats]
    const initialMessages: Record<string, SlackMsg[]> = {}
    
    allChats.forEach(chat => {
      initialMessages[chat.id] = generateContextualMessages(chat.id, chat)
    })
    
    // Ensure CHG-189 has messages even if not in channelChats yet
    if (!initialMessages['CHG-189'] || initialMessages['CHG-189'].length === 0) {
      const chg189Chat: ChatItem = {
        id: 'CHG-189',
        name: '#CHG-189',
        type: 'channel',
        unread: 0
      }
      initialMessages['CHG-189'] = generateContextualMessages('CHG-189', chg189Chat)
    }
    
    setChatMessages(initialMessages)
  }, []) // Run once on mount - channelConfig is imported statically

  // Periodic message system - adds messages to random chats every few seconds
  useEffect(() => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
    
    // Get all chat IDs statically (don't depend on unreadCounts)
    const allChatIds = [
      'itom-4412', 'incidents', 'alerts',
      'merc-ai', 'hannah', 'felix', 'mia', 'eve', 'james', 'priya', 'alexander', 'sarah', 'paul',
      'group-1', 'group-2', 'group-3', 'group-4', 'group-5',
      'chg-review', 'CHG-189', 'dev-ops', 'general', 'engineering', 'backend', 'frontend', 'infrastructure',
      'security', 'sre', 'oncall', 'deployments', 'monitoring', 'ci-cd', 'kubernetes', 'aws',
      'database', 'api', 'mobile', 'qa', 'design', 'product', 'sales', 'support', 'marketing'
    ]
    
    const generateMessageForChat = (chatId: string): SlackMsg | null => {
      const chatName = chatId.replace('#', '').replace(/-/g, ' ')
      const isChannel = chatId.startsWith('#') || ['itom-4412', 'incidents', 'alerts', 'chg-review', 'CHG-189', 'dev-ops', 'general', 'engineering', 'backend', 'frontend', 'infrastructure', 'security', 'sre', 'oncall', 'deployments', 'monitoring', 'ci-cd', 'kubernetes', 'aws', 'database', 'api', 'mobile', 'qa', 'design', 'product', 'sales', 'support', 'marketing'].includes(chatId)
      const isGroupDM = chatId.startsWith('group-')
      const isDM = !isChannel && !isGroupDM
      
      let p = pick(getOtherPeople)
      let text = ''
      
      if (chatId === 'merc-ai') {
        // Special handling for Merc AI
        p = people.find(pp => pp.n === 'Merc AI') || p
        text = pick([
          `I've updated the analysis for incident #4412.`,
          `New recommendations available based on latest metrics.`,
          `Would you like me to generate a report?`,
        ])
      } else if (isChannel) {
        // Use realistic message generator for channels
        const msg = generateRealisticMessage(chatId, chatName, isChannel, isGroupDM, pick)
        p = people.find(pp => pp.n === msg.who) || p
        text = msg.text
      } else if (isGroupDM) {
        // For group DMs, pick someone from the group (not current user)
        const allChats = [...starredChats, ...dmChats, ...channelChats]
        const groupChat = allChats.find(c => c.id === chatId)
        if (groupChat) {
          const groupMembers = getGroupMembers(groupChat.name)
          if (groupMembers.length > 0) {
            const memberName = pick(groupMembers)
            p = people.find(pp => pp.n === memberName) || p
          }
        }
        // Contextual group DM messages based on company description
        const descLower = (companyData.description || '').toLowerCase()
        const hasITSM = descLower.includes('incident') || descLower.includes('itom') || descLower.includes('itsm')
        
        const dmContexts: Record<string, string[]> = hasITSM ? {
          'group-1': ['Hey team! Are you seeing the same incident alerts?', 'Change request looks good to me', 'Monitoring shows all systems operational'],
          'group-2': ['Morning everyone! Quick update - no active incidents', 'Ready for the change window?', 'Let\'s sync up on the deployment'],
          'group-3': ['Update: Change request approved and ready', 'I\'ll review the post-mortem', 'Thanks for helping with the incident'],
          'group-4': ['Status update: All systems operational', 'Infrastructure metrics looking good', 'Keep me posted on the change window'],
          'group-5': ['Hey! Quick question about the monitoring dashboard', 'How\'s the incident response going?', 'All set for the change deployment'],
        } : {
          'group-1': ['Hey team!', 'What do you think?', 'Sounds good to me.'],
          'group-2': ['Morning everyone!', 'Ready for the meeting?', 'Let\'s sync up.'],
          'group-3': ['Update: Changes are ready', 'I\'ll review it', 'Thanks!'],
          'group-4': ['Status update', 'Looking good', 'Keep me posted'],
          'group-5': ['Hey!', 'How\'s it going?', 'All set here'],
        }
        const contexts = dmContexts[chatId] || (hasITSM ? [
          `Hey! Quick update - monitoring shows all systems operational`,
          `Thanks for helping with the incident response!`,
          `Change request review completed. Ready for deployment`,
          `Infrastructure metrics within normal ranges`
        ] : [
          `Hey! Just following up.`,
          `Thanks for the help!`,
          `Let me know when you're free.`
        ])
        text = pick(contexts)
      } else if (isDM) {
        // For individual DMs, use realistic DM generator
        const personName = getPersonNameFromChatId(chatId)
        if (personName) {
          const msg = generateContextualDMMessage(personName, getCurrentUser, chatMessages[selectedChat] || [], pick)
          p = people.find(pp => pp.n === msg.who) || p
          text = msg.text
        } else {
          p = pick(getOtherPeople)
          text = `Hey! Just following up.`
        }
      }
      
      // Get person object to check for traits
      const personObj = getPerson(p.n)
      
      // Enhance message based on person traits
      text = enhanceMessage(text, personObj || { name: p.n, avatar: p.a }, pick)
      
      return {
        id: Math.random().toString(36).slice(2),
        who: p.n,
        text,
        when: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      }
    }
    
    // Run with dynamic interval using recursive setTimeout
    let timeoutId: number | null = null
    
    const scheduleNext = (interval?: number) => {
      const delay = interval !== undefined ? interval : (5000 + Math.floor(Math.random() * 5000))
      timeoutId = window.setTimeout(() => {
        tick()
      }, delay)
    }
    
    const tick = () => {
      setUnreadCounts(currentUnreadCounts => {
        const totalChats = allChatIds.length
        const chatsWithUnread = allChatIds.filter(id => (currentUnreadCounts[id] || 0) > 0).length
        const unreadPercentage = totalChats > 0 ? (chatsWithUnread / totalChats) : 0
        
        // Always keep streaming, but adjust frequency based on unread percentage:
        // - If 0% unread (all read): Stream more aggressively to bring chats back to life
        // - If 30-40% unread: Stream moderately to maintain activity
        // - If >40% unread: Stream less frequently to avoid overwhelming
        
        // If all chats are read (0% unread), we need to start streaming to bring them back to life
        // Otherwise, continue streaming but with appropriate frequency
        if (unreadPercentage > 0.45) {
          // Too many unreads (>45%), reduce streaming frequency by skipping this tick sometimes
          if (Math.random() > 0.3) {
            // Schedule next tick with longer interval
            scheduleNext(10000 + Math.floor(Math.random() * 10000)) // 10-20 seconds
            return currentUnreadCounts // Skip 70% of ticks
          }
        }
        
        // Pick a random chat (excluding currently selected one and CHG-189 if Merc AI's message already exists)
        const availableChats = allChatIds.filter(id => {
          if (id === selectedChat) return false
          // Exclude CHG-189 if Merc AI's message with actions already exists
          if (id === 'CHG-189') {
            const chgMessages = chatMessages['CHG-189'] || []
            const mercAIMessageExists = chgMessages.some(m => 
              m.who === 'Merc AI' && m.text.includes('Risk validation complete')
            )
            return !mercAIMessageExists
          }
          return true
        })
        if (availableChats.length === 0) {
          scheduleNext(5000 + Math.floor(Math.random() * 5000))
          return currentUnreadCounts
        }
        
        const randomChatId = pick(availableChats)
        const newMsg = generateMessageForChat(randomChatId)
        
        if (newMsg) {
          // Add message to the chat
          setChatMessages(prev => {
            const current = prev[randomChatId] || []
            const next = current.concat(newMsg)
            const trimmed = next.slice(-40)
            return { ...prev, [randomChatId]: trimmed }
          })
          
          // Increment unread count if chat is not currently selected
          if (randomChatId !== selectedChat) {
            const updatedCounts = {
              ...currentUnreadCounts,
              [randomChatId]: (currentUnreadCounts[randomChatId] || 0) + 1
            }
            
            // Calculate new percentage after increment
            const newChatsWithUnread = allChatIds.filter(id => (updatedCounts[id] || 0) > 0).length
            const newUnreadPercentage = totalChats > 0 ? (newChatsWithUnread / totalChats) : 0
            
            // Schedule next tick with dynamic interval based on unread percentage
            if (newUnreadPercentage === 0) {
              scheduleNext(3000 + Math.floor(Math.random() * 3000)) // 3-6 seconds - aggressive
            } else if (newUnreadPercentage > 0.4) {
              scheduleNext(10000 + Math.floor(Math.random() * 10000)) // 10-20 seconds - less frequent
            } else {
              scheduleNext(5000 + Math.floor(Math.random() * 5000)) // 5-10 seconds - normal
            }
            
            return updatedCounts
          } else {
            // Message added to selected chat - still schedule next tick but don't increment unread
            // Schedule next tick with dynamic interval
            if (unreadPercentage === 0) {
              scheduleNext(3000 + Math.floor(Math.random() * 3000)) // 3-6 seconds - aggressive
            } else if (unreadPercentage > 0.4) {
              scheduleNext(10000 + Math.floor(Math.random() * 10000)) // 10-20 seconds - less frequent
            } else {
              scheduleNext(5000 + Math.floor(Math.random() * 5000)) // 5-10 seconds - normal
            }
            return currentUnreadCounts
          }
        }
        
        // No message generated - schedule next tick with dynamic interval
        if (unreadPercentage === 0) {
          scheduleNext(3000 + Math.floor(Math.random() * 3000)) // 3-6 seconds - aggressive
        } else if (unreadPercentage > 0.4) {
          scheduleNext(10000 + Math.floor(Math.random() * 10000)) // 10-20 seconds - less frequent
        } else {
          scheduleNext(5000 + Math.floor(Math.random() * 5000)) // 5-10 seconds - normal
        }
        
        return currentUnreadCounts
      })
    }
    
    // Start the first tick
    scheduleNext(5000 + Math.floor(Math.random() * 5000))
    
    // Return cleanup function
    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [selectedChat, chatMessages, people, getOtherPeople, getCurrentUser, starredChats, dmChats, channelChats, unreadCounts])

  // Simulate incoming Slack messages for the selected chat (keep this for when user is viewing a chat)
  useEffect(() => {
    if (!selectedChat || !chatMessages[selectedChat]) return
    
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
    const allChats = [...starredChats, ...dmChats, ...channelChats]
    const chatData = allChats.find(c => c.id === selectedChat)
    if (!chatData) return
    
    const chatName = chatData.name.replace('#', '')
    const isChannel = chatData.type === 'channel' || chatData.type === 'starred'
    const isGroupDM = chatData.id?.startsWith('group-')
    const isDM = chatData.type === 'dm' && !isGroupDM
    
    const mkMsg = (): SlackMsg => {
      let p = pick(getOtherPeople)
      let text = ''
      
      if (selectedChat === 'merc-ai') {
        // Special handling for Merc AI
        p = people.find(pp => pp.n === 'Merc AI') || p
        text = pick([
          `I've updated the analysis for incident #4412.`,
          `New recommendations available based on latest metrics.`,
          `Would you like me to generate a report?`,
        ])
      } else if (isChannel) {
        // Use realistic message generator for channels
        const msg = generateRealisticMessage(selectedChat, chatName, isChannel, isGroupDM, pick)
        p = people.find(pp => pp.n === msg.who) || p
        text = msg.text
      } else if (isGroupDM) {
        // For group DMs, pick someone from the group (not current user)
        const groupMembers = getGroupMembers(chatData.name)
        if (groupMembers.length > 0) {
          const memberName = pick(groupMembers)
          p = people.find(pp => pp.n === memberName) || p
        }
        // Contextual group DM messages based on company description
        const descLower = (companyData.description || '').toLowerCase()
        const hasITSM = descLower.includes('incident') || descLower.includes('itom') || descLower.includes('itsm')
        
        const dmContexts: Record<string, string[]> = hasITSM ? {
          'group-1': ['Hey team! Are you seeing the same incident alerts?', 'Change request looks good to me', 'Monitoring shows all systems operational'],
          'group-2': ['Morning everyone! Quick update - no active incidents', 'Ready for the change window?', 'Let\'s sync up on the deployment'],
          'group-3': ['Update: Change request approved and ready', 'I\'ll review the post-mortem', 'Thanks for helping with the incident'],
          'group-4': ['Status update: All systems operational', 'Infrastructure metrics looking good', 'Keep me posted on the change window'],
          'group-5': ['Hey! Quick question about the monitoring dashboard', 'How\'s the incident response going?', 'All set for the change deployment'],
        } : {
          'group-1': ['Hey team!', 'What do you think?', 'Sounds good to me.'],
          'group-2': ['Morning everyone!', 'Ready for the meeting?', 'Let\'s sync up.'],
          'group-3': ['Update: Changes are ready', 'I\'ll review it', 'Thanks!'],
          'group-4': ['Status update', 'Looking good', 'Keep me posted'],
          'group-5': ['Hey!', 'How\'s it going?', 'All set here'],
        }
        const contexts = dmContexts[selectedChat] || (hasITSM ? [
          `Hey! Quick update - monitoring shows all systems operational`,
          `Thanks for helping with the incident response!`,
          `Change request review completed. Ready for deployment`,
          `Infrastructure metrics within normal ranges`
        ] : [
          `Hey! Just following up.`,
          `Thanks for the help!`,
          `Let me know when you're free.`
        ])
        text = pick(contexts)
      } else if (isDM) {
        // For individual DMs, use realistic DM generator
        const personName = getPersonNameFromChatId(selectedChat)
        if (personName) {
          const msg = generateContextualDMMessage(personName, getCurrentUser, chatMessages[selectedChat] || [], pick)
          p = people.find(pp => pp.n === msg.who) || p
          text = msg.text
        } else {
          // Fallback - generate contextual message
          p = pick(getOtherPeople)
          const person = getPerson(p.n)
          const personRole = person?.role || ''
          const roleLower = personRole.toLowerCase()
          const descLower = (companyData.description || '').toLowerCase()
          const hasITSM = descLower.includes('incident') || descLower.includes('itom') || descLower.includes('itsm')
          
          if (hasITSM) {
            if (roleLower.includes('engineer') || roleLower.includes('developer')) {
              text = `Hey ${getCurrentUser}! Quick question - are you seeing the same incident alerts I am?`
            } else if (roleLower.includes('devops') || roleLower.includes('sre')) {
              text = `Hey ${getCurrentUser}! Quick update - monitoring shows all systems operational`
            } else {
              text = `Hey ${getCurrentUser}! Quick question - do you have a minute to discuss something?`
            }
          } else {
            text = `Hey ${getCurrentUser}! Quick question - do you have a minute?`
          }
        }
      }
      
      // Get person object to check for traits
      const personObj = getPerson(p.n)
      
      // Enhance message based on person traits
      text = enhanceMessage(text, personObj || { name: p.n, avatar: p.a }, pick)
      
      return {
        id: Math.random().toString(36).slice(2),
        who: p.n,
        text,
        when: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      }
    }
    
    const tick = () => {
      setChatMessages(prev => {
        const current = prev[selectedChat] || []
        const next = current.concat(mkMsg())
        const trimmed = next.slice(-40)
        return { ...prev, [selectedChat]: trimmed }
      })
      // Don't scroll here - the useEffect will handle it smoothly
    }
    
    const id = window.setInterval(() => {
      tick()
    }, 8000 + Math.floor(Math.random() * 4000))
    
    return () => window.clearInterval(id)
  }, [selectedChat, chatMessages, people, getOtherPeople, getCurrentUser, starredChats, dmChats, channelChats])

  // Auto-scroll to bottom instantly when switching chats
  useEffect(() => {
    const chatChanged = prevSelectedChatRef.current !== selectedChat
    if (chatChanged && chatMessages[selectedChat] && chatMessages[selectedChat].length > 0) {
      // Instant scroll (no animation) when switching chats
      setTimeout(() => { 
        try { 
          if (slackRootRef.current) {
            slackRootRef.current.scrollTop = slackRootRef.current.scrollHeight
          }
        } catch {} 
      }, 0)
    }
    prevSelectedChatRef.current = selectedChat
  }, [selectedChat, chatMessages])

  // Auto-scroll to bottom smoothly when new messages arrive in the current chat
  useEffect(() => {
    const messageCount = chatMessages[selectedChat]?.length || 0
    const chatChanged = prevSelectedChatRef.current !== selectedChat
    
    // Only scroll if we're still on the same chat (new message, not chat switch)
    if (messageCount > 0 && !chatChanged) {
      setTimeout(() => { 
        try { 
          if (slackRootRef.current) {
            // Always scroll to bottom smoothly when new messages arrive
            slackRootRef.current.scrollTo({ top: slackRootRef.current.scrollHeight, behavior: 'smooth' })
          }
        } catch {} 
      }, 100)
    }
  }, [chatMessages[selectedChat]?.length, selectedChat])

  // Online/offline statuses are now static - no dynamic updates after initial load

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedChat) return
    const newMsg: SlackMsg = {
      id: Math.random().toString(36).slice(2),
      who: currentUserName,
      text: messageInput,
      when: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }
    setChatMessages(prev => {
      const current = prev[selectedChat] || []
      return { ...prev, [selectedChat]: current.concat(newMsg) }
    })
    setMessageInput('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
    setTimeout(() => { 
      try { 
        if (slackRootRef.current) {
          slackRootRef.current.scrollTo({ top: slackRootRef.current.scrollHeight, behavior: 'smooth' })
        }
      } catch {} 
    }, 100)
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value)
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Use layout effect to restore scroll position synchronously before paint
  useLayoutEffect(() => {
    if (scrollAnchorRef.current && slackRootRef.current) {
      const container = slackRootRef.current
      const { scrollHeight: scrollHeightBefore, scrollTop: scrollTopBefore } = scrollAnchorRef.current
      
      const scrollHeightAfter = container.scrollHeight
      const heightDiff = scrollHeightAfter - scrollHeightBefore
      
      if (heightDiff !== 0) {
        // Synchronously adjust scroll position before paint to prevent flicker
        container.scrollTop = scrollTopBefore + heightDiff
        scrollAnchorRef.current = null
      }
    }
  }) // Run on every render, but only acts when scrollAnchorRef is set

  // Helper to capture scroll position before content height changes
  const captureScrollPosition = () => {
    if (!slackRootRef.current) return false
    
    const container = slackRootRef.current
    const scrollHeight = container.scrollHeight
    const scrollTop = container.scrollTop
    const clientHeight = container.clientHeight
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    
    // If we were near the bottom (within 50px), capture position
    const wasNearBottom = distanceFromBottom < 50
    
    if (wasNearBottom) {
      scrollAnchorRef.current = { scrollHeight, scrollTop, clientHeight }
      return true
    }
    
    scrollAnchorRef.current = null
    return false
  }
  
  // Helper to restore scroll position after content height changes
  const restoreScrollPosition = () => {
    if (!slackRootRef.current || !scrollAnchorRef.current) return
    
    const container = slackRootRef.current
    const { scrollHeight: scrollHeightBefore, scrollTop: scrollTopBefore } = scrollAnchorRef.current
    
    // Try immediate synchronous restoration first
    const scrollHeightAfter = container.scrollHeight
    const heightDiff = scrollHeightAfter - scrollHeightBefore
    
    if (heightDiff !== 0) {
      // Immediately adjust scroll position to prevent flicker
      container.scrollTop = scrollTopBefore + heightDiff
      scrollAnchorRef.current = null
    } else {
      // If height hasn't changed yet, wait for DOM update
      requestAnimationFrame(() => {
        if (container && scrollAnchorRef.current) {
          const scrollHeightAfter = container.scrollHeight
          const heightDiff = scrollHeightAfter - scrollHeightBefore
          if (heightDiff !== 0) {
            container.scrollTop = scrollTopBefore + heightDiff
            scrollAnchorRef.current = null
          }
        }
      })
    }
  }

  const handleReaction = (messageId: string, emoji: string) => {
    // Capture scroll position before state update
    const shouldMaintainAnchor = captureScrollPosition()
    
    setChatMessages(prev => {
      const chatMessages = prev[selectedChat] || []
      const messageIndex = chatMessages.findIndex(m => m.id === messageId)
      if (messageIndex === -1) return prev
      
      const message = chatMessages[messageIndex]
      const reactions = message.reactions || {}
      const currentCount = reactions[emoji] || 0
      
      // Check if user has already reacted to this emoji
      const userReactedSet = userReactions[messageId] || new Set<string>()
      const hasUserReacted = userReactedSet.has(emoji)
      
      const newReactions = { ...reactions }
      
      if (hasUserReacted) {
        // User is removing their reaction
        if (currentCount > 1) {
          // If count is greater than 1, just decrement
          newReactions[emoji] = currentCount - 1
        } else {
          // If count is 1 and it's the user's reaction, remove it entirely
          delete newReactions[emoji]
        }
      } else {
        // User is adding their reaction
        newReactions[emoji] = currentCount + 1
      }
      
      // Update user reactions tracking
      setUserReactions(prevReactions => {
        const newUserReactions = { ...prevReactions }
        if (!newUserReactions[messageId]) {
          newUserReactions[messageId] = new Set<string>()
        } else {
          newUserReactions[messageId] = new Set(newUserReactions[messageId])
        }
        
        if (hasUserReacted) {
          newUserReactions[messageId].delete(emoji)
        } else {
          newUserReactions[messageId].add(emoji)
        }
        
        return newUserReactions
      })
      
      const updatedMessage = { ...message, reactions: Object.keys(newReactions).length > 0 ? newReactions : undefined }
      const newChatMessages = [...chatMessages]
      newChatMessages[messageIndex] = updatedMessage
      
      return { ...prev, [selectedChat]: newChatMessages }
    })
    
    // Restore scroll position after state update - useEffect will handle it synchronously
    // No need to call restoreScrollPosition here, useEffect will handle it
  }

  const handleAction = (messageId: string, actionId: string) => {
    setCompletedActions(prev => ({
      ...prev,
      [messageId]: actionId
    }))
    
    // If "Approve change" is clicked in CHG-189, add follow-up messages
    if (selectedChat === 'CHG-189' && actionId === 'approve-change') {
      const followUpMessages: SlackMsg[] = [
        {
          id: `CHG-189-merc-ai-followup-${Date.now()}`,
          who: 'Merc AI',
          text: `🎉 Change approved! The team can proceed with the rollout. All risk validations are complete and stakeholders have been notified.<br><br>Thank you <span style="color: #1D9BD1 !important; font-weight: 600;">@JamesMc</span> for upholding our high standards and ensuring safe, validated changes move forward. This is exactly the kind of rigor that keeps our systems stable and our deployments smooth. Let's ship it! 🚀`,
          when: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        },
        {
          id: `CHG-189-congrats-1-${Date.now()}`,
          who: 'Sarah Kim',
          text: `Awesome! Thanks <span style="color: #1D9BD1 !important; font-weight: 600;">@JamesMc</span> for the quick approval. We'll start the gradual rollout now.`,
          when: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        },
        {
          id: `CHG-189-congrats-2-${Date.now()}`,
          who: 'Paul Bauer',
          text: `Appreciate the thorough review process. Thanks for pushing this through <span style="color: #1D9BD1 !important; font-weight: 600;">@JamesMc</span>! Let's get this implemented! 🚀`,
          when: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        },
        {
          id: `CHG-189-congrats-3-${Date.now()}`,
          who: 'Emma Wilson',
          text: `Thanks ${currentUserName}! Monitoring is all set up and ready to go.`,
          when: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        }
      ]
      
      // Add messages with delays for natural flow (longer delays for organic feel)
      const mercAIMessageId = followUpMessages[0].id
      setTimeout(() => {
        setChatMessages(prev => {
          const current = prev['CHG-189'] || []
          return { ...prev, 'CHG-189': [...current, followUpMessages[0]] }
        })
        
        // Add organic reactions to Merc AI's message
        // First reaction appears after 2000ms (increased delay)
        setTimeout(() => {
          // Capture scroll position before state update
          const shouldMaintainAnchor1 = captureScrollPosition()
          
          setChatMessages(prev => {
            const current = prev['CHG-189'] || []
            const messageIndex = current.findIndex(m => m.id === mercAIMessageId)
            if (messageIndex === -1) return prev
            
            const message = current[messageIndex]
            const reactions = { ...(message.reactions || {}) }
            reactions['🎉'] = 1
            
            const updatedMessage = { ...message, reactions }
            const newMessages = [...current]
            newMessages[messageIndex] = updatedMessage
            
            return { ...prev, 'CHG-189': newMessages }
          })
          
          // Restore scroll position after state update
          if (shouldMaintainAnchor1) {
            restoreScrollPosition()
          }
          
          // Increment first reaction after 600ms
          setTimeout(() => {
            // Capture scroll position before state update
            const shouldMaintainAnchor2 = captureScrollPosition()
            
            setChatMessages(prev => {
              const current = prev['CHG-189'] || []
              const messageIndex = current.findIndex(m => m.id === mercAIMessageId)
              if (messageIndex === -1) return prev
              
              const message = current[messageIndex]
              const reactions = { ...(message.reactions || {}) }
              reactions['🎉'] = (reactions['🎉'] || 0) + 1
              
              const updatedMessage = { ...message, reactions }
              const newMessages = [...current]
              newMessages[messageIndex] = updatedMessage
              
              return { ...prev, 'CHG-189': newMessages }
            })
            
            // Restore scroll position after state update
            if (shouldMaintainAnchor2) {
              restoreScrollPosition()
            }
          }, 600)
          
          // Second reaction appears after 1200ms from first
          setTimeout(() => {
            // Capture scroll position before state update
            const shouldMaintainAnchor3 = captureScrollPosition()
            
            setChatMessages(prev => {
              const current = prev['CHG-189'] || []
              const messageIndex = current.findIndex(m => m.id === mercAIMessageId)
              if (messageIndex === -1) return prev
              
              const message = current[messageIndex]
              const reactions = { ...(message.reactions || {}) }
              reactions['🚀'] = 1
              
              const updatedMessage = { ...message, reactions }
              const newMessages = [...current]
              newMessages[messageIndex] = updatedMessage
              
              return { ...prev, 'CHG-189': newMessages }
            })
            
            // Restore scroll position after state update
            if (shouldMaintainAnchor3) {
              restoreScrollPosition()
            }
            
            // Increment both reactions after 500ms
            setTimeout(() => {
              // Capture scroll position before state update
              const shouldMaintainAnchor4 = captureScrollPosition()
              
              setChatMessages(prev => {
                const current = prev['CHG-189'] || []
                const messageIndex = current.findIndex(m => m.id === mercAIMessageId)
                if (messageIndex === -1) return prev
                
                const message = current[messageIndex]
                const reactions = { ...(message.reactions || {}) }
                reactions['🚀'] = (reactions['🚀'] || 0) + 1
                
                const updatedMessage = { ...message, reactions }
                const newMessages = [...current]
                newMessages[messageIndex] = updatedMessage
                
                return { ...prev, 'CHG-189': newMessages }
              })
              
              // Restore scroll position after state update
              if (shouldMaintainAnchor4) {
                restoreScrollPosition()
              }
              
              // Increment first reaction slowly after another 800ms
              setTimeout(() => {
                // Capture scroll position before state update
                const shouldMaintainAnchor5 = captureScrollPosition()
                
                setChatMessages(prev => {
                  const current = prev['CHG-189'] || []
                  const messageIndex = current.findIndex(m => m.id === mercAIMessageId)
                  if (messageIndex === -1) return prev
                  
                  const message = current[messageIndex]
                  const reactions = { ...(message.reactions || {}) }
                  reactions['🎉'] = (reactions['🎉'] || 0) + 1
                  
                  const updatedMessage = { ...message, reactions }
                  const newMessages = [...current]
                  newMessages[messageIndex] = updatedMessage
                  
                  return { ...prev, 'CHG-189': newMessages }
                })
                
                // Restore scroll position after state update
                if (shouldMaintainAnchor5) {
                  restoreScrollPosition()
                }
              }, 800)
            }, 500)
            
            // Third reaction appears after 1000ms from second
            setTimeout(() => {
              // Capture scroll position before state update
              const shouldMaintainAnchor6 = captureScrollPosition()
              
              setChatMessages(prev => {
                const current = prev['CHG-189'] || []
                const messageIndex = current.findIndex(m => m.id === mercAIMessageId)
                if (messageIndex === -1) return prev
                
                const message = current[messageIndex]
                const reactions = { ...(message.reactions || {}) }
                reactions['👏'] = 1
                
                const updatedMessage = { ...message, reactions }
                const newMessages = [...current]
                newMessages[messageIndex] = updatedMessage
                
                return { ...prev, 'CHG-189': newMessages }
              })
              
              // Restore scroll position after state update
              if (shouldMaintainAnchor6) {
                restoreScrollPosition()
              }
              
              // Increment third reaction after 400ms
              setTimeout(() => {
                // Capture scroll position before state update
                const shouldMaintainAnchor7 = captureScrollPosition()
                
                setChatMessages(prev => {
                  const current = prev['CHG-189'] || []
                  const messageIndex = current.findIndex(m => m.id === mercAIMessageId)
                  if (messageIndex === -1) return prev
                  
                  const message = current[messageIndex]
                  const reactions = { ...(message.reactions || {}) }
                  reactions['👏'] = (reactions['👏'] || 0) + 1
                  
                  const updatedMessage = { ...message, reactions }
                  const newMessages = [...current]
                  newMessages[messageIndex] = updatedMessage
                  
                  return { ...prev, 'CHG-189': newMessages }
                })
                
                // Restore scroll position after state update
                if (shouldMaintainAnchor7) {
                  restoreScrollPosition()
                }
              }, 400)
            }, 1000)
          }, 1200)
        }, 800)
      }, 500)
      
      // Add congratulatory messages with organic delays (longer and more varied)
      const delays = [5000, 8000, 11000] // 5s, 8s, 11s delays for more organic flow (increased)
      followUpMessages.slice(1).forEach((msg, idx) => {
        setTimeout(() => {
          setChatMessages(prev => {
            const current = prev['CHG-189'] || []
            return { ...prev, 'CHG-189': [...current, msg] }
          })
        }, delays[idx])
      })
    }
  }

  const handleAddReaction = (messageId: string, emoji: string) => {
    // Capture scroll position before state update
    const shouldMaintainAnchor = captureScrollPosition()
    
    setChatMessages(prev => {
      const chatMessages = prev[selectedChat] || []
      const messageIndex = chatMessages.findIndex(m => m.id === messageId)
      if (messageIndex === -1) return prev
      
      const message = chatMessages[messageIndex]
      const reactions = message.reactions || {}
      const currentCount = reactions[emoji] || 0
      
      // Check if user has already reacted to this emoji
      const userReactedSet = userReactions[messageId] || new Set<string>()
      const hasUserReacted = userReactedSet.has(emoji)
      
      // If user already reacted, don't add again
      if (hasUserReacted) return prev
      
      const newReactions = { ...reactions, [emoji]: currentCount + 1 }
      const updatedMessage = { ...message, reactions: newReactions }
      const newChatMessages = [...chatMessages]
      newChatMessages[messageIndex] = updatedMessage
      
      // Update user reactions tracking
      setUserReactions(prevReactions => {
        const newUserReactions = { ...prevReactions }
        if (!newUserReactions[messageId]) {
          newUserReactions[messageId] = new Set<string>()
        } else {
          newUserReactions[messageId] = new Set(newUserReactions[messageId])
        }
        newUserReactions[messageId].add(emoji)
        return newUserReactions
      })
      
      return { ...prev, [selectedChat]: newChatMessages }
    })
    
    // Restore scroll position after state update
    if (shouldMaintainAnchor) {
      restoreScrollPosition()
    }
  }

  // Fixed member counts for each chat (consistent across renders)
  // General channel has the highest count (triple digits)
  const GENERAL_CHANNEL_COUNT = 750
  
  const memberCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    
    // General channel has the highest count (triple digits)
    counts['general'] = GENERAL_CHANNEL_COUNT
    
    // Get all channels from channel-config.json
    const allChannels = [
      ...(channelConfig.starred || []),
      ...(channelConfig.public || []),
      ...((channelConfig.private || []) as Array<{ id: string }>)
    ]
    
    // Generate member counts for all channels dynamically
    // Ensure all counts are less than general channel count
    allChannels.forEach((channel, index) => {
      if (channel.id === 'general') {
        counts['general'] = GENERAL_CHANNEL_COUNT
      } else {
        // Generate a deterministic count based on channel ID hash
        // Range: 15 to 99 (less than 100, always less than general)
        let hash = 0
        for (let i = 0; i < channel.id.length; i++) {
          hash = channel.id.charCodeAt(i) + ((hash << 5) - hash)
        }
        // Use hash to generate count between 15 and 99
        const count = 15 + (Math.abs(hash) % 85) // 85 = 99 - 15 + 1
        counts[channel.id] = count
      }
    })
    
    // Group DMs - count based on actual number of people in the group
    const groupDMs = (channelConfig.groupDMs as Array<{ id: string; name: string; members?: string[] }> | undefined) || []
    groupDMs.forEach(group => {
      // Count actual members, or parse from name if members array not available
      if (group.members && group.members.length > 0) {
        counts[group.id] = group.members.length
      } else {
        // Parse from name (e.g., "David Chen, Mia Zimmermann, Henry Martin" = 3)
        const memberCount = group.name.split(',').length
        counts[group.id] = memberCount
      }
    })
    
    // Hardcoded fallbacks for known channels (if not in config)
    // All counts are between 15-99 (less than 100)
    const fallbackCounts: Record<string, number> = {
      'itom-4412': 85,
      'incidents': 72,
      'alerts': 68,
      'chg-review': 55,
      'CHG-189': 26,
      'dev-ops': 48,
      'engineering': 92,
      'backend': 45,
      'frontend': 42,
      'infrastructure': 38,
      'security': 35,
      'sre': 32,
      'oncall': 28,
      'deployments': 26,
      'monitoring': 24,
      'ci-cd': 22,
      'kubernetes': 20,
      'aws': 18,
      'database': 16,
      'api': 15,
      'mobile': 15,
      'qa': 15,
      'design': 15,
      'product': 25,
      'sales': 30,
      'support': 35,
      'marketing': 28,
      'itom-alerts': 45,
      'itsm-incidents': 52,
      'on-call': 28,
      'itom-critical': 18,
      'itsm-security': 22,
      'change-approval': 15,
      'leadership-ops': 12, // Will be clamped to 15
      'post-mortems': 20
    }
    
    // Apply fallbacks only if channel doesn't already have a count
    Object.keys(fallbackCounts).forEach(channelId => {
      if (!counts[channelId]) {
        counts[channelId] = fallbackCounts[channelId]
      }
    })
    
    // Ensure all counts are between 15-99 (less than 100, always less than general)
    Object.keys(counts).forEach(channelId => {
      if (channelId !== 'general') {
        if (counts[channelId] < 15) {
          counts[channelId] = 15
        } else if (counts[channelId] >= 100) {
          counts[channelId] = 99
        }
        // Also ensure it's less than general
        if (counts[channelId] >= GENERAL_CHANNEL_COUNT) {
          counts[channelId] = 99
        }
      }
    })
    
    return counts
  }, [])

  const currentChat = [...starredChats, ...dmChats, ...channelChats].find(c => c.id === selectedChat)

  // Safety check: if currentChat is not found, use first starred chat
  useEffect(() => {
    if (!currentChat && starredChats.length > 0) {
      setSelectedChat(starredChats[0].id)
    }
  }, [currentChat, starredChats])

  // Don't render if no chat is selected
  if (!currentChat) {
    return (
      <div style={{ padding: 20, color: 'white', background: '#000' }}>
        Loading... (starredChats: {starredChats.length}, dmChats: {dmChats.length}, channelChats: {channelChats.length}, selectedChat: {selectedChat})
      </div>
    )
  }

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      overflow: 'hidden', 
      background: currentTheme.colors.leftmostPanel,
      fontFamily: 'Lato, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      {/* Leftmost Panel - Icon Bar */}
      <div style={{ 
        width: 60, 
        background: '#000000', 
        display: 'flex', 
        flexDirection: 'column',
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        paddingBottom: 12,
        gap: 8
      }}>
        {/* Company Logo */}
        <div style={{ marginBottom: 8 }}>
          {companyData.logo ? (
            <img 
              src={companyData.logo} 
              alt={companyData.name} 
              width={40} 
              height={40} 
              style={{ 
                display: 'block',
                borderRadius: 8,
                objectFit: 'contain'
              }} 
            />
          ) : (
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: '#0052CC',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 600,
              fontFamily: 'Lato, sans-serif'
            }}>
              {(companyData as any).logoInitials || companyData.name?.substring(0, 2).toUpperCase() || 'CO'}
            </div>
          )}
        </div>
        
        {/* Vertical Square Icon Containers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', alignItems: 'center', flex: 1 }}>
          {/* Home */}
          <div 
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}
          >
            <div style={{ 
              width: 40, 
              height: 40, 
              background: 'rgba(255, 255, 255, 0.18)', 
              borderRadius: 8, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffffff' }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <span style={{ fontSize: 11, color: '#ffffff', fontFamily: 'Lato, sans-serif', fontWeight: 400 }}>Home</span>
          </div>
          
          {/* DMs */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <div style={{ 
              width: 40, 
              height: 40, 
              background: 'transparent', 
              borderRadius: 4, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#9ca3af' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'Lato, sans-serif', fontWeight: 400 }}>DMs</span>
          </div>
          
          {/* Activity */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <div style={{ 
              width: 40, 
              height: 40, 
              background: 'transparent', 
              borderRadius: 4, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#9ca3af' }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'Lato, sans-serif', fontWeight: 400 }}>Activity</span>
          </div>
          
          {/* Files */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <div style={{ 
              width: 40, 
              height: 40, 
              background: 'transparent', 
              borderRadius: 4, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#9ca3af' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'Lato, sans-serif', fontWeight: 400 }}>Files</span>
          </div>
          
          {/* Later */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <div style={{ 
              width: 40, 
              height: 40, 
              background: 'transparent', 
              borderRadius: 4, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#9ca3af' }}>
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'Lato, sans-serif', fontWeight: 400 }}>Later</span>
          </div>
          
          {/* More */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <div style={{ 
              width: 40, 
              height: 40, 
              background: 'transparent', 
              borderRadius: 4, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#9ca3af' }}>
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="19" cy="12" r="1"></circle>
                <circle cx="5" cy="12" r="1"></circle>
              </svg>
            </div>
            <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'Lato, sans-serif', fontWeight: 400 }}>More</span>
          </div>
        </div>

        {/* User Avatar */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {/* Theme Selector */}
          <div style={{ position: 'relative', width: 32 }}>
            <select
              value={currentThemeId}
              onChange={(e) => setCurrentThemeId(e.target.value)}
              style={{
                height: 24,
                width: '100%',
                padding: '0 18px 0 4px',
                fontSize: 10,
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 4,
                color: 'transparent',
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'Lato, sans-serif',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
              }}
            >
              {availableThemes.map(theme => (
                <option key={theme.id} value={theme.id}>{theme.name}</option>
              ))}
            </select>
            <div style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid rgba(255, 255, 255, 0.7)',
            }} />
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden' }}>
              {(() => {
                const avatar = getAvatar(currentUserName)
                if (avatar) {
                  return <img src={avatar} alt={currentUserName} width={40} height={40} style={{ borderRadius: 8, objectFit: 'cover', display: 'block' }} onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent && !parent.querySelector('.avatar-initials')) {
                      const initialsDiv = document.createElement('div')
                      initialsDiv.className = 'avatar-initials'
                      initialsDiv.textContent = getInitials(currentUserName)
                      initialsDiv.style.cssText = `
                        width: 40px;
                        height: 40px;
                        border-radius: 8px;
                        background: ${getAvatarColor(currentUserName)};
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 600;
                        font-size: 16px;
                      `
                      parent.appendChild(initialsDiv)
                    }
                  }} />
                } else {
                  return (
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: getAvatarColor(currentUserName),
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: 16
                    }}>
                      {getInitials(currentUserName)}
                    </div>
                  )
                }
              })()}
            </div>
            {/* Online status dot */}
            <>
              {/* Background mask - creates space between avatar and dot */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: -3,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#1a1d21',
                  border: '1.5px solid #1a1d21',
                  zIndex: 1,
                }}
              />
              {/* Status dot */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#2eb886',
                  zIndex: 2,
                }}
              />
            </>
          </div>
        </div>
      </div>

      {/* Left Panel - Chat List */}
      <div style={{ 
        width: sidebarWidth, 
        background: currentTheme.colors.sidebarBackground, 
        display: 'flex', 
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        {/* Chat List Header - Sticky */}
        <div style={{ 
          padding: '23px 16px 16px 16px', 
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          background: currentTheme.colors.sidebarBackground,
          zIndex: 10,
        }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: getTextColor.primary, fontFamily: 'Lato, sans-serif', lineHeight: 1, display: 'flex', alignItems: 'center', height: 18 }}>{companyData.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Settings Icon */}
            <button
              style={{
                width: 20,
                height: 20,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: getTextColor.secondary,
                cursor: 'pointer',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                borderRadius: 2,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = currentTheme.colors.hoverBackground
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
              onClick={() => {}}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            {/* New Message Icon */}
            <button
              style={{
                width: 20,
                height: 20,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: getTextColor.secondary,
                cursor: 'pointer',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                borderRadius: 2,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = currentTheme.colors.hoverBackground
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
              onClick={() => {}}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Chat List Items - Scrollable */}
        <div 
          className="no-scrollbars"
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          } as React.CSSProperties & { scrollbarWidth: string; msOverflowStyle: string }}
        >
          {/* Navigation Items */}
          <div style={{ padding: '8px 0', borderBottom: `1px solid ${currentTheme.colors.separator}` }}>
            {[
              { 
                id: 'threads', 
                label: 'Threads', 
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    <path d="M13 7H7"></path>
                    <path d="M17 11H7"></path>
                  </svg>
                )
              },
              { 
                id: 'huddles', 
                label: 'Huddles', 
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
                  </svg>
                )
              },
              { 
                id: 'drafts', 
                label: 'Drafts & sent', 
                icon: (
                  <img 
                    src="/assets/send-horizontal.svg" 
                    alt="drafts & sent" 
                    width={20} 
                    height={20} 
                    style={{ 
                      display: 'block',
                      filter: currentTheme.type === 'dark' ? 'brightness(0) invert(1)' : 'brightness(0)',
                      opacity: 0.82
                    }} 
                  />
                )
              },
              { 
                id: 'directories', 
                label: 'Directories', 
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                )
              },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {}}
                style={{
                  width: 'calc(100% - 8px)',
                  margin: '0 4px',
                  padding: '5px 12px',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: getTextColor.secondary,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  borderRadius: 6,
                  fontFamily: 'Lato, sans-serif',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  const highlight = e.currentTarget.querySelector('.highlight-bg') as HTMLElement
                  if (highlight) highlight.style.background = currentTheme.colors.hoverBackground
                }}
                onMouseLeave={(e) => {
                  const highlight = e.currentTarget.querySelector('.highlight-bg') as HTMLElement
                  if (highlight) highlight.style.background = 'transparent'
                }}
              >
                <div className="highlight-bg" style={{
                  position: 'absolute',
                  left: 4,
                  right: 4,
                  top: 0,
                  bottom: 0,
                  borderRadius: 6,
                  background: 'transparent',
                  pointerEvents: 'none',
                  zIndex: 0,
                }} />
                <div style={{ 
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                }}>
                  <div style={{ 
                    width: 20, 
                    height: 20, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: getTextColor.secondary
                  }}>
                    {item.icon}
                  </div>
                  <span>{item.label}</span>
                </div>
              </button>
            ))}
          </div>
          {/* Starred Section */}
          <div style={{ marginTop: 20, marginBottom: 8 }}>
            <div 
              style={{ padding: '4px 16px', fontSize: 15, fontWeight: 400, color: getTextColor.sectionHeader, fontFamily: 'Lato, sans-serif', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
              onClick={() => setCollapsedSections(prev => ({ ...prev, starred: !prev.starred }))}
              onMouseEnter={(e) => {
                const iconBox = e.currentTarget.querySelector('.section-icon-box') as HTMLElement
                if (iconBox) {
                  iconBox.style.background = currentTheme.colors.border
                }
              }}
              onMouseLeave={(e) => {
                const iconBox = e.currentTarget.querySelector('.section-icon-box') as HTMLElement
                if (iconBox) {
                  iconBox.style.background = 'transparent'
                }
              }}
            >
              <div className="section-icon-box" style={{ width: 20, height: 20, borderRadius: 5, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s ease' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill={getTextColor.sectionHeader} stroke={getTextColor.sectionHeader} strokeWidth="0.5"/>
                </svg>
              </div>
              Starred
            </div>
            {!collapsedSections.starred && starredChats.map((chat) => {
              const isActive = selectedChat === chat.id
              const channelName = chat.name.startsWith('#') ? chat.name.slice(1) : chat.name
              return (
                <button
                  key={chat.id}
                  onClick={() => handleChatSelect(chat.id)}
                  style={{
                    width: 'calc(100% - 8px)',
                    margin: '0 4px',
                    padding: '5px 12px',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                  background: 'transparent',
                  color: isActive ? getTextColor.primary : ((chat.unread !== undefined && chat.unread > 0) ? (currentTheme.type === 'light' ? '#1d1c1d' : '#ffffff') : getTextColor.secondary),
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 15,
                    fontWeight: (chat.unread !== undefined && chat.unread > 0) ? 900 : 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: 6,
                    fontFamily: 'Lato, sans-serif',
                    gap: 12,
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      const highlight = e.currentTarget.querySelector('.highlight-bg') as HTMLElement
                      if (highlight) highlight.style.background = currentTheme.colors.hoverBackground
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      const highlight = e.currentTarget.querySelector('.highlight-bg') as HTMLElement
                      if (highlight) highlight.style.background = 'transparent'
                    }
                  }}
                >
                  <div className="highlight-bg" style={{
                    position: 'absolute',
                    left: 4,
                    right: 4,
                    top: 0,
                    bottom: 0,
                    borderRadius: 6,
                    background: isActive ? currentTheme.colors.activeBackground : 'transparent',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }} />
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: currentTheme.colors.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {chat.isPrivate ? (
                        <img 
                          src="/assets/lock.svg" 
                          alt="lock" 
                          width={14} 
                          height={14} 
                          style={{ 
                            display: 'block',
                            filter: currentTheme.type === 'dark' ? 'brightness(0) invert(1)' : 'brightness(0)',
                            opacity: 0.6
                          }} 
                        />
                      ) : (
                        <span style={{ fontSize: 14, color: getTextColor.tertiary, fontWeight: 400 }}>#</span>
                      )}
                    </div>
                    <span style={{ fontWeight: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channelName}</span>
                  </div>
                  {chat.unread !== undefined && chat.unread > 0 && (
                    <span
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        minWidth: 18,
                        height: 18,
                        padding: '0 6px',
                        borderRadius: 12,
                        background: currentTheme.colors.unreadPill,
                        color: currentTheme.colors.unreadPillText,
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {chat.unread}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Direct Messages Section */}
          <div style={{ marginTop: 20, marginBottom: 8 }}>
            <div 
              style={{ padding: '4px 16px', fontSize: 15, fontWeight: 400, color: getTextColor.sectionHeader, fontFamily: 'Lato, sans-serif', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
              onClick={() => setCollapsedSections(prev => ({ ...prev, directMessages: !prev.directMessages }))}
              onMouseEnter={(e) => {
                const iconBox = e.currentTarget.querySelector('.section-icon-box') as HTMLElement
                if (iconBox) {
                  iconBox.style.background = currentTheme.colors.border
                }
              }}
              onMouseLeave={(e) => {
                const iconBox = e.currentTarget.querySelector('.section-icon-box') as HTMLElement
                if (iconBox) {
                  iconBox.style.background = 'transparent'
                }
              }}
            >
              <div className="section-icon-box" style={{ width: 20, height: 20, borderRadius: 5, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s ease' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: collapsedSections.directMessages ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                  <path d="M7 10L12 15L17 10H7Z" fill={getTextColor.sectionHeader} stroke={getTextColor.sectionHeader} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              Direct messages
            </div>
            {!collapsedSections.directMessages && dmChats.map((chat) => {
              const isActive = selectedChat === chat.id
              const isGroup = chat.id.startsWith('group-')
              // For group DMs, show first two avatars or a group icon
              const getGroupAvatars = () => {
                if (!isGroup) return []
                const names = chat.name.split(', ').slice(0, 2)
                return names.map(name => {
                  const person = people.find(p => p.n === name.trim())
                  return person?.a || '/assets/avatar.png'
                })
              }
              return (
                <button
                  key={chat.id}
                  onClick={() => handleChatSelect(chat.id)}
                  style={{
                    width: 'calc(100% - 8px)',
                    margin: '0 4px',
                    padding: '5px 12px',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                  background: 'transparent',
                  color: isActive ? getTextColor.primary : ((chat.unread !== undefined && chat.unread > 0) ? (currentTheme.type === 'light' ? '#1d1c1d' : '#ffffff') : getTextColor.secondary),
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 15,
                    fontWeight: (chat.unread !== undefined && chat.unread > 0) ? 900 : 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: 6,
                    fontFamily: 'Lato, sans-serif',
                    gap: 12,
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    const highlight = e.currentTarget.querySelector('.highlight-bg') as HTMLElement
                    if (highlight) {
                      highlight.style.background = isActive ? currentTheme.colors.activeBackground : currentTheme.colors.hoverBackground
                    }
                    // Update grey dot colors on hover
                    const greyDotMask = e.currentTarget.querySelector('.grey-dot-mask') as HTMLElement
                    const greyDotInner = e.currentTarget.querySelector('.grey-dot-inner') as HTMLElement
                    if (greyDotMask) {
                      greyDotMask.style.background = isActive ? currentTheme.colors.activeBackground : currentTheme.colors.hoverBackground
                      greyDotMask.style.borderColor = isActive ? currentTheme.colors.activeBackground : currentTheme.colors.hoverBackground
                    }
                    if (greyDotInner) {
                      greyDotInner.style.background = isActive ? currentTheme.colors.activeBackground : currentTheme.colors.hoverBackground
                    }
                    // Update green dot border color on hover
                    const greenDot = e.currentTarget.querySelector('.green-dot') as HTMLElement
                    if (greenDot) {
                      greenDot.style.borderColor = isActive ? currentTheme.colors.activeBackground : currentTheme.colors.hoverBackground
                    }
                    // Update group avatar image border color on hover
                    const groupAvatarImgs = e.currentTarget.querySelectorAll('[data-group-avatar="true"]')
                    groupAvatarImgs.forEach((img) => {
                      const imgEl = img as HTMLElement
                      const borderColor = isActive ? currentTheme.colors.activeBackground : currentTheme.colors.hoverBackground
                      imgEl.style.setProperty('border', `1px solid ${borderColor}`, 'important')
                    })
                  }}
                  onMouseLeave={(e) => {
                    const highlight = e.currentTarget.querySelector('.highlight-bg') as HTMLElement
                    if (highlight) {
                      highlight.style.background = isActive ? currentTheme.colors.activeBackground : 'transparent'
                    }
                    // Reset grey dot colors on hover leave
                    const greyDotMask = e.currentTarget.querySelector('.grey-dot-mask') as HTMLElement
                    const greyDotInner = e.currentTarget.querySelector('.grey-dot-inner') as HTMLElement
                    if (greyDotMask) {
                      greyDotMask.style.background = isActive ? currentTheme.colors.activeBackground : currentTheme.colors.sidebarBackground
                      greyDotMask.style.borderColor = isActive ? currentTheme.colors.activeBackground : currentTheme.colors.sidebarBackground
                    }
                    if (greyDotInner) {
                      greyDotInner.style.background = isActive ? currentTheme.colors.activeBackground : currentTheme.colors.sidebarBackground
                    }
                    // Reset green dot border color on hover leave
                    const greenDot = e.currentTarget.querySelector('.green-dot') as HTMLElement
                    if (greenDot) {
                      greenDot.style.borderColor = isActive ? currentTheme.colors.activeBackground : currentTheme.colors.sidebarBackground
                    }
                    // Reset group avatar image border color on hover leave
                    const groupAvatarImgs = e.currentTarget.querySelectorAll('[data-group-avatar="true"]')
                    groupAvatarImgs.forEach((img) => {
                      const imgEl = img as HTMLElement
                      const borderColor = isActive ? currentTheme.colors.activeBackground : currentTheme.colors.avatarBorder
                      imgEl.style.setProperty('border', `1px solid ${borderColor}`, 'important')
                    })
                  }}
                >
                  <div className="highlight-bg" style={{
                    position: 'absolute',
                    left: 4,
                    right: 4,
                    top: 0,
                    bottom: 0,
                    borderRadius: 6,
                    background: isActive ? currentTheme.colors.activeBackground : 'transparent',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }} />
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    {isGroup ? (
                      <div style={{ width: 20, height: 20, position: 'relative', flexShrink: 0 }}>
                        {getGroupAvatars().map((avatar, idx) => {
                          const isLastAvatar = idx === getGroupAvatars().length - 1
                          const avatarWidth = idx === 0 ? 14 : 12
                          const avatarHeight = idx === 0 ? 14 : 12
                          const avatarLeft = idx === 0 ? 0 : 8
                          const avatarTop = idx === 0 ? 0 : 6
                          return (
                            <React.Fragment key={idx}>
                              <img
                                src={avatar}
                                alt=""
                                width={avatarWidth}
                                height={avatarHeight}
                                className={isLastAvatar ? "group-avatar-img" : undefined}
                                data-group-avatar={isLastAvatar ? "true" : undefined}
                                style={{
                                  position: 'absolute',
                                  left: avatarLeft,
                                  top: avatarTop,
                                  borderRadius: 5,
                                  objectFit: 'cover',
                                  border: `1px solid ${isActive ? currentTheme.colors.activeBackground : currentTheme.colors.avatarBorder}`,
                                  zIndex: 1,
                                }}
                              />
                            </React.Fragment>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ width: 20, height: 20, flexShrink: 0, position: 'relative' }}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, overflow: 'hidden' }}>
                          {(() => {
                            const avatar = chat.avatar || getAvatar(chat.name)
                            if (avatar) {
                              return <img src={avatar} alt={chat.name} width={20} height={20} style={{ display: 'block', objectFit: 'cover' }} onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent && !parent.querySelector('.avatar-initials')) {
                                  const initialsDiv = document.createElement('div')
                                  initialsDiv.className = 'avatar-initials'
                                  initialsDiv.textContent = getInitials(chat.name)
                                  initialsDiv.style.cssText = `
                                    width: 20px;
                                    height: 20px;
                                    border-radius: 5px;
                                    background: ${getAvatarColor(chat.name)};
                                    color: white;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-weight: 600;
                                    font-size: 10px;
                                  `
                                  parent.appendChild(initialsDiv)
                                }
                              }} />
                            } else {
                              return (
                                <div style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: 5,
                                  background: getAvatarColor(chat.name),
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 600,
                                  fontSize: 10
                                }}>
                                  {getInitials(chat.name)}
                                </div>
                              )
                            }
                          })()}
                        </div>
                        {/* Status circle - green for online, grey for offline (only show for real people, not system accounts) */}
                        {chat.isOnline !== undefined && (chat.isOnline === false) ? (
                          <>
                            {/* Outer circle - mask/background */}
                            <div
                              className="grey-dot-mask"
                              style={{
                                position: 'absolute',
                                bottom: -1,
                                right: 0,
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: isActive ? currentTheme.colors.activeBackground : currentTheme.colors.sidebarBackground,
                                border: `2px solid ${isActive ? currentTheme.colors.activeBackground : currentTheme.colors.sidebarBackground}`,
                                transform: 'translateX(2px)',
                                zIndex: 1,
                                boxSizing: 'border-box',
                              }}
                            >
                              {/* Inner circle - grey border (same size as green dot) */}
                              <div
                                className="grey-dot-inner"
                                style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background: isActive ? currentTheme.colors.activeBackground : currentTheme.colors.sidebarBackground,
                                  border: `1.5px solid ${currentTheme.colors.offlineStatus}`,
                                  transform: 'translate(-50%, -50%)',
                                  zIndex: 2,
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>
                          </>
                        ) : chat.isOnline === true ? (
                          <div
                            className="green-dot"
                            style={{
                              position: 'absolute',
                              bottom: -1,
                              right: 0,
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: currentTheme.colors.onlineStatus,
                              border: `2px solid ${isActive ? currentTheme.colors.activeBackground : currentTheme.colors.sidebarBackground}`,
                              transform: 'translateX(2px)',
                              zIndex: 2,
                            }}
                          />
                        ) : null}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.name}</span>
                      {!isGroup && chat.statusEmoji && (
                        <span style={{ fontSize: 14, flexShrink: 0 }}>{chat.statusEmoji}</span>
                      )}
                    </div>
                  </div>
                  {chat.unread !== undefined && chat.unread > 0 && (
                    <span
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        minWidth: 18,
                        height: 18,
                        padding: '0 6px',
                        borderRadius: 12,
                        background: currentTheme.colors.unreadPill,
                        color: currentTheme.colors.unreadPillText,
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {chat.unread}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Channels Section */}
          <div style={{ marginTop: 20, marginBottom: 8 }}>
            <div 
              style={{ padding: '4px 16px', fontSize: 15, fontWeight: 400, color: getTextColor.sectionHeader, fontFamily: 'Lato, sans-serif', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
              onClick={() => setCollapsedSections(prev => ({ ...prev, channels: !prev.channels }))}
              onMouseEnter={(e) => {
                const iconBox = e.currentTarget.querySelector('.section-icon-box') as HTMLElement
                if (iconBox) {
                  iconBox.style.background = currentTheme.colors.border
                }
              }}
              onMouseLeave={(e) => {
                const iconBox = e.currentTarget.querySelector('.section-icon-box') as HTMLElement
                if (iconBox) {
                  iconBox.style.background = 'transparent'
                }
              }}
            >
              <div className="section-icon-box" style={{ width: 20, height: 20, borderRadius: 5, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s ease' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: collapsedSections.channels ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                  <path d="M7 10L12 15L17 10H7Z" fill={getTextColor.sectionHeader} stroke={getTextColor.sectionHeader} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              Channels
            </div>
            {!collapsedSections.channels && channelChats.map((chat) => {
              const isActive = selectedChat === chat.id
              const channelName = chat.name.startsWith('#') ? chat.name.slice(1) : chat.name
              return (
                <button
                  key={chat.id}
                  onClick={() => handleChatSelect(chat.id)}
                  style={{
                    width: 'calc(100% - 8px)',
                    margin: '0 4px',
                    padding: '5px 12px',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                  background: 'transparent',
                  color: isActive ? getTextColor.primary : ((chat.unread !== undefined && chat.unread > 0) ? (currentTheme.type === 'light' ? '#1d1c1d' : '#ffffff') : getTextColor.secondary),
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 15,
                    fontWeight: (chat.unread !== undefined && chat.unread > 0) ? 900 : 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: 6,
                    fontFamily: 'Lato, sans-serif',
                    gap: 12,
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      const highlight = e.currentTarget.querySelector('.highlight-bg') as HTMLElement
                      if (highlight) highlight.style.background = currentTheme.colors.hoverBackground
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      const highlight = e.currentTarget.querySelector('.highlight-bg') as HTMLElement
                      if (highlight) highlight.style.background = 'transparent'
                    }
                  }}
                >
                  <div className="highlight-bg" style={{
                    position: 'absolute',
                    left: 4,
                    right: 4,
                    top: 0,
                    bottom: 0,
                    borderRadius: 6,
                    background: isActive ? currentTheme.colors.activeBackground : 'transparent',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }} />
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: currentTheme.colors.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {chat.isPrivate ? (
                        <img 
                          src="/assets/lock.svg" 
                          alt="lock" 
                          width={14} 
                          height={14} 
                          style={{ 
                            display: 'block',
                            filter: currentTheme.type === 'dark' ? 'brightness(0) invert(1)' : 'brightness(0)',
                            opacity: 0.6
                          }} 
                        />
                      ) : (
                        <span style={{ fontSize: 14, color: getTextColor.tertiary, fontWeight: 400 }}>#</span>
                      )}
                    </div>
                    <span style={{ fontWeight: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channelName}</span>
                  </div>
                  {chat.unread !== undefined && chat.unread > 0 && (
                    <span
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        minWidth: 18,
                        height: 18,
                        padding: '0 6px',
                        borderRadius: 12,
                        background: currentTheme.colors.unreadPill,
                        color: currentTheme.colors.unreadPillText,
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {chat.unread}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Resizable Separator - Single 1px Line */}
      <div 
        ref={resizeRef}
        onMouseDown={(e) => {
          e.preventDefault()
          setIsResizing(true)
        }}
        style={{ 
          width: '1px',
          minWidth: '1px',
          maxWidth: '1px',
          background: currentTheme.colors.separator,
          flexShrink: 0,
          cursor: 'col-resize',
          position: 'relative',
          zIndex: 10,
        }}
      />

      {/* Right Panel - Chat Interface */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        background: currentTheme.colors.sidebarBackground,
        minWidth: 0
      }}>
        {/* Header Text */}
        <div style={{ 
          padding: '23px 20px 16px 20px', 
          background: currentTheme.colors.chatBackground,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}>
          {(() => {
            const isGroupDM = currentChat?.id?.startsWith('group-')
            const isChannel = currentChat?.type === 'channel' || currentChat?.type === 'starred'
            const isOneOnOneDM = currentChat?.type === 'dm' && !isGroupDM
            
            return (
              <div style={{ fontWeight: 700, fontSize: 18, color: getTextColor.primary, fontFamily: 'Lato, sans-serif', lineHeight: 1, display: 'flex', alignItems: 'center', height: 20, gap: 8 }}>
                {/* Show avatars for DMs */}
                {(isOneOnOneDM || isGroupDM) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: isGroupDM ? -4 : 0 }}>
                {isOneOnOneDM ? (
                  // Single avatar for 1:1 DM
                  <div style={{ position: 'relative', width: 24, height: 24, flexShrink: 0 }}>
                    {(() => {
                      const personName = getPersonNameFromChatId(currentChat?.id || '') || currentChat?.name || ''
                      const avatar = currentChat?.avatar || getAvatar(personName)
                      if (avatar) {
                        return <img 
                          src={avatar} 
                          alt={currentChat?.name} 
                          width={24} 
                          height={24} 
                          style={{ 
                            borderRadius: 6, 
                            objectFit: 'cover', 
                            flexShrink: 0,
                            border: `1px solid ${currentTheme.colors.avatarBorder}`,
                            display: 'block'
                          }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent && !parent.querySelector('.avatar-initials')) {
                              const initialsDiv = document.createElement('div')
                              initialsDiv.className = 'avatar-initials'
                              initialsDiv.textContent = getInitials(personName)
                              initialsDiv.style.cssText = `
                                width: 24px;
                                height: 24px;
                                border-radius: 6px;
                                background: ${getAvatarColor(personName)};
                                color: white;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-weight: 600;
                                font-size: 10px;
                                border: 1px solid ${currentTheme.colors.avatarBorder};
                              `
                              parent.appendChild(initialsDiv)
                            }
                          }}
                        />
                      } else {
                        return (
                          <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            background: getAvatarColor(personName),
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: 10,
                            border: `1px solid ${currentTheme.colors.avatarBorder}`,
                            flexShrink: 0
                          }}>
                            {getInitials(personName)}
                          </div>
                        )
                      }
                    })()}
                    {/* Status circle - green for online, grey for offline (only show for real people, not system accounts) */}
                    {currentChat?.isOnline !== undefined && currentChat.isOnline === false ? (
                      <>
                        {/* Outer circle - mask/background */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: -3,
                            right: 0,
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: currentTheme.colors.chatBackground,
                            border: `2px solid ${currentTheme.colors.chatBackground}`,
                            transform: 'translateX(4px)',
                            zIndex: 1,
                            boxSizing: 'border-box',
                          }}
                        >
                          {/* Inner circle - grey border (same size as green dot) */}
                          <div
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              background: currentTheme.colors.chatBackground,
                              border: `2px solid ${currentTheme.colors.offlineStatus}`,
                              transform: 'translate(-50%, -50%)',
                              zIndex: 2,
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      </>
                    ) : currentChat?.isOnline === true ? (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: -3,
                          right: 0,
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: currentTheme.colors.onlineStatus,
                          border: `2px solid ${currentTheme.colors.chatBackground}`,
                          transform: 'translateX(4px)',
                          zIndex: 2,
                          boxSizing: 'border-box',
                        }}
                      />
                    ) : null}
                  </div>
                ) : isGroupDM ? (
                  // Multiple avatars for group DM (show first 3, overlapping)
                  (() => {
                    const groupMemberNames = getGroupMembers(currentChat?.name || '')
                    const groupAvatars = groupMemberNames.slice(0, 3).map(name => {
                      const person = people.find(p => p.n === name.trim())
                      const chatItem = dmChats.find(c => c.name === name.trim())
                      return { 
                        name, 
                        avatar: getAvatar(name.trim()),
                        isOnline: chatItem?.isOnline
                      }
                    })
                    return groupAvatars.map((member, idx) => (
                      <div
                        key={member.name}
                        style={{
                          position: 'relative',
                          marginLeft: idx > 0 ? -4 : 0,
                          zIndex: 3 - idx,
                        }}
                      >
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt={member.name}
                            width={24}
                            height={24}
                            style={{
                              borderRadius: 6,
                              objectFit: 'cover',
                              flexShrink: 0,
                              border: `1px solid ${currentTheme.colors.avatarBorder}`,
                              display: 'block'
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const parent = target.parentElement
                              if (parent && !parent.querySelector('.avatar-initials')) {
                                const initialsDiv = document.createElement('div')
                                initialsDiv.className = 'avatar-initials'
                                initialsDiv.textContent = getInitials(member.name)
                                initialsDiv.style.cssText = `
                                  width: 24px;
                                  height: 24px;
                                  border-radius: 6px;
                                  background: ${getAvatarColor(member.name)};
                                  color: white;
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  font-weight: 600;
                                  font-size: 10px;
                                  border: 1px solid ${currentTheme.colors.avatarBorder};
                                `
                                parent.appendChild(initialsDiv)
                              }
                            }}
                          />
                        ) : (
                          <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            background: getAvatarColor(member.name),
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: 10,
                            border: `1px solid ${currentTheme.colors.avatarBorder}`,
                            flexShrink: 0
                          }}>
                            {getInitials(member.name)}
                          </div>
                        )}
                        {/* Status circle - green for online, grey for offline (only show for real people, not system accounts) */}
                        {member.isOnline !== undefined && member.isOnline === false ? (
                          <>
                            {/* Outer circle - mask/background */}
                            <div
                              style={{
                                position: 'absolute',
                                bottom: -3,
                                right: 0,
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                background: currentTheme.colors.chatBackground,
                                border: `2px solid ${currentTheme.colors.chatBackground}`,
                                transform: 'translateX(4px)',
                                zIndex: 1,
                                boxSizing: 'border-box',
                              }}
                            >
                              {/* Inner circle - grey border (same size as green dot) */}
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  width: 7,
                                  height: 7,
                                  borderRadius: '50%',
                                  background: currentTheme.colors.chatBackground,
                                  border: `2px solid ${currentTheme.colors.offlineStatus}`,
                                  transform: 'translate(-50%, -50%)',
                                  zIndex: 2,
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>
                          </>
                        ) : member.isOnline === true ? (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: -3,
                              right: 0,
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              background: currentTheme.colors.onlineStatus,
                              border: `2px solid ${currentTheme.colors.chatBackground}`,
                              transform: 'translateX(4px)',
                              zIndex: 2,
                              boxSizing: 'border-box',
                            }}
                          />
                        ) : null}
                      </div>
                    ))
                  })()
                ) : null}
              </div>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {(() => {
                const isChannel = currentChat?.type === 'channel' || currentChat?.type === 'starred'
                const isPrivate = currentChat?.isPrivate
                const channelName = isChannel && currentChat?.name 
                  ? currentChat.name.replace(/^#/, '')
                  : (currentChat?.name || '#itom-4412')
                
                return (
                  <>
                    {isChannel && (
                      <div style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: 8, 
                        background: 'transparent',
                        border: `1px solid ${currentTheme.colors.separator}`,
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        flexShrink: 0,
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = currentTheme.colors.hoverBackground
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                      >
                        {isPrivate ? (
                          <img 
                            src="/assets/lock.svg" 
                            alt="lock" 
                            width={18} 
                            height={18} 
                            style={{ 
                              display: 'block',
                              filter: currentTheme.type === 'dark' ? 'brightness(0) invert(1)' : 'brightness(0)',
                              opacity: 0.8
                            }} 
                          />
                        ) : (
                          <span style={{ fontSize: 18, color: getTextColor.secondary, fontWeight: 400 }}>#</span>
                        )}
                      </div>
                    )}
                    {channelName}
                    {currentChat?.statusEmoji && (
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{currentChat.statusEmoji}</span>
                    )}
                  </>
                )
              })()}
            </span>
          </div>
            )
          })()}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 20 }}>
            {[1, 2, 3, 4, 5].map((i) => {
              // Calculate member count for group DMs and channels
              const isGroupDM = currentChat?.id?.startsWith('group-')
              const isChannel = currentChat?.type === 'channel' || currentChat?.type === 'starred'
              const isOneOnOneDM = currentChat?.type === 'dm' && !isGroupDM
              
              // Hide pill 1 (user count) for 1:1 DMs
              if (i === 1 && isOneOnOneDM) {
                return null
              }
              
              // Get fixed member count from the memoized counts
              // Ensure all channels and group DMs have a member count > 0
              let memberCount = 0
              if (isGroupDM && currentChat?.id) {
                memberCount = memberCounts[currentChat.id] || 0
                // Fallback: parse from name if count is 0
                if (memberCount === 0 && currentChat.name) {
                  memberCount = Math.max(2, currentChat.name.split(',').length)
                }
              } else if (isChannel && currentChat?.id) {
                memberCount = memberCounts[currentChat.id] || 0
                // Fallback: ensure channel always has a count (15-99 range, less than general)
                if (memberCount === 0) {
                  // Generate a deterministic count based on channel ID
                  let hash = 0
                  for (let i = 0; i < currentChat.id.length; i++) {
                    hash = currentChat.id.charCodeAt(i) + ((hash << 5) - hash)
                  }
                  memberCount = 15 + (Math.abs(hash) % 85) // 85 = 99 - 15 + 1
                }
                // Ensure count is in valid range
                if (memberCount < 15) {
                  memberCount = 15
                } else if (memberCount >= 100) {
                  memberCount = 99
                }
              }
              
              // Show users icon for pill 1 when it's a group DM or channel (not 1:1 DM)
              // Always show icon for pill 1 if it's a channel or group DM
              const showUsersIcon = i === 1 && (isGroupDM || isChannel) && !isOneOnOneDM && currentChat
              // Always show count text for pill 1 if it's a channel or group DM (memberCount should always be > 0)
              const showCount = i === 1 && (isGroupDM || isChannel) && memberCount > 0
              
              // All pills use the same user count pill styling
              // Height: 32px, Padding: 8px top/bottom, 10px left/right
              
              return (
                <div 
                  key={i}
                  style={{ 
                    ...(i === 1 ? { minWidth: '50px' } : { width: '32px' }),
                    boxSizing: 'border-box',
                    height: '32px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    paddingLeft: i === 1 ? '10px' : '4px',
                    paddingRight: i === 1 ? '10px' : '4px',
                    background: 'transparent',
                    border: `1px solid ${currentTheme.colors.separator}`,
                    borderRadius: '8px', 
                    flexShrink: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    fontSize: '9px',
                    color: getTextColor.secondary,
                    fontFamily: 'Lato, sans-serif',
                    fontWeight: 400,
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = currentTheme.colors.hoverBackground
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {i === 1 && showUsersIcon && (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      {showCount && (
                        <span style={{ fontSize: 13, lineHeight: 1, fontWeight: 600, flexShrink: 0 }}>{memberCount}</span>
                      )}
                    </>
                  )}
                  {i === 2 && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                    </svg>
                  )}
                  {i === 3 && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                  )}
                  {i === 4 && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.35-4.35"></path>
                    </svg>
                  )}
                  {i === 5 && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="19" cy="12" r="1"></circle>
                      <circle cx="5" cy="12" r="1"></circle>
                    </svg>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Horizontal Tabs */}
        <div style={{ 
          display: 'flex', 
          borderBottom: `1px solid ${currentTheme.colors.separator}`,
          background: currentTheme.colors.chatBackground,
          padding: '0 20px'
        }}>
          {([
            { id: 'messages' as const, label: 'Messages', icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            )},
            { id: 'add-canvas' as const, label: 'Add canvas', icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            )},
            { id: 'files' as const, label: 'Files', icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            )}
          ]).map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 0',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: activeTab === tab.id ? getTextColor.primary : getTextColor.tabInactive,
                fontSize: 14,
                fontWeight: 400,
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? `2px solid ${currentTheme.colors.tabActiveBorder}` : '2px solid transparent',
                fontFamily: 'Lato, sans-serif',
                borderRadius: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginLeft: index === 0 ? 0 : 24,
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = getTextColor.tabHover
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = getTextColor.tabInactive
                }
              }}
            >
              <div style={{ 
                width: 16, 
                height: 16, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0,
                color: 'inherit'
              }}>
                {tab.icon}
              </div>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Messages Area */}
        <div
          ref={slackRootRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            overflowAnchor: 'none', // Prevent browser's automatic scroll anchoring
            padding: '20px 20px 10px 20px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {(!chatMessages[selectedChat] || chatMessages[selectedChat].length === 0) ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: getTextColor.tertiary, marginTop: 'auto' }}>
              <div style={{ fontSize: 15, marginBottom: 8 }}>No messages yet</div>
              <div style={{ fontSize: 13 }}>Start the conversation!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
              {chatMessages[selectedChat].map((m, idx) => {
                const prevMsg = idx > 0 ? chatMessages[selectedChat][idx - 1] : null
                // Always show avatar for every message, even back-to-back messages from the same person
                const showAvatar = true
                const p = people.find(pp => pp.n === m.who)
                const isLastMessage = idx === chatMessages[selectedChat].length - 1
                return (
                  <div 
                    key={m.id}
                    data-message-id={m.id}
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '38px 1fr', 
                      columnGap: 10, 
                      marginBottom: isLastMessage ? 0 : 0, 
                      alignItems: 'start',
                      marginLeft: -20,
                      marginRight: -20,
                      paddingLeft: 20,
                      paddingRight: 20,
                      paddingTop: 8,
                      paddingBottom: 8,
                      borderRadius: 0,
                      position: 'relative',
                      background: showReactionPicker === m.id ? (currentTheme.type === 'light' ? currentTheme.colors.activeBackground : currentTheme.colors.hoverBackground) : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      // Use lighter hover color for light mode
                      const hoverColor = currentTheme.type === 'light' 
                        ? currentTheme.colors.activeBackground // Lighter hover for light mode (#f5f3ed vs #f0ede5)
                        : currentTheme.colors.hoverBackground
                      e.currentTarget.style.background = hoverColor
                      setHoveredMessageId(m.id)
                    }}
                    onMouseLeave={(e) => {
                      // Only clear hover if reaction picker is not open for this message
                      if (showReactionPicker !== m.id) {
                        e.currentTarget.style.background = 'transparent'
                        setHoveredMessageId(null)
                      } else {
                        // Keep hover background and hoveredMessageId when picker is open
                        const hoverColor = currentTheme.type === 'light' 
                          ? currentTheme.colors.activeBackground
                          : currentTheme.colors.hoverBackground
                        e.currentTarget.style.background = hoverColor
                        setHoveredMessageId(m.id) // Keep menu bar visible
                      }
                    }}
                  >
                    {/* Menu Bar - appears on hover or when picker is open */}
                    {(hoveredMessageId === m.id || showReactionPicker === m.id) && (
                      <div style={{
                        position: 'absolute',
                        top: -16,
                        right: 16,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        zIndex: 10,
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: currentTheme.colors.sidebarBackground,
                          border: `1px solid ${currentTheme.colors.border}`,
                          borderRadius: 10,
                          padding: '6px 6px',
                        }}>
                          {/* Emoji button */}
                          <button
                            data-emoji-button="true"
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowReactionPicker(showReactionPicker === m.id ? null : m.id)
                            }}
                            style={{
                              width: 28,
                              height: 28,
                              padding: 0,
                              borderRadius: 4,
                              border: 'none',
                              outline: 'none',
                              background: showReactionPicker === m.id ? currentTheme.colors.activeBackground : 'transparent',
                              color: getTextColor.secondary,
                              fontSize: 14,
                              fontFamily: 'Lato, sans-serif',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            onMouseEnter={(e) => {
                              if (showReactionPicker !== m.id) {
                                e.currentTarget.style.background = currentTheme.colors.hoverBackground
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (showReactionPicker !== m.id) {
                                e.currentTarget.style.background = 'transparent'
                              }
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                              <line x1="9" y1="9" x2="9.01" y2="9"></line>
                              <line x1="15" y1="9" x2="15.01" y2="9"></line>
                            </svg>
                          </button>
                          {/* Forward button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // TODO: Handle forward
                            }}
                            style={{
                              width: 28,
                              height: 28,
                              padding: 0,
                              borderRadius: 4,
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              color: getTextColor.secondary,
                              fontSize: 12,
                              fontFamily: 'Lato, sans-serif',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = currentTheme.colors.hoverBackground
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="15 17 20 12 15 7"></polyline>
                              <path d="M4 18v-2a4 4 0 0 1 4-4h12"></path>
                            </svg>
                          </button>
                          {/* Bookmark button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // TODO: Handle bookmark
                            }}
                            style={{
                              width: 28,
                              height: 28,
                              padding: 0,
                              borderRadius: 4,
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              color: getTextColor.secondary,
                              fontSize: 12,
                              fontFamily: 'Lato, sans-serif',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = currentTheme.colors.hoverBackground
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                          </button>
                          {/* More options button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // TODO: Handle more options
                            }}
                            style={{
                              width: 28,
                              height: 28,
                              padding: 0,
                              borderRadius: 4,
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              color: getTextColor.secondary,
                              fontSize: 12,
                              fontFamily: 'Lato, sans-serif',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = currentTheme.colors.hoverBackground
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="1"></circle>
                              <circle cx="19" cy="12" r="1"></circle>
                              <circle cx="5" cy="12" r="1"></circle>
                            </svg>
                          </button>
                        </div>
                        {/* Reaction Picker - appears when emoji button is clicked */}
                        {showReactionPicker === m.id && (
                          <div 
                            data-reaction-picker="true"
                            onMouseEnter={(e) => {
                              // Keep picker open when hovering over it
                              e.stopPropagation()
                              // Ensure hover state is maintained
                              setHoveredMessageId(m.id)
                            }}
                            onMouseLeave={(e) => {
                              // Keep picker open even when mouse leaves - only close on click outside or emoji selection
                              e.stopPropagation()
                              // Don't clear hover state - picker should stay open
                            }}
                            style={{
                              position: 'absolute',
                              bottom: '100%',
                              right: 0,
                              marginBottom: 8,
                              background: currentTheme.colors.sidebarBackground,
                              border: `1px solid ${currentTheme.colors.border}`,
                              borderRadius: 8,
                              padding: '8px',
                              display: 'flex',
                              gap: 4,
                              flexWrap: 'wrap',
                              zIndex: 100,
                              boxShadow: currentTheme.type === 'dark' 
                                ? '0 4px 12px rgba(0, 0, 0, 0.3)' 
                                : '0 4px 12px rgba(0, 0, 0, 0.1)',
                              minWidth: 200,
                            }}
                          >
                            {commonEmojis.map(emoji => (
                              <button
                                key={emoji}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAddReaction(m.id, emoji)
                                  setShowReactionPicker(null)
                                }}
                                style={{
                                  width: 32,
                                  height: 32,
                                  padding: 0,
                                  borderRadius: 4,
                                  border: 'none',
                                  outline: 'none',
                                  background: 'transparent',
                                  fontSize: 18,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = currentTheme.colors.hoverBackground
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent'
                                }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {showAvatar ? (
                      <div 
                        style={{ cursor: 'pointer' }}
                        onClick={() => {}}
                      >
                        {(() => {
                          const avatar = getAvatar(m.who)
                          const initials = getInitials(m.who)
                          const person = getPerson(m.who)
                          
                          if (avatar) {
                            return <img 
                              src={avatar} 
                              alt={m.who} 
                              width={38} 
                              height={38} 
                              style={{ borderRadius: 8, objectFit: 'cover', flexShrink: 0, display: 'block' }} 
                              onError={(e) => {
                                // If image fails to load, show initials fallback
                                console.error('Avatar failed to load:', avatar, 'for', m.who)
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent && !parent.querySelector('.avatar-initials')) {
                                  const initialsDiv = document.createElement('div')
                                  initialsDiv.className = 'avatar-initials'
                                  initialsDiv.textContent = initials
                                  initialsDiv.style.cssText = `
                                    width: 38px;
                                    height: 38px;
                                    border-radius: 8px;
                                    background: ${getAvatarColor(m.who)};
                                    color: white;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-weight: 600;
                                    font-size: 14px;
                                    flex-shrink: 0;
                                  `
                                  parent.appendChild(initialsDiv)
                                }
                              }}
                              onLoad={() => {
                                console.log('Avatar loaded successfully:', avatar, 'for', m.who)
                              }}
                            />
                          } else {
                            return (
                              <div style={{
                                width: 38,
                                height: 38,
                                borderRadius: 8,
                                background: getAvatarColor(m.who),
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 600,
                                fontSize: 14,
                                flexShrink: 0
                              }}>
                                {initials}
                              </div>
                            )
                          }
                        })()}
                      </div>
                    ) : (
                      <div style={{ width: 38 }} />
                    )}
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                      {showAvatar && (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, lineHeight: 1.1, marginBottom: 3 }}>
                          <span 
                            style={{ 
                              fontWeight: 900, 
                              color: currentTheme.type === 'light' ? '#1d1c1d' : '#ffffff', 
                              fontSize: 15, 
                              fontFamily: 'Lato, sans-serif', 
                              lineHeight: 1.1,
                              cursor: 'pointer',
                              textDecoration: 'none',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.textDecoration = 'underline'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.textDecoration = 'none'
                            }}
                            onClick={() => {}}
                          >
                            {m.who}
                          </span>
                          <span style={{ fontSize: 12, color: currentTheme.type === 'dark' ? '#9ca3af' : '#616061', lineHeight: 1.1 }}>{m.when}</span>
                        </div>
                      )}
                      <div 
                        className="message-content"
                        style={{ 
                          lineHeight: 1.45, 
                          fontSize: 15, 
                          color: currentTheme.type === 'light' ? '#3d3c3d' : '#d5d5d5', 
                          fontFamily: 'Lato, sans-serif', 
                          marginTop: showAvatar ? 0 : 0, 
                          paddingRight: 60 
                        }} 
                        dangerouslySetInnerHTML={{ __html: m.text }}
                      />
                      {/* Link Embeds */}
                      {(() => {
                        const embedLinks = detectEmbedLinks(m.text, m.who)
                        if (embedLinks.length === 0) return null
                        
                        return (
                          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {embedLinks.map((embed, idx) => (
                              <LinkEmbed
                                key={idx}
                                embed={embed}
                                theme={currentTheme}
                                textColors={getTextColor}
                              />
                            ))}
                          </div>
                        )
                      })()}
                      {/* Message Actions */}
                      {m.actions && m.actions.length > 0 && !completedActions[m.id] && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                          {m.actions.map((action) => {
                            const isPrimary = action.type === 'primary'
                            const greenColor = '#00553D' // Green color for primary buttons
                            return (
                              <button
                                key={action.id}
                                onClick={() => handleAction(m.id, action.id)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 6,
                                  border: isPrimary ? 'none' : `1px solid ${currentTheme.colors.borderLight}`,
                                  outline: 'none',
                                  background: isPrimary ? greenColor : currentTheme.colors.chatBackground,
                                  color: isPrimary ? '#ffffff' : getTextColor.primary,
                                  fontSize: 14,
                                  fontWeight: 700,
                                  fontFamily: 'Lato, sans-serif',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  userSelect: 'none',
                                  WebkitUserSelect: 'none',
                                  WebkitTapHighlightColor: 'transparent',
                                }}
                                onMouseEnter={(e) => {
                                  if (isPrimary) {
                                    e.currentTarget.style.background = '#004030' // Darker green on hover (#00553D -> #004030)
                                  } else {
                                    e.currentTarget.style.background = currentTheme.colors.hoverBackground
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (isPrimary) {
                                    e.currentTarget.style.background = greenColor
                                  } else {
                                    e.currentTarget.style.background = currentTheme.colors.chatBackground
                                  }
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                }}
                              >
                                {action.emoji && <span style={{ fontSize: 14 }}>{action.emoji}</span>}
                                <span>{action.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {/* Action Confirmation Text */}
                      {completedActions[m.id] && m.actions && (() => {
                        const completedAction = m.actions.find(a => a.id === completedActions[m.id])
                        if (!completedAction) return null
                        // Replace placeholder with actual actor name if needed
                        const confirmationText = completedAction.confirmationText.replace('{actor}', currentUserName)
                        return (
                          <div 
                            style={{ 
                              marginTop: 12,
                              fontSize: 14,
                              color: currentTheme.type === 'light' ? '#868686' : '#9ca3af',
                              fontFamily: 'Lato, sans-serif',
                              lineHeight: 1.4,
                            }}
                            dangerouslySetInnerHTML={{ __html: confirmationText }}
                          />
                        )
                      })()}
                      {m.reactions && Object.keys(m.reactions).length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {Object.entries(m.reactions).map(([emoji, count]) => {
                              const userReactedSet = userReactions[m.id] || new Set<string>()
                              const hasUserReacted = userReactedSet.has(emoji)
                              // Use very subtle lighter background for dark mode, very subtle darker background for light mode
                              // This ensures reacted emojis stand out just barely even when message is hovered
                              // Apply special color to ALL pills with reactions (not just user reactions)
                              const reactedBackground = currentTheme.type === 'dark' 
                                ? 'rgba(255, 255, 255, 0.04)' // Very subtle white overlay - barely lighter than hoverBackground
                                : 'rgba(0, 0, 0, 0.05)' // Very subtle black overlay - barely darker than hoverBackground
                              const defaultBackground = currentTheme.colors.hoverBackground
                              // All pills with reactions get the special background color
                              const pillBackground = count > 0 ? reactedBackground : defaultBackground
                              
                              // For selected emoji pills (user has reacted), use light accent fill and inset border
                              const accentColor = currentTheme.colors.buttonPrimary
                              // Convert hex to rgba for opacity
                              const hexToRgba = (hex: string, alpha: number) => {
                                const r = parseInt(hex.slice(1, 3), 16)
                                const g = parseInt(hex.slice(3, 5), 16)
                                const b = parseInt(hex.slice(5, 7), 16)
                                return `rgba(${r}, ${g}, ${b}, ${alpha})`
                              }
                              const selectedBackground = currentTheme.type === 'dark'
                                ? hexToRgba(accentColor, 0.4) // More saturated accent color for dark mode
                                : hexToRgba(accentColor, 0.3) // More saturated accent color for light mode
                              
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(m.id, emoji)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '8px 10px',
                                    borderRadius: 999,
                                    border: 'none',
                                    outline: 'none',
                                    background: hasUserReacted ? selectedBackground : pillBackground,
                                    color: getTextColor.secondary,
                                    fontSize: 13,
                                    fontFamily: 'Lato, sans-serif',
                                    cursor: 'pointer',
                                    lineHeight: 1,
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none',
                                    WebkitTapHighlightColor: 'transparent',
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                  }}
                                  onMouseEnter={(e) => {
                                    if (hasUserReacted) {
                                      // Keep selected styling on hover, just slightly brighter
                                      const hexToRgba = (hex: string, alpha: number) => {
                                        const r = parseInt(hex.slice(1, 3), 16)
                                        const g = parseInt(hex.slice(3, 5), 16)
                                        const b = parseInt(hex.slice(5, 7), 16)
                                        return `rgba(${r}, ${g}, ${b}, ${alpha})`
                                      }
                                      const hoverBackground = currentTheme.type === 'dark'
                                        ? hexToRgba(accentColor, 0.45)
                                        : hexToRgba(accentColor, 0.35)
                                      e.currentTarget.style.background = hoverBackground
                                    } else {
                                      // Use very subtle contrast on hover for non-selected reacted emojis
                                      e.currentTarget.style.background = count > 0
                                        ? (currentTheme.type === 'dark' 
                                            ? 'rgba(255, 255, 255, 0.06)' // Very subtle lighter for dark mode hover
                                            : 'rgba(0, 0, 0, 0.05)') // Very subtle darker for light mode hover
                                        : currentTheme.colors.activeBackground
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = hasUserReacted ? selectedBackground : pillBackground
                                  }}
                                >
                                  <span>{emoji}</span>
                                  <span style={{ fontWeight: 400, color: currentTheme.type === 'light' ? '#1d1c1d' : '#ffffff' }}>{count}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Message Composer */}
        <div style={{ padding: '12px 20px 20px 20px' }}>
          <div 
            ref={composeContainerRef}
            style={{ 
              border: `1px solid ${currentTheme.colors.composeBorder}`,
              borderRadius: 10,
              background: currentTheme.colors.composeBackground,
              display: 'flex',
              flexDirection: 'column',
              transition: 'border-color 0.2s ease',
            }}
          >
              {/* Top Row of Action Icons */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0, 
                padding: '4px',
                minHeight: 32,
              }}>
                {[
                  { icon: 'bold', title: 'Bold' },
                  { icon: 'italic', title: 'Italic' },
                  { icon: 'underline', title: 'Underline' },
                  { icon: 'link', title: 'Link' },
                  { icon: 'list', title: 'Bullet List' },
                  { icon: 'numbered-list', title: 'Numbered List' },
                  { icon: 'code', title: 'Code' },
                  { icon: 'quote', title: 'Quote' },
                ].map((action, idx) => (
                  <button
                    key={idx}
                    title={action.title}
                    style={{
                      width: 32,
                      height: 32,
                      padding: 0,
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isComposeFocused ? getTextColor.secondary : getTextColor.tertiary,
                      transition: 'background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease',
                      opacity: isComposeFocused ? 1 : 0.6,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = currentTheme.colors.activeBackground
                      e.currentTarget.style.color = getTextColor.primary
                      e.currentTarget.style.opacity = '1'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = isComposeFocused ? getTextColor.secondary : getTextColor.tertiary
                      e.currentTarget.style.opacity = isComposeFocused ? '1' : '0.6'
                    }}
                  >
                    {action.icon === 'bold' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                      </svg>
                    )}
                    {action.icon === 'italic' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="4" x2="10" y2="4"></line>
                        <line x1="14" y1="20" x2="5" y2="20"></line>
                        <line x1="15" y1="4" x2="9" y2="20"></line>
                      </svg>
                    )}
                    {action.icon === 'underline' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path>
                        <line x1="4" y1="21" x2="20" y2="21"></line>
                      </svg>
                    )}
                    {action.icon === 'strikethrough' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 4h2a2 2 0 0 1 2 2v2M8 20H6a2 2 0 0 1-2-2v-2"></path>
                        <line x1="7" y1="12" x2="17" y2="12"></line>
                      </svg>
                    )}
                    {action.icon === 'code' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 18 22 12 16 6"></polyline>
                        <polyline points="8 6 2 12 8 18"></polyline>
                      </svg>
                    )}
                    {action.icon === 'link' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                      </svg>
                    )}
                    {action.icon === 'list' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                      </svg>
                    )}
                    {action.icon === 'numbered-list' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="10" y1="6" x2="21" y2="6"></line>
                        <line x1="10" y1="12" x2="21" y2="12"></line>
                        <line x1="10" y1="18" x2="21" y2="18"></line>
                        <line x1="4" y1="6" x2="4.01" y2="6"></line>
                        <line x1="4" y1="12" x2="4.01" y2="12"></line>
                        <line x1="4" y1="18" x2="4.01" y2="18"></line>
                      </svg>
                    )}
                    {action.icon === 'quote' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                      </svg>
                    )}
                    {action.icon === 'mention' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              {/* Typing Area */}
              <textarea
                ref={textareaRef}
                value={messageInput}
                onChange={handleTextareaChange}
                onKeyPress={handleKeyPress}
                onFocus={() => {
                  setIsComposeFocused(true)
                  if (composeContainerRef.current) {
                    composeContainerRef.current.style.borderColor = currentTheme.colors.composeBorderFocus
                  }
                }}
                onBlur={() => {
                  setIsComposeFocused(false)
                  if (composeContainerRef.current) {
                    composeContainerRef.current.style.borderColor = currentTheme.colors.composeBorder
                  }
                }}
                placeholder={`Message ${(() => {
                  const isChannel = currentChat?.type === 'channel' || currentChat?.type === 'starred'
                  if (isChannel && currentChat?.name) {
                    return currentChat.name.replace(/^#/, '')
                  }
                  return currentChat?.name || '#itom-4412'
                })()}`}
                style={{
                  border: 'none',
                  borderRadius: 0,
                  padding: '10px 12px',
                  fontSize: 15,
                  outline: 'none',
                  background: 'transparent',
                  color: getTextColor.primary,
                  fontFamily: 'Lato, sans-serif',
                  resize: 'none',
                  overflow: 'hidden',
                  lineHeight: '20px',
                  minHeight: '20px',
                  maxHeight: '200px',
                  height: 'auto',
                }}
                rows={1}
              />

              {/* Bottom Row of Action Icons */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0, 
                padding: '4px',
                minHeight: 32,
              }}>
                {[
                  { icon: 'plus', title: 'Add' },
                  { icon: 'emoji', title: 'Emoji' },
                  { icon: 'file', title: 'File' },
                  { icon: 'image', title: 'Image' },
                  { icon: 'video', title: 'Video' },
                  { icon: 'record', title: 'Record' },
                  { icon: 'more', title: 'More' },
                ].map((action, idx) => (
                  <button
                    key={idx}
                    title={action.title}
                    style={{
                      width: 32,
                      height: 32,
                      padding: 0,
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isComposeFocused ? getTextColor.secondary : getTextColor.tertiary,
                      transition: 'background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease',
                      opacity: isComposeFocused ? 1 : 0.6,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = currentTheme.colors.activeBackground
                      e.currentTarget.style.color = getTextColor.primary
                      e.currentTarget.style.opacity = '1'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = isComposeFocused ? getTextColor.secondary : getTextColor.tertiary
                      e.currentTarget.style.opacity = isComposeFocused ? '1' : '0.6'
                    }}
                  >
                    {action.icon === 'plus' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    )}
                    {action.icon === 'emoji' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                        <line x1="9" y1="9" x2="9.01" y2="9"></line>
                        <line x1="15" y1="9" x2="15.01" y2="9"></line>
                      </svg>
                    )}
                    {action.icon === 'file' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                    )}
                    {action.icon === 'image' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    )}
                    {action.icon === 'video' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                    )}
                    {action.icon === 'record' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                    {action.icon === 'more' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="19" cy="12" r="1"></circle>
                        <circle cx="5" cy="12" r="1"></circle>
                      </svg>
                    )}
                  </button>
                ))}
                {/* Send Button - Extreme Right */}
                <button
                  title="Send"
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  style={{
                    width: 32,
                    height: 32,
                    padding: 0,
                    border: 'none',
                    outline: 'none',
                    background: isComposeFocused 
                      ? currentTheme.colors.buttonPrimaryHover 
                      : currentTheme.colors.hoverBackground,
                    borderRadius: 8,
                    cursor: !messageInput.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isComposeFocused 
                      ? getTextColor.primary
                      : getTextColor.tertiary,
                    transition: 'background-color 0.08s ease, color 0.08s ease, opacity 0.08s ease',
                    opacity: isComposeFocused ? 1 : 0.8,
                    marginLeft: 'auto',
                  }}
                  onMouseEnter={(e) => {
                    if (isComposeFocused) {
                      e.currentTarget.style.background = currentTheme.colors.buttonPrimaryHover
                      e.currentTarget.style.opacity = '0.9'
                      e.currentTarget.style.color = getTextColor.primary
                      const icon = e.currentTarget.querySelector('img')
                      if (icon) icon.style.opacity = '1'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isComposeFocused 
                      ? currentTheme.colors.buttonPrimaryHover
                      : currentTheme.colors.hoverBackground
                    e.currentTarget.style.color = isComposeFocused 
                      ? getTextColor.primary
                      : getTextColor.tertiary
                    e.currentTarget.style.opacity = isComposeFocused ? '1' : '0.8'
                    const icon = e.currentTarget.querySelector('img')
                    if (icon) icon.style.opacity = isComposeFocused ? '1' : '0.6'
                  }}
                >
                  <img 
                    src="/assets/send-horizontal.svg" 
                    alt="send" 
                    width={16} 
                    height={16} 
                    style={{ 
                      display: 'block',
                      filter: isComposeFocused 
                        ? 'brightness(0) invert(1)' 
                        : (currentTheme.type === 'dark' ? 'brightness(0) invert(1)' : 'brightness(0)'),
                      opacity: isComposeFocused ? 1 : 0.6
                    }} 
                  />
                </button>
              </div>
            </div>
        </div>
      </div>
    </div>
  )
}
