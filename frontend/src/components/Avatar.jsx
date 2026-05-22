import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { useEffect, useRef } from 'react';

const STATE_MACHINE_NAME = 'State Machine 1';
const DIRECT_ANIMATIONS = {
  idle: 'IDLE9',
  listening: 'Listening9',
  thinking: 'Thinking9',
  speaking: 'Speaking9',
};
const IDLE_RETRY_DELAYS_MS = [750, 1500, 2500, 4000];

export default function Avatar({ state, onReady }) {
  const prevStateRef = useRef(null);
  const idleRetryTimeoutsRef = useRef([]);
  const readyNotifiedRef = useRef(false);

  const { rive, RiveComponent } = useRive({
    src: 'avatar.riv',
    stateMachines: STATE_MACHINE_NAME,
    layout: new Layout({
      fit: Fit.Cover,
      alignment: Alignment.Center,
    }),
    autoplay: false,
  });

  const idleInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'IDLE');
  const listenInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'Listening');
  const thinkInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'Thinking');
  const speakInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'Speaking');

  const availableAnimations = new Set(rive?.animationNames ?? []);
  const playbackMode = !rive
    ? 'pending'
    : Object.values(DIRECT_ANIMATIONS).every((name) => availableAnimations.has(name))
      ? 'animations'
      : 'state-machine';

  const currentInput =
    state === 'idle'
      ? idleInput
      : state === 'listening'
        ? listenInput
        : state === 'thinking'
          ? thinkInput
          : state === 'speaking'
            ? speakInput
            : null;

  useEffect(() => {
    const notifyReady = () => {
      if (readyNotifiedRef.current) return;
      readyNotifiedRef.current = true;
      onReady?.();
    };

    if (!rive || playbackMode === 'pending') {
      return;
    }

    if (playbackMode === 'animations' || currentInput) {
      notifyReady();
    }
  }, [rive, playbackMode, currentInput, onReady]);

  useEffect(() => {
    const clearIdleRetries = () => {
      idleRetryTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      idleRetryTimeoutsRef.current = [];
    };

    clearIdleRetries();

    if (!rive || playbackMode === 'pending') {
      return clearIdleRetries;
    }

    if (playbackMode === 'animations') {
      if (prevStateRef.current === state) {
        return clearIdleRetries;
      }

      prevStateRef.current = state;
      const animationName = DIRECT_ANIMATIONS[state] ?? DIRECT_ANIMATIONS.idle;
      rive.stop();
      rive.reset({
        animations: animationName,
        autoplay: true,
      });
      return clearIdleRetries;
    }

    if (!currentInput) {
      return clearIdleRetries;
    }

    if (prevStateRef.current === state) {
      return clearIdleRetries;
    }

    prevStateRef.current = state;

    currentInput.fire();

    if (rive.isPaused || rive.isStopped) {
      rive.play();
    }

    if (state === 'idle' && idleInput) {
      IDLE_RETRY_DELAYS_MS.forEach((delay) => {
        const timeoutId = window.setTimeout(() => {
          idleInput.fire();
          if (rive.isPaused || rive.isStopped) {
            rive.play();
          }
        }, delay);
        idleRetryTimeoutsRef.current.push(timeoutId);
      });
    }

    return clearIdleRetries;
  }, [state, rive, playbackMode, currentInput, idleInput]);

  return (
    <div className="w-full h-full relative">
      <RiveComponent className="w-full h-full" />
    </div>
  );
}
