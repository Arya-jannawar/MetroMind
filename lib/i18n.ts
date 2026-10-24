// ---------------------------------------------------------------------------
// i18n for the First-Time Rider guide + key chrome. EN / हिंदी / मराठी.
// Only short, standard transit phrases are translated — anything uncertain
// ships EN-only, per the honesty policy.
// ---------------------------------------------------------------------------

export type Lang = "en" | "hi" | "mr";

export const LANG_LABEL: Record<Lang, string> = {
  en: "EN",
  hi: "हिंदी",
  mr: "मराठी",
};

interface GuideStep {
  title: string;
  body: string;
}

interface Dict {
  steps: GuideStep[]; // exactly 5
  phrases: { en: string; hi: string; mr: string }[];
  accessibility: string;
  accessibilityBody: string;
}

const EN: Dict = {
  steps: [
    {
      title: "Buy a ticket",
      body: "Use the token counter, the ticket vending machine, or a smart card. A round trip costs two tokens. Contactless cards and UPI QR are accepted at the machines.",
    },
    {
      title: "Security check",
      body: "Bags go through the X-ray scanner; you walk through the door-frame detector. Keep water bottles outside if asked. The queue usually moves in 2–3 minutes.",
    },
    {
      title: "Find your platform",
      body: "Follow the overhead signs to the platform for your direction. Elevated stations: platform level is one floor up by lift or escalator. Underground stations: follow the line colour, not the exit number.",
    },
    {
      title: "Board the train",
      body: "Stand behind the yellow line, let passengers exit first, and mind the gap. Coach signage shows the line colour and the terminal station — that's your direction check.",
    },
    {
      title: "Exit and last mile",
      body: "Tap out at the exit gates and keep your token until then. Follow the exit signs for the gate closest to your destination — stations have 2–4 exits and picking the right one saves a walk.",
    },
  ],
  phrases: [
    { en: "Where is the ticket counter?", hi: "टिकट काउंटर कहाँ है?", mr: "तिकीट काउंटर कुठे आहे?" },
    { en: "Which platform for the Aqua Line?", hi: "एक्वा लाइन के लिए कौन सा प्लेटफॉर्म?", mr: "अक्वा लाइनसाठी कोणते फलाट?" },
    { en: "Does this train go to District Court?", hi: "क्या यह ट्रेन डिस्ट्रिक्ट कोर्ट जाती है?", mr: "ही गाडी डिस्ट्रिक्ट कोर्टला जाते का?" },
    { en: "Where is the lift?", hi: "लिफ्ट कहाँ है?", mr: "लिफ्ट कुठे आहे?" },
    { en: "Please help me.", hi: "कृपया मेरी मदद करें।", mr: "कृपया मला मदत करा." },
    { en: "I got off at the wrong station.", hi: "मैं गलत स्टेशन पर उतर गया।", mr: "मी चुकीच्या स्थानकावर उतरलो." },
  ],
  accessibility: "Accessibility",
  accessibilityBody:
    "Every operational station has lifts from street to platform and step-free gates. Prefer step-free routing in the Copilot to keep interchanges lift-friendly. Tactile paving is marked at most stations — check the station page for the current status.",
};

const HI: Dict = {
  steps: [
    {
      title: "टिकट खरीदें",
      body: "टोकन काउंटर, टिकट वेंडिंग मशीन या स्मार्ट कार्ड का उपयोग करें। मशीनों पर कार्ड और UPI QR भी चलते हैं।",
    },
    {
      title: "सुरक्षा जाँच",
      body: "बैग X-ray मशीन से, आप डोर-फ्रेम डिटेक्टर से गुज़रें। कतार आमतौर पर 2–3 मिनट में आगे बढ़ जाती है।",
    },
    {
      title: "प्लेटफॉर्म खोजें",
      body: "ऊपर लगे संकेतों का पालन करें। ऊँचे स्टेशनों पर लिफ्ट/एस्कलेटर से एक तल ऊपर जाएँ। भूमिगत स्टेशनों पर लाइन के रंग का पालन करें।",
    },
    {
      title: "ट्रेन में चढ़ें",
      body: "पीली रेखा के पीछे खड़े हों, पहले उतरने वालों को निकलने दें, और गैप का ध्यान रखें। डिब्बे पर लाइन का रंग और टर्मिनल स्टेशन लिखा होता है।",
    },
    {
      title: "बाहर निकलें",
      body: "एक्ज़िट गेट पर टैप करें और टोकन तब तक संभालकर रखें। सही एक्ज़िट चुनने से बहुत चलना बचता है।",
    },
  ],
  phrases: EN.phrases,
  accessibility: "सुलभता",
  accessibilityBody:
    "हर स्टेशन पर लिफ्ट और स्टेप-फ्री गेट उपलब्ध हैं। Copilot में step-free रूटिंग चुनें। स्थान के अनुसार विवरण स्टेशन पेज पर देखें।",
};

const MR: Dict = {
  steps: [
    {
      title: "तिकीट घ्या",
      body: "टोकन काउंटर, तिकीट विक्री यंत्र किंवा स्मार्ट कार्ड वापरा. यंत्रांवर कार्ड आणि UPI QR चालते.",
    },
    {
      title: "सुरक्षा तपासणी",
      body: "बॅग X-ray मधून, तुम्ही डोअर-फ्रेम डिटेक्टरमधून जा. रांग सहसा २–३ मिनिटांत पुढे जाते.",
    },
    {
      title: "फलाट शोधा",
      body: "वरच्या फलकांचे अनुसरण करा. उंच स्थानकांवर लिफ्ट/जानेवालीने एक मजला वर जा. भूमिगत स्थानकांवर लाईनचा रंग पाहा.",
    },
    {
      title: "गाडीत बसा",
      body: "पिवळ्या ओळीमागे उभे रहा, आधी उतरणाऱ्यांना जाऊ द्या, आणि गॅपकडे लक्ष द्या. डब्ब्यावर लाईनचा रंग व शेवटचे स्थानक लिहिलेले असते.",
    },
    {
      title: "बाहेर पडा",
      body: "एक्झिट गेटवर टॅप करा आणि तोपर्यंत टोकन जपून ठेवा. योग्य एक्झिट निवडल्याने चालणे वाचते.",
    },
  ],
  phrases: EN.phrases,
  accessibility: "सुलभता",
  accessibilityBody:
    "प्रत्येक स्थानकात लिफ्ट आणि स्टेप-फ्री गेट आहेत. Copilot मध्ये step-free रूटिंग निवडा. तपशील स्थानक पृष्ठावर पहा.",
};

export const DICTS: Record<Lang, Dict> = { en: EN, hi: HI, mr: MR };

export function dict(lang: Lang): Dict {
  return DICTS[lang] ?? EN;
}
