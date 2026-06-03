import { useState } from 'react'
import HomePage from './components/Home/HomePage.jsx'
import WelcomeCard from './components/WelcomeCard/WelcomeCard.jsx'
import DiagnosisChat from './components/DiagnosisChat/DiagnosisChat.jsx'

const PAGES = {
  HOME: 'home',
  WELCOME: 'welcome',
  CHAT: 'chat',
}

function App() {
  const [currentPage, setCurrentPage] = useState(PAGES.HOME)
  const [userName, setUserName] = useState('')
  const [userTitle, setUserTitle] = useState('')

  const handleStartTriage = () => {
    setCurrentPage(PAGES.WELCOME)
  }

  const handleWelcomeComplete = (name, title) => {
    setUserName(name)
    setUserTitle(title)
    setCurrentPage(PAGES.CHAT)
  }

  const handleBackHome = () => {
    setCurrentPage(PAGES.HOME)
  }

  return (
    <div className="app-shell">
      {currentPage === PAGES.HOME && (
        <HomePage onStart={handleStartTriage} />
      )}

      {currentPage === PAGES.WELCOME && (
        <WelcomeCard onComplete={handleWelcomeComplete} />
      )}

      {currentPage === PAGES.CHAT && (
        <DiagnosisChat
          userName={userName}
          userTitle={userTitle}
          onBack={handleBackHome}
        />
      )}
    </div>
  )
}

export default App
