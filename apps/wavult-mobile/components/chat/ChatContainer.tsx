import { useRef } from 'react'
import { FlatList, View, StyleSheet } from 'react-native'
import { MessageBubble } from './MessageBubble'
import { StreamingIndicator } from './StreamingIndicator'
import type { ChatMessage } from '../../lib/store'

type Props = {
  messages: ChatMessage[]
  isStreaming: boolean
}

export function ChatContainer({ messages, isStreaming }: Props) {
  const listRef = useRef<FlatList>(null)

  return (
    <FlatList
      ref={listRef}
      data={[...messages].reverse()}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MessageBubble message={item} />}
      inverted
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={isStreaming ? <StreamingIndicator /> : null}
    />
  )
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 12,
    paddingBottom: 8,
  },
})
