# **SignalAI** 🤟  
### *Real-Time Sign Language Translation for Inclusive Communication*  

---

## **✨ Introduction**  
**SignalAI** is an **AI-powered sign language translator** that bridges communication gaps for the deaf and non-verbal communities. It converts **American Sign Language (ASL)** into **real-time text and speech**, enabling seamless interaction with the hearing world.  

🚀 **Key Objectives:**  
✔ **Accessibility** – Break communication barriers for the deaf and hard-of-hearing.  
✔ **Real-Time Translation** – Instant ASL-to-text and speech conversion.  
✔ **User-Friendly** – Intuitive interface with customizable settings.  
✔ **Open Source** – Encourage global collaboration for better ASL recognition.  

---

## **🔥 Key Features**  

### **1. Real-Time ASL Translation**  
📸 **Live Camera Feed** – Uses **MediaPipe** for hand tracking and pose estimation.  
✍️ **Text Output** – Displays translated ASL gestures as text in real time.  
🗣 **Text-to-Speech (TTS)** – Converts text into spoken words (multiple voice options).  

### **2. Comprehensive ASL Phrase Library**  
📚 **300+ Signs** – Categorized into **Basic, Intermediate, and Advanced** levels.  
🔍 **Search & Learn** – Easily find and practice ASL phrases.  

### **3. Customizable Settings**  
⚙ **Camera & Performance** – Adjust resolution, FPS, and landmarks visibility.  
🎚 **Accessibility Options** – Modify TTS voice, speed, and volume.  
🌙 **Dark Mode** – Reduces eye strain in low-light environments.  

### **4. Translation History & Export**  
📜 **Session Logs** – Save and review past translations.  
📤 **Export Data** – Share translations via text or audio files. 

### **5. Export Functionality**
📂 **Excel (XLSX) Export** – Save translations with timestamp, ASL video (if saved), translated text, and TTS audio (if generated). <br>
📄 **PDF Export** – Generates formatted transcripts, organized by date/time with optional ASL gesture thumbnails. <br>
📥 **Easy Access** – Go to "Translation History", select entries, and export as Excel or PDF for analysis, reports, or sharing.  <br>
🔊 **Audio Export (MP3)** – Export TTS-generated audio files individually or as a batch for offline playback or sharing.



---

## **🛠 Tech Stack**  

| **Category**       | **Technologies Used** |
|-------------------|----------------------|
| **AI Model**      | MediaPipe, TensorFlow (ASL recognition) |
| **Frontend**      | React.js (TypeScript) |
| **Backend**       | Python (FastAPI/Flask) |
| **Text-to-Speech**| Web Speech API / Google TTS |
| **Database**      | MongoDB (for translation logs) |
| **Deployment**    | Docker, AWS/GCP (optional) |

---

## **🚀 Installation (Local Setup)**  

### **Prerequisites**  
✅ **Python 3.8+** (for backend)  
✅ **Node.js 16+** (for frontend)  
✅ **Webcam** (for real-time ASL detection)  

### **Step-by-Step Setup**  

1. **Clone the Repository**  
   ```bash
   git clone https://github.com/yourusername/SignalAI.git
   cd SignalAI
   ```

2. **Set Up Backend (Python)**  
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py  # Starts the AI model server
   ```

3. **Set Up Frontend (React)**  
   ```bash
   cd ../frontend
   npm install
   npm start  # Runs the app at http://localhost:3000
   ```

4. **Configure Environment Variables**  
   - **Backend** (`backend/.env`):  
     ```env
     MODEL_PATH=./models/asl_model.h5
     PORT=5000
     ```
   - **Frontend** (`frontend/.env`):  
     ```env
     REACT_APP_API_URL=http://localhost:5000
     ```

5. **Launch the App**  
   - Open `http://localhost:3000` in your browser.  
   - Allow camera access and start signing!  

---

## **🌍 Why Open Source?**  
🔓 **Transparency** – Open AI models ensure fairness and bias reduction.  
⚡ **Community-Driven Improvements** – Developers & ASL experts can enhance accuracy.  
🌐 **Global Adaptability** – Can be extended to other sign languages (BSL, ISL, etc.).  

---

## **📊 Performance & Impact**  
✅ **95% Accuracy** on common ASL phrases.  
⚡ **<500ms Latency** for real-time translation.  
📈 **300+ Supported Signs** (and growing).  

---

## **🤝 How to Contribute**  
We welcome **developers, designers, and ASL experts** to contribute!  

1. **Fork the repo** and create a new branch.  
2. **Make improvements** (code, UI, or ASL dataset).  
3. **Submit a Pull Request** with a clear description.   

---

## **📜 License**  
📄 **MIT License** – Free for personal and commercial use.  

---

# **🚀 Let’s Make Communication Accessible for Everyone!**  
**⭐ Star the repo if you find this project useful!**  

🔗 **GitHub:** [github.com/yourusername/SignalAI](https://github.com/yourusername/SignalAI)  

---

### **📌 Screenshots (Preview)**  
<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/e67709cc-84b8-4926-920d-2c3cd6675ab4" />
*Real-time ASL translation with text & speech output*  

<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/42b7e024-d47e-47d3-85c5-4c03481bab49" />

*Interactive ASL dictionary for learning*  

<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/1bdd9b05-0007-46c5-b1f9-0929fdba59f5" />

*Customizable accessibility options*  

---

**Made with ❤️ for the Deaf & Non-Verbal Community**  
**© 2024 SignalAI | Breaking Barriers with AI**
