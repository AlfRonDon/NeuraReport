import { useMemo } from 'react'
import { Box, Typography, Stack } from '@mui/material'
import { useSessionStore } from '../../stores'
import SessionItem from './SessionItem'
import { ScrollArea } from '../primitives'

function groupSessionsByDate(sessions) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  }

  sessions.forEach((session) => {
    const date = new Date(session.updatedAt)
    if (date >= today) {
      groups.today.push(session)
    } else if (date >= yesterday) {
      groups.yesterday.push(session)
    } else if (date >= weekAgo) {
      groups.thisWeek.push(session)
    } else {
      groups.older.push(session)
    }
  })

  return groups
}

function SessionGroup({ title, sessions, activeId, onSelect, onRename, onDelete }) {
  if (sessions.length === 0) return null

  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={600}
        sx={{ px: 2, mb: 1, display: 'block', textTransform: 'uppercase' }}
      >
        {title}
      </Typography>
      <Stack spacing={0.5}>
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            isActive={session.id === activeId}
            onClick={() => onSelect(session.id)}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </Stack>
    </Box>
  )
}

export default function SessionList() {
  const sessions = useSessionStore((s) => s.sessions)
  const activeSessionId = useSessionStore((s) => s.activeSessionId)
  const setActiveSession = useSessionStore((s) => s.setActiveSession)
  const renameSession = useSessionStore((s) => s.renameSession)
  const deleteSession = useSessionStore((s) => s.deleteSession)

  const groups = useMemo(() => groupSessionsByDate(sessions), [sessions])

  if (sessions.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No sessions yet.
          <br />
          Start a new session to begin.
        </Typography>
      </Box>
    )
  }

  return (
    <ScrollArea sx={{ flex: 1 }}>
      <Box sx={{ py: 1 }}>
        <SessionGroup
          title="Today"
          sessions={groups.today}
          activeId={activeSessionId}
          onSelect={setActiveSession}
          onRename={renameSession}
          onDelete={deleteSession}
        />
        <SessionGroup
          title="Yesterday"
          sessions={groups.yesterday}
          activeId={activeSessionId}
          onSelect={setActiveSession}
          onRename={renameSession}
          onDelete={deleteSession}
        />
        <SessionGroup
          title="This Week"
          sessions={groups.thisWeek}
          activeId={activeSessionId}
          onSelect={setActiveSession}
          onRename={renameSession}
          onDelete={deleteSession}
        />
        <SessionGroup
          title="Older"
          sessions={groups.older}
          activeId={activeSessionId}
          onSelect={setActiveSession}
          onRename={renameSession}
          onDelete={deleteSession}
        />
      </Box>
    </ScrollArea>
  )
}
