"use client";
import React from 'react';
import { useAuth } from './_lib/hooks';
import { AuthModeSwitch, AuthForm, SocialLoginButtons } from './_components';

export default function LoginPage() {
  const {
    mode,
    switchMode,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    displayName,
    setDisplayName,
    handle,
    setHandle,
    loading,
    error,
    info,
    showPwd,
    setShowPwd,
    showConfirm,
    setShowConfirm,
    pwdStrength,
    mismatch,
    handleStatus,
    handleError,
    handleSubmit,
    handleGoogle,
    handleTwitter,
  } = useAuth();

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden">
      <div className="max-w-md w-full mx-auto p-6">
        <h1 className="text-4xl font-bold my-8 text-teal-500 text-center">Virtualbum</h1>
        
        <AuthModeSwitch
          mode={mode}
          loading={loading}
          onSwitch={switchMode}
        />
        
        <AuthForm
          mode={mode}
          email={email}
          password={password}
          confirmPassword={confirmPassword}
          displayName={displayName}
          handle={handle}
          loading={loading}
          error={error}
          info={info}
          showPwd={showPwd}
          showConfirm={showConfirm}
          pwdStrength={pwdStrength}
          mismatch={mismatch}
          handleStatus={handleStatus}
          handleError={handleError}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onDisplayNameChange={setDisplayName}
          onHandleChange={setHandle}
          onShowPwdToggle={() => setShowPwd(s => !s)}
          onShowConfirmToggle={() => setShowConfirm(s => !s)}
          onSubmit={handleSubmit}
        />
        
        <SocialLoginButtons
          loading={loading}
          onGoogle={handleGoogle}
          onTwitter={handleTwitter}
        />
      </div>
    </div>
  );
}
