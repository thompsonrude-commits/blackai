import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Image, Mic, Globe, BookOpen, Database, Play, MessageSquare, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ImageGenerator from './ImageGenerator';
import VoiceSettingsModal from './VoiceSettingsModal';
import AppHeader from './AppHeader';

const featuredTools = [
  { title: 'AI Image Studio', description: 'Generate logos, cultural posters, avatars and more.', icon: Image },
  { title: 'AI Voice Assistant', description: 'Speech-to-text, text-to-speech and accent coaching.', icon: Mic },
  { title: 'AI Translation Hub', description: 'Translate text and voice across African languages.', icon: Globe },
  { title: 'AI Creator Studio', description: 'Create thumbnails, stories, and media assets fast.', icon: BookOpen },
];

const utilityCards = [
  {
    title: 'Image Studio',
    subtitle: 'Create cultural art, avatars, thumbnails.',
    icon: Image,
    action: 'image-studio',
    buttonLabel: 'Open Studio',
    color: '#008751',
  },
  {
    title: 'Voice Lab',
    subtitle: 'Generate multilingual speech and pronunciation guides.',
    icon: Mic,
    action: 'voice-lab',
    buttonLabel: 'Voice Settings',
    color: '#008751',
  },
  {
    title: 'Translation Hub',
    subtitle: 'Translate across text, voice and captions.',
    icon: Globe,
    action: 'chat',
    prompt: 'Translate the following text for me across African languages: ',
    buttonLabel: 'Open Translator',
    color: '#0070f3',
  },
  {
    title: 'Storytelling',
    subtitle: 'Write African stories, scripts and lessons.',
    icon: BookOpen,
    action: 'chat',
    prompt: 'Write me a short African cultural story about ',
    buttonLabel: 'Start Writing',
    color: '#7928ca',
  },
  {
    title: 'Research Assistant',
    subtitle: 'Ask questions and retrieve smart answers.',
    icon: Sparkles,
    action: 'chat',
    prompt: 'Research and give me detailed information about ',
    buttonLabel: 'Start Research',
    color: '#ff4d4d',
  },
  {
    title: 'Podcast Studio',
    subtitle: 'Plan and script audio shows quickly.',
    icon: Play,
    action: 'chat',
    prompt: 'Help me plan and write a podcast script about ',
    buttonLabel: 'Plan Podcast',
    color: '#f5a623',
  },
  {
    title: 'Productivity Tools',
    subtitle: 'Generate documents, summaries and plans.',
    icon: Database,
    action: 'chat',
    prompt: 'Help me create a professional document or plan for ',
    buttonLabel: 'Open Tools',
    color: '#0070f3',
  },
  {
    title: 'Learning Assistant',
    subtitle: 'Build quizzes, lessons and practice exercises.',
    icon: MessageSquare,
    action: 'chat',
    prompt: 'Create a lesson plan and quiz questions about ',
    buttonLabel: 'Start Learning',
    color: '#008751',
  },
];

export default function Utilities() {
  const navigate = useNavigate();
  const [showImageStudio, setShowImageStudio] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const handleCardAction = (card: typeof utilityCards[0]) => {
    if (card.action === 'image-studio') {
      setShowImageStudio(true);
    } else if (card.action === 'voice-lab') {
      setShowVoiceSettings(true);
    } else if (card.action === 'chat' && card.prompt) {
      // Navigate to main chat with a pre-filled prompt context
      navigate('/', { state: { prefillPrompt: card.prompt } });
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto pb-20">
      <AppHeader />
      <header className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#008751]/10 text-[#008751] text-xs font-bold uppercase tracking-widest">
          <Sparkles size={14} /> AI Universe
        </div>
        <h1 className="mt-3 text-3xl font-serif text-[#1A1A1A]">Utilities</h1>
        <p className="mt-1 text-sm text-gray-600 max-w-2xl">A futuristic AI ecosystem hub for language, voice, images, learning and creative tools.</p>
      </header>

      {/* Featured overview strip */}
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mb-6">
        {featuredTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <motion.div
              key={tool.title}
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#008751]/10 text-[#008751] mb-3">
                <Icon size={18} />
              </div>
              <h2 className="text-sm font-semibold mb-1">{tool.title}</h2>
              <p className="text-xs text-gray-500">{tool.description}</p>
            </motion.div>
          );
        })}
      </section>

      {/* All utility cards - all connected */}
      <section className="grid gap-4 md:grid-cols-2">
        {utilityCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              whileHover={{ scale: 1.01 }}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#008751] font-bold">Featured</p>
                  <h3 className="mt-1 text-lg font-semibold text-[#1A1A1A]">{card.title}</h3>
                </div>
                <div
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
                  style={{ backgroundColor: `${card.color}15`, color: card.color }}
                >
                  <Icon size={18} />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">{card.subtitle}</p>
              <button
                onClick={() => handleCardAction(card)}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: card.color }}
              >
                {card.buttonLabel}
                <ArrowRight size={14} />
              </button>
            </motion.div>
          );
        })}
      </section>

      {showImageStudio && (
        <ImageGenerator
          onClose={() => setShowImageStudio(false)}
          initialPrompt="A futuristic African cultural poster blending tradition and technology"
        />
      )}
      {showVoiceSettings && (
        <VoiceSettingsModal onClose={() => setShowVoiceSettings(false)} />
      )}
    </div>
  );
}
