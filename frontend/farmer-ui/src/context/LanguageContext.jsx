import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const LANGUAGE_STORAGE_KEY = "farmdirect-ui-language";

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "te", label: "Telugu" },
  { code: "ta", label: "Tamil" },
];

const UI_TRANSLATIONS = {
  en: {
    navProducts: "Products",
    navProfile: "Profile",
    navChatbot: "Chatbot",
    navAddProduct: "Add Product",
    navDelivery: "Delivery",
    navPricing: "Pricing",
    navOrders: "Orders",
    navMessages: "Messages",
    navCart: "Cart",
    navLogout: "Logout",
    navLanguageAria: "Change app language",
    floatingChatTitle: "Chat with assistant",
    dashboardEyebrow: "Smart Agri Console",
    dashboardTitle: "Farmer to Consumer Marketplace",
    dashboardSubtitle: "Manage products, direct trade, live order flow, and delivery intelligence from one polished workspace built for both growers and buyers.",
    dashboardExploreInventory: "Explore Inventory",
    dashboardQuickActions: "Quick Actions",
    dashboardQuickActionsCopy: "Jump into the workflows you are most likely to use next.",
    dashboardProductsTitle: "Products",
    dashboardProductsCopy: "Browse marketplace inventory and explore listed produce.",
    dashboardProductsCta: "View Products",
    dashboardIncomingOrdersTitle: "Incoming Orders",
    dashboardIncomingOrdersCopy: "Review new customer demand and move orders through dispatch.",
    dashboardIncomingOrdersCta: "View Orders",
    dashboardMyOrdersTitle: "My Orders",
    dashboardMyOrdersCopy: "Track purchases, delivery progress, and order history in one place.",
    dashboardMyOrdersCta: "View Orders",
    dashboardProfileTitle: "Profile",
    dashboardProfileCopy: "Update account preferences, warehouse base, and personal details.",
    dashboardProfileCta: "View Profile",
    dashboardMarketplaceMode: "Marketplace Mode",
    dashboardFarmerWorkspace: "Farmer Workspace",
    dashboardConsumerWorkspace: "Consumer Workspace",
    dashboardOperationalFocus: "Operational Focus",
    dashboardFocusFarmer: "Inventory + Fulfillment",
    dashboardFocusConsumer: "Discovery + Tracking",
    productsLoading: "Loading products...",
    productsDeleteConfirm: "Are you sure you want to delete this product?",
    productsDeleteFailed: "Failed to delete product.",
    productsEyebrow: "Inventory Hub",
    productsTitle: "Product Inventory",
    productsSubtitle: "Manage listings, monitor stock levels, and keep the marketplace shelf polished and ready for buyers.",
    productsAdd: "Add Product",
    productsTotalListings: "Total Listings",
    productsAvailable: "Available",
    productsLowStock: "Low Stock",
    productsReadyToSell: "Ready to sell",
    productsOutOfStock: "Out of stock",
    productsPrice: "Price",
    productsUnits: "Units",
    productsInStockWithCount: "In Stock",
    productsDeleteListing: "Delete Listing",
    categoryVegetables: "Vegetables",
    categoryFruits: "Fruits",
    categoryDairy: "Dairy",
    categoryMeats: "Meats",
    categoryHerbs: "Herbs",
    categoryBerries: "Berries",
  },
  hi: {
    navProducts: "उत्पाद",
    navProfile: "प्रोफ़ाइल",
    navChatbot: "चैटबॉट",
    navAddProduct: "उत्पाद जोड़ें",
    navDelivery: "डिलीवरी",
    navPricing: "मूल्य निर्धारण",
    navOrders: "ऑर्डर",
    navMessages: "संदेश",
    navCart: "कार्ट",
    navLogout: "लॉगआउट",
    navLanguageAria: "ऐप भाषा बदलें",
    floatingChatTitle: "सहायक से चैट करें",
    dashboardEyebrow: "स्मार्ट एग्री कंसोल",
    dashboardTitle: "किसान से उपभोक्ता मार्केटप्लेस",
    dashboardSubtitle: "उत्पाद, सीधे व्यापार, लाइव ऑर्डर फ्लो और डिलीवरी को एक ही जगह से प्रबंधित करें।",
    dashboardExploreInventory: "इन्वेंटरी देखें",
    dashboardQuickActions: "क्विक एक्शन",
    dashboardQuickActionsCopy: "अगले सबसे उपयोगी वर्कफ़्लो में सीधे जाएँ।",
    dashboardProductsTitle: "उत्पाद",
    dashboardProductsCopy: "मार्केटप्लेस इन्वेंटरी ब्राउज़ करें और सूचीबद्ध उत्पाद देखें।",
    dashboardProductsCta: "उत्पाद देखें",
    dashboardIncomingOrdersTitle: "आने वाले ऑर्डर",
    dashboardIncomingOrdersCopy: "नए ग्राहक ऑर्डर देखें और डिस्पैच तक बढ़ाएँ।",
    dashboardIncomingOrdersCta: "ऑर्डर देखें",
    dashboardMyOrdersTitle: "मेरे ऑर्डर",
    dashboardMyOrdersCopy: "खरीद, डिलीवरी प्रगति और ऑर्डर इतिहास ट्रैक करें।",
    dashboardMyOrdersCta: "ऑर्डर देखें",
    dashboardProfileTitle: "प्रोफ़ाइल",
    dashboardProfileCopy: "खाता सेटिंग, बेस पता और व्यक्तिगत विवरण अपडेट करें।",
    dashboardProfileCta: "प्रोफ़ाइल देखें",
    dashboardMarketplaceMode: "मार्केटप्लेस मोड",
    dashboardFarmerWorkspace: "किसान वर्कस्पेस",
    dashboardConsumerWorkspace: "उपभोक्ता वर्कस्पेस",
    dashboardOperationalFocus: "ऑपरेशनल फोकस",
    dashboardFocusFarmer: "इन्वेंटरी + फुलफिलमेंट",
    dashboardFocusConsumer: "खोज + ट्रैकिंग",
    productsLoading: "उत्पाद लोड हो रहे हैं...",
    productsDeleteConfirm: "क्या आप यह उत्पाद हटाना चाहते हैं?",
    productsDeleteFailed: "उत्पाद हटाना विफल रहा।",
    productsEyebrow: "इन्वेंटरी हब",
    productsTitle: "उत्पाद इन्वेंटरी",
    productsSubtitle: "लिस्टिंग प्रबंधित करें, स्टॉक स्तर देखें और बाज़ार शेल्फ को खरीदारों के लिए तैयार रखें।",
    productsAdd: "उत्पाद जोड़ें",
    productsTotalListings: "कुल लिस्टिंग",
    productsAvailable: "उपलब्ध",
    productsLowStock: "कम स्टॉक",
    productsReadyToSell: "बिक्री के लिए तैयार",
    productsOutOfStock: "स्टॉक समाप्त",
    productsPrice: "कीमत",
    productsUnits: "इकाइयाँ",
    productsInStockWithCount: "स्टॉक में",
    productsDeleteListing: "लिस्टिंग हटाएँ",
    categoryVegetables: "सब्ज़ियां",
    categoryFruits: "फल",
    categoryDairy: "डेयरी",
    categoryMeats: "मांस",
    categoryHerbs: "जड़ी-बूटियाँ",
    categoryBerries: "बेरी",
  },
  te: {
    navProducts: "ఉత్పత్తులు",
    navProfile: "ప్రొఫైల్",
    navChatbot: "చాట్‌బాట్",
    navAddProduct: "ఉత్పత్తి జోడించండి",
    navDelivery: "డెలివరీ",
    navPricing: "ధర నిర్ణయం",
    navOrders: "ఆర్డర్లు",
    navMessages: "సందేశాలు",
    navCart: "కార్ట్",
    navLogout: "లాగౌట్",
    navLanguageAria: "యాప్ భాష మార్చండి",
    floatingChatTitle: "అసిస్టెంట్‌తో చాట్ చేయండి",
    dashboardEyebrow: "స్మార్ట్ అగ్రి కన్సోల్",
    dashboardTitle: "రైతు నుంచి వినియోగదారుకు మార్కెట్‌ప్లేస్",
    dashboardSubtitle: "ఉత్పత్తులు, ప్రత్యక్ష వాణిజ్యం, లైవ్ ఆర్డర్ ఫ్లో మరియు డెలివరీని ఒకే వర్క్‌స్పేస్‌లో నిర్వహించండి.",
    dashboardExploreInventory: "ఇన్వెంటరీ చూడండి",
    dashboardQuickActions: "త్వరిత చర్యలు",
    dashboardQuickActionsCopy: "తరువాత మీరు ఎక్కువగా ఉపయోగించే వర్క్‌ఫ్లోల్లోకి వెళ్లండి.",
    dashboardProductsTitle: "ఉత్పత్తులు",
    dashboardProductsCopy: "మార్కెట్‌ప్లేస్ ఇన్వెంటరీ బ్రౌజ్ చేసి జాబితా ఉత్పత్తులు చూడండి.",
    dashboardProductsCta: "ఉత్పత్తులు చూడండి",
    dashboardIncomingOrdersTitle: "వస్తున్న ఆర్డర్లు",
    dashboardIncomingOrdersCopy: "కొత్త కస్టమర్ డిమాండ్ చూసి డిస్పాచ్ వరకు ప్రాసెస్ చేయండి.",
    dashboardIncomingOrdersCta: "ఆర్డర్లు చూడండి",
    dashboardMyOrdersTitle: "నా ఆర్డర్లు",
    dashboardMyOrdersCopy: "కొనుగోళ్లు, డెలివరీ పురోగతి, ఆర్డర్ చరిత్రను ట్రాక్ చేయండి.",
    dashboardMyOrdersCta: "ఆర్డర్లు చూడండి",
    dashboardProfileTitle: "ప్రొఫైల్",
    dashboardProfileCopy: "ఖాతా అభిరుచులు, బేస్ అడ్రస్, వ్యక్తిగత వివరాలు నవీకరించండి.",
    dashboardProfileCta: "ప్రొఫైల్ చూడండి",
    dashboardMarketplaceMode: "మార్కెట్‌ప్లేస్ మోడ్",
    dashboardFarmerWorkspace: "రైతు వర్క్‌స్పేస్",
    dashboardConsumerWorkspace: "వినియోగదారు వర్క్‌స్పేస్",
    dashboardOperationalFocus: "ఆపరేషనల్ ఫోకస్",
    dashboardFocusFarmer: "ఇన్వెంటరీ + ఫుల్ఫిల్మెంట్",
    dashboardFocusConsumer: "శోధన + ట్రాకింగ్",
    productsLoading: "ఉత్పత్తులు లోడ్ అవుతున్నాయి...",
    productsDeleteConfirm: "ఈ ఉత్పత్తిని తొలగించాలా?",
    productsDeleteFailed: "ఉత్పత్తి తొలగింపు విఫలమైంది.",
    productsEyebrow: "ఇన్వెంటరీ హబ్",
    productsTitle: "ఉత్పత్తుల ఇన్వెంటరీ",
    productsSubtitle: "లిస్టింగ్స్ నిర్వహించండి, స్టాక్ స్థాయిలను గమనించండి, కొనుగోలుదారులకు మార్కెట్‌ను సిద్ధంగా ఉంచండి.",
    productsAdd: "ఉత్పత్తి జోడించండి",
    productsTotalListings: "మొత్తం లిస్టింగ్స్",
    productsAvailable: "అందుబాటులో",
    productsLowStock: "తక్కువ స్టాక్",
    productsReadyToSell: "అమ్మకానికి సిద్ధం",
    productsOutOfStock: "స్టాక్ లేదు",
    productsPrice: "ధర",
    productsUnits: "యూనిట్లు",
    productsInStockWithCount: "స్టాక్‌లో ఉంది",
    productsDeleteListing: "లిస్టింగ్ తొలగించు",
    categoryVegetables: "కూరగాయలు",
    categoryFruits: "పండ్లు",
    categoryDairy: "పాల ఉత్పత్తులు",
    categoryMeats: "మాంసం",
    categoryHerbs: "సుగంధ ద్రవ్యాలు",
    categoryBerries: "బెర్రీలు",
  },
  ta: {
    navProducts: "தயாரிப்புகள்",
    navProfile: "சுயவிவரம்",
    navChatbot: "அரட்டை உதவி",
    navAddProduct: "தயாரிப்பு சேர்",
    navDelivery: "டெலிவரி",
    navPricing: "விலை நிர்ணயம்",
    navOrders: "ஆர்டர்கள்",
    navMessages: "செய்திகள்",
    navCart: "கார்ட்",
    navLogout: "வெளியேறு",
    navLanguageAria: "ஆப் மொழியை மாற்று",
    floatingChatTitle: "உதவியாளருடன் அரட்டை",
    dashboardEyebrow: "ஸ்மார்ட் அக்ரி கன்சோல்",
    dashboardTitle: "விவசாயியிலிருந்து நுகர்வோருக்கு மார்க்கெட்ப்ளேஸ்",
    dashboardSubtitle: "தயாரிப்புகள், நேரடி வர்த்தகம், நேரடி ஆர்டர் ஓட்டம், டெலிவரியை ஒரே இடத்தில் நிர்வகிக்கவும்.",
    dashboardExploreInventory: "இன்வெண்டரி பார்க்க",
    dashboardQuickActions: "விரைவு செயல்கள்",
    dashboardQuickActionsCopy: "அடுத்து அதிகம் பயன்படுத்தப் போகும் பணிச்சூழல்களுக்கு செல்லவும்.",
    dashboardProductsTitle: "தயாரிப்புகள்",
    dashboardProductsCopy: "மார்க்கெட்ப்ளேஸ் இன்வெண்டரியை உலாவி பட்டியலிடப்பட்ட பொருட்களை பாருங்கள்.",
    dashboardProductsCta: "தயாரிப்புகள் பார்க்க",
    dashboardIncomingOrdersTitle: "வரும் ஆர்டர்கள்",
    dashboardIncomingOrdersCopy: "புதிய வாடிக்கையாளர் தேவையை பார்த்து டிஸ்பாச் வரை நகர்த்துங்கள்.",
    dashboardIncomingOrdersCta: "ஆர்டர்கள் பார்க்க",
    dashboardMyOrdersTitle: "என் ஆர்டர்கள்",
    dashboardMyOrdersCopy: "கொள்முதல், டெலிவரி முன்னேற்றம், ஆர்டர் வரலாற்றை கண்காணிக்கவும்.",
    dashboardMyOrdersCta: "ஆர்டர்கள் பார்க்க",
    dashboardProfileTitle: "சுயவிவரம்",
    dashboardProfileCopy: "கணக்கு விருப்பங்கள், அடிப்படை முகவரி, தனிப்பட்ட தகவலை புதுப்பிக்கவும்.",
    dashboardProfileCta: "சுயவிவரம் பார்க்க",
    dashboardMarketplaceMode: "மார்க்கெட்ப்ளேஸ் முறை",
    dashboardFarmerWorkspace: "விவசாயி பணிமனை",
    dashboardConsumerWorkspace: "நுகர்வோர் பணிமனை",
    dashboardOperationalFocus: "செயல்பாட்டு கவனம்",
    dashboardFocusFarmer: "இன்வெண்டரி + நிறைவேற்றம்",
    dashboardFocusConsumer: "கண்டுபிடித்தல் + கண்காணித்தல்",
    productsLoading: "தயாரிப்புகள் ஏற்றப்படுகிறது...",
    productsDeleteConfirm: "இந்த தயாரிப்பை நீக்க வேண்டுமா?",
    productsDeleteFailed: "தயாரிப்பை நீக்க முடியவில்லை.",
    productsEyebrow: "இன்வென்டரி மையம்",
    productsTitle: "தயாரிப்பு இன்வென்டரி",
    productsSubtitle: "பட்டியல்களை நிர்வகிக்கவும், கையிருப்பை கண்காணிக்கவும், வாங்குபவர்களுக்கு மார்க்கெட்டை தயாராக வைத்திருக்கவும்.",
    productsAdd: "தயாரிப்பு சேர்",
    productsTotalListings: "மொத்த பட்டியல்கள்",
    productsAvailable: "கிடைக்கும்",
    productsLowStock: "குறைந்த கையிருப்பு",
    productsReadyToSell: "விற்க தயாராக உள்ளது",
    productsOutOfStock: "கையிருப்பு இல்லை",
    productsPrice: "விலை",
    productsUnits: "அலகுகள்",
    productsInStockWithCount: "கையிருப்பில்",
    productsDeleteListing: "பட்டியல் நீக்கு",
    categoryVegetables: "காய்கறிகள்",
    categoryFruits: "பழங்கள்",
    categoryDairy: "பால்வளம்",
    categoryMeats: "இறைச்சி",
    categoryHerbs: "மூலிகைகள்",
    categoryBerries: "பெர்ரிகள்",
  },
};

const LanguageContext = createContext(null);

const readStoredLanguage = () => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (LANGUAGE_OPTIONS.some((item) => item.code === stored)) {
      return stored;
    }
  } catch (error) {
    console.warn("Language read error:", error);
  }
  return "en";
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readStoredLanguage);

  useEffect(() => {
    document.documentElement.setAttribute("lang", language);
  }, [language]);

  const setLanguage = useCallback((nextLanguage) => {
    if (!LANGUAGE_OPTIONS.some((item) => item.code === nextLanguage)) {
      return;
    }

    setLanguageState(nextLanguage);

    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch (error) {
      console.warn("Language save error:", error);
    }
  }, []);

  const t = useCallback(
    (key, fallback = "") => {
      return UI_TRANSLATIONS[language]?.[key]
        || UI_TRANSLATIONS.en?.[key]
        || fallback
        || key;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      languages: LANGUAGE_OPTIONS,
      t,
    }),
    [language, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider.");
  }
  return context;
}
