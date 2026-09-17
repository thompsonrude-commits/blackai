import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Database, Search, ChevronRight, Globe, Clock, User, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { NIGERIAN_LANGUAGES } from '../lib/nigerianLanguages';

interface RepositoryLanguage {
  id: string;
  name: string;
  location?: string;
  isRegional: boolean;
  createdAt: { seconds: number };
}

const BUILT_IN_LANGUAGES = Array.from(new Map(
  NIGERIAN_LANGUAGES.flatMap(region =>
    region.languages.map(language => [
      language.id,
      {
        id: language.id,
        name: language.name,
        location: region.name,
        isRegional: false,
        createdAt: { seconds: 0 },
      },
    ] as const)
  )
).values()).sort((a, b) => a.name.localeCompare(b.name)) as RepositoryLanguage[];

export default function AdminRepository({ onSelectLanguage }: { onSelectLanguage: (name: string) => void }) {
  const [languages, setLanguages] = useState<RepositoryLanguage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fallbackTimer = window.setTimeout(() => {
      setLanguages(current => current.length > 0 ? current : BUILT_IN_LANGUAGES);
      setLoading(false);
    }, 1500);
    const q = query(collection(db, 'languages'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveLanguages: RepositoryLanguage[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: typeof data.name === 'string' ? data.name : doc.id,
          location: typeof data.location === 'string' ? data.location : undefined,
          isRegional: data.isRegional === true,
          createdAt: data.createdAt && typeof data.createdAt.seconds === 'number'
            ? { seconds: data.createdAt.seconds }
            : { seconds: 0 },
        };
      });
      const liveNames = new Set(liveLanguages.map(language => String(language.name).toLowerCase()));
      setLanguages([
        ...liveLanguages,
        ...BUILT_IN_LANGUAGES.filter(language => !liveNames.has(language.name.toLowerCase())),
      ]);
      setLoading(false);
      window.clearTimeout(fallbackTimer);
    }, (error) => {
      console.warn('[AdminRepository] Using built-in language registry:', error);
      setLanguages(BUILT_IN_LANGUAGES);
      setLoading(false);
      window.clearTimeout(fallbackTimer);
    });
    return () => {
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  const filtered = languages.filter(l =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.location || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="black-ai-surface max-w-5xl mx-auto px-6 sm:px-12 py-10 sm:py-16 rounded-3xl">
      <header className="mb-12">
        <h2 className="text-4xl font-serif text-white mb-4">Linguistic Repository</h2>
        <p className="text-white/60">Access and manage all materials gathered by the crawler. Click on a language to view its full dossier.</p>
      </header>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A1A1A1]" />
        <input 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by language or region..."
          className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00ff88]"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#5A5A40]">Loading repository...</div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((lang) => (
            <motion.button
              key={lang.id}
              whileHover={{ x: 10 }}
              onClick={() => onSelectLanguage(lang.name)}
              className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl text-left hover:border-[#00ff88]/50 transition-colors group shadow-lg shadow-black/20 hover:shadow-[#00ff88]/10"
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-[#00ff88]/10 flex items-center justify-center text-[#00ff88] group-hover:bg-[#00ff88] group-hover:text-black transition-colors">
                  {lang.isRegional ? <Database className="w-6 h-6" /> : <Globe className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-bold text-white flex items-center gap-2">
                    {lang.name}
                    {lang.isRegional && <span className="text-[8px] px-2 py-0.5 bg-[#00ff88] text-black rounded-full uppercase tracking-tighter">Regional</span>}
                  </h4>
                  <div className="flex items-center gap-4 text-xs text-white/40 mt-1">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {lang.location || 'Nigeria'}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Supported language</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#00ff88] transition-colors" />
            </motion.button>
          ))}
          {filtered.length === 0 && (
            <div className="p-20 text-center border-2 border-dashed border-white/10 rounded-[40px] text-white/40">
              No matching records found in the repository.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
