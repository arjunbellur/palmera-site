import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import BaseSection from '@/components/BaseSection'
import Destinations from '@/components/Destinations'
import Services from '@/components/Services'
import Stats from '@/components/Stats'
import AppSection from '@/components/AppSection'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main>
      <Navbar />
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
