// ─────────────────────────────────────────────────────────────────────────
// Palmera Provider Partnership Agreement — types, version, and accessors.
//
// The agreement TEXT lives in ./partner-agreement-content.ts, which is
// AUTO-GENERATED from the source .docx files. Never hand-edit the legal text:
// regenerate it, then bump AGREEMENT_VERSION below.
//
// The agreement body interpolates NO partner details — §Intro identifies the
// counterparty as "the business identified during the Palmera onboarding
// process". The only variable fields are in the signature block, which is
// rendered from data (see AgreementSignatures). This is deliberate: it makes it
// impossible to render a blank placeholder inside legal text a partner signs.
// ─────────────────────────────────────────────────────────────────────────
import { AGREEMENT_CONTENT } from './partner-agreement-content'

/** Bump whenever the agreement text changes. Recorded on every acceptance. */
export const AGREEMENT_VERSION = 'v2.0-2026-09'

export type AgreementLocale = 'fr' | 'en'

export type AgreementBlock =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'ul'; items: string[] }

export interface AgreementSection {
  heading: string
  blocks: AgreementBlock[]
}

export interface AgreementContent {
  title: string
  intro: AgreementBlock[]
  sections: AgreementSection[]
}

/**
 * Palmera's fixed legal entity, as named on the agreement. This is a static
 * legal fact, so it stays in code. The human countersignatory (representative
 * name + title) is NOT here — it is configured through the admin UI and stored
 * in Firestore (`config/countersignatory`), so nobody edits source to sign.
 */
export const PALMERA_SIGNATORY = {
  entity: 'Palmera Services LLC',
} as const

export interface AgreementParty {
  name: string
  title: string
  date: string
}

export interface AgreementSignatures {
  effectiveDate: string
  palmera: AgreementParty & { entity: string }
  provider: AgreementParty & { businessName: string }
  /** When true, the provider has signed but Palmera has not yet countersigned. */
  palmeraPending?: boolean
}

/** Signature-block labels, transcribed verbatim from each source document. */
export const SIGNATURE_LABELS: Record<AgreementLocale, Record<string, string>> = {
  en: {
    effectiveDate: 'Effective Date',
    palmeraHeading: 'Palmera Services LLC',
    providerHeading: 'Provider Partner',
    businessName: 'Business Name',
    representative: 'Authorized Representative',
    title: 'Title',
    date: 'Date',
    awaitingCountersignature: 'Awaiting Palmera countersignature',
  },
  fr: {
    effectiveDate: 'Date d’entrée en vigueur',
    palmeraHeading: 'PALMERA SERVICES LLC',
    providerHeading: 'LE PARTENAIRE',
    businessName: 'Nom de l’établissement',
    representative: 'Représentant autorisé',
    title: 'Fonction',
    date: 'Date',
    awaitingCountersignature: 'En attente de la contresignature de Palmera',
  },
}

/** The agreement text for a locale. French is the fallback. */
export function getAgreement(locale: AgreementLocale): AgreementContent {
  return AGREEMENT_CONTENT[locale] ?? AGREEMENT_CONTENT.fr
}

export function formatAgreementDate(iso: string, locale: AgreementLocale): string {
  return new Date(iso).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}
