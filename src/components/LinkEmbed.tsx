import React from 'react'
import { getEmbedAppInfo } from '../utils/embedDetector'
import type { EmbedConfig, EmbedType } from '../utils/embedDetector'

export type { EmbedConfig, EmbedType }

interface LinkEmbedProps {
  embed: EmbedConfig
  theme: {
    colors: {
      chatBackground: string
      hoverBackground: string
      borderLight: string
    }
    type: 'dark' | 'light'
  }
  textColors: {
    primary: string
    secondary: string
    tertiary: string
  }
  onOpen?: (url: string) => void
  onCheckLater?: () => void
}

export const LinkEmbed: React.FC<LinkEmbedProps> = ({ 
  embed, 
  theme, 
  textColors,
  onOpen,
  onCheckLater 
}) => {
  const appInfo = getEmbedAppInfo(embed.type)
  
  const handleOpen = () => {
    if (onOpen) {
      onOpen(embed.url)
    } else {
      window.open(embed.url, '_blank', 'noopener,noreferrer')
    }
  }
  
  return (
    <div
      style={{
        position: 'relative',
        background: 'transparent', // Inherit hover background from parent message
        borderRadius: 4,
        paddingTop: '4px',
        paddingBottom: '4px',
        paddingRight: '16px',
        paddingLeft: '16px', // Padding for the line
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Left border line with rounded terminals */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          background: theme.colors.borderLight,
          borderRadius: '3px 3px 3px 3px', // Rounded on both ends
        }}
      />
      
      {/* App logo + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Logo placeholder */}
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            background: appInfo.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {appInfo.logoUrl ? (
            <img 
              src={appInfo.logoUrl} 
              alt={appInfo.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                padding: 2,
              }}
              onError={(e) => {
                // Fallback to emoji if image fails to load
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = appInfo.icon
                  parent.style.fontSize = '12px'
                }
              }}
            />
          ) : (
            <span style={{ fontSize: 12 }}>{appInfo.icon}</span>
          )}
        </div>
        <span style={{ 
          fontSize: 13, 
          fontWeight: 600, 
          color: textColors.secondary,
          fontFamily: 'Lato, sans-serif',
        }}>
          {appInfo.name}
        </span>
        <span style={{ 
          fontSize: 13, 
          color: textColors.tertiary,
          fontFamily: 'Lato, sans-serif',
          marginLeft: 4,
          opacity: 0.4, // Make it super faint
        }}>
          |
        </span>
        <span style={{ 
          fontSize: 13, 
          color: textColors.tertiary,
          fontFamily: 'Lato, sans-serif',
          marginLeft: 4,
        }}>
          {embed.owner}
        </span>
      </div>
      
      {/* Blue title (clickable link) */}
      <a
        href={embed.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: '#1D9BD1', // Blue color matching @-tags
          fontFamily: 'Lato, sans-serif',
          lineHeight: 1.4,
          textDecoration: 'none',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.textDecoration = 'underline'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.textDecoration = 'none'
        }}
      >
        {embed.title}
      </a>
      
      {/* Thumbnail with 16:9 aspect ratio */}
      <div
        style={{
          width: '40%',
          aspectRatio: '16/9',
          background: appInfo.color,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 48,
          overflow: 'hidden',
        }}
      >
        {appInfo.thumbnailUrl ? (
          <img 
            src={appInfo.thumbnailUrl} 
            alt={embed.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={(e) => {
              // Fallback to icon if thumbnail fails to load
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent) {
                parent.innerHTML = appInfo.icon
                parent.style.fontSize = '48px'
              }
            }}
          />
        ) : (
          appInfo.icon
        )}
      </div>
      
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={handleOpen}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: `1px solid ${theme.colors.borderLight}`,
            outline: 'none',
            background: theme.colors.chatBackground,
            color: textColors.primary,
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
            e.currentTarget.style.background = theme.colors.hoverBackground
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = theme.colors.chatBackground
          }}
          onMouseDown={(e) => {
            e.preventDefault()
          }}
        >
          Open now
        </button>
        <button
          onClick={onCheckLater}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: `1px solid ${theme.colors.borderLight}`,
            outline: 'none',
            background: theme.colors.chatBackground,
            color: textColors.primary,
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
            e.currentTarget.style.background = theme.colors.hoverBackground
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = theme.colors.chatBackground
          }}
          onMouseDown={(e) => {
            e.preventDefault()
          }}
        >
          Check later
        </button>
      </div>
      
      {/* Added by text */}
      <div
        style={{
          fontSize: 12,
          color: textColors.tertiary,
          fontFamily: 'Lato, sans-serif',
        }}
      >
        Added by {appInfo.name}
      </div>
    </div>
  )
}

