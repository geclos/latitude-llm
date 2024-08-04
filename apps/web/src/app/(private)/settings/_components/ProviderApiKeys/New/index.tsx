import { Providers } from '@latitude-data/core/browser'
import {
  Button,
  CloseTrigger,
  FormWrapper,
  Input,
  Modal,
  Select,
} from '@latitude-data/web-ui'
import { useFormAction } from '$/hooks/useFormAction'
import useProviderApiKeys from '$/stores/providerApiKeys'

export default function NewApiKey({
  open,
  setOpen,
}: {
  open: boolean
  setOpen: (open: boolean) => void
}) {
  const { create } = useProviderApiKeys()
  const { data, action } = useFormAction(create, {
    onSuccess: () => setOpen(false),
  })

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title='Add new API Key'
      description='API keys allow you to work with a specific LLM model in your prompts and evaluations.'
      footer={
        <>
          <CloseTrigger />
          <Button form='createApiKeyForm' type='submit'>
            Create API Key
          </Button>
        </>
      }
    >
      <form id='createApiKeyForm' action={action}>
        <FormWrapper>
          <Input type='hidden' name='provider' value={Providers.OpenAI} />
          <Select
            required
            label='Provider'
            name='provider'
            value={data?.provider}
            options={Object.entries(Providers).map(([key, value]) => ({
              value,
              label: key,
            }))}
          />
          <Input
            required
            type='text'
            label='Name'
            name='name'
            defaultValue={data?.name}
            placeholder='My API Key'
          />
          <Input
            required
            label='Token'
            type='text'
            name='token'
            defaultValue={data?.token}
            placeholder='sk-0dfdsn23bm4m23n4MfB'
          />
        </FormWrapper>
      </form>
    </Modal>
  )
}
