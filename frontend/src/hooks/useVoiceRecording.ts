import { useState, useRef, useCallback } from 'react';

export type VoiceState = 'idle' | 'recording' | 'processing';

export interface ParsedExpense {
  name: string;
  amount: number;
  category: string;
  date: string;
  confidence: number;
  ambiguous: boolean;
}

export interface VoiceParseResponse {
  transcript: string;
  expenses: ParsedExpense[];
}

const MAX_RECORDING_TIME = 15000; // 15 seconds

export function useVoiceRecording() {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setState('recording');

      // Auto-stop after 15 seconds
      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, MAX_RECORDING_TIME);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not access microphone. Please check permissions.');
      setState('idle');
    }
  }, []);

  const stopRecording = useCallback((): Promise<VoiceParseResponse> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || mediaRecorder.state !== 'recording') {
        reject(new Error('No active recording'));
        return;
      }

      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }

      mediaRecorder.onstop = async () => {
        setState('processing');

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const result = await sendAudioForParsing(audioBlob);
          setState('idle');
          resolve(result);
        } catch (err) {
          setState('idle');
          const errorMessage = err instanceof Error ? err.message : 'Failed to parse audio';
          setError(errorMessage);
          reject(err);
        }
      };

      mediaRecorder.stop();
    });
  }, []);

  const sendAudioForParsing = async (audioBlob: Blob): Promise<VoiceParseResponse> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          const base64Audio = reader.result as string;

          const response = await fetch(`/api/voice/parse`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
            body: JSON.stringify({ audioData: base64Audio })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to parse audio');
          }

          const result: VoiceParseResponse = await response.json();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to process audio file'));
      };

      reader.readAsDataURL(audioBlob);
    });
  };

  const cancelRecording = useCallback(() => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setState('idle');
    audioChunksRef.current = [];
  }, []);

  return {
    state,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
