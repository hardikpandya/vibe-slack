#!/usr/bin/env node

/**
 * Setup Wizard for SlackKit
 * 
 * Interactive CLI wizard to customize your Slack environment
 * 
 * Usage:
 *   npm run setup
 *   or
 *   npm run get-started
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Name generation based on nationality
const nameGenerators = {
  'United States': {
    first: ['James', 'Michael', 'Robert', 'John', 'David', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher', 'Sarah', 'Jessica', 'Emily', 'Ashley', 'Amanda', 'Melissa', 'Deborah', 'Michelle', 'Lisa', 'Nancy'],
    last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee']
  },
  'India': {
    first: ['Priya', 'Raj', 'Amit', 'Ananya', 'Rahul', 'Sneha', 'Vikram', 'Kavita', 'Arjun', 'Meera', 'Suresh', 'Deepika', 'Rohan', 'Neha', 'Karan', 'Pooja'],
    last: ['Patel', 'Sharma', 'Kumar', 'Singh', 'Gupta', 'Reddy', 'Mehta', 'Desai', 'Joshi', 'Shah', 'Iyer', 'Nair', 'Rao', 'Malhotra', 'Agarwal', 'Verma']
  },
  'United Kingdom': {
    first: ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Charles', 'Joseph', 'Thomas', 'Emma', 'Olivia', 'Sophia', 'Isabella', 'Charlotte', 'Amelia', 'Mia', 'Harper', 'Evelyn', 'Abigail'],
    last: ['Smith', 'Jones', 'Taylor', 'Williams', 'Brown', 'Davies', 'Evans', 'Wilson', 'Thomas', 'Roberts', 'Johnson', 'Lewis', 'Walker', 'Robinson', 'Wood', 'Thompson', 'White', 'Watson', 'Jackson', 'Wright']
  },
  'Australia': {
    first: ['James', 'William', 'Oliver', 'Jack', 'Henry', 'Thomas', 'Lucas', 'Noah', 'Charlie', 'Ethan', 'Charlotte', 'Olivia', 'Amelia', 'Isla', 'Ava', 'Mia', 'Grace', 'Chloe', 'Ruby', 'Willow'],
    last: ['Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Johnson', 'White', 'Martin', 'Anderson', 'Thompson', 'Nguyen', 'Thomas', 'Walker', 'Harris', 'Lee', 'Ryan', 'Robinson', 'Kelly', 'King']
  },
  'Germany': {
    first: ['Maximilian', 'Alexander', 'Paul', 'Lukas', 'Leon', 'Luka', 'Ben', 'Jonas', 'Noah', 'Felix', 'Emma', 'Hannah', 'Mia', 'Sophia', 'Emilia', 'Lina', 'Marie', 'Mila', 'Ella', 'Lea'],
    last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Schafer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schroder', 'Neumann', 'Schwarz', 'Zimmermann']
  },
  'France': {
    first: ['Lucas', 'Lucas', 'Hugo', 'Louis', 'Gabriel', 'Léo', 'Raphaël', 'Nathan', 'Adam', 'Arthur', 'Emma', 'Jade', 'Louise', 'Alice', 'Chloé', 'Lina', 'Mila', 'Rose', 'Anna', 'Inès'],
    last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier']
  },
  'Japan': {
    first: ['Hiroshi', 'Takeshi', 'Kenji', 'Yuki', 'Satoshi', 'Akira', 'Daiki', 'Ryota', 'Yuto', 'Kaito', 'Yuki', 'Sakura', 'Aoi', 'Hana', 'Mei', 'Rin', 'Yui', 'Akari', 'Emi', 'Mio'],
    last: ['Tanaka', 'Sato', 'Suzuki', 'Takahashi', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Saito', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu']
  },
  'China': {
    first: ['Wei', 'Ming', 'Jie', 'Lei', 'Feng', 'Jun', 'Tao', 'Yong', 'Hui', 'Xin', 'Li', 'Wang', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou'],
    last: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou', 'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo', 'He', 'Gao', 'Lin', 'Luo']
  },
  'Brazil': {
    first: ['Miguel', 'Arthur', 'Davi', 'Gabriel', 'Bernardo', 'Lucas', 'Matheus', 'Rafael', 'Heitor', 'Enzo', 'Maria', 'Ana', 'Julia', 'Beatriz', 'Mariana', 'Gabriela', 'Rafaela', 'Larissa', 'Fernanda', 'Amanda'],
    last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Ribeiro', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias']
  }
};

function generateName(nationality, gender) {
  const normalized = nationality.toLowerCase();
  let countryKey = 'United States'; // default
  
  for (const key in nameGenerators) {
    if (normalized.includes(key.toLowerCase()) || normalized.includes(key.substring(0, 3).toLowerCase())) {
      countryKey = key;
      break;
    }
  }
  
  const generator = nameGenerators[countryKey] || nameGenerators['United States'];
  const firstNames = gender === 'male' 
    ? generator.first.filter((_, i) => i < generator.first.length / 2)
    : gender === 'female'
    ? generator.first.filter((_, i) => i >= generator.first.length / 2)
    : generator.first;
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = generator.last[Math.floor(Math.random() * generator.last.length)];
  return `${firstName} ${lastName}`;
}

function inferChannels(industry, description, companySize, companyName) {
  const industryLower = (industry || '').toLowerCase();
  const sizeLower = (companySize || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  
  const channels = {
    starred: [],
    public: [],
    private: []
  };
  
  // Always add general channel first
  channels.public.push({
    id: 'general',
    name: '#general',
    description: 'Company-wide announcements and discussions',
    topics: ['announcements', 'company updates', 'all-hands', 'team news']
  });
  
  // Generate contextual default channel based on company description
  const generateContextualChannel = () => {
    // Extract key themes from description
    const descWords = descLower.split(/\s+/);
    
    // Social media / content companies
    if (descLower.includes('social') || descLower.includes('content') || descLower.includes('media') || 
        descLower.includes('video') || descLower.includes('photo') || descLower.includes('influencer')) {
      return {
        id: 'content-updates',
        name: '#content-updates',
        isPrivate: false,
        description: 'Content platform updates and discussions',
        topics: ['content moderation', 'feature releases', 'user engagement', 'platform updates']
      };
    }
    
    // E-commerce / retail
    if (descLower.includes('ecommerce') || descLower.includes('retail') || descLower.includes('shop') ||
        descLower.includes('store') || descLower.includes('marketplace')) {
      return {
        id: 'operations',
        name: '#operations',
        isPrivate: false,
        description: 'Daily operations and coordination',
        topics: ['inventory', 'orders', 'fulfillment', 'customer service']
      };
    }
    
    // Healthcare / medical
    if (descLower.includes('health') || descLower.includes('medical') || descLower.includes('patient') ||
        descLower.includes('clinic') || descLower.includes('hospital')) {
      return {
        id: 'operations',
        name: '#operations',
        isPrivate: false,
        description: 'Daily operations and coordination',
        topics: ['scheduling', 'patient care', 'compliance', 'operations']
      };
    }
    
    // Education
    if (descLower.includes('education') || descLower.includes('school') || descLower.includes('learning') ||
        descLower.includes('student') || descLower.includes('course')) {
      return {
        id: 'updates',
        name: '#updates',
        isPrivate: false,
        description: 'Platform updates and announcements',
        topics: ['course updates', 'student support', 'feature releases', 'announcements']
      };
    }
    
    // Default: use first meaningful word from description or company name
    const meaningfulWords = descWords.filter(w => w.length > 4 && !['company', 'that', 'makes', 'provides', 'offers'].includes(w));
    if (meaningfulWords.length > 0) {
      const channelName = meaningfulWords[0].substring(0, 15);
      return {
        id: channelName,
        name: `#${channelName}`,
        isPrivate: false,
        description: `${channelName.charAt(0).toUpperCase() + channelName.slice(1)} updates and discussions`,
        topics: ['updates', 'discussions', 'coordination', 'announcements']
      };
    }
    
    // Final fallback
    return {
      id: 'updates',
      name: '#updates',
      isPrivate: false,
      description: 'Company updates and discussions',
      topics: ['updates', 'announcements', 'discussions', 'coordination']
    };
  };
  
  // Social media / content companies
  if (descLower.includes('social') || descLower.includes('content') || descLower.includes('media') || 
      descLower.includes('video') || descLower.includes('photo') || descLower.includes('influencer')) {
    
    channels.starred.push(generateContextualChannel());
    
    channels.public.push(
      { id: 'content-updates', name: '#content-updates', description: 'Content platform updates and discussions', topics: ['content moderation', 'feature releases', 'user engagement', 'platform updates'] },
      { id: 'engineering', name: '#engineering', description: 'Engineering discussions', topics: ['code reviews', 'architecture', 'technical discussions', 'PRs'] },
      { id: 'product', name: '#product', description: 'Product discussions', topics: ['features', 'roadmap', 'user feedback', 'requirements'] },
      { id: 'content-moderation', name: '#content-moderation', description: 'Content moderation and safety', topics: ['moderation', 'safety', 'policy', 'reports'] },
      { id: 'video-processing', name: '#video-processing', description: 'Video processing and encoding', topics: ['video encoding', 'CDN', 'streaming', 'performance'] },
      { id: 'user-engagement', name: '#user-engagement', description: 'User engagement and growth', topics: ['engagement', 'growth', 'analytics', 'metrics'] },
      { id: 'backend', name: '#backend', description: 'Backend engineering', topics: ['API development', 'database', 'services', 'performance'] },
      { id: 'frontend', name: '#frontend', description: 'Frontend engineering', topics: ['UI/UX', 'React', 'components', 'design system'] },
      { id: 'dev-ops', name: '#dev-ops', description: 'DevOps and infrastructure', topics: ['deployments', 'infrastructure', 'CI/CD', 'scaling'] },
      { id: 'monitoring', name: '#monitoring', description: 'Monitoring and observability', topics: ['metrics', 'dashboards', 'alerts', 'observability'] }
    );
    
    channels.private.push(
      { id: 'content-policy', name: '#content-policy', description: 'Private content policy discussions', topics: ['policy', 'compliance', 'legal'] },
      { id: 'leadership', name: '#leadership', description: 'Leadership team discussions', topics: ['strategy', 'planning', 'decisions'] },
      { id: 'security-private', name: '#security-private', description: 'Private security discussions', topics: ['security incidents', 'vulnerabilities', 'compliance'] }
    );
  }
  // Software/Tech companies
  else if (industryLower.includes('software') || industryLower.includes('tech') || industryLower.includes('saas') ||
      descLower.includes('software') || descLower.includes('tech') || descLower.includes('saas')) {
    
    channels.starred.push(generateContextualChannel());
    
    channels.public.push(
      { id: 'engineering', name: '#engineering', description: 'Engineering discussions', topics: ['code reviews', 'architecture', 'technical discussions', 'PRs'] },
      { id: 'dev-ops', name: '#dev-ops', description: 'DevOps and infrastructure', topics: ['deployments', 'infrastructure', 'CI/CD', 'scaling'] },
      { id: 'backend', name: '#backend', description: 'Backend engineering', topics: ['API development', 'database', 'services', 'performance'] },
      { id: 'frontend', name: '#frontend', description: 'Frontend engineering', topics: ['UI/UX', 'React', 'components', 'design system'] },
      { id: 'infrastructure', name: '#infrastructure', description: 'Infrastructure and operations', topics: ['servers', 'networking', 'cloud', 'monitoring'] },
      { id: 'security', name: '#security', description: 'Security discussions', topics: ['security', 'vulnerabilities', 'compliance', 'incidents'] },
      { id: 'sre', name: '#sre', description: 'Site Reliability Engineering', topics: ['reliability', 'incidents', 'post-mortems', 'on-call'] },
      { id: 'oncall', name: '#oncall', description: 'On-call rotations and coordination', topics: ['on-call', 'rotations', 'incidents', 'escalations'] },
      { id: 'deployments', name: '#deployments', description: 'Deployment coordination', topics: ['deployments', 'releases', 'rollbacks', 'change management'] },
      { id: 'monitoring', name: '#monitoring', description: 'Monitoring and observability', topics: ['metrics', 'dashboards', 'alerts', 'observability'] },
      { id: 'product', name: '#product', description: 'Product discussions', topics: ['features', 'roadmap', 'user feedback', 'requirements'] }
    );
    
    channels.private.push(
      { id: 'security-private', name: '#security-private', description: 'Private security discussions', topics: ['security incidents', 'vulnerabilities', 'compliance'] },
      { id: 'leadership', name: '#leadership', description: 'Leadership team discussions', topics: ['strategy', 'planning', 'decisions'] }
    );
  }
  // E-commerce / Retail companies
  else if (descLower.includes('ecommerce') || descLower.includes('retail') || descLower.includes('shop') ||
           descLower.includes('store') || descLower.includes('marketplace')) {
    
    channels.starred.push(generateContextualChannel());
    
    channels.public.push(
      { id: 'operations', name: '#operations', description: 'Daily operations and coordination', topics: ['inventory', 'orders', 'fulfillment', 'customer service'] },
      { id: 'engineering', name: '#engineering', description: 'Engineering discussions', topics: ['code reviews', 'architecture', 'technical discussions', 'PRs'] },
      { id: 'product', name: '#product', description: 'Product discussions', topics: ['features', 'roadmap', 'user feedback', 'requirements'] },
      { id: 'inventory', name: '#inventory', description: 'Inventory management', topics: ['stock', 'warehouse', 'supply chain', 'logistics'] },
      { id: 'customer-service', name: '#customer-service', description: 'Customer service and support', topics: ['support', 'tickets', 'customer issues', 'satisfaction'] },
      { id: 'sales', name: '#sales', description: 'Sales and revenue', topics: ['sales', 'revenue', 'conversions', 'metrics'] },
      { id: 'fulfillment', name: '#fulfillment', description: 'Order fulfillment and shipping', topics: ['shipping', 'orders', 'logistics', 'delivery'] },
      { id: 'backend', name: '#backend', description: 'Backend engineering', topics: ['API development', 'database', 'services', 'performance'] },
      { id: 'frontend', name: '#frontend', description: 'Frontend engineering', topics: ['UI/UX', 'React', 'components', 'design system'] },
      { id: 'dev-ops', name: '#dev-ops', description: 'DevOps and infrastructure', topics: ['deployments', 'infrastructure', 'CI/CD', 'scaling'] }
    );
    
    channels.private.push(
      { id: 'pricing', name: '#pricing', description: 'Private pricing discussions', topics: ['pricing', 'strategy', 'discounts'] },
      { id: 'leadership', name: '#leadership', description: 'Leadership team discussions', topics: ['strategy', 'planning', 'decisions'] },
      { id: 'security-private', name: '#security-private', description: 'Private security discussions', topics: ['security incidents', 'vulnerabilities', 'compliance'] }
    );
  }
  // Finance/Banking
  else if (industryLower.includes('bank') || industryLower.includes('finance') || industryLower.includes('fintech') ||
           descLower.includes('bank') || descLower.includes('finance') || descLower.includes('fintech')) {
    
    channels.starred.push(generateContextualChannel());
    
    channels.public.push(
      { id: 'engineering', name: '#engineering', description: 'Engineering discussions', topics: ['code reviews', 'architecture', 'technical discussions'] },
      { id: 'compliance', name: '#compliance', description: 'Regulatory compliance', topics: ['compliance', 'regulations', 'audits', 'reporting'] },
      { id: 'risk', name: '#risk', description: 'Risk management', topics: ['risk assessment', 'mitigation', 'monitoring'] },
      { id: 'operations', name: '#operations', description: 'Operations and infrastructure', topics: ['deployments', 'infrastructure', 'monitoring'] },
      { id: 'security', name: '#security', description: 'Security discussions', topics: ['security', 'vulnerabilities', 'compliance', 'incidents'] },
      { id: 'backend', name: '#backend', description: 'Backend engineering', topics: ['API development', 'database', 'services', 'performance'] },
      { id: 'frontend', name: '#frontend', description: 'Frontend engineering', topics: ['UI/UX', 'React', 'components', 'design system'] },
      { id: 'monitoring', name: '#monitoring', description: 'Monitoring and observability', topics: ['metrics', 'dashboards', 'alerts', 'observability'] }
    );
    
    channels.private.push(
      { id: 'compliance-private', name: '#compliance-private', description: 'Private compliance discussions', topics: ['regulatory matters', 'audits', 'compliance'] },
      { id: 'leadership', name: '#leadership', description: 'Leadership team discussions', topics: ['strategy', 'planning', 'decisions'] },
      { id: 'security-private', name: '#security-private', description: 'Private security discussions', topics: ['security incidents', 'vulnerabilities', 'compliance'] }
    );
  }
  // Default / Generic
  else {
    channels.starred.push(generateContextualChannel());
    
    channels.public.push(
      { id: 'engineering', name: '#engineering', description: 'Engineering discussions', topics: ['code reviews', 'architecture', 'technical discussions', 'PRs'] },
      { id: 'operations', name: '#operations', description: 'Operations and infrastructure', topics: ['deployments', 'infrastructure', 'monitoring'] },
      { id: 'product', name: '#product', description: 'Product discussions', topics: ['features', 'roadmap', 'user feedback', 'requirements'] },
      { id: 'design', name: '#design', description: 'Design discussions', topics: ['UI/UX', 'design system', 'prototypes', 'user research'] },
      { id: 'backend', name: '#backend', description: 'Backend engineering', topics: ['API development', 'database', 'services', 'performance'] },
      { id: 'frontend', name: '#frontend', description: 'Frontend engineering', topics: ['UI/UX', 'React', 'components', 'design system'] },
      { id: 'dev-ops', name: '#dev-ops', description: 'DevOps and infrastructure', topics: ['deployments', 'infrastructure', 'CI/CD', 'scaling'] },
      { id: 'monitoring', name: '#monitoring', description: 'Monitoring and observability', topics: ['metrics', 'dashboards', 'alerts', 'observability'] }
    );
    
    channels.private.push(
      { id: 'leadership', name: '#leadership', description: 'Leadership team discussions', topics: ['strategy', 'planning', 'decisions'] },
      { id: 'security-private', name: '#security-private', description: 'Private security discussions', topics: ['security incidents', 'vulnerabilities', 'compliance'] },
      { id: 'hiring', name: '#hiring', description: 'Hiring and recruitment', topics: ['candidates', 'interviews', 'openings'] }
    );
  }
  
  // Add random for larger companies
  if (sizeLower.includes('large') || sizeLower.includes('enterprise')) {
    channels.public.push({
      id: 'random',
      name: '#random',
      description: 'Random discussions and water cooler chat',
      topics: ['random', 'water cooler', 'off-topic', 'fun']
    });
  }
  
  return channels;
}

function inferCommunicationStyle(industry, companySize, description) {
  const industryLower = (industry || '').toLowerCase();
  const sizeLower = (companySize || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  
  // Startups - casual and fast-paced
  if (sizeLower.includes('small') || sizeLower.includes('startup') || descLower.includes('startup')) {
    return {
      tone: 'Casual and fast-paced',
      formality: 'Very casual',
      commonPatterns: [
        'Quick status updates',
        'Rapid decision-making',
        'Informal check-ins',
        'Direct questions and answers',
        'Emoji usage common',
        'Quick async updates'
      ]
    };
  }
  
  // Banks / Financial - very formal and professional
  if (industryLower.includes('bank') || industryLower.includes('finance') || industryLower.includes('fintech') ||
      descLower.includes('bank') || descLower.includes('finance') || descLower.includes('fintech')) {
    return {
      tone: 'Professional and formal',
      formality: 'Very formal',
      commonPatterns: [
        'Formal status updates',
        'Compliance-focused discussions',
        'Structured reporting',
        'Documented decisions',
        'Regulatory compliance mentions',
        'Risk assessment discussions'
      ]
    };
  }
  
  // Large enterprises - semi-formal
  if (sizeLower.includes('large') || sizeLower.includes('enterprise')) {
    return {
      tone: 'Professional yet collaborative',
      formality: 'Semi-formal',
      commonPatterns: [
        'Structured status updates',
        'Cross-functional collaboration',
        'Formal meeting notes',
        'Documented decisions',
        'Process-oriented discussions',
        'Team coordination'
      ]
    };
  }
  
  // Tech companies - casual to semi-formal
  if (industryLower.includes('software') || industryLower.includes('tech') || industryLower.includes('saas')) {
    return {
      tone: 'Professional yet collaborative',
      formality: 'Casual to semi-formal depending on context',
      commonPatterns: [
        'Quick status updates and check-ins',
        'Technical deep-dives and architecture discussions',
        'Incident coordination and resolution',
        'Feature announcements and product updates',
        'Team celebrations and recognition'
      ]
    };
  }
  
  // Default
  return {
    tone: 'Professional yet collaborative',
    formality: 'Casual to semi-formal depending on context',
    commonPatterns: [
      'Quick status updates and check-ins',
      'Technical deep-dives and architecture discussions',
      'Incident coordination and resolution',
      'Feature announcements and product updates',
      'Team celebrations and recognition'
    ]
  };
}

function inferChannelTopics(channelId, industry) {
  const industryLower = (industry || '').toLowerCase();
  
  if (channelId.includes('incident') || channelId.includes('itom') || channelId.includes('alert')) {
    return ['incident response', 'root cause analysis', 'mitigation', 'alerts'];
  }
  if (channelId.includes('engineering') || channelId.includes('backend') || channelId.includes('frontend')) {
    return ['code reviews', 'architecture', 'technical discussions', 'PRs'];
  }
  if (channelId.includes('dev-ops') || channelId.includes('infrastructure') || channelId.includes('deploy')) {
    return ['deployments', 'infrastructure', 'CI/CD', 'scaling'];
  }
  if (channelId.includes('security')) {
    return ['security', 'vulnerabilities', 'compliance', 'incidents'];
  }
  if (channelId.includes('product')) {
    return ['features', 'roadmap', 'user feedback', 'requirements'];
  }
  if (channelId === 'general') {
    return ['announcements', 'company updates', 'all-hands', 'team news'];
  }
  
  return ['general discussion', 'team updates', 'collaboration'];
}

function inferFileTemplates(industry, description, companySize) {
  const industryLower = (industry || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  
  const templates = [];
  
  // Software/Tech companies
  if (industryLower.includes('software') || industryLower.includes('tech') || descLower.includes('software')) {
    templates.push(
      { type: 'pdf', name: 'API Architecture Documentation.pdf', size: '2.4 MB' },
      { type: 'document', name: 'Database Schema Design.docx', size: '856 KB' },
      { type: 'code', name: 'deployment-script.sh', size: '12 KB' },
      { type: 'spreadsheet', name: 'Sprint Planning Q2 2024.xlsx', size: '1.2 MB' },
      { type: 'presentation', name: 'Product Roadmap Q2.pptx', size: '3.5 MB' },
      { type: 'pdf', name: 'Incident Response Runbook.pdf', size: '1.8 MB' },
      { type: 'code', name: 'config.yaml', size: '8 KB' },
      { type: 'document', name: 'Engineering Onboarding Guide.docx', size: '1.1 MB' }
    );
  }
  // Finance
  else if (industryLower.includes('finance') || industryLower.includes('bank')) {
    templates.push(
      { type: 'pdf', name: 'Compliance Report Q2.pdf', size: '3.2 MB' },
      { type: 'spreadsheet', name: 'Risk Assessment Dashboard.xlsx', size: '1.8 MB' },
      { type: 'document', name: 'Regulatory Update Memo.docx', size: '456 KB' },
      { type: 'pdf', name: 'Audit Findings Report.pdf', size: '2.1 MB' }
    );
  }
  // Default
  else {
    templates.push(
      { type: 'pdf', name: 'Company Handbook.pdf', size: '2.4 MB' },
      { type: 'document', name: 'Project Plan.docx', size: '856 KB' },
      { type: 'spreadsheet', name: 'Budget Planning.xlsx', size: '1.2 MB' }
    );
  }
  
  return templates;
}

async function setup() {
  console.log('\n🎉 Welcome to the SlackKit Setup Wizard!');
  console.log('==========================================\n');
  console.log('This wizard will help you customize your Slack environment.');
  console.log('You can answer questions naturally - just describe your company!\n');
  
  const contextPath = path.join(rootDir, 'company-context.json');
  
  // Check if company-context.json already exists
  if (fs.existsSync(contextPath)) {
    const overwrite = await question('⚠️  company-context.json already exists. Overwrite? (yes/no): ');
    if (overwrite.toLowerCase() !== 'yes' && overwrite.toLowerCase() !== 'y') {
      console.log('\nSetup cancelled. Your existing configuration is preserved.');
      rl.close();
      return;
    }
  }
  
  // Company Information
  console.log('\n🏢 Company Information\n');
  
  const companyName = await question('What\'s your company called? ') || 'Your Company';
  const companyDescription = await question('What does your company do? (describe your business): ') || 'A company';
  const companyIndustry = await question('What industry are you in? (e.g., Software Development, Finance, Healthcare): ') || 'Software Development';
  const companySize = await question('Company size? (Small/Medium/Large Enterprise): ') || 'Medium';
  const logoPath = await question('Company logo path? (or press Enter to skip): ');
  
  // User Information
  console.log('\n👤 Your Information\n');
  
  const myName = await question('What\'s your full name? ') || 'User';
  const myCountry = await question('What country are you from? ') || 'United States';
  const myGender = await question('Gender? (male/female/neutral): ') || 'neutral';
  const myRole = await question('What\'s your role? (e.g., Software Engineer, Product Manager): ') || 'Software Engineer';
  
  // Team Members
  console.log('\n👥 Team Members\n');
  console.log('Tell me what nationalities are on your team, and I\'ll auto-generate team members!');
  console.log('Examples: "United States, India, Australia" or "US, India, UK, Germany"\n');
  
  const nationalitiesInput = await question('What nationalities are on your team? (comma-separated): ') || 'United States';
  const nationalities = nationalitiesInput.split(',').map(n => n.trim()).filter(n => n);
  
  // Initialize context
  const context = {
    company: {
      name: companyName,
      logo: logoPath || '/assets/atlassian-blue.png',
      description: companyDescription,
      industry: companyIndustry,
      companySize: companySize,
      domain: `${companyName.toLowerCase().replace(/\s+/g, '')}.com`
    },
    employees: [],
    channels: {},
    communicationStyle: {},
    messageThemes: {},
    roles: [],
    fileTemplates: []
  };
  
  // Add current user
  context.employees.push({
    name: myName,
    avatar: `/assets/faces/${myName.toLowerCase().replace(/\s+/g, '-')}.jpg`,
    gender: myGender,
    country: myCountry,
    role: myRole,
    me: true
  });
  
  // Infer channels
  console.log('\n📢 Inferring channels from your company information...\n');
  
  const inferredChannels = inferChannels(companyIndustry, companyDescription, companySize, companyName);
  context.channels = inferredChannels;
  
  console.log(`✅ Generated ${inferredChannels.starred.length} starred channels, ${inferredChannels.public.length} public channels, ${inferredChannels.private.length} private channels`);
  
  // Infer communication style
  context.communicationStyle = inferCommunicationStyle(companyIndustry, companySize, companyDescription);
  
  // Generate team members based on channels
  const allChannels = [
    ...inferredChannels.starred,
    ...inferredChannels.public,
    ...inferredChannels.private
  ];
  
  const targetMemberCount = Math.min(Math.max(Math.floor(allChannels.length * 2.5), 8), 20);
  const roles = ['Software Engineer', 'Product Manager', 'DevOps Engineer', 'SRE', 'Backend Engineer', 'Frontend Engineer', 'Engineering Manager', 'Designer'];
  
  let memberIndex = 0;
  nationalities.forEach(nationality => {
    const membersPerNationality = Math.ceil(targetMemberCount / nationalities.length);
    
    for (let i = 0; i < membersPerNationality && context.employees.length < targetMemberCount + 1; i++) {
      const gender = Math.random() > 0.5 ? 'male' : 'female';
      const fullName = generateName(nationality, gender);
      const role = roles[memberIndex % roles.length];
      const emojiHeavy = Math.random() < 0.3;
      const verbose = Math.random() < 0.2;
      
      context.employees.push({
        avatar: `/assets/faces/${fullName.toLowerCase().replace(/\s+/g, '-')}.jpg`,
        gender,
        country: nationality,
        role,
        name: fullName,
        ...(emojiHeavy && { 'emoji-heavy': true }),
        ...(verbose && { verbose: true })
      });
      
      memberIndex++;
    }
  });
  
  // Generate contextual AI assistant name (never Rovo for custom setup)
  const generateAIAssistantName = () => {
    const companyNameLower = companyName.toLowerCase();
    const descLower = companyDescription.toLowerCase();
    
    // Extract first meaningful word from company name or description
    const words = (companyNameLower + ' ' + descLower).split(/\s+/).filter(w => w.length > 3);
    const firstWord = words[0] || 'assistant';
    
    // Generate AI assistant names based on company context
    const aiNames = [
      `${firstWord.charAt(0).toUpperCase() + firstWord.slice(1)}AI`,
      `${firstWord.charAt(0).toUpperCase() + firstWord.slice(1)}Bot`,
      `Aria`,
      `Nexus`,
      `Astra`,
      `Vex`,
      `Zara`,
      `Kai`,
      `Luna`,
      `Orion`
    ];
    
    return aiNames[Math.floor(Math.random() * aiNames.length)];
  };
  
  const aiAssistantBaseName = generateAIAssistantName();
  const aiAssistantName = `${aiAssistantBaseName} AI`; // Append " AI" to make it clear
  context.employees.push({
    name: aiAssistantName,
    avatar: null, // Use null to trigger initials fallback
    gender: 'neutral',
    country: 'Global',
    role: 'AI Assistant'
  });
  
  console.log(`✅ Generated ${context.employees.length - 2} team members (excluding you and ${aiAssistantName}) with mixed genders and nationalities!`);
  
  // Generate group DMs (2-3 group DMs with 3-5 members each)
  console.log('\n💬 Generating group DMs...\n');
  const groupDMs = [];
  const nonMeEmployees = context.employees.filter(e => !e.me && e.name !== aiAssistantName);
  const groupCount = Math.min(3, Math.floor(nonMeEmployees.length / 3));
  
  for (let i = 0; i < groupCount; i++) {
    const groupSize = Math.floor(Math.random() * 3) + 3; // 3-5 members
    const groupMembers = [];
    const availableMembers = [...nonMeEmployees].filter(m => !groupMembers.some(gm => gm.name === m.name));
    
    for (let j = 0; j < groupSize && availableMembers.length > 0; j++) {
      const member = availableMembers.splice(Math.floor(Math.random() * availableMembers.length), 1)[0];
      groupMembers.push(member);
    }
    
    if (groupMembers.length >= 2) {
      const groupName = groupMembers.map(m => m.name.split(' ')[0]).join(', ');
      groupDMs.push({
        id: `group-${i + 1}`,
        name: groupName,
        members: groupMembers.map(m => m.name)
      });
    }
  }
  
  context.groupDMs = groupDMs;
  console.log(`✅ Generated ${groupDMs.length} group DMs`);
  
  // Generate message themes for each channel
  console.log('\n💬 Generating message themes for channels...\n');
  
  allChannels.forEach(channel => {
    const topics = inferChannelTopics(channel.id, companyIndustry);
    context.messageThemes[channel.id] = [
      `Message about ${topics[0]}`,
      `Discussion on ${topics[1]}`,
      `Update regarding ${topics[2] || topics[0]}`
    ];
  });
  
  // Generate file templates
  context.fileTemplates = inferFileTemplates(companyIndustry, companyDescription, companySize);
  
  // Generate roles
  context.roles = [
    {
      title: 'Software Engineer',
      responsibilities: ['Write and review code', 'Design system architecture', 'Participate in technical discussions'],
      commonChannels: ['#engineering', '#backend', '#code-review']
    },
    {
      title: 'Product Manager',
      responsibilities: ['Define product roadmap', 'Gather user requirements', 'Coordinate cross-functional teams'],
      commonChannels: ['#product', '#roadmap', '#feature-requests']
    },
    {
      title: 'Site Reliability Engineer (SRE)',
      responsibilities: ['Monitor system health', 'Respond to incidents', 'Improve system reliability'],
      commonChannels: ['#incidents', '#oncall', '#monitoring', '#infrastructure']
    },
    {
      title: 'DevOps Engineer',
      responsibilities: ['Manage CI/CD pipelines', 'Automate deployments', 'Maintain infrastructure'],
      commonChannels: ['#dev-ops', '#infrastructure', '#deployments']
    }
  ];
  
  // Write company-context.json
  fs.writeFileSync(contextPath, JSON.stringify(context, null, 2));
  console.log('\n✅ Created company-context.json');
  
  // Download avatars for all employees
  console.log('\n📥 Downloading avatars for all employees...\n');
  try {
    execSync('node scripts/download-avatars.js', { cwd: rootDir, stdio: 'inherit' });
  } catch (error) {
    console.warn('⚠️  Warning: Avatar download failed, but continuing setup...');
    console.warn('   You can run "npm run download-avatars" later to download avatars.');
  }
  
  // Run generate script
  console.log('\n🔄 Generating configuration files...\n');
  try {
    execSync('node scripts/generate-from-context.js', { cwd: rootDir, stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Error running generate script:', error);
    rl.close();
    process.exit(1);
  }
  
  console.log('\n🎉 Setup complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Run: npm run dev');
  console.log('   2. Add company logo to assets/ directory (optional)');
  console.log('\n💡 Tip: Avatars have been automatically downloaded! If you need to download more, run: npm run download-avatars');
  
  rl.close();
}

setup().catch(err => {
  console.error('Error during setup:', err);
  rl.close();
  process.exit(1);
});

