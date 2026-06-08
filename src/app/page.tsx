import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import NavbarWrapper from '@/components/NavbarWrapper'
import Hero from '@/components/Hero'
import BaseSection from '@/components/BaseSection'
import Destinations from '@/components/Destinations'
import Services from '@/components/Services'
import Stats from '@/components/Stats'
import AppSection from '@/components/AppSection'
import Footer from '@/components/Footer'

export default async function Home() {
  const t = await getTranslations()
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
      <NavbarWrapper messages={navMessages} />
      <Hero />
      <BaseSection />
      <Destinations />
      <Services />
      <Stats />
      <AppSection />
      <Footer />
    </main>
  )
}
