import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type {
  ConfirmUserRegistrationInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterUserInput,
  ResetPasswordInput,
} from '@repo/validators'
import { WEB_ROUTES } from '../../common/constants/routes'
import { useSessionStore } from '../../common/stores/session.store'
import { resolvePostAuthPath } from '../../legal-documents/services/legal-documents.service'
import {
  confirmUserRegistrationFn,
  forgotPasswordFn,
  loginFn,
  requestRegisterUserFn,
  resetPasswordFn,
} from '../services/auth.service'
import { saveAuthSession } from '../utils/auth-storage.utils'

export function useLogin(returnTo?: string) {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (input: LoginInput) => loginFn({ data: input }),
    onSuccess: async (session) => {
      saveAuthSession(session)
      await useSessionStore.getState().loadSession()
      const to = await resolvePostAuthPath(returnTo ?? WEB_ROUTES.events())
      await navigate({ to: to as '/', replace: true })
    },
  })
}

export function useRequestRegister() {
  return useMutation({
    mutationFn: (input: RegisterUserInput) => requestRegisterUserFn({ data: input }),
  })
}

export function useConfirmUserRegistration() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (input: ConfirmUserRegistrationInput) => confirmUserRegistrationFn({ data: input }),
    onSuccess: async (session) => {
      saveAuthSession(session)
      await useSessionStore.getState().loadSession()
      const to = await resolvePostAuthPath(WEB_ROUTES.events())
      await navigate({ to: to as '/', replace: true })
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) => forgotPasswordFn({ data: input }),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => resetPasswordFn({ data: input }),
  })
}
