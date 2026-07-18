'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '@/constants';

export type EmailStatus = 'idle' | 'checking' | 'available' | 'exists' | 'invalid';
export type EmailConfirmStatus = 'idle' | 'matched' | 'mismatched' | 'empty';

export function useEmailValidation(
  email: string,
  confirmEmail?: string,
  bypass: boolean = false
) {
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle');
  const [emailConfirmStatus, setEmailConfirmStatus] = useState<EmailConfirmStatus>('idle');

  useEffect(() => {
    if (bypass) {
      setEmailStatus('idle');
      return;
    }

    const trimmedEmail = email ? email.trim() : '';
    if (!trimmedEmail) {
      setEmailStatus('idle');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailStatus('invalid');
      return;
    }

    setEmailStatus('checking');

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/auth/mobile/check-user?email=${encodeURIComponent(trimmedEmail)}`
        );
        if (res.data && res.data.exists) {
          setEmailStatus('exists');
        } else {
          setEmailStatus('available');
        }
      } catch (err) {
        console.error('Error checking email availability:', err);
        setEmailStatus('idle');
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [email, bypass]);

  useEffect(() => {
    if (bypass || confirmEmail === undefined) {
      setEmailConfirmStatus('idle');
      return;
    }

    const trimmedEmail = email ? email.trim() : '';
    const trimmedConfirm = confirmEmail ? confirmEmail.trim() : '';

    if (!trimmedConfirm) {
      setEmailConfirmStatus('empty');
      return;
    }

    if (trimmedEmail === trimmedConfirm) {
      setEmailConfirmStatus('matched');
    } else {
      setEmailConfirmStatus('mismatched');
    }
  }, [email, confirmEmail, bypass]);

  return { emailStatus, emailConfirmStatus, setEmailStatus, setEmailConfirmStatus };
}
