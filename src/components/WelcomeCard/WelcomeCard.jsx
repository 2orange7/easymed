import { useState } from 'react'
import logoImage from '../../easymed_logo.png'
import './WelcomeCard.css'

function WelcomeCard({ onComplete }) {
  const [surname, setSurname] = useState('')
  const [title, setTitle] = useState('')

  const canSubmit = surname.trim().length > 0 && title !== ''

  const handleSubmit = () => {
    if (!canSubmit) return
    onComplete(surname.trim(), title)
  }

  return (
    <div className="welcome-card">
      {/* 顶部 Logo 区域 */}
      <header className="welcome-logo">
        <img src={logoImage} alt="医路通" className="welcome-logo-image" />
        <h1 className="welcome-logo-title">医路通</h1>
      </header>

      {/* 欢迎语 */}
      <p className="welcome-greeting">
        您好，我是小医，很高兴认识您！请先告诉我怎么称呼您
      </p>

      {/* 姓氏输入 */}
      <div className="welcome-field">
        <label className="welcome-label">您怎么称呼？</label>
        <input
          className="welcome-input"
          type="text"
          placeholder="您的姓氏，比如：王、张、李"
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
        />
      </div>

      {/* 称呼选择 */}
      <div className="welcome-field welcome-field-title">
        <label className="welcome-label">您是？</label>
        <div className="welcome-title-options">
          <button
            className={`welcome-title-btn ${title === '叔叔' ? 'selected' : ''}`}
            onClick={() => setTitle('叔叔')}
          >
            叔叔
          </button>
          <button
            className={`welcome-title-btn ${title === '阿姨' ? 'selected' : ''}`}
            onClick={() => setTitle('阿姨')}
          >
            阿姨
          </button>
        </div>
      </div>

      {/* 确认按钮 */}
      <button
        className="welcome-submit"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        好的，开始问诊
      </button>

      {/* 底部提示 */}
      <p className="welcome-hint">
        填写姓氏即可，我们不会保存您的个人信息
      </p>
    </div>
  )
}

export default WelcomeCard
