import React, { useState, useEffect } from 'react';
import { useVault } from '../hooks/useVault';
import { evaluatePasswordStrength, generateRecoveryCode } from '../lib/crypto';
import { Logo } from './Logo';
import {
  Lock,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Copy,
  Check,
  HelpCircle,
  LifeBuoy,
  ArrowLeft,
  Trash2,
  Fingerprint,
} from 'lucide-react';

export const UnlockScreen: React.FC = () => {
  const {
    hasVault,
    createVault,
    unlockVault,
    unlockWithRecoveryCode,
    unlockWithPasskey,
    isPasskeySupported,
    hasPasskey,
    passwordHint,
    wipeVault,
  } = useVault();

  // Setup state
  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoverySaved, setRecoverySaved] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Unlock state
  const [unlockMode, setUnlockMode] = useState<'passkey' | 'password' | 'recovery'>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Set default unlockMode based on passkey availability
  useEffect(() => {
    if (hasVault && hasPasskey && isPasskeySupported) {
      setUnlockMode('passkey');
    } else {
      setUnlockMode('password');
    }
  }, [hasVault, hasPasskey, isPasskeySupported]);

  // Rate limit / Cooldown state (3 failures -> 5s cooldown)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Modal confirm wipe
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  const passwordStrength = evaluatePasswordStrength(password);

  // Cooldown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleTriggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 450);
  };

  const handleSetupStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!userName.trim()) {
      setErrorMessage('Your display name is required.');
      handleTriggerShake();
      return;
    }
    if (!password) {
      setErrorMessage('Master password is required.');
      handleTriggerShake();
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Master password must be at least 8 characters long.');
      handleTriggerShake();
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      handleTriggerShake();
      return;
    }

    // Generate recovery code for Step 2
    const code = generateRecoveryCode();
    setRecoveryCode(code);
    setSetupStep(2);
  };

  const handleFinalizeCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!recoverySaved) {
      setErrorMessage('You must check the box confirming you saved your recovery code.');
      handleTriggerShake();
      return;
    }

    try {
      setIsLoading(true);
      await createVault(password, hint.trim() || undefined, userName.trim() || undefined);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize encrypted vault.');
      handleTriggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyRecoveryCode = () => {
    navigator.clipboard.writeText(recoveryCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleUnlockPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds > 0) return;
    setErrorMessage(null);

    if (!password) {
      setErrorMessage('Please enter your master password.');
      handleTriggerShake();
      return;
    }

    try {
      setIsLoading(true);
      await unlockVault(password);
      setFailedAttempts(0);
    } catch (err: any) {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);
      handleTriggerShake();

      if (nextFailures >= 3) {
        setCooldownSeconds(5);
        setErrorMessage('Too many failed attempts. Cooldown active for 5 seconds.');
      } else {
        setErrorMessage('Incorrect master password. Authentication check failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockPasskey = async () => {
    if (cooldownSeconds > 0) return;
    setErrorMessage(null);

    try {
      setIsLoading(true);
      await unlockWithPasskey();
      setFailedAttempts(0);
    } catch (err: any) {
      const msg = err.message || 'Passkey authentication failed.';
      if (msg === 'Cancelled or timed out.') {
        setErrorMessage('Passkey unlock cancelled or timed out.');
      } else {
        const nextFailures = failedAttempts + 1;
        setFailedAttempts(nextFailures);
        handleTriggerShake();

        if (nextFailures >= 3) {
          setCooldownSeconds(5);
          setErrorMessage('Too many failed attempts. Cooldown active for 5 seconds.');
        } else {
          setErrorMessage(msg);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds > 0) return;
    setErrorMessage(null);

    if (!recoveryCode) {
      setErrorMessage('Please enter your 24-character recovery code.');
      handleTriggerShake();
      return;
    }

    try {
      setIsLoading(true);
      await unlockWithRecoveryCode(recoveryCode);
      setFailedAttempts(0);
    } catch (err: any) {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);
      handleTriggerShake();

      if (nextFailures >= 3) {
        setCooldownSeconds(5);
        setErrorMessage('Too many failed attempts. Cooldown active for 5 seconds.');
      } else {
        setErrorMessage('Invalid recovery code. Please check and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleWipeVault = async () => {
    try {
      setIsLoading(true);
      await wipeVault();
      setShowWipeConfirm(false);
      setUserName('');
      setPassword('');
      setConfirmPassword('');
      setHint('');
      setRecoveryCode('');
      setSetupStep(1);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage('Failed to wipe vault.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[var(--bg-main)] flex flex-col items-center justify-center p-4 select-none relative pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      <div
        className={`max-w-md w-full bg-[var(--bg-card)] border-keepeit rounded-keepeit p-6 sm:p-8 shadow-xl relative z-10 ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">
            KeepEit
          </h1>
          <p className="text-xs font-mono-label text-[var(--text-muted)] mt-1">
            Developer: Kurt Ross
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-keepeit bg-red-500/10 border border-[var(--accent-rust)]/30 text-[var(--accent-rust)] text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Authentication Error</p>
              <p className="mt-0.5 leading-normal">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Cooldown Active Banner */}
        {cooldownSeconds > 0 && (
          <div className="mb-5 p-3 rounded-keepeit bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-mono-label flex items-center justify-between">
            <span>RATE LIMIT ACTIVE</span>
            <span className="font-bold">WAIT {cooldownSeconds}S</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* CASE 1: FIRST-TIME SETUP SCREEN                           */}
        {/* ========================================================= */}
        {hasVault === false && (
          <div>
            {setupStep === 1 && (
              <form onSubmit={handleSetupStep1} className="space-y-4">
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-xs text-[var(--text-muted)] leading-relaxed">
                  <p className="font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[var(--accent-seal)]" />
                    100% Private & Zero-Knowledge
                  </p>
                  Only you hold the key to your vault. Your data is encrypted directly on your device—not even we can see, read, or recover your master password.
                </div>

                <div>
                  <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                    YOUR NAME
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g., Juan Dela Cruz"
                    className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-seal)]"
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                    CREATE MASTER PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters..."
                      className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-sm text-[var(--text-primary)] pr-10 focus-visible:ring-2 focus-visible:ring-[var(--accent-seal)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-keepeit focus-visible:ring-2"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono-label">
                        <span className="text-[var(--text-muted)]">STRENGTH:</span>
                        <span className="font-semibold text-[var(--accent-seal)]">
                          {passwordStrength.label.toUpperCase()}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--bg-surface)] rounded-full overflow-hidden flex gap-1">
                        {[0, 1, 2, 3].map((step) => (
                          <div
                            key={step}
                            className={`h-full flex-1 transition-all ${
                              step <= passwordStrength.score
                                ? passwordStrength.score >= 3
                                  ? 'bg-[var(--accent-seal)]'
                                  : passwordStrength.score >= 2
                                  ? 'bg-amber-500'
                                  : 'bg-[var(--accent-rust)]'
                                : 'bg-transparent'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                    CONFIRM MASTER PASSWORD
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter master password..."
                    className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-seal)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                    PASSWORD HINT (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder="e.g. Favorite book title + graduation year"
                    className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-seal)]"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-stealth-primary w-full mt-2 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label font-semibold py-2.5 px-4 rounded-keepeit transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B]"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>GENERATE RECOVERY CODE</span>
                </button>
              </form>
            )}

            {setupStep === 2 && (
              <form onSubmit={handleFinalizeCreateVault} className="space-y-4">
                <div className="p-4 bg-[var(--bg-surface)] border-keepeit rounded-keepeit space-y-3">
                  <h3 className="font-mono-label text-xs text-[var(--text-primary)] font-bold">
                    YOUR EMERGENCY RECOVERY CODE
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    If you forget your master password, this 24-character Crockford base32 code is your ONLY way to restore your vault. Write it down or save it in a safe offline location.
                  </p>

                  <div className="p-3 bg-[var(--bg-card)] border-keepeit rounded-keepeit flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-[var(--accent-seal)] tracking-wider break-all select-all">
                      {recoveryCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyRecoveryCode}
                      className="px-2.5 py-1.5 bg-[var(--accent-seal)] text-[var(--accent-fg)] font-mono-label text-[10px] rounded-keepeit hover:opacity-90 flex items-center gap-1 shrink-0 font-bold"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'COPIED' : 'COPY'}</span>
                    </button>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 p-3 bg-[var(--bg-surface)] border-keepeit rounded-keepeit cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recoverySaved}
                    onChange={(e) => setRecoverySaved(e.target.checked)}
                    className="mt-0.5 accent-[var(--accent-seal)]"
                  />
                  <span className="text-xs text-[var(--text-primary)] leading-snug">
                    I have saved my recovery code in a secure location. I understand it cannot be recovered if lost.
                  </span>
                </label>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSetupStep(1)}
                    className="px-3 py-2.5 border-keepeit rounded-keepeit text-xs font-mono-label text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    BACK
                  </button>
                  <button
                    type="submit"
                    disabled={!recoverySaved || isLoading}
                    className={`flex-1 font-mono-label font-semibold py-2.5 px-4 rounded-keepeit transition-all flex items-center justify-center gap-2 ${
                      recoverySaved && !isLoading
                        ? 'btn-stealth-primary bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B]'
                        : 'bg-gray-400 dark:bg-gray-700 text-zinc-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isLoading ? 'ENCRYPTING VAULT...' : 'CREATE ENCRYPTED VAULT'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* CASE 2: RETURNING USER LOCK SCREEN                        */}
        {/* ========================================================= */}
        {hasVault === true && (
          <div>
            {unlockMode === 'passkey' ? (
              <div className="space-y-4">
                <div className="p-4 bg-[var(--bg-surface)] border-keepeit rounded-keepeit text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--accent-seal)] text-[var(--accent-fg)]">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <h3 className="font-mono-label text-xs font-bold text-[var(--text-primary)]">
                    BIOMETRIC PASSKEY UNLOCK
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Authenticate using your device's biometric sensor or security PIN to unwrap your vault DEK.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={cooldownSeconds > 0 || isLoading}
                  onClick={handleUnlockPasskey}
                  className="btn-stealth-primary w-full bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label font-semibold py-3 px-4 rounded-keepeit transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  <Fingerprint className="w-5 h-5" />
                  <span>{isLoading ? 'AUTHENTICATING...' : 'UNLOCK WITH PASSKEY'}</span>
                </button>

                <div className="flex flex-col items-center gap-2 pt-2 border-t border-keepeit text-xs font-mono-label">
                  <button
                    type="button"
                    onClick={() => {
                      setUnlockMode('password');
                      setErrorMessage(null);
                    }}
                    className="text-[var(--text-primary)] hover:underline font-semibold"
                  >
                    Use master password
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUnlockMode('recovery');
                      setErrorMessage(null);
                    }}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] underline text-[11px]"
                  >
                    Use recovery code
                  </button>
                </div>
              </div>
            ) : unlockMode === 'password' ? (
              <form onSubmit={handleUnlockPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                    MASTER PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      disabled={cooldownSeconds > 0 || isLoading}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter master password..."
                      className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-sm text-[var(--text-primary)] pr-10 focus-visible:ring-2 focus-visible:ring-[var(--accent-seal)] disabled:opacity-50"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-keepeit focus-visible:ring-2"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Hint Toggle */}
                {passwordHint && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowHint(!showHint)}
                      className="text-xs font-mono-label text-[var(--accent-seal)] hover:underline flex items-center gap-1 focus-visible:ring-2 rounded-keepeit"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{showHint ? 'HIDE HINT' : 'SHOW PASSWORD HINT'}</span>
                    </button>
                    {showHint && (
                      <div className="mt-2 p-2.5 bg-[var(--bg-surface)] border-keepeit rounded-keepeit text-xs text-[var(--text-primary)] font-mono">
                        <span className="text-[var(--text-muted)] block text-[10px]">RECOVERY HINT:</span>
                        {passwordHint}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={cooldownSeconds > 0 || isLoading}
                  className="btn-stealth-primary w-full bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label font-semibold py-2.5 px-4 rounded-keepeit transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isLoading ? 'DECRYPTING...' : 'UNLOCK VAULT'}</span>
                </button>

                <div className="flex justify-center items-center gap-3 pt-1 text-xs font-mono-label">
                  {hasPasskey && isPasskeySupported && (
                    <button
                      type="button"
                      onClick={() => {
                        setUnlockMode('passkey');
                        setErrorMessage(null);
                      }}
                      className="text-[var(--accent-seal)] font-semibold hover:underline flex items-center gap-1"
                    >
                      <Fingerprint className="w-3.5 h-3.5" />
                      <span>Use passkey</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setUnlockMode('recovery');
                      setErrorMessage(null);
                    }}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] underline"
                  >
                    Use recovery code
                  </button>
                </div>
              </form>
            ) : (
              /* Recovery Code Unlock Mode */
              <form onSubmit={handleUnlockRecovery} className="space-y-4">
                <div className="p-3 bg-[var(--bg-surface)] border-keepeit rounded-keepeit text-xs text-[var(--text-muted)]">
                  <p className="font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1">
                    <LifeBuoy className="w-4 h-4 text-[var(--accent-seal)]" />
                    Emergency Recovery Mode
                  </p>
                  Enter the 24-character Crockford base32 recovery code generated when your vault was created.
                </div>

                <div>
                  <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                    RECOVERY CODE
                  </label>
                  <input
                    type="text"
                    value={recoveryCode}
                    disabled={cooldownSeconds > 0 || isLoading}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                    className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 font-mono text-sm tracking-wider text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-seal)] disabled:opacity-50"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={cooldownSeconds > 0 || isLoading}
                  className="btn-stealth-primary w-full bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label font-semibold py-2.5 px-4 rounded-keepeit transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LifeBuoy className="w-4 h-4" />
                  <span>{isLoading ? 'VERIFYING...' : 'UNLOCK WITH RECOVERY CODE'}</span>
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setUnlockMode('password');
                      setErrorMessage(null);
                    }}
                    className="text-xs font-mono-label text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1 mx-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to master password</span>
                  </button>
                </div>
              </form>
            )}

            {/* Reset Vault trigger */}
            <button
              type="button"
              onClick={() => setShowWipeConfirm(true)}
              className="flex items-center justify-center gap-1.5 w-full text-center mt-4 text-red-500/80 hover:text-red-600 font-mono text-[11px] uppercase tracking-wider hover:underline transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>WIPE VAULT & START OVER</span>
            </button>
          </div>
        )}
        
      {/* Honest Demo Disclaimer in Mono (Exact phrase requested) */}
        <div className="mt-6 pt-4 border-t border-keepeit text-center">
          <p className="font-mono text-[10px] text-[var(--text-muted)] leading-relaxed">
            Real project — encrypted locally with AES-256-GCM.
          </p>
        </div>
      </div>

      {/* Wipe Confirmation Modal */}
      {showWipeConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border-keepeit rounded-keepeit p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-[var(--accent-rust)] flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Wipe Encrypted Vault?
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
              This action will permanently erase your encrypted vault envelope from IndexedDB storage. Unless you have saved a backup file, all vault contents will be lost forever.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowWipeConfirm(false)}
                className="px-3 py-1.5 text-xs font-mono-label border-keepeit rounded-keepeit hover:bg-[var(--bg-surface)] text-[var(--text-primary)]"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleWipeVault}
                className="px-3 py-1.5 text-xs font-mono-label bg-[var(--accent-rust)] text-white rounded-keepeit hover:opacity-90 font-semibold"
              >
                CONFIRM WIPE
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
