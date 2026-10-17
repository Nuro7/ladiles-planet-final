import { useState, useCallback } from 'react';
import { uploadPhoto as apiUpload, applyLook as apiApply } from '../api/tryOn';
import { createSession } from '../api/session';

/**
 * useTryOn — manages the full virtual try-on flow:
 *   photo → sessionId → activeLook → result
 */
export function useTryOn() {
  const [photo, setPhoto]           = useState(null);   // File | null
  const [photoUrl, setPhotoUrl]     = useState(null);   // local preview URL
  const [sessionId, setSessionId]   = useState(null);
  const [activeLook, setActiveLook] = useState(null);
  const [result, setResult]         = useState(null);   // { resultImageUrl, confidence }
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const clearError = () => setError(null);

  const uploadPhoto = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    setResult(null);

    // Show instant local preview
    const localUrl = URL.createObjectURL(file);
    setPhoto(file);
    setPhotoUrl(localUrl);

    try {
      const data = await apiUpload(file);
      setSessionId(data.sessionId);
    } catch (err) {
      setError(err.message || 'Failed to upload photo. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const applyLook = useCallback(async (lookId) => {
    if (!sessionId) {
      setError('Please upload a photo first.');
      return;
    }

    setLoading(true);
    setError(null);
    setActiveLook(lookId);

    try {
      const data = await apiApply(sessionId, lookId);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to apply look. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const resetSession = useCallback(() => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(null);
    setPhotoUrl(null);
    setSessionId(null);
    setActiveLook(null);
    setResult(null);
    setError(null);
    setLoading(false);
  }, [photoUrl]);

  return {
    photo,
    photoUrl,
    sessionId,
    activeLook,
    result,
    loading,
    error,
    uploadPhoto,
    applyLook,
    resetSession,
    clearError,
  };
}

export default useTryOn;
