import logoImage from '../../easymed_logo.png'
import heroImage from '../../hero_image.jpg'
import './HomePage.css'

function HomePage({ onStart }) {
  return (
    <div className="home-page">
      {/* 顶部 Logo 区域 */}
      <header className="home-header">
        <div className="home-logo">
          <img src={logoImage} alt="医路通" className="home-logo-image" />
          <h1 className="home-title">医路通</h1>
        </div>
        <p className="home-subtitle">智能就医导诊，让看病更简单</p>
      </header>

      {/* 中间医疗场景封面图 */}
      <div className="home-cover">
        <img
          src={heroImage}
          alt="医生与患者交流"
          className="home-cover-image"
        />
      </div>

      {/* 底部 CTA 按钮 */}
      <div className="home-action">
        <button className="home-cta-button" onClick={onStart}>
          我不舒服，来问问
        </button>
      </div>
    </div>
  )
}

export default HomePage
