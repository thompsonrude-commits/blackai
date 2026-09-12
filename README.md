# BLACK AI - Africa's Smartest AI

<div align="center">
  <h1>🌍 BLACK AI</h1>
  <p><strong>Africa's Most Intelligent AI Companion</strong></p>
  <p>Created by Obosa Thompson Emuze</p>
</div>

## 🚀 About BLACK AI

BLACK AI is a cutting-edge artificial intelligence platform built specifically for Africa. Chat in any of 500+ Nigerian and African languages, generate images, translate content, and explore the power of AI technology designed for African users.

## ✨ Features

- **🗣️ Multilingual Chat**: Converse in English, Yoruba, Igbo, Hausa, Edo, Pidgin, and 500+ more languages
- **🎨 Image Generation**: Create stunning visuals with AI
- **🔄 Translation**: Translate between African languages instantly
- **📚 Language Learning**: Learn Nigerian and African languages interactively
- **🎙️ Voice Assistant**: Speech-to-text and text-to-speech in multiple languages
- **📊 Document Generation**: Create spreadsheets, documents, and more
- **🌐 Offline-First**: Works even without internet connection

## 🛠️ Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend**: Firebase Functions, Firestore
- **AI Models**: Groq (Llama 3.3 70B), Direct API Integration
- **Hosting**: Vercel
- **PWA**: Installable as native app on mobile and desktop

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Local Development

1. **Clone the repository:**
```bash
git clone https://github.com/thompsonrude-commits/blackai.git
cd blackai
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
Create a `.env` file:
```env
# Groq API Key for AI chat
VITE_GROQ_KEY=your_groq_api_key_here
GROQ_KEY=your_groq_api_key_here

# Firebase Config
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
```

4. **Run the development server:**
```bash
npm run dev
```

Visit `http://localhost:3000`

### Production Build

```bash
npm run build
npm run preview
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## 🔑 Environment Variables

Add these to your Vercel project:

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GROQ_KEY` | Groq API key for AI chat | ✅ Yes |
| `GROQ_KEY` | Backend Groq API key | ✅ Yes |
| `VITE_FIREBASE_API_KEY` | Firebase API key | ✅ Yes |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | ✅ Yes |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | ✅ Yes |

## 🎯 Key Features

### Direct AI Integration
BLACK AI now makes **direct API calls to Groq**, bypassing Firebase Functions for faster responses and simpler architecture.

### Multi-Language Support
- 500+ Nigerian and African languages
- Automatic language detection
- Context-aware translations

### Offline-First Architecture
- Local fallback responses
- Progressive Web App (PWA)
- Works without internet

### Admin Training System
- Train the AI in any language
- Correct spellings and terminology
- Add phonetic pronunciations
- Manage team members

## 📱 Mobile Support

BLACK AI works seamlessly on mobile devices:
- Responsive design
- Touch-optimized interface
- Installable as PWA
- Offline functionality

## 🔧 Project Structure

```
blackai/
├── src/
│   ├── components/     # React components
│   ├── lib/           # Core libraries
│   │   ├── groqDirect.ts    # Direct Groq API client
│   │   ├── systemPrompts.ts # AI identity & prompts
│   │   └── ai.ts            # Main AI engine
│   ├── App.tsx        # Main app component
│   └── main.tsx       # Entry point
├── public/            # Static assets
├── functions/         # Firebase Functions (legacy)
└── package.json
```

## 🤝 Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 👨‍💻 Creator

**Obosa Thompson Emuze**
- Email: obosathompsons@gmail.com
- GitHub: [@thompsonrude-commits](https://github.com/thompsonrude-commits)

## 🌟 Support

If you find BLACK AI useful, please ⭐ star the repository!

## 📞 Contact

For issues, questions, or feedback:
- Open an issue on GitHub
- Email: obosathompsons@gmail.com

---

<div align="center">
  <p><strong>BLACK AI</strong> - Built with ❤️ in Africa</p>
  <p>© 2026 Obosa Thompson Emuze. All rights reserved.</p>
</div>
