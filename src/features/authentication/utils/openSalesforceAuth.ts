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

const SALESFORCE_URLS = {
  production: 'https://login.salesforce.com',
  sandbox: 'https://test.salesforce.com',
};

export function openSalesforceAuth(environment: 'production' | 'sandbox' = 'production'): void {
  const clientId = import.meta.env.VITE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_REDIRECT_URI;
  const baseUrl = SALESFORCE_URLS[environment];

  console.log('[Auth] Opening Salesforce OAuth popup');
  console.log('[Auth] Environment:', environment);
  console.log('[Auth] Client ID:', clientId ? `${clientId.substring(0, 20)}...` : 'MISSING');
  console.log('[Auth] Redirect URI:', redirectUri);
  console.log('[Auth] Base URL:', baseUrl);
  console.log('[Auth] Current window origin:', window.location.origin);

  const params = new URLSearchParams({
    response_type: 'token',
    client_id: clientId,
    redirect_uri: redirectUri,
    // Add prompt=login to force fresh authentication (prevents instant close on retry)
    prompt: 'login',
  });

  const url = `${baseUrl}/services/oauth2/authorize?${params.toString()}`;
  const windowName = `salesforce_auth_${Date.now()}`;
  
  console.log('[Auth] Opening popup with name:', windowName);
  console.log('[Auth] Full OAuth URL:', url);
  
  const popup = window.open(url, windowName, 'width=500,height=700,resizable=yes,scrollbars=yes');
  
  if (!popup) {
    console.error('[Auth] Failed to open popup - popup may be blocked');
  } else {
    console.log('[Auth] Popup opened successfully');
    console.log('[Auth] Popup closed status:', popup.closed);
    
    // Monitor popup status
    const checkPopup = setInterval(() => {
      if (popup.closed) {
        console.log('[Auth] Popup was closed');
        clearInterval(checkPopup);
      }
    }, 1000);
  }
}
