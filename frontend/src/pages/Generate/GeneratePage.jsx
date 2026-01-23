import { useInteraction } from '@/components/ux/governance'
import GeneratePageContainer from '@/features/generate/containers/GeneratePageContainer'

export default function GeneratePage() {
  useInteraction()
  return <GeneratePageContainer />
}
