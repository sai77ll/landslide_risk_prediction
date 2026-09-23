"""
Language service — curated emergency alert translations.
Supports: English (en), Hindi (hi), Marathi (mr), Bengali (bn), Urdu (ur).
All translations are pre-written emergency messages — no external API required.
"""

# ─── Language metadata ────────────────────────────────────────────────────────

SUPPORTED_LANGUAGES = [
    {"code": "en", "name": "English",          "native": "English",       "flag": "🇬🇧"},
    {"code": "hi", "name": "Hindi",            "native": "हिंदी",          "flag": "🇮🇳"},
    {"code": "mr", "name": "Marathi",          "native": "मराठी",          "flag": "🇮🇳"},
    {"code": "bn", "name": "Bengali",          "native": "বাংলা",          "flag": "🇮🇳"},
    {"code": "ur", "name": "Urdu",             "native": "اردو",           "flag": "🇮🇳"},
]

LANGUAGE_CODES = {lang["code"] for lang in SUPPORTED_LANGUAGES}

# ─── Curated alert message templates per language per level ──────────────────
# Keys: informational | advisory | warning | emergency

ALERT_MESSAGES = {

    # ── English ──────────────────────────────────────────────────────────────
    "en": {
        "informational": (
            "📢 LandGuard Notice: Elevated monitoring is active for your area. "
            "Stay informed and avoid unstable slopes. For updates call 112."
        ),
        "advisory": (
            "⚡ LandGuard Advisory: Landslide risk is elevated in your zone due to heavy rainfall. "
            "Avoid hill roads and riverbanks. Emergency: 112."
        ),
        "warning": (
            "⚠️ LandGuard WARNING: HIGH landslide risk detected near you. "
            "Please move to safer ground and stay indoors. Call 112 for emergencies."
        ),
        "emergency": (
            "🚨 EMERGENCY ALERT from LandGuard: CRITICAL landslide risk! "
            "EVACUATE immediately to designated safe zones. Call 112 NOW!"
        ),
    },

    # ── Hindi (हिंदी) ─────────────────────────────────────────────────────────
    "hi": {
        "informational": (
            "📢 LandGuard सूचना: आपके क्षेत्र में निगरानी बढ़ा दी गई है। "
            "अस्थिर ढलानों से दूर रहें और सतर्क रहें। अधिक जानकारी के लिए 112 पर कॉल करें।"
        ),
        "advisory": (
            "⚡ LandGuard चेतावनी: भारी बारिश के कारण आपके क्षेत्र में भूस्खलन का खतरा बढ़ गया है। "
            "पहाड़ी सड़कों और नदी किनारों से दूर रहें। आपात स्थिति: 112।"
        ),
        "warning": (
            "⚠️ LandGuard गंभीर चेतावनी: आपके पास उच्च भूस्खलन खतरा पाया गया है। "
            "कृपया सुरक्षित स्थान पर जाएं और घर के अंदर रहें। आपात स्थिति में 112 पर कॉल करें।"
        ),
        "emergency": (
            "🚨 आपातकालीन अलर्ट — LandGuard: अत्यंत गंभीर भूस्खलन खतरा! "
            "तुरंत निर्धारित सुरक्षित क्षेत्र में जाएं। अभी 112 पर कॉल करें!"
        ),
    },

    # ── Marathi (मराठी) ───────────────────────────────────────────────────────
    "mr": {
        "informational": (
            "📢 LandGuard सूचना: तुमच्या परिसरात देखरेख वाढवण्यात आली आहे। "
            "अस्थिर उतारांपासून दूर राहा आणि सावध राहा। अधिक माहितीसाठी 112 वर कॉल करा।"
        ),
        "advisory": (
            "⚡ LandGuard सावधगिरी: मुसळधार पावसामुळे तुमच्या क्षेत्रात भूस्खलनाचा धोका वाढला आहे। "
            "डोंगरी रस्ते आणि नदीकिनारे टाळा। आणीबाणी: 112।"
        ),
        "warning": (
            "⚠️ LandGuard इशारा: तुमच्या जवळ उच्च भूस्खलन धोका आढळला आहे। "
            "कृपया सुरक्षित ठिकाणी जा आणि घरातच राहा। आणीबाणीसाठी 112 वर कॉल करा।"
        ),
        "emergency": (
            "🚨 आणीबाणी अलर्ट — LandGuard: अत्यंत गंभीर भूस्खलन धोका! "
            "तात्काळ निर्धारित सुरक्षित ठिकाणी जा. आत्ताच 112 वर कॉल करा!"
        ),
    },

    # ── Bengali (বাংলা) ───────────────────────────────────────────────────────
    "bn": {
        "informational": (
            "📢 LandGuard বিজ্ঞপ্তি: আপনার এলাকায় নজরদারি বাড়ানো হয়েছে। "
            "অস্থির ঢাল থেকে দূরে থাকুন এবং সতর্ক থাকুন। আরও তথ্যের জন্য 112-তে কল করুন।"
        ),
        "advisory": (
            "⚡ LandGuard সতর্কতা: ভারী বৃষ্টির কারণে আপনার এলাকায় ভূমিধসের ঝুঁকি বেড়েছে। "
            "পাহাড়ি রাস্তা ও নদীর তীর এড়িয়ে চলুন। জরুরি: 112।"
        ),
        "warning": (
            "⚠️ LandGuard সতর্কতা: আপনার কাছে উচ্চ ভূমিধসের ঝুঁকি সনাক্ত হয়েছে। "
            "দয়া করে নিরাপদ স্থানে যান এবং ঘরের ভেতরে থাকুন। জরুরি পরিস্থিতিতে 112-তে কল করুন।"
        ),
        "emergency": (
            "🚨 জরুরি সতর্কতা — LandGuard: অত্যন্ত গুরুতর ভূমিধসের বিপদ! "
            "এখনই নির্ধারিত নিরাপদ স্থানে সরে যান। এখনই 112-তে কল করুন!"
        ),
    },

    # ── Urdu (اردو) ───────────────────────────────────────────────────────────
    "ur": {
        "informational": (
            "📢 LandGuard اطلاع: آپ کے علاقے میں نگرانی بڑھا دی گئی ہے۔ "
            "غیر مستحکم ڈھلوانوں سے دور رہیں اور چوکس رہیں۔ مزید معلومات کے لیے 112 پر کال کریں۔"
        ),
        "advisory": (
            "⚡ LandGuard مشورہ: بھاری بارش کی وجہ سے آپ کے علاقے میں لینڈ سلائیڈ کا خطرہ بڑھ گیا ہے۔ "
            "پہاڑی سڑکوں اور ندی کنارے سے گریز کریں۔ ایمرجنسی: 112۔"
        ),
        "warning": (
            "⚠️ LandGuard انتباہ: آپ کے قریب زیادہ لینڈ سلائیڈ خطرہ پایا گیا ہے۔ "
            "براہ کرم محفوظ جگہ جائیں اور گھر کے اندر رہیں۔ ایمرجنسی کے لیے 112 پر کال کریں۔"
        ),
        "emergency": (
            "🚨 ایمرجنسی الرٹ — LandGuard: انتہائی سنگین لینڈ سلائیڈ خطرہ! "
            "فوری طور پر مقررہ محفوظ علاقے میں جائیں۔ ابھی 112 پر کال کریں!"
        ),
    },
}


# ─── Public API ───────────────────────────────────────────────────────────────

def get_available_languages() -> list:
    """Return list of supported language metadata dicts."""
    return SUPPORTED_LANGUAGES


def get_translated_message(alert_level: str, language_code: str = "en") -> str:
    """
    Return the curated alert message for the given level and language.
    Falls back to English if the language or level is not found.
    """
    lang = language_code if language_code in ALERT_MESSAGES else "en"
    level = alert_level if alert_level in ALERT_MESSAGES["en"] else "advisory"
    return ALERT_MESSAGES[lang][level]


def build_bilingual_message(
    alert_level: str,
    language_code: str,
    zone_name: str = "",
    risk_score: float = None,
) -> str:
    """
    Build a bilingual message: English first, then local language.
    Adds zone name and risk score context if provided.
    """
    en_msg = get_translated_message(alert_level, "en")
    local_msg = get_translated_message(alert_level, language_code)

    # Add zone context
    context = ""
    if zone_name:
        context = f" [Zone: {zone_name}]"
    if risk_score is not None:
        context += f" [Risk Score: {risk_score:.0f}/100]"

    if language_code == "en":
        return en_msg + context

    # Bilingual format
    lang_meta = next((l for l in SUPPORTED_LANGUAGES if l["code"] == language_code), None)
    lang_name = lang_meta["native"] if lang_meta else language_code.upper()

    return (
        f"{en_msg}{context}\n"
        f"{'─' * 40}\n"
        f"[{lang_name}] {local_msg}{context}"
    )
