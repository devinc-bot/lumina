import { createServerFn } from '@tanstack/react-start'
import { getResponseHeaders } from '@tanstack/react-start/server'
import {
  confirmUserRegistrationSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@repo/validators'
import { translateSync } from '@repo/i18n'
import { API_ROUTES, api } from '~/config/api'
import { forwardApiSetCookieHeaders, throwApiServiceError, buildApiPath } from '@repo/common'
import type { LoginResponse } from '@repo/types'

async function postAuth<T>(path: string, data: unknown, fallback: string): Promise<T> {
  try {
    return await api.post<T>(path, data)
  } catch (error) {
    throwApiServiceError(error, fallback)
  }
}

async function postAuthWithCookies<T>(path: string, data: unknown, fallback: string): Promise<T> {
  try {
    return forwardApiSetCookieHeaders(
      await api.postWithResponse<T>(path, data),
      getResponseHeaders()
    )
  } catch (error) {
    throwApiServiceError(error, fallback)
  }
}

export const loginFn = createServerFn({ method: 'POST' })
  .validator(loginSchema)
  .handler(async ({ data }): Promise<LoginResponse> => {
    return postAuthWithCookies<LoginResponse>(
      buildApiPath(API_ROUTES.auth, API_ROUTES.auth.path.login()),
      data,
      translateSync('auth:login.error.fallback')
    )
  })

export const requestRegisterOwnerFn = createServerFn({ method: 'POST' })
  .validator(registerSchema)
  .handler(async ({ data }): Promise<void> => {
    return postAuth<void>(
      buildApiPath(API_ROUTES.auth, API_ROUTES.auth.path.registerOwnerRequest()),
      data,
      translateSync('auth:register.error.fallback')
    )
  })

export const confirmOwnerRegistrationFn = createServerFn({ method: 'POST' })
  .validator(confirmUserRegistrationSchema)
  .handler(async ({ data }): Promise<LoginResponse> => {
    return postAuthWithCookies<LoginResponse>(
      buildApiPath(API_ROUTES.auth, API_ROUTES.auth.path.registerOwnerConfirm()),
      data,
      translateSync('auth:register.confirm.error.fallback')
    )
  })

export const forgotPasswordFn = createServerFn({ method: 'POST' })
  .validator(forgotPasswordSchema)
  .handler(async ({ data }): Promise<void> => {
    return postAuth<void>(
      buildApiPath(API_ROUTES.auth, API_ROUTES.auth.path.forgotPassword()),
      data,
      translateSync('auth:forgotPassword.error.fallback')
    )
  })

export const resetPasswordFn = createServerFn({ method: 'POST' })
  .validator(resetPasswordSchema)
  .handler(async ({ data }): Promise<void> => {
    return postAuth<void>(
      buildApiPath(API_ROUTES.auth, API_ROUTES.auth.path.resetPassword()),
      data,
      translateSync('auth:resetPassword.error.fallback')
    )
  })
