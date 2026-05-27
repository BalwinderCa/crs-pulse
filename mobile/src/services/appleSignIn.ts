import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

export async function isAppleSignInAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithApple(): Promise<{
  identityToken: string;
  authorizationCode: string;
  nonce: string;
  fullName: AppleAuthentication.AppleAuthenticationFullName | null;
  email: string | null;
}> {
  // Generate cryptographic nonce to prevent replay attacks
  const rawNonce   = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken || !credential.authorizationCode) {
    throw new Error('Apple Sign-In failed: missing identity token.');
  }

  return {
    identityToken:     credential.identityToken,
    authorizationCode: credential.authorizationCode,
    nonce:             rawNonce,
    fullName:          credential.fullName,
    email:             credential.email,
  };
}
