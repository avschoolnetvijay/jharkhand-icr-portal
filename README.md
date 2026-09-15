# Jharkhand ICT & Smart Class ICR Digitization Portal
*(ICT-108 & SC-664 Hardware Digitization & Row-Wise Asset Inventory System)*

इस वेब पोर्टल को झारखंड राज्य के 679 स्कूलों (108 ICT Lab और 571 Smart Class) में स्थापित हार्डवेयर उपकरणों के **Installation Completion Report (ICR)** को डिजिटाइज़ करने, लाइव डुप्लीकेसी रोकने और **Google Sheets** में **Row-Wise (1 पंक्ति प्रति डिवाइस)** स्टोर करने के लिए विकसित किया गया है।

---

## मुख्य विशेषताएं (Key Features)

1. **स्मार्ट स्कूल सर्च (Smart Search & Autocomplete)**:
   - फील्ड इंजीनियर/यूज़र **UDISE Code**, **SNIL Code** या **School Name** टाइप करके तुरंत स्कूल खोज सकते हैं।
2. **लाइव स्टेटस वेरिफिकेशन (Instant Status Check)**:
   - यदि स्कूल का डेटा पहले ही सबमिट हो चुका है -> **ALREADY UPDATED** बैज दिखता है, जिसमें अपडेट करने वाले का नाम, मोबाइल नंबर, तारीख और भरे गए सीरियल नंबर्स की **Read-Only टेबल** दिखती है (ताकि कोई दोबारा डेटा न बदल सके)।
   - यदि पेंडिंग है -> **PENDING** बैज दिखता है और डेटा एंट्री फॉर्म खुल जाता है।
3. **डायनेमिक आईसीआर फॉर्म (Dynamic Device Forms)**:
   - स्कूल की कैटेगरी के अनुसार केवल वही डिवाइस इनपुट खुलते हैं जिनका सीरियल नंबर आवश्यक है:
     - **ICT 5 INCS Lab**: 8 डिवाइसेज
     - **ICT 5 INCS + Smart Class (Both)**: 12 डिवाइसेज
     - **ICT 5 Nodes Lab**: 17 डिवाइसेज
     - **ICT 10 Nodes Lab**: 27 डिवाइसेज
     - **Smart Class Only**: 4 डिवाइसेज
   - **फर्नीचर व नॉन-सीरियल आइटम्स को बाहर रखा गया है**: टेबल, चेयर, व्हाइटबोर्ड, हेडफ़ोन (NA), बैटरी क्वांटिटी और सॉफ्टवेयर के लिए कोई इनपुट नहीं मांगा जाता।
4. **रियल-टाइम डुप्लीकेसी रोकथाम (Real-time Duplicate Prevention)**:
   - **In-Form Duplicate Check**: यदि एक ही फॉर्म में कोई सीरियल नंबर दोबारा डाला जाता है -> तुरंत रेड अलर्ट।
   - **Central Database Check**: किसी बॉक्स में सीरियल नंबर डालते ही गूगल शीट से चेक होता है कि क्या यह सीरियल नंबर पूरे प्रोजेक्ट में किसी अन्य स्कूल में पहले तो नहीं डल चुका। यदि डल चुका है, तो तुरंत स्कूल का नाम, UDISE, अपडेटकर्ता का नाम, मोबाइल नंबर और तारीख स्क्रीन पर आ जाती है।
5. **रो-वाइज डेटा आर्किटेक्चर (Row-Wise Asset Register Format)**:
   - यदि किसी स्कूल में 12 डिवाइसेज हैं, तो गूगल शीट और एक्सेल एक्सपोर्ट में **12 अलग-अलग पंक्तियां** बनती हैं। हर पंक्ति में डिवाइस नाम, मेक-मॉडल, सीरियल नंबर और स्कूल का विवरण दर्ज होता है।
6. **एडमिन डैशबोर्ड व एक्सेल एक्सपोर्ट (Admin Dashboard & Reports)**:
   - पासवर्ड सुरक्षित एडमिन पैनल (`Admin@2026`)।
   - झारखंड के सभी 24 जिलों का लाइव ब्रेकडाउन (Total, Completed, Pending, % Progress)।
   - लैब कैटेगरी-वाइज प्रोग्रेस।
   - 1-क्लिक में **Row-Wise Excel (.xlsx)** फाइल डाउनलोड।

---

## लोकल रन करने का तरीका (Local Development)

```bash
# 1. प्रोजेक्ट फोल्डर में जाएं
cd "d:/Portal Try/ICT-108 & SC 664"

# 2. डिपेंडेंसीज इंस्टॉल करें (पहले से हो चुकी हैं)
npm install

# 3. डेवलपमेंट सर्वर शुरू करें
npm run dev
```
पोर्टल आपके ब्राउज़र में `http://localhost:3000` पर खुल जाएगा।

---

## प्रोडक्शन बिल्ड (Production Build)

```bash
npm run build
```
यह `dist/` फोल्डर में ऑप्टिमाइज़्ड कोड तैयार कर देता है।

---

## गूगल शीट बैकएंड सेटअप (Google Sheets Backend Setup)

विस्तृत हिंदी व अंग्रेजी गाइड के लिए [`GOOGLE_SHEETS_SETUP.md`](./GOOGLE_SHEETS_SETUP.md) फाइल देखें:
1. एक नई Google Sheet बनाएं।
2. **Extensions -> Apps Script** में जाएं।
3. `google_apps_script/Code.gs` का कोड पेस्ट करें।
4. **Deploy as Web App** करें (Access: **Anyone**)।
5. मिले हुए Web App URL को पोर्टल के **Database Config (Gear Icon)** में सेव कर दें।

---

## GitHub और Netlify पर डिप्लॉय करने का तरीका (Deploy to Netlify)

1. **GitHub पर कोड पुश करें**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Jharkhand ICR Digitization Portal"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Netlify पर डिप्लॉय करें**:
   - Netlify.com पर लॉगिन करें।
   - **Add new site -> Import an existing project -> GitHub** चुनें।
   - अपनी रिपॉजिटरी चुनें।
   - Build Settings (पहले से `netlify.toml` में कॉन्फ़िगर हैं):
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
   - **Deploy Site** पर क्लिक करें। आपकी वेबसाइट कुछ ही सेकंडों में लाइव हो जाएगी!

---

## एडमिन क्रेडेंशियल्स (Admin Credentials)

- **Admin Password**: `Admin@2026`
*(आप इसे `src/components/AdminDashboard.jsx` में जाकर अपनी इच्छानुसार कभी भी बदल सकते हैं।)*
