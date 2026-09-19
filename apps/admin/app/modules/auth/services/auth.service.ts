import { createServerFn } from '@tanstack/react-start'
import { getResponseHeaders } from '@tanstack/react-start/server'
import type { LoginResponse } from '@repo/types'
import { loginSchema } from '@repo/validators'
import { translateSync } from '@repo/i18n'
import { buildApiPath, forwardApiSetCookieHeaders, throwApiServiceError } from '@repo/common'
import { API_ROUTES, api } from '~/config/api'

export const loginFn = createServerFn({ method: 'POST' })
  .validator(loginSchema)
  .handler(async ({ data }): Promise<LoginResponse> => {
    try {
      return forwardApiSetCookieHeaders(
        await api.postWithResponse<LoginResponse>(
          buildApiPath(API_ROUTES.auth, API_ROUTES.auth.path.login()),
          data
        ),
        getResponseHeaders()
      )
    } catch (error) {
      throwApiServiceError(error, translateSync('auth:login.error.fallback'))
    }
  })
