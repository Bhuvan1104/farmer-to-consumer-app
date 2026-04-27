import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "./OnboardingGuide.css";

const LANG_OPTIONS = [
  { code: "en", label: "English", speech: "en-IN" },
  { code: "hi", label: "Hindi", speech: "hi-IN" },
  { code: "te", label: "Telugu", speech: "te-IN" },
  { code: "ta", label: "Tamil", speech: "ta-IN" },
];

const UI_TEXT = {
  en: {
    title: "Guided Tour",
    subtitle: "Learn the app in 2 minutes.",
    step: "Step",
    close: "Close",
    finish: "Finish",
    next: "Next",
    back: "Back",
    open: "Open Guide",
    listen: "Listen",
    mic: "Use microphone",
    stopMic: "Stop microphone",
    notSupported: "Voice input is not supported in this browser.",
    heard: "You said:",
  },
  hi: {
    title: "गाइडेड टूर",
    subtitle: "2 मिनट में ऐप सीखें।",
    step: "चरण",
    close: "बंद करें",
    finish: "समाप्त",
    next: "अगला",
    back: "पिछला",
    open: "गाइड खोलें",
    listen: "सुनें",
    mic: "माइक इस्तेमाल करें",
    stopMic: "माइक रोकें",
    notSupported: "इस ब्राउज़र में वॉइस इनपुट समर्थित नहीं है।",
    heard: "आपने कहा:",
  },
  te: {
    title: "మార్గదర్శక టూర్",
    subtitle: "2 నిమిషాల్లో యాప్ నేర్చుకోండి.",
    step: "దశ",
    close: "మూసివేయండి",
    finish: "పూర్తి చేయండి",
    next: "తర్వాత",
    back: "వెనక్కి",
    open: "గైడ్ తెరవండి",
    listen: "వినండి",
    mic: "మైక్ ఉపయోగించండి",
    stopMic: "మైక్ ఆపండి",
    notSupported: "ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్ అందుబాటులో లేదు.",
    heard: "మీరు చెప్పింది:",
  },
  ta: {
    title: "வழிகாட்டி சுற்றுலா",
    subtitle: "2 நிமிடத்தில் பயன்பாட்டை அறியுங்கள்.",
    step: "படி",
    close: "மூடு",
    finish: "முடிக்கவும்",
    next: "அடுத்து",
    back: "பின்செல்",
    open: "வழிகாட்டியை திற",
    listen: "கேள்",
    mic: "மைக் பயன்படுத்து",
    stopMic: "மைக் நிறுத்து",
    notSupported: "இந்த உலாவியில் குரல் உள்ளீடு கிடைக்கவில்லை.",
    heard: "நீங்கள் சொன்னது:",
  },
};

const GUIDE_STEPS = {
  farmer: {
    en: [
      {
        title: "Add products quickly",
        body: "Use Quick Add mode: upload image, add name, price, and quantity.",
        route: "/add-product",
        cta: "Open Add Product",
      },
      {
        title: "Manage incoming orders",
        body: "Accept new orders, update status, and keep customers informed.",
        route: "/farmer-orders",
        cta: "Open Farmer Orders",
      },
      {
        title: "Plan delivery faster",
        body: "Select confirmed orders and calculate dispatch metrics from your saved base address.",
        route: "/delivery",
        cta: "Open Delivery",
      },
      {
        title: "Use regional chat",
        body: "Speak or type in your language. The receiver can view in their chosen language.",
        route: "/chat-history",
        cta: "Open Messages",
      },
    ],
    hi: [
      {
        title: "जल्दी प्रोडक्ट जोड़ें",
        body: "क्विक ऐड मोड में फोटो, नाम, कीमत और मात्रा भरें।",
        route: "/add-product",
        cta: "Add Product खोलें",
      },
      {
        title: "नए ऑर्डर संभालें",
        body: "ऑर्डर स्वीकार करें, स्थिति अपडेट करें और ग्राहक को जानकारी दें।",
        route: "/farmer-orders",
        cta: "Farmer Orders खोलें",
      },
      {
        title: "डिलीवरी प्लान करें",
        body: "कन्फर्म ऑर्डर चुनें और सेव किए गए डिस्पैच पते से मेट्रिक्स निकालें।",
        route: "/delivery",
        cta: "Delivery खोलें",
      },
      {
        title: "क्षेत्रीय चैट का उपयोग करें",
        body: "अपनी भाषा में बोलें या टाइप करें। रिसीवर अपनी पसंद की भाषा में पढ़ सकता है।",
        route: "/chat-history",
        cta: "Messages खोलें",
      },
    ],
    te: [
      {
        title: "త్వరగా ఉత్పత్తి జోడించండి",
        body: "క్విక్ యాడ్ మోడ్‌లో ఫోటో, పేరు, ధర, పరిమాణం మాత్రమే ఇవ్వండి.",
        route: "/add-product",
        cta: "Add Product తెరవండి",
      },
      {
        title: "కొత్త ఆర్డర్లను నిర్వహించండి",
        body: "కొత్త ఆర్డర్లను అంగీకరించి, స్థితిని అప్డేట్ చేయండి.",
        route: "/farmer-orders",
        cta: "Farmer Orders తెరవండి",
      },
      {
        title: "డెలివరీ ప్లాన్ చేయండి",
        body: "కన్‌ఫర్మ్ అయిన ఆర్డర్లను ఎంపిక చేసి డిస్పాచ్ మేట్రిక్స్ లెక్కించండి.",
        route: "/delivery",
        cta: "Delivery తెరవండి",
      },
      {
        title: "ప్రాంతీయ చాట్ ఉపయోగించండి",
        body: "మీ భాషలో మాట్లాడండి లేదా టైప్ చేయండి. రిసీవర్ తన ఎంపిక భాషలో చూడగలడు.",
        route: "/chat-history",
        cta: "Messages తెరవండి",
      },
    ],
    ta: [
      {
        title: "வேகமாக பொருள் சேர்க்கவும்",
        body: "Quick Add-இல் படம், பெயர், விலை, அளவு மட்டும் போதுமானது.",
        route: "/add-product",
        cta: "Add Product திறக்கவும்",
      },
      {
        title: "புதிய ஆர்டர்களை நிர்வகிக்கவும்",
        body: "ஆர்டரை ஏற்று நிலையை புதுப்பிக்கவும்.",
        route: "/farmer-orders",
        cta: "Farmer Orders திறக்கவும்",
      },
      {
        title: "டெலிவரி திட்டமிடவும்",
        body: "உறுதிப்படுத்தப்பட்ட ஆர்டர்களை தேர்ந்து dispatch metrics பார்க்கவும்.",
        route: "/delivery",
        cta: "Delivery திறக்கவும்",
      },
      {
        title: "பிராந்திய உரையாடலை பயன்படுத்தவும்",
        body: "உங்கள் மொழியில் பேசுங்கள் அல்லது টাইப் செய்யுங்கள். பெறுபவர் விருப்ப மொழியில் பார்க்கலாம்.",
        route: "/chat-history",
        cta: "Messages திறக்கவும்",
      },
    ],
  },
  consumer: {
    en: [
      {
        title: "Browse and buy easily",
        body: "Explore products, add to cart, and place order with saved address.",
        route: "/products",
        cta: "Open Products",
      },
      {
        title: "Track your orders",
        body: "Watch live order progress from confirmed to delivered.",
        route: "/orders",
        cta: "Open Orders",
      },
      {
        title: "Chat in your language",
        body: "Type or speak in your language and view messages in your selected language.",
        route: "/chat-history",
        cta: "Open Messages",
      },
    ],
    hi: [
      {
        title: "आसानी से खरीदारी करें",
        body: "प्रोडक्ट देखें, कार्ट में जोड़ें और सेव पते से ऑर्डर करें।",
        route: "/products",
        cta: "Products खोलें",
      },
      {
        title: "ऑर्डर ट्रैक करें",
        body: "कन्फर्म से डिलीवर तक ऑर्डर की स्थिति लाइव देखें।",
        route: "/orders",
        cta: "Orders खोलें",
      },
      {
        title: "अपनी भाषा में चैट करें",
        body: "अपनी भाषा में बोलें या टाइप करें और संदेश पसंदीदा भाषा में देखें।",
        route: "/chat-history",
        cta: "Messages खोलें",
      },
    ],
    te: [
      {
        title: "సులభంగా కొనుగోలు చేయండి",
        body: "ప్రోడక్ట్స్ చూడండి, కార్ట్‌లో జోడించి సేవ్ చేసిన చిరునామాతో ఆర్డర్ చేయండి.",
        route: "/products",
        cta: "Products తెరవండి",
      },
      {
        title: "మీ ఆర్డర్లను ట్రాక్ చేయండి",
        body: "కన్‌ఫర్మ్ నుండి డెలివర్డ్ వరకు ఆర్డర్ స్థితిని లైవ్‌గా చూడండి.",
        route: "/orders",
        cta: "Orders తెరవండి",
      },
      {
        title: "మీ భాషలో చాట్ చేయండి",
        body: "మీ భాషలో మాట్లాడండి లేదా టైప్ చేయండి. సందేశాలను మీ ఎంపిక భాషలో చూడండి.",
        route: "/chat-history",
        cta: "Messages తెరవండి",
      },
    ],
    ta: [
      {
        title: "எளிதாக வாங்குங்கள்",
        body: "பொருட்களை பார்த்து cart-ல் சேர்த்து saved முகவரியுடன் order இடுங்கள்.",
        route: "/products",
        cta: "Products திறக்கவும்",
      },
      {
        title: "உங்கள் ஆர்டரை கண்காணிக்கவும்",
        body: "Confirmed முதல் delivered வரை order நிலையை நேரடியாக பாருங்கள்.",
        route: "/orders",
        cta: "Orders திறக்கவும்",
      },
      {
        title: "உங்கள் மொழியில் உரையாடுங்கள்",
        body: "பேசுங்கள் அல்லது টাইப் செய்யுங்கள்; messages-ஐ விருப்ப மொழியில் பாருங்கள்.",
        route: "/chat-history",
        cta: "Messages திறக்கவும்",
      },
    ],
  },
};

function OnboardingGuide({ role = "consumer", initialLang = "en" }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState(initialLang || "en");
  const [stepIndex, setStepIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");

  const text = UI_TEXT[lang] || UI_TEXT.en;
  const seenKey = `onboarding_seen_${role}`;

  const steps = useMemo(() => {
    const roleKey = role === "farmer" ? "farmer" : "consumer";
    const byRole = GUIDE_STEPS[roleKey] || GUIDE_STEPS.consumer;
    return byRole[lang] || byRole.en;
  }, [role, lang]);

  const currentStep = steps[stepIndex];
  const speechLang = LANG_OPTIONS.find((l) => l.code === lang)?.speech || "en-IN";
  const progressPct = Math.round(((stepIndex + 1) / Math.max(1, steps.length)) * 100);

  const compactBody = useMemo(() => {
    const body = currentStep?.body || "";
    if (body.length <= 96) return body;

    const separators = [". ", "? ", "?", "."];
    for (const sep of separators) {
      const idx = body.indexOf(sep);
      if (idx > 30 && idx < 120) {
        return body.slice(0, idx + 1).trim();
      }
    }

    return `${body.slice(0, 93).trim()}...`;
  }, [currentStep]);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(seenKey);
      if (!seen) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [seenKey]);

  useEffect(() => {
    if (!initialLang) return;
    setLang(initialLang);
  }, [initialLang]);

  useEffect(() => () => window.speechSynthesis.cancel(), []);

  useEffect(() => {
    if (!open) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        try {
          localStorage.setItem(seenKey, "1");
        } catch {
          // ignore storage errors
        }
        setOpen(false);
        setStepIndex(0);
        setListening(false);
        setTranscript("");
        setError("");
      }
      if (event.key === "ArrowRight") {
        setStepIndex((p) => Math.min(steps.length - 1, p + 1));
      }
      if (event.key === "ArrowLeft") {
        setStepIndex((p) => Math.max(0, p - 1));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, seenKey, steps.length]);

  const markSeenAndClose = () => {
    try {
      localStorage.setItem(seenKey, "1");
    } catch {
      // ignore storage errors
    }
    setOpen(false);
    setStepIndex(0);
    setListening(false);
    setTranscript("");
    setError("");
  };

  const remindLater = () => {
    setOpen(false);
    setListening(false);
    setTranscript("");
    setError("");
  };

  const restartGuide = () => {
    setStepIndex(0);
    setTranscript("");
    setError("");
  };

  const speakStep = () => {
    if (!currentStep) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${currentStep.title}. ${currentStep.body}`);
    utterance.lang = speechLang;
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  const toggleMicPractice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(text.notSupported);
      return;
    }

    if (listening) {
      setListening(false);
      return;
    }

    setError("");
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = speechLang;
    rec.onstart = () => setListening(true);
    rec.onerror = () => {
      setListening(false);
      setError(text.notSupported);
    };
    rec.onend = () => setListening(false);
    rec.onresult = (e) => {
      const spoken = e.results?.[0]?.[0]?.transcript || "";
      setTranscript(spoken);
    };
    rec.start();
  };

  const gotoStepPage = () => {
    if (!currentStep?.route) return;
    navigate(currentStep.route);
    markSeenAndClose();
  };

  return (
    <>
      <button className="onb-trigger" type="button" onClick={() => setOpen(true)}>
        {text.open}
      </button>

      {open && createPortal(
        <div className="onb-overlay">
          <div className="onb-modal">
            <div className="onb-head">
              <div>
                <h3>{text.title}</h3>
                <p>{text.subtitle}</p>
              </div>
              <div className="onb-head-controls">
                <select value={lang} onChange={(e) => setLang(e.target.value)}>
                  {LANG_OPTIONS.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <button type="button" className="onb-head-close" onClick={markSeenAndClose}>
                  {text.close}
                </button>
              </div>
            </div>

            <div className="onb-progress-wrap">
              <div className="onb-progress-label">
                <span>Progress</span>
                <strong>{progressPct}%</strong>
              </div>
              <div className="onb-progress-track">
                <div className="onb-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <div className="onb-body">
              <aside className="onb-steps-nav">
                <h5>Tips</h5>
                <div className="onb-steps-list">
                  {steps.map((item, idx) => (
                    <button
                      type="button"
                      key={`${item.title}-${idx}`}
                      className={`onb-step-nav-item ${idx === stepIndex ? "active" : ""} ${idx < stepIndex ? "done" : ""}`}
                      onClick={() => setStepIndex(idx)}
                    >
                      <span className="onb-step-nav-index">{idx + 1}</span>
                      <span className="onb-step-nav-title">{item.title}</span>
                    </button>
                  ))}
                </div>
              </aside>

              <section className="onb-step-card">
                <span className="onb-step-index">
                  {text.step} {stepIndex + 1}/{steps.length}
                </span>
                <h4>{currentStep?.title}</h4>
                <p>{compactBody}</p>
                <button type="button" className="onb-open-page" onClick={gotoStepPage}>
                  {currentStep?.cta}
                </button>

                <div className="onb-voice-row">
                  <button type="button" onClick={speakStep} title={text.listen} aria-label={text.listen}>
                    🔊
                  </button>
                  <button
                    type="button"
                    onClick={toggleMicPractice}
                    title={listening ? text.stopMic : text.mic}
                    aria-label={listening ? text.stopMic : text.mic}
                  >
                    {listening ? "■" : "🎤"}
                  </button>
                </div>

                {transcript && <div className="onb-note">{text.heard} {transcript}</div>}
                {error && <div className="onb-note onb-error">{error}</div>}
              </section>
            </div>

            <div className="onb-actions">
              <button type="button" onClick={remindLater}>
                Remind Later
              </button>
              <div>
                <button type="button" onClick={restartGuide}>
                  Restart
                </button>
                <button
                  type="button"
                  disabled={stepIndex === 0}
                  onClick={() => setStepIndex((p) => Math.max(0, p - 1))}
                >
                  {text.back}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    stepIndex === steps.length - 1
                      ? markSeenAndClose()
                      : setStepIndex((p) => Math.min(steps.length - 1, p + 1))
                  }
                >
                  {stepIndex === steps.length - 1 ? text.finish : text.next}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}

export default OnboardingGuide;

