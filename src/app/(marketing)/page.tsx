import { getTranslations, getLocale } from 'next-intl/server'
import NavbarWrapper from '@/components/NavbarWrapper'
import BackgroundController from '@/components/BackgroundController'
import Hero from '@/components/Hero'
import BaseSection from '@/components/BaseSection'
import Destinations from '@/components/Destinations'
import Services from '@/components/Services'
import Stats from '@/components/Stats'
import AppSection from '@/components/AppSection'
import Footer from '@/components/Footer'

export default async function Home() {
  const t = await getTranslations()
  const locale = await getLocale()

  const navMessages = {
    learn: t('nav.learn'),
    location: t('nav.location'),
    experience: t('nav.experience'),
    app: t('nav.app'),
    signup: t('nav.signup'),
    partners: t('nav.partners'),
    earlyAccess: t('nav.earlyAccess'),
  }

  return (
    <main>
      <BackgroundController />
      <NavbarWrapper messages={navMessages} />
      <Hero />
      <BaseSection />
      <Destinations locale={locale} />
      <Services />
      <Stats />
      <AppSection />
      <Footer />
    </main>
  )
}
