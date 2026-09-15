# Google Sheets Backend Setup Guide (गूगल शीट बैकएंड सेटअप गाइड)

इस गाइड की मदद से आप मात्र 2 मिनट में अपने Google Sheet को पोर्टल के लाइव डेटाबेस से जोड़ सकते हैं।

---

### Step 1: नई गूगल शीट बनाएं (Create a New Google Spreadsheet)
1. अपने Google Drive में जाएं और **New -> Google Sheets** पर क्लिक करें।
2. शीट का नाम दें: **"Jharkhand ICT & Smart Class Master DB"**।

---

### Step 2: Apps Script एडिटर खोलें (Open Apps Script)
1. ऊपर मेनू में **Extensions** पर क्लिक करें।
2. **Apps Script** चुनें।
3. एडिटर में जो पहले से कोड लिखा हो उसे हटा दें।

---

### Step 3: कोड पेस्ट करें (Paste the Code)
1. आपके प्रोजेक्ट फोल्डर में मौजूद `google_apps_script/Code.gs` फाइल के पूरे कोड को कॉपी करें।
2. Apps Script एडिटर में पेस्ट कर दें।
3. ऊपर **Save (डिस्क आइकन)** पर क्लिक करें।

---

### Step 4: वेब ऐप के रूप में डिप्लॉय करें (Deploy as Web App)
1. ऊपर दाईं ओर **Deploy -> New deployment** पर क्लिक करें।
2. बाईं तरफ **Gear icon (Select type)** पर क्लिक करके **Web app** चुनें।
3. सेटिंग्स इस प्रकार रखें:
   - **Description**: `ICR Live API v1`
   - **Execute as**: `Me (your email)`
   - **Who has access**: **`Anyone`** *(यह बहुत जरूरी है ताकि पोर्टल बिना गूगल लॉगिन के लाइव डेटा सिंक कर सके)*
4. **Deploy** पर क्लिक करें।
5. पहली बार आपसे **Authorize Access** मांगेगा:
   - अपना Google Account चुनें।
   - **Advanced** पर क्लिक करें -> **Go to Untitled project (unsafe)** पर क्लिक करें -> **Allow** कर दें।
6. आपको एक **Web App URL** मिलेगा (जैसे: `https://script.google.com/macros/s/AKfycbx.../exec`)।
7. इस URL को कॉपी कर लें!

---

### Step 5: पोर्टल में URL जोड़ें और 679 स्कूल Google Sheet में पुश करें
1. पोर्टल खोलें (http://localhost:3000) और ऊपर **Cloud / Settings icon** पर क्लिक करें।
2. अपना **Web App URL** पेस्ट करें और **Save & Test Sync** पर क्लिक करें।
3. अब नीचे **"Push 679 Schools to Sheet"** बटन पर क्लिक करें।
   - यह आपकी Google Sheet में `Master_Schools` नाम की शीट बनाकर सभी 679 स्कूलों की पूरी लिस्ट डाल देगा!
4. **भविष्य में बदलाव (Future Flexibility)**:
   - अब यदि आप Google Sheet के `Master_Schools` टैब में किसी स्कूल का नाम सुधारते हैं, जिला/ब्लॉक बदलते हैं, लैब कैटेगरी बदलते हैं, या कोई नया स्कूल जोड़ते हैं—तो वह **स्वतः लाइव पोर्टल पर तुरंत अपडेट हो जाएगा**!

---

### आपकी Google Sheet में कुल 3 शीट्स (टैब्स) रहेंगी:
1. `Master_Schools`: सभी स्कूलों की डायनामिक मास्टर लिस्ट (जिसे आप कभी भी गूगल शीट में बदल सकते हैं)।
2. `Device_Serial_Inventory`: आपके बताए अनुसार **1 पंक्ति प्रति डिवाइस (Row-wise Asset Register)**।
3. `School_Status`: सभी स्कूलों का समरी स्टेटस (Completed / Pending)।
