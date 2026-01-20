import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { WizardLayout } from '../../layouts'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider'
import StepConnection from './steps/StepConnection'
import StepTemplate from './steps/StepTemplate'
import StepMapping from './steps/StepMapping'

const WIZARD_STEPS = [
  {
    key: 'connection',
    label: 'Connect Database',
    description: 'Select or create a database connection',
  },
  {
    key: 'template',
    label: 'Upload Template',
    description: 'Upload a PDF or Excel template',
  },
  {
    key: 'mapping',
    label: 'Configure Mapping',
    description: 'Map template fields to database columns',
  },
]

export default function SetupWizard() {
  const navigate = useNavigate()
  const toast = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)

  // Wizard state
  const [wizardState, setWizardState] = useState({
    connectionId: null,
    templateId: null,
    templateKind: 'pdf',
    mapping: null,
    keys: [],
  })

  const activeConnection = useAppStore((s) => s.activeConnection)
  const templateId = useAppStore((s) => s.templateId)

  const updateWizardState = useCallback((updates) => {
    setWizardState((prev) => ({ ...prev, ...updates }))
  }, [])

  const handleNext = useCallback(() => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }, [currentStep])

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  const handleComplete = useCallback(() => {
    toast.show('Template setup complete!', 'success')
    navigate('/reports')
  }, [navigate, toast])

  const getStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <StepConnection
            wizardState={wizardState}
            updateWizardState={updateWizardState}
            onComplete={handleNext}
            setLoading={setLoading}
          />
        )
      case 1:
        return (
          <StepTemplate
            wizardState={wizardState}
            updateWizardState={updateWizardState}
            onComplete={handleNext}
            setLoading={setLoading}
          />
        )
      case 2:
        return (
          <StepMapping
            wizardState={wizardState}
            updateWizardState={updateWizardState}
            onComplete={handleComplete}
            setLoading={setLoading}
          />
        )
      default:
        return null
    }
  }

  const isNextDisabled = () => {
    switch (currentStep) {
      case 0:
        return !wizardState.connectionId && !activeConnection?.id
      case 1:
        return !wizardState.templateId && !templateId
      case 2:
        return false
      default:
        return false
    }
  }

  return (
    <WizardLayout
      title="Set Up Report Template"
      subtitle="Connect your data source and configure your report template"
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onNext={handleNext}
      onPrev={handlePrev}
      onComplete={handleComplete}
      nextDisabled={isNextDisabled()}
      loading={loading}
    >
      {getStepContent()}
    </WizardLayout>
  )
}
