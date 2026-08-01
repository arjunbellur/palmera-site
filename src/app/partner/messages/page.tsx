'use client'
export const dynamic = 'force-dynamic'
// Messages — a first-class tab (Airbnb host pattern) shipped BEFORE the
// feature: the tab teaches partners it's coming and where it will live.
// Wire to real data when the app's chat collections gain a partner side.
import { usePartner } from '../PartnerContext'
import { t } from '../i18n'
import { ScreenHeader, EmptyState } from '@/components/partner/ui'

export default function MessagesScreen() {
  const { locale } = usePartner()
  const L = (k: string) => t(locale, k)
  return (
    <div className="pf-in">
      <ScreenHeader label={L('msg_label')} title={L('msg_title')} />
      <EmptyState icon="✉" title={L('msg_empty_t')} body={L('msg_empty_b')} chip={L('msg_soon')} />
    </div>
  )
}
