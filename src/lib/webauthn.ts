// Browser WebAuthn helpers — used to enroll & verify a student's fingerprint
// on the cashier device. The credential is bound to this device's
// authenticator (Touch ID, Windows Hello, Android fingerprint, etc.).

const RP_NAME = "BioPay Smart Shop";

function bufToB64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function strToBuf(s: string): ArrayBuffer {
  return new TextEncoder().encode(s).buffer as ArrayBuffer;
}

function randomChallenge(): ArrayBuffer {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return a.buffer;
}

export function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

/** Enroll a fingerprint on this device for a student. Returns credential payload to store. */
export async function enrollFingerprint(opts: {
  studentId: string;
  studentCode: string;
  studentName: string;
}): Promise<{
  credential_id: string;
  public_key: string;
  transports: string | null;
}> {
  if (!isWebAuthnSupported()) throw new Error("This device doesn't support fingerprint authentication");
  if (!window.isSecureContext) throw new Error("Fingerprint requires HTTPS (secure context)");
  if (window.top !== window.self)
    throw new Error(
      "Fingerprint enrollment is blocked inside the editor preview. Click the 'Open in new tab' icon at the top of the preview (or use your published URL) and try again — the sensor will then prompt you."
    );

  let cred: PublicKeyCredential | null = null;
  try {
    cred = (await navigator.credentials.create({
      publicKey: {
        challenge: randomChallenge(),
        rp: { name: RP_NAME, id: window.location.hostname },
        user: {
          id: strToBuf(opts.studentId),
          name: opts.studentCode,
          displayName: opts.studentName,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },   // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          // Allow BOTH built-in (Touch ID, Windows Hello) and external USB
          // fingerprint readers. Omitting authenticatorAttachment lets any
          // available authenticator be used.
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;
  } catch (err: any) {
    // Surface the actual browser reason instead of a generic message.
    const name = err?.name || "Error";
    const msg = err?.message || String(err);
    if (name === "NotAllowedError")
      throw new Error("Enrollment cancelled or no fingerprint sensor responded. Try again and touch the sensor when prompted.");
    if (name === "SecurityError")
      throw new Error(`Browser security error — usually a domain mismatch. ${msg}`);
    if (name === "NotSupportedError")
      throw new Error("No compatible authenticator found on this device.");
    if (name === "InvalidStateError")
      throw new Error("This authenticator is already registered for this student.");
    throw new Error(`${name}: ${msg}`);
  }

  if (!cred) throw new Error("Enrollment cancelled");
  const response = cred.response as AuthenticatorAttestationResponse;
  const transports =
    typeof response.getTransports === "function" ? response.getTransports().join(",") : null;

  // We store the raw attestationObject as the "public_key" blob. For this app's
  // trust model (admin-operated cashier), we use the credential_id as the
  // identity proof during checkout — the platform authenticator already
  // verified the fingerprint locally before producing the assertion.
  return {
    credential_id: cred.id,
    public_key: bufToB64Url(response.attestationObject),
    transports: transports || null,
  };
}

/** Prompt the student to verify with fingerprint. Returns the matched credential_id.
 *  If allowedCredentialIds is empty, uses discoverable credentials so the
 *  authenticator chooses any enrolled identity on the device. */
export async function verifyFingerprint(allowedCredentialIds: string[] = []): Promise<string> {
  if (!isWebAuthnSupported()) throw new Error("This device doesn't support fingerprint authentication");
  if (window.top !== window.self)
    throw new Error(
      "Fingerprint is blocked inside the editor preview iframe. Open the app in its own tab (or use the published URL) to use the sensor."
    );

  const allowCredentials = allowedCredentialIds.map((id) => {
    // credential.id is base64url; navigator.credentials needs ArrayBuffer
    const padded = id + "===".slice((id.length + 3) % 4);
    const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return { id: buf.buffer, type: "public-key" as const };
  });

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: randomChallenge(),
      rpId: window.location.hostname,
      allowCredentials,
      userVerification: "required",
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) throw new Error("Fingerprint verification cancelled");
  return assertion.id;
}
