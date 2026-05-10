type KivoAuthListener = () => void;

const signOutListeners = new Set<KivoAuthListener>();

export function subscribeKivoSignOut(listener: KivoAuthListener) {
  signOutListeners.add(listener);

  return () => {
    signOutListeners.delete(listener);
  };
}

export function notifyKivoSignedOut() {
  signOutListeners.forEach((listener) => {
    listener();
  });
}
