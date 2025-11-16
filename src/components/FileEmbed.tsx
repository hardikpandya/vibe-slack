import React from 'react'

export type FileType = 'pdf' | 'image' | 'document' | 'spreadsheet' | 'presentation' | 'code' | 'video' | 'audio' | 'archive' | 'other'

export interface FileEmbedConfig {
  type: FileType
  name: string
  size: string
  url?: string
  thumbnailUrl?: string
  uploadedBy: string
}

interface FileEmbedProps {
  file: FileEmbedConfig
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
  onOpen?: (file: FileEmbedConfig) => void
  onDownload?: (file: FileEmbedConfig) => void
}

const getFileIcon = (type: FileType): string => {
  switch (type) {
    case 'pdf':
      return '📄'
    case 'image':
      return '🖼️'
    case 'document':
      return '📝'
    case 'spreadsheet':
      return '📊'
    case 'presentation':
      return '📽️'
    case 'code':
      return '💻'
    case 'video':
      return '🎥'
    case 'audio':
      return '🎵'
    case 'archive':
      return '📦'
    default:
      return '📎'
  }
}

const getFileTypeColor = (type: FileType): string => {
  switch (type) {
    case 'pdf':
      return '#DC143C'
    case 'image':
      return '#4CAF50'
    case 'document':
      return '#2196F3'
    case 'spreadsheet':
      return '#FF9800'
    case 'presentation':
      return '#9C27B0'
    case 'code':
      return '#607D8B'
    case 'video':
      return '#E91E63'
    case 'audio':
      return '#00BCD4'
    case 'archive':
      return '#795548'
    default:
      return '#9E9E9E'
  }
}

export const FileEmbed: React.FC<FileEmbedProps> = ({ 
  file, 
  theme, 
  textColors,
  onOpen,
  onDownload 
}) => {
  const fileIcon = getFileIcon(file.type)
  const fileColor = getFileTypeColor(file.type)
  
  const handleOpen = () => {
    if (onOpen) {
      onOpen(file)
    } else if (file.url) {
      window.open(file.url, '_blank', 'noopener,noreferrer')
    }
  }
  
  const handleDownload = () => {
    if (onDownload) {
      onDownload(file)
    } else if (file.url) {
      const link = document.createElement('a')
      link.href = file.url
      link.download = file.name
      link.click()
    }
  }
  
  return (
    <div
      style={{
        position: 'relative',
        background: 'transparent',
        borderRadius: 4,
        paddingTop: '4px',
        paddingBottom: '4px',
        paddingRight: '16px',
        paddingLeft: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginTop: 8,
      }}
    >
      {/* Left border line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          background: theme.colors.borderLight,
          borderRadius: '3px 3px 3px 3px',
        }}
      />
      
      {/* File info row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* File icon/thumbnail */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 4,
            background: fileColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {file.thumbnailUrl ? (
            <img 
              src={file.thumbnailUrl} 
              alt={file.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = fileIcon
                  parent.style.fontSize = '24px'
                }
              }}
            />
          ) : (
            fileIcon
          )}
        </div>
        
        {/* File details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#1D9BD1',
              fontFamily: 'Lato, sans-serif',
              lineHeight: 1.4,
              cursor: 'pointer',
              textDecoration: 'none',
              marginBottom: 4,
            }}
            onClick={handleOpen}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none'
            }}
          >
            {file.name}
          </div>
          <div style={{ 
            fontSize: 13, 
            color: textColors.tertiary,
            fontFamily: 'Lato, sans-serif',
          }}>
            {file.size} • {file.uploadedBy}
          </div>
        </div>
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
          Open
        </button>
        <button
          onClick={handleDownload}
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
          Download
        </button>
      </div>
    </div>
  )
}

