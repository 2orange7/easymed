import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ArrowLeft, Volume2, Mic, Send, Stethoscope, MapPin, AlertCircle, Lock,
} from 'lucide-react'
import doctorAvatar from '../../doctor_avatar.jpg'
import './DiagnosisChat.css'

const STEPS = ['描述症状', '详细了解', '分析中', '推荐结果']

const DEFAULT_GUIDE = '用您自己的话说就好，不用太准确'

const FOLLOW_UPS = {
  headDizzy: [
    '头晕的时候，是感觉天旋地转、站不稳，还是脑袋昏昏沉沉的？',
    '这种情况大概多久了？是今天突然开始的，还是已经好几天了？',
    '您平时有高血压吗？',
  ],
  chestPain: [
    '胸口不舒服的时候，是像被什么东西压住一样的闷痛，还是一阵一阵的刺痛？',
    '除了胸口不舒服，有没有同时觉得喘不上气，或者手臂发麻、出冷汗？',
    '这种情况是今天第一次出现，还是之前也有过？',
  ],
  stomachPain: [
    '肚子哪个位置不舒服？是上面靠近胃的地方，还是肚脐周围，或者是右下方？',
    '这个疼痛是一直持续着，还是一阵一阵的？',
    '吃东西之后有没有变得更严重，或者最近吃饭规不规律？',
  ],
}

const SCAN_KEYWORDS = [
  '天旋', '地转', '站不稳', '突然',
  '闷', '压住', '喘不上气', '喘不过气',
  '手臂', '发麻', '冷汗',
  '右下', '一直持续', '持续疼', '持续痛',
]

const SEVERITY_RULES = {
  headDizzy: ['天旋', '地转', '站不稳', '突然'],
  chestPain: ['闷', '压住', '喘不上气', '喘不过气', '手臂', '发麻', '冷汗'],
  stomachPain: ['右下', '持续疼', '持续痛', '一直持续'],
}

function checkSeverityByType(collected, symptomType) {
  const rules = SEVERITY_RULES[symptomType]
  if (rules && collected.some((k) => rules.includes(k))) return 'severe'
  return 'mild'
}

function matchSymptom(text) {
  // 头部相关
  const headDirect = /头晕|头昏|天旋地转|站不稳/
  const headLocation = /头/
  const headFeeling = /痛|疼|晕|昏|重|胀|懵/
  if (headDirect.test(text) || (headLocation.test(text) && headFeeling.test(text))) {
    return 'headDizzy'
  }
  // 胸部相关
  const chestDirect = /胸口|心脏|心口/
  const chestLocation = /胸/
  const chestFeeling = /痛|疼|闷|压|紧|难受/
  if (chestDirect.test(text) || (chestLocation.test(text) && chestFeeling.test(text))) {
    return 'chestPain'
  }
  // 腹部相关
  const stomachLocation = /肚|腹|胃|肠/
  const stomachFeeling = /痛|疼|胀|难受|不舒服/
  if (stomachLocation.test(text) && stomachFeeling.test(text)) {
    return 'stomachPain'
  }
  return 'unknown'
}

function checkSeverity(text, symptomType) {
  const keywords = SEVERE_KEYWORDS[symptomType]
  if (keywords && keywords.some((k) => text.includes(k))) return 'severe'
  return 'mild'
}

function DiagnosisChat({ userName, userTitle, onBack }) {
  const [messages, setMessages] = useState([])
  const [currentStep, setCurrentStep] = useState(1)
  const [symptomType, setSymptomType] = useState(null)
  const [severity, setSeverity] = useState(null)
  const [dialogStage, setDialogStage] = useState(0)
  const [isThinking, setIsThinking] = useState(false)
  const [input, setInput] = useState('')
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [showGuide, setShowGuide] = useState(true)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [collectedKeywords, setCollectedKeywords] = useState([])
  const [toastMessage, setToastMessage] = useState('')

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const initializedRef = useRef(false)
  const collectedRef = useRef([])

  const canSend = input.trim().length > 0
  const isResult = currentStep === 4

  const lastSpokenIndexRef = useRef(-1)

  // 自动开场白
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      const greeting = `${userName}${userTitle}您好！我是小医，专门帮您找对科室、挂对号。您哪里不舒服，慢慢说，不着急。`
      setMessages([{ type: 'ai', content: greeting }])
    }
  }, [userName, userTitle])

  // Toast自动消失
  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(''), 1500)
    return () => clearTimeout(timer)
  }, [toastMessage])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking, showQuickReplies])

  // AI消息自动语音朗读
  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (lastMsg && lastMsg.type === 'ai' && messages.length - 1 > lastSpokenIndexRef.current) {
      lastSpokenIndexRef.current = messages.length - 1
      const utterance = new SpeechSynthesisUtterance(lastMsg.content)
      utterance.lang = 'zh-CN'
      utterance.rate = 0.9
      speechSynthesis.speak(utterance)
    }
  }, [messages])

  const addMessage = useCallback((type, content) => {
    setMessages((prev) => [...prev, { type, content }])
  }, [])

  const handleSpeak = useCallback((text) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    speechSynthesis.speak(utterance)
  }, [])

  const processUserMessage = useCallback(
    (text) => {
      addMessage('user', text)
      setIsThinking(true)
      setShowQuickReplies(false)

      setTimeout(() => {
        setIsThinking(false)

        // 扫描本轮消息中的重症关键词，追加到 collectedKeywords
        const newKeys = SCAN_KEYWORDS.filter(
          (k) => text.includes(k) && !collectedRef.current.includes(k)
        )
        if (newKeys.length > 0) {
          collectedRef.current = [...collectedRef.current, ...newKeys]
          setCollectedKeywords([...collectedRef.current])
        }

        if (dialogStage === 0) {
          // 症状识别
          const type = matchSymptom(text)
          if (type === 'unknown') {
            addMessage(
              'ai',
              '我没太听明白，您是头晕、胸口不舒服，还是肚子疼呢？可以直接点击下方的选项告诉小医'
            )
            setShowQuickReplies(true)
            setShowGuide(false)
          } else {
            setSymptomType(type)
            setDialogStage(1)
            setCurrentStep(2)
            const reply = FOLLOW_UPS[type][0]
            addMessage('ai', reply)
            setShowGuide(false)
          }
        } else if (dialogStage === 1) {
          setDialogStage(2)
          const reply = FOLLOW_UPS[symptomType][1]
          addMessage('ai', reply)
        } else if (dialogStage === 2) {
          setDialogStage(3)
          setCurrentStep(3)
          const reply = FOLLOW_UPS[symptomType][2]
          addMessage('ai', reply)
        } else if (dialogStage === 3) {
          // 严重程度判断 —— 基于全部累积关键词
          const sev = checkSeverityByType(collectedRef.current, symptomType)
          setSeverity(sev)
          setDialogStage(4)
          setCurrentStep(4)
        }
      }, 1500)
    },
    [dialogStage, symptomType, addMessage]
  )

  const handleSend = useCallback(() => {
    if (!canSend || isThinking) return
    const text = input.trim()
    setInput('')
    processUserMessage(text)
  }, [canSend, isThinking, input, processUserMessage])

  const handleQuickReply = useCallback(
    (label, type) => {
      if (isThinking) return
      addMessage('user', label)
      setIsThinking(true)
      setShowQuickReplies(false)

      setTimeout(() => {
        setIsThinking(false)

        const newKeys = SCAN_KEYWORDS.filter(
          (k) => label.includes(k) && !collectedRef.current.includes(k)
        )
        if (newKeys.length > 0) {
          collectedRef.current = [...collectedRef.current, ...newKeys]
          setCollectedKeywords([...collectedRef.current])
        }

        setSymptomType(type)
        setDialogStage(1)
        setCurrentStep(2)
        const reply = FOLLOW_UPS[type][0]
        addMessage('ai', reply)
        setShowGuide(false)
      }, 1500)
    },
    [isThinking, addMessage]
  )

  const handleInputChange = (e) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && canSend && !isThinking) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMic = () => {
    setToastMessage('语音输入在完整版小程序中体验')
  }

  const handleRestart = () => {
    setMessages([])
    setCurrentStep(1)
    setSymptomType(null)
    setSeverity(null)
    setDialogStage(0)
    setIsThinking(false)
    setInput('')
    setShowQuickReplies(false)
    setShowGuide(true)
    setCollectedKeywords([])
    collectedRef.current = []
    initializedRef.current = false
    lastSpokenIndexRef.current = -1
    const greeting = `${userName}${userTitle}您好！我是小医，专门帮您找对科室、挂对号。您哪里不舒服，慢慢说，不着急。`
    setMessages([{ type: 'ai', content: greeting }])
  }

  // ===== 推荐结果逻辑 =====
  const getRecommendation = () => {
    if (symptomType === 'headDizzy' && severity === 'severe') {
      return {
        hospital: '北京协和医院',
        level: '三甲',
        department: '神经内科',
        distance: '距您约3.2公里',
        description: '综合实力全国顶尖，疑难重症首选',
        isCommunity: false,
        alertType: 'severe',
        alertText: '您这个情况需要尽快去医院，如果突然不舒服，要马上拨打120',
      }
    }
    if (symptomType === 'headDizzy' && severity === 'mild') {
      return {
        hospital: '您附近的社区卫生服务中心',
        level: null,
        department: '耳鼻喉科 / 全科',
        distance: null,
        description: null,
        isCommunity: true,
        alertType: 'encourage',
        alertText: '这种情况挂个号去看看就好，不用着急',
      }
    }
    if (symptomType === 'chestPain' && severity === 'severe') {
      return {
        hospital: '北京安贞医院',
        level: '三甲',
        department: '心内科',
        distance: '距您约4.1公里',
        description: '心血管疾病专科权威医院',
        isCommunity: false,
        alertType: 'severe',
        alertText: '您这个情况需要尽快去医院，如果突然不舒服，要马上拨打120',
      }
    }
    if (symptomType === 'chestPain' && severity === 'mild') {
      return {
        hospital: '北京市海淀医院',
        level: '二甲',
        department: '心内科',
        distance: '距您约1.8公里',
        description: '社区综合医院，日常就诊便捷',
        isCommunity: false,
        alertType: 'encourage',
        alertText: '这种情况挂个号去看看就好，不用着急',
      }
    }
    if (symptomType === 'stomachPain' && severity === 'severe') {
      return {
        hospital: '北京大学人民医院',
        level: '三甲',
        department: '普外科',
        distance: '距您约5.6公里',
        description: '综合性研究型医院，科室齐全',
        isCommunity: false,
        alertType: 'severe',
        alertText: '您这个情况需要尽快去医院，如果突然不舒服，要马上拨打120',
      }
    }
    if (symptomType === 'stomachPain' && severity === 'mild') {
      return {
        hospital: '上海市杨浦区中心医院',
        level: '二甲',
        department: '消化内科',
        distance: '距您约1.5公里',
        description: '区域综合医院，就诊等待时间短',
        isCommunity: false,
        alertType: 'encourage',
        alertText: '这种情况挂个号去看看就好，不用着急',
      }
    }
    return null
  }

  const recommendation = isResult ? getRecommendation() : null

  // 进度条索引
  const stepIndex = currentStep - 1

  return (
    <div className="diagnosis-chat">
      {/* 顶部导航栏 */}
      <header className="chat-navbar">
        <button className="chat-navbar-back" onClick={onBack}>
          <ArrowLeft size={28} color="#333333" />
        </button>
        <span className="chat-navbar-title">智能导诊</span>
        <div className="chat-navbar-right" />
      </header>

      {/* 步骤进度条 */}
      <div className="chat-progress-wrapper">
        <div className="chat-progress-bar">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`chat-progress-step ${i <= stepIndex ? 'done' : ''}`}
            />
          ))}
        </div>
        <p className="chat-progress-text">
          第{currentStep}步：{STEPS[stepIndex]}
        </p>
      </div>

      {/* AI助手信息栏 */}
      <div className="chat-assistant-bar">
        <img src={doctorAvatar} alt="小医" className="chat-avatar" />
        <div className="chat-assistant-text">
          <p className="chat-assistant-name">小医</p>
          <p className="chat-assistant-subtitle">导诊助手 · 随时为您服务</p>
        </div>
      </div>

      {/* 对话内容区域 */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.type === 'ai' ? (
              <div className="chat-bubble-ai">
                <div className="chat-bubble-ai-inner">
                  <p className="chat-bubble-text">{msg.content}</p>
                </div>
                <button
                  className="chat-bubble-speak"
                  onClick={() => handleSpeak(msg.content)}
                >
                  <Volume2 size={24} color="#00B388" />
                </button>
              </div>
            ) : (
              <div className="chat-bubble-user">
                <div className="chat-bubble-user-inner">
                  <p className="chat-bubble-text">{msg.content}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* 快捷选项按钮 */}
        {showQuickReplies && !isThinking && (
          <div className="chat-quick-replies">
            <button
              className="chat-quick-reply-btn"
              onClick={() => handleQuickReply('头晕', 'headDizzy')}
            >
              头晕
            </button>
            <button
              className="chat-quick-reply-btn"
              onClick={() => handleQuickReply('胸口痛', 'chestPain')}
            >
              胸口痛
            </button>
            <button
              className="chat-quick-reply-btn"
              onClick={() => handleQuickReply('肚子疼', 'stomachPain')}
            >
              肚子疼
            </button>
          </div>
        )}

        {/* 引导提示文字 —— 仅第一条AI消息下方显示一次 */}
        {showGuide && messages.length === 1 && !isThinking && !isResult && (
          <p className="chat-guide-text">{DEFAULT_GUIDE}</p>
        )}

        {/* 推荐结果 */}
        {isResult && recommendation && (
          <div className="chat-results">
            {/* 对话与结果分隔线 */}
            <div className="chat-results-divider">
              <span className="chat-results-divider-text">
                · 以下是小医为您找到的结果 ·
              </span>
            </div>

            <h2 className="chat-results-title">
              小医为您找到了合适的科室
            </h2>

            {recommendation.isCommunity ? (
              <>
                {/* 轻症提示文字 */}
                <div className="chat-alert chat-alert-encourage">
                  <span>{recommendation.alertText}</span>
                </div>

                {/* 社区医院卡片 */}
                <div className="chat-result-card">
                  <div className="chat-result-header">
                    <span className="chat-result-name">
                      {recommendation.hospital}
                    </span>
                  </div>
                  <div className="chat-result-row">
                    <span className="chat-result-dept-label">科室：</span>
                    <span className="chat-result-dept">
                      {recommendation.department}
                    </span>
                  </div>
                  <div className="chat-result-row">
                    <MapPin size={20} color="#666666" />
                    <span className="chat-result-distance">
                      请前往附近社区卫生服务中心
                    </span>
                  </div>
                </div>

                {/* 挂号引导区块 */}
                <div className="chat-register-btn">
                  <Lock size={18} color="#CCCCCC" />
                  <span>挂号引导（即将开放）</span>
                </div>

                {/* 主行动按钮 */}
                <button className="chat-restart-btn" onClick={handleRestart}>
                  还有其他不舒服？继续问小医
                </button>
              </>
            ) : (
              <>
                {/* 警示框 */}
                {recommendation.alertType === 'severe' && (
                  <div className="chat-alert chat-alert-severe">
                    <AlertCircle size={18} color="#E65100" />
                    <span>{recommendation.alertText}</span>
                  </div>
                )}
                {recommendation.alertType === 'encourage' && (
                  <div className="chat-alert chat-alert-encourage">
                    <span>{recommendation.alertText}</span>
                  </div>
                )}

                {/* 医院推荐卡片 */}
                <div className="chat-result-card">
                  <div className="chat-result-header">
                    <span className="chat-result-name">
                      {recommendation.hospital}
                    </span>
                    {recommendation.level && (
                      <span
                        className={`hospital-level hospital-level-${recommendation.level}`}
                      >
                        {recommendation.level}
                      </span>
                    )}
                  </div>

                  <div className="chat-result-row">
                    <span className="chat-result-dept-label">科室：</span>
                    <span className="chat-result-dept">
                      {recommendation.department}
                    </span>
                  </div>

                  {recommendation.distance && (
                    <div className="chat-result-row">
                      <MapPin size={20} color="#666666" />
                      <span className="chat-result-distance">
                        {recommendation.distance}
                      </span>
                    </div>
                  )}

                  {recommendation.description && (
                    <p className="chat-result-desc">
                      {recommendation.description}
                    </p>
                  )}
                </div>

                {/* 挂号引导区块 */}
                <div className="chat-register-btn">
                  <Lock size={18} color="#CCCCCC" />
                  <span>挂号引导（即将开放）</span>
                </div>

                {/* 主行动按钮 */}
                {recommendation.alertType === 'severe' ? (
                  <button className="chat-restart-btn" onClick={onBack}>
                    我知道了，去医院
                  </button>
                ) : (
                  <button className="chat-restart-btn" onClick={handleRestart}>
                    还有其他不舒服？继续问小医
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 底部输入区域 */}
      {!isResult && (
        <footer className="chat-input-area">
          <textarea
            ref={inputRef}
            className="chat-input"
            rows={1}
            placeholder="输入症状，或用麦克风说话"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isThinking}
          />
          <button
            className="chat-mic-btn"
            onClick={handleMic}
            disabled={isThinking}
          >
            <Mic size={28} />
          </button>
          <button
            className="chat-send-btn"
            disabled={!canSend || isThinking}
            onClick={handleSend}
          >
            <Send size={28} color="#FFFFFF" />
          </button>
        </footer>
      )}

      {/* Toast轻提示 */}
      {toastMessage && (
        <div className="chat-toast">{toastMessage}</div>
      )}

      {/* 定位弹窗 */}
      {showLocationModal && (
        <div
          className="chat-modal-overlay"
          onClick={() => setShowLocationModal(false)}
        >
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <p className="chat-modal-text">
              定位功能将在正式版本中开放，届时将为您找到最近的一家
            </p>
            <button
              className="chat-modal-btn"
              onClick={() => setShowLocationModal(false)}
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DiagnosisChat
