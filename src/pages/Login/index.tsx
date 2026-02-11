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

import { useEffect, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';

import {
  Button, Label, Select, Paragraph, ErrorBox,
} from '@components';
import { useAuthentication, openSalesforceAuth } from '@features/authentication';

import { useTranslation } from '@hooks';

import { openGuide } from '@utils';

import './login.css';

type Environment = 'production' | 'sandbox';

export function Login() {
  const { route } = useLocation();
  const { t, isReady } = useTranslation();
  const { authenticate } = useAuthentication();

  const [environment, setEnvironment] = useState<Environment>('production');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Login] Setting up message listener');
    
    const handleMessage = (event: MessageEvent) => {
      console.log('[Login] Message received:', {
        type: event.data?.type,
        origin: event.origin,
        hasParams: !!event.data?.params,
      });
      
      if (event.data?.type === 'salesforce_auth' && event.data.params) {
        console.log('[Login] Salesforce auth message received');
        console.log('[Login] Auth params:', {
          hasAccessToken: !!event.data.params.access_token,
          hasId: !!event.data.params.id,
          hasInstanceUrl: !!event.data.params.instance_url,
          issuedAt: event.data.params.issued_at,
        });
        
        try {
          authenticate({ ...event.data.params });
          console.log('[Login] Authentication successful, routing to home');
          route('/');
        } catch (error) {
          console.error('[Login] Authentication failed:', error);
          setError('Authentication failed. Please try again.');
        }
      } else if (event.data?.type === 'salesforce_auth_error') {
        console.error('[Login] OAuth error received:', event.data.error);
        console.error('[Login] Error description:', event.data.error_description);
        
        const errorMsg = event.data.error_description || event.data.error || 'Unknown error';
        setError(errorMsg);
      } else {
        console.log('[Login] Ignoring message (not salesforce_auth or missing params)');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      console.log('[Login] Removing message listener');
      window.removeEventListener('message', handleMessage);
    };
  }, [authenticate, route]);

  const handleAuthorize = () => {
    console.log('[Login] Initiating Salesforce authorization for environment:', environment);
    setError(null); // Clear any previous errors
    openSalesforceAuth(environment);
  };

  if (!isReady) {
    return (
      <div className="login-page page-enter">
        <div className="login-page__content" />
      </div>
    );
  }

  return (
    <div className="login-page page-enter">
      <div className="login-page__content">
        {error && (
          <div className="login-page__spacing">
            <ErrorBox 
              title={t('common.error')} 
              message={error}
            />
            {error.includes('Cross-org') && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                <Paragraph>
                  This error occurs when your Salesforce Connected App is not configured to allow cross-organization OAuth flows.
                  Please ensure your Connected App settings allow access from different organizations.
                </Paragraph>
              </div>
            )}
          </div>
        )}
        
        <div className="login-page__spacing">
          <Paragraph>{t('auth.please_login')}</Paragraph>
        </div>

        <div className="login-page__label-spacing">
          <Label>
            {t('auth.environment')}
            :
          </Label>
        </div>
        <div className="login-page__spacing">
          <Select
            options={[
              { value: 'production', label: t('auth.production') },
              { value: 'sandbox', label: t('auth.sandbox') },
            ]}
            value={environment}
            onChange={(value) => setEnvironment(value as Environment)}
          />
        </div>

        <div className="login-page__spacing">
          <Paragraph>{t('auth.authorize_description')}</Paragraph>
        </div>

        <Button variant="primary" fullWidth onClick={handleAuthorize}>
          {t('auth.login')}
        </Button>
      </div>

      <div className="login-page__footer">
        <Button variant="link" onClick={openGuide}>
          {t('common.open_guide')}
        </Button>
      </div>
    </div>
  );
}
