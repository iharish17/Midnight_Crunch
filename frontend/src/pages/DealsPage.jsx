import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import '../App.css'

function DealsPage() {
  const isLoggedIn = !!localStorage.getItem('userToken')

  return (
    <>
      <Navbar userLoggedIn={isLoggedIn} />
      <main className="deals-page">
        <section className="deals-card">
          <p className="eyebrow">Special offers</p>
          <h1>Deals Coming Soon</h1>
          <p>
            We are cooking up limited-time combos and late-night offers. Check back soon for tasty deals.
          </p>
          <Link className="deals-back-link" to="/">
            Back to menu
          </Link>
        </section>
      </main>
    </>
  )
}

export default DealsPage
