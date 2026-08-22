// Marketing-only layout: next-intl (locale cookie → messages) lives HERE, not
// in the root layout, so the dashboard/partner/admin/supplier trees — which
// have their own i18n — aren't forced dynamic by a cookie read they never use.
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()
  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  )
}
