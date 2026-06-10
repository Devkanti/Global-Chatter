// Web Crypto API helper for End-to-End Encryption

const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const base64ToArrayBuffer = (base64) => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

// Initialize or Load RSA-OAEP Keypair
export const initCrypto = async (username) => {
  const storedPrivKey = localStorage.getItem(`chat_priv_${username}`);
  const storedPubKey = localStorage.getItem(`chat_pub_${username}`);

  if (storedPrivKey && storedPubKey) {
    try {
      const privJwk = JSON.parse(storedPrivKey);
      const pubJwk = JSON.parse(storedPubKey);

      const privateKey = await window.crypto.subtle.importKey(
        "jwk",
        privJwk,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["decrypt"]
      );

      return { privateKey, publicKeyJwk: pubJwk };
    } catch (e) {
      console.warn("Failed to load existing keys, generating new ones", e);
    }
  }

  // Generate new keys
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // Must be extractable to save
    ["encrypt", "decrypt"]
  );
  
  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

  localStorage.setItem(`chat_priv_${username}`, JSON.stringify(privateKeyJwk));
  localStorage.setItem(`chat_pub_${username}`, JSON.stringify(publicKeyJwk));

  return {
    privateKey: keyPair.privateKey,
    publicKeyJwk: publicKeyJwk
  };
};

export const encryptMessage = async (text, recipientPublicKeysJwkMap) => {
  // 1. Generate one-time AES-GCM key
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // 2. Encrypt the actual message text
  const encoder = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuf = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    encoder.encode(text)
  );

  // 3. Export the raw AES key to be wrapped
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  // 4. Wrap the AES key for every recipient
  const wrappedKeys = {};
  for (const [username, jwk] of Object.entries(recipientPublicKeysJwkMap)) {
    try {
      const pubKey = await window.crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
      );
      const wrappedKeyBuf = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        pubKey,
        rawAesKey
      );
      wrappedKeys[username] = arrayBufferToBase64(wrappedKeyBuf);
    } catch (e) {
      console.warn(`Failed to encrypt for user ${username}`, e);
    }
  }

  return {
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(ciphertextBuf),
    wrappedKeys: wrappedKeys
  };
};

export const decryptMessage = async (encryptedPayload, myUsername, myPrivateKey) => {
  try {
    const { iv, ciphertext, wrappedKeys } = encryptedPayload;
    
    // Find my wrapped key
    const myWrappedKeyBase64 = wrappedKeys[myUsername];
    if (!myWrappedKeyBase64) {
      return "[Message not encrypted for you]";
    }

    const myWrappedKeyBuf = base64ToArrayBuffer(myWrappedKeyBase64);

    // 1. Unwrap the AES key
    const rawAesKey = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      myPrivateKey,
      myWrappedKeyBuf
    );

    // 2. Import the unwrapped AES key
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      rawAesKey,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    // 3. Decrypt the ciphertext
    const ivBuf = base64ToArrayBuffer(iv);
    const ciphertextBuf = base64ToArrayBuffer(ciphertext);
    const plaintextBuf = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBuf },
      aesKey,
      ciphertextBuf
    );

    const decoder = new TextDecoder();
    return decoder.decode(plaintextBuf);
  } catch (e) {
    console.error("Decryption failed", e);
    return "[Decryption Error]";
  }
};
