/** Human-readable upload failure — partners must never see a silent no-op. */
export function uploadErrorText(err: unknown, locale: 'fr' | 'en'): string {
  const code = (err as { code?: string })?.code || ''
  const fr = {
    'storage/unauthorized': 'Envoi refusé — format non pris en charge ou fichier trop lourd (max 20 Mo).',
    'storage/canceled': 'Envoi annulé.',
    'storage/retry-limit-exceeded': 'Connexion trop lente — réessayez avec une meilleure connexion.',
    'storage/quota-exceeded': 'Espace de stockage saturé — contactez Palmera.',
    default: 'L’envoi a échoué. Vérifiez votre connexion et réessayez.',
  }
  const en = {
    'storage/unauthorized': 'Upload refused — unsupported format or file too large (max 20 MB).',
    'storage/canceled': 'Upload cancelled.',
    'storage/retry-limit-exceeded': 'Connection too slow — try again on a better connection.',
    'storage/quota-exceeded': 'Storage quota reached — contact Palmera.',
    default: 'Upload failed. Check your connection and try again.',
  }
  const m = locale === 'fr' ? fr : en
  return (m as Record<string, string>)[code] || m.default
}
