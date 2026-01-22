let intentStack = []

export const pushActiveIntent = (intent) => {
  if (!intent) return
  intentStack = [...intentStack, intent]
}

export const popActiveIntent = (intentId) => {
  if (!intentStack.length) return
  if (!intentId) {
    intentStack = []
    return
  }
  intentStack = intentStack.filter((item) => item?.id !== intentId)
}

export const getActiveIntent = () => (
  intentStack.length ? intentStack[intentStack.length - 1] : null
)
