/**
 *
 * (c) Copyright Ascensio System SIA 2026
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { createContext } from 'preact';
import { signal, computed } from '@preact/signals';

import type { Authentication, AuthenticationStore } from '@features/authentication/types';
import { emptyAuthentication, AUTHENTICATION_STORAGE_KEY } from '@features/authentication/types';

const TOKEN_LIFETIME_SECONDS = 3600;

function createAuthenticationStore(): AuthenticationStore {
  let expirationTimer: ReturnType<typeof setTimeout> | null = null;
  const stored = localStorage.getItem(AUTHENTICATION_STORAGE_KEY);
  
  console.log('[AuthStore] Initializing authentication store');
  console.log('[AuthStore] Stored auth found:', !!stored);
  
  const state = signal<Authentication>(
    stored ? JSON.parse(stored) : emptyAuthentication,
  );
  
  if (stored) {
    const parsed = JSON.parse(stored);
    console.log('[AuthStore] Loaded stored authentication:', {
      hasAccessToken: !!parsed.access_token,
      expiresAt: parsed.expires_at ? new Date(parsed.expires_at * 1000).toISOString() : 'none',
    });
  }

  const clearExpirationTimer = () => {
    if (expirationTimer) {
      clearTimeout(expirationTimer);
      expirationTimer = null;
    }
  };

  const clear = () => {
    console.log('[AuthStore] Clearing authentication');
    clearExpirationTimer();
    state.value = emptyAuthentication;
    localStorage.removeItem(AUTHENTICATION_STORAGE_KEY);
  };

  const setExpirationTimer = (expiresAt: number) => {
    clearExpirationTimer();
    const untilExpiration = (expiresAt * 1000) - Date.now();
    const expiresInMinutes = Math.floor(untilExpiration / 60000);
    
    console.log('[AuthStore] Setting expiration timer:', {
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      expiresInMinutes,
    });
    
    if (untilExpiration > 0) {
      expirationTimer = setTimeout(clear, untilExpiration);
    } else {
      console.warn('[AuthStore] Token already expired, clearing immediately');
      clear();
    }
  };

  const isAuthenticated = computed(() => {
    const auth = state.value;
    
    if (!auth.access_token) {
      console.log('[AuthStore] Not authenticated: no access token');
      return false;
    }
    
    if (auth.expires_at && Date.now() / 1000 >= auth.expires_at) {
      console.log('[AuthStore] Not authenticated: token expired');
      clear();
      return false;
    }

    console.log('[AuthStore] Authenticated');
    return true;
  });

  const authenticate = (authentication: Omit<Authentication, 'expires_at'>) => {
    console.log('[AuthStore] Authenticating with params:', {
      hasAccessToken: !!authentication.access_token,
      hasId: !!authentication.id,
      hasInstanceUrl: !!authentication.instance_url,
      issuedAt: authentication.issued_at,
      issuedAtDate: new Date(authentication.issued_at).toISOString(),
    });
    
    const expiresAt = Math.floor(authentication.issued_at / 1000) + TOKEN_LIFETIME_SECONDS;

    const fullAuthentication: Authentication = {
      ...authentication,
      expires_at: expiresAt,
    };

    console.log('[AuthStore] Storing authentication in state and localStorage');
    state.value = fullAuthentication;
    localStorage.setItem(AUTHENTICATION_STORAGE_KEY, JSON.stringify(fullAuthentication));
    setExpirationTimer(expiresAt);
    
    console.log('[AuthStore] Authentication complete');
  };

  if (state.value.expires_at) setExpirationTimer(state.value.expires_at);

  return {
    state,
    isAuthenticated,
    authenticate,
    clear,
  };
}

const store = createAuthenticationStore();

export const AuthenticationContext = createContext<AuthenticationStore>(store);

interface AuthenticationProviderProps {
  children: preact.ComponentChildren;
}

export function AuthenticationProvider({ children }: AuthenticationProviderProps) {
  return (
    <AuthenticationContext.Provider value={store}>
      {children}
    </AuthenticationContext.Provider>
  );
}
