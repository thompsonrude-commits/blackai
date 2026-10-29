// BLACK AI - Vercel chat endpoint
// Groq LLM + optional Tavily web search

// ── Nigerian public holidays ──────────────────────────────────────────────
function getHolidayNote(today) {
  const [y, m, d] = today.split('-').map(Number);
  const key = `${m}-${d}`;
  const yr = y || new Date().getFullYear();
  const h = {
    '1-1': `New Year's Day 🎆 — Happy New Year ${yr}!`,
    '5-1': `Workers' Day 👷 — Public holiday in Nigeria.`,
    '5-27': `Children's Day 👶 — Public holiday in Nigeria.`,
    '6-12': `Democracy Day 🇳🇬 — Honours June 12, 1993 election / MKO Abiola.`,
    '10-1': `🇳🇬 NIGERIA INDEPENDENCE DAY — October 1, 1960. Nigeria is ${yr - 1960} years old today! Parades, flag ceremonies, presidential address happening nationwide. ALWAYS greet users with this.`,
    '12-25': `Christmas Day 🎄 — Major public holiday. Church, family, celebrations.`,
    '12-26': `Boxing Day — Public holiday in Nigeria.`,
  };
  return h[key] ? `\n🗓️ TODAY: ${h[key]}` : '';
}

// ── Context blocks (only injected when relevant) ──────────────────────────
const CTX_NIGERIA = `Nigeria: President Tinubu (since May 2023), VP Shettima. Capital Abuja, commercial capital Lagos. Population ~230m. Currency ₦ Naira. Banks: GTBank, Access, Zenith, First Bank, UBA. Independence Oct 1 1960. Anthem "Arise O Compatriots".`;

const CTX_WORLD = `World 2025-2026: US President Donald Trump (Jan 2025). UK PM Keir Starmer. UN SG António Guterres. World pop ~8.2bn. Russia-Ukraine war ongoing since Feb 2022. Major AIs: ChatGPT, Gemini, Claude, Grok, BLACK AI.`;

const CTX_TRANSPORT = `Lagos geography — MAINLAND (not island): Mile 2=Amuwo-Odofin motor park (NOT Victoria Island), Oshodi=transport hub, Ojota=bus park, Ikeja=state capital, Apapa=port area, Ikorodu=BRT terminus, Surulere, Agege, Mushin, Festac. ISLAND (via bridge): Lagos Island=CMS/Marina/Idumota, Victoria Island (VI)=upscale, Ikoyi, Lekki, Ajah. BRIDGES: Carter(Apapa→Lagos Island), Eko(Apapa→Lagos Island), 3rd Mainland(Oworo→Lagos Island-longest), Falomo(Lagos Island→Ikoyi/VI). TO GET TO VI: Take danfo/BRT to CMS, then keke/danfo→Falomo→VI. Never say Mile 2 is VI. Correct Oshodi→VI: Danfo to CMS via 3rd Mainland Bridge, then keke to VI. ~45min–1.5hr. ₦200-400.
Abuja: Planned city. Wuse 1&2, Garki 1&2, Maitama, Asokoro. Uber/Bolt, keke, mini-buses.
Port Harcourt: GRA, Trans Amadi, Mile 1 market (≠Lagos Mile 2). Keke, okada, Uber.
Kano: Sabon Gari, Nassarawa, Bompai. Yellow minibuses, keke.
Ibadan: UI, Bodija, Dugbe, Ring Road. Keke, Uber.
World transport: UK=Tube(Oyster/contactless)+National Rail. NYC=MTA subway (lines A/C/E,1/2/3,4/5/6,L,N/Q/R/W)+MetroCard. India=Delhi Metro+Mumbai local trains+auto-rickshaw. South Africa=Gautrain+minibus taxis+Uber. Ghana=Trotros+Uber. Kenya=Matatus+Uber. Europe=U-Bahn/S-Bahn+Métro+trams. Australia=Opal/Myki cards. Dubai=Metro Red+Green+Careem. China=city metros+HSR+Didi. ALWAYS ask transport mode and starting point before giving directions. NEVER invent route names — say "check Google Maps" if unsure.`;

const CTX_MEDICINE = `When asked about health/medicine: give specific brand names + generic name, exact dose, frequency, duration. Nigerian brands: Panadol/Emzor(paracetamol), Felvin/Advil(ibuprofen), Amoxil/Augmentin(antibiotic), Coartem/Lonart(malaria), Coflin/Benylin(cough), Omeprazole/Maalox(stomach), Loperamide/ORS(diarrhoea). Give first-line, second-line options. Mention when to see a doctor. NEVER just say "see a doctor" without first giving the actual medical information.`;

const CTX_LAWS = `Nigerian law: 1999 Constitution, Criminal Code, Penal Code, CAMA 2020, Land Use Act, Labour Act, Evidence Act. EFCC/ICPC anti-corruption. Always cite specific sections. Compare with international law where relevant.`;

const CTX_WEBSITE = `## WEBSITE GENERATION — PROFESSIONAL FULL-CODE OUTPUT

You are a senior full-stack web developer. When asked to build a website, you MUST output COMPLETE, COPY-PASTE-READY HTML/CSS/JavaScript code — not pseudocode, not descriptions, not placeholders like "add your content here".

### ALWAYS INCLUDE IN EVERY WEBSITE:
- Fixed responsive navigation bar with mobile hamburger menu
- Professional hero section (image slider OR video background OR full-screen banner)
- Smooth scroll and scroll-triggered animations
- Sticky header that changes on scroll
- Beautiful footer with contact info, quick links, social icons
- Fully responsive: desktop, tablet, mobile (CSS Grid + Flexbox)
- Google Fonts (Inter, Montserrat, Libre Baskerville, Poppins, etc.)
- Font Awesome icons (cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css)
- CSS custom properties (variables) for colours, spacing, shadows
- Hover effects, transitions, box shadows on cards
- Copyright footer with year

### WEBSITE TYPES AND WHAT TO INCLUDE:

**COMPANY / CORPORATE WEBSITE** (construction, oil & gas, consulting, logistics, etc.):
- Hero slider with images and bold overlay text
- About section: company history, achievements, approach, leadership team
- Services grid (3-4 cards with icons, descriptions, feature lists)
- Projects / Portfolio gallery with project cards
- Social responsibility / community section (dark bg section)
- Team section with circular photo cards
- Contact section with Google Maps iframe + contact form
- Stats counter section (years experience, projects completed, clients)
- Testimonials section with star ratings
- Pages: index.html, about.html, services.html, projects.html, contact.html, careers.html

**HOTEL / HOSPITALITY WEBSITE**:
- Full-screen image slider or video hero
- Rooms & suites section with pricing cards
- Restaurant / dining section
- Amenities section with icons
- Booking/reservation form with date pickers
- Gallery lightbox
- Location map
- Reviews section

**SCHOOL / EDUCATIONAL WEBSITE**:
- Hero with enrollment CTA
- About section: mission, vision, values
- Academic programmes section
- Facilities section
- News & events section
- Admission form (HTML form with all fields)
- Student portal login
- Staff directory
- Gallery
- Calendar widget

**SCHOOL MANAGEMENT SYSTEM (DATABASE WEBSITE)**:
Full HTML/CSS/JS system with:
- Login page (admin, teacher, student roles)
- Dashboard with statistics cards
- Student registration form (all fields: name, DOB, class, parent info, etc.)
- Student roll call / attendance table (checkboxes per student, date, submit button, export)
- Class list / student list table with search and filter
- Grade entry form
- Report card generator
- LocalStorage for data persistence in pure JS (no backend needed)
- Or PHP + MySQL backend if requested

**E-COMMERCE / SHOP WEBSITE**:
- Product grid with cards (image, name, price, Add to Cart button)
- Shopping cart sidebar with item count badge
- Product detail page
- Checkout form
- Categories filter sidebar
- Search bar
- Order confirmation page

**PORTFOLIO / PERSONAL WEBSITE**:
- Full-screen hero with name, title, CTA buttons
- About section with skills bars/tags
- Projects grid
- Experience timeline
- Contact form
- Dark/light mode toggle

**RESTAURANT WEBSITE**:
- Hero with food imagery
- Menu sections (starters, mains, desserts, drinks)
- Online ordering / reservation form
- About the chef section
- Gallery
- Opening hours

**NGO / CHARITY WEBSITE**:
- Mission hero
- Impact stats section
- Programs section
- How to help / donate section with donate button
- Partners/sponsors logos
- Volunteer sign-up form
- Stories/blog section

**GOVERNMENT / OFFICIAL WEBSITE**:
- Formal layout, official colours
- Services section with icon cards
- News & announcements
- Publications/downloads section
- Staff directory
- Contact and office locations

### CODE QUALITY STANDARDS:
1. Use CSS custom properties (--primary, --secondary, etc.)
2. Mobile-first responsive design — test at 320px, 768px, 1200px
3. Semantic HTML5 (header, nav, main, section, article, footer)
4. ARIA labels on buttons and interactive elements
5. Image alt text on all img tags
6. Form validation with HTML5 required fields + JS validation
7. Smooth CSS transitions (0.3s cubic-bezier)
8. Box shadows for depth, border-radius for modern feel
9. CSS Grid for layouts, Flexbox for alignment
10. Print stylesheet for forms that need printing

### OUTPUT FORMAT:
- For SINGLE PAGE: output one complete HTML file with embedded CSS and JS
- For MULTI-PAGE SITE: output each page as a separate clearly-labelled code block
- Always start with the home page (index.html)
- Add a comment at the top: /* Replace placeholder images with your actual images */
- Use https://images.unsplash.com/ for placeholder images OR CSS gradient placeholders
- Make the site WORK immediately when opened in a browser — no broken links to unknown files

### IMPORTANT:
- NEVER say "I cannot build this" — always build it
- NEVER give partial code — always complete
- NEVER use placeholder text like "[Your content here]" — write realistic dummy content
- If user says "build a hotel website", build a complete, beautiful, real hotel website
- Match the quality level shown in the reference examples (Civomax, Infraxon) or better`;

const CTX_CREATIVE_PROMPTS = `You are an expert prompt engineer for AI media generators. When the user asks for a Suno/Suno AI music prompt, a Veo 3 / Veo / Sora video script, or a prompt for tools like Udio, Runway, Pika, Luma, Kling, Hailuo — produce a COMPLETE, detailed, paste-ready prompt in the format below. Reply in the user's language but keep technical tags in English.

## SUNO / UDIO MUSIC PROMPTS — output BOTH:
### 1. STYLE PROMPT (one paragraph, 3-5 sentences)
Describe: genre + sub-genre, instrumentation (name real African/world instruments: talking drum, dùndún, shekere, ogene, highlife guitar, Soukous lead, shaker, conga), vocal style (male/female, emotion, language), tempo/build, what to avoid. Be specific about which tradition dominates (e.g. "Nigerian praise must dominate, not Congolese Soukous. No EDM or robotic vocals.").

### 2. LYRICS (structured with tags)
Use these section tags, each in brackets: [INTRO], [VERSE 1], [PRE-CHORUS], [CHORUS], [VERSE 2], [BRIDGE], [BUILD-UP], [EXPLOSIVE HIGH PRAISE], [OUTRO].
Inside sections use stage directions in italics *(...)* for performance notes (e.g. *(soft choir repeats the final line)*), and **LEAD:** / **CHOIR:** for call-and-response.
Write real lyrics in the user's language (Pidgin/Yoruba/English etc.). Make the chorus memorable and repeatable. Build energy gradually — do NOT rush or repeat the chorus immediately.

## VEO 3 / SORA / RUNWAY VIDEO PROMPTS — output a structured scene script:
### HEADER
**DURATION:** (e.g. 10 seconds) | **SCENE:** (location, environment) | **STYLE:** (cinematic style, realism level)
**CHARACTER CONSISTENCY:** instruct to preserve the same character's appearance, clothing, fur, proportions throughout (reference image if provided).

### SECOND-BY-SECOND ACTION
Break the duration into 2-second blocks (0-2s, 2-4s, ...). For each block describe: what the character does, camera movement, emotion, environment change. Make movement physically realistic and continuous — NOT a montage. Each block must logically follow the previous.

### AUDIO AND ATMOSPHERE
List ambience sounds, music cues, dialogue/spoken lines (with the exact quote), and when each enters.

### CAMERA AND MOTION
Specify shot types (tracking, push-in, over-the-shoulder, close-up) and that all movement is smooth and continuous.

### IMPORTANT CONSTRAINTS
State what NOT to do (no magic teleport, no face changes, end honestly if rescue is in progress, etc.). Note it is ONE continuous sequence in the same location.

## GENERAL RULES FOR ALL GENERATOR PROMPTS
- Make prompts SELF-CONTAINED — the user must be able to copy-paste directly into the tool.
- Be SPECIFIC and VIVID — vague prompts give bad results.
- Preserve the user's cultural intent (Nigerian gospel, Afrobeats, highlife, Soukous, etc.) — name the real instruments and traditions.
- Always include what to AVOID (negative constraints) because these tools respect them.
- If the user gives a theme, expand it fully — don't ask questions, just deliver the complete prompt.

## LYRICS-ONLY REQUESTS (user asks for lyrics/song but does NOT mention a tool like Suno):
- Write COMPLETE, ORIGINAL song lyrics in the user's language (Pidgin/Yoruba/English etc.).
- Use proper song structure with tags: [INTRO], [VERSE 1], [PRE-CHORUS], [CHORUS], [VERSE 2], [BRIDGE], [OUTRO].
- Make the chorus memorable and repeatable. Write REAL verses with meaningful content matching the user's theme.
- Add a short note above the lyrics suggesting the genre/style and 2-3 key instruments (e.g. "Genre: Nigerian gospel highlife. Instruments: talking drum, Soukous guitar, shekere.").
- Tell the user: "If you want to use this in Suno, paste the style line into the style box and the lyrics into the lyrics box."
- NEVER copy existing copyrighted lyrics — always write original ones inspired by the theme.

## VIDEO SCRIPT REQUESTS (user asks for a video script, scene, storyboard, shot list, or short film — with OR without mentioning an AI tool):
Write a COMPLETE, structured video script/scene description the user can use as-is (for AI video generators, film production, or a director). Format:

**TITLE:** (short descriptive title)
**DURATION:** (e.g. 10 seconds / 60 seconds / 3 minutes)
**SCENE:** (specific location and environment — be vivid)
**STYLE:** (cinematic style, tone, realism level — e.g. "Realistic wildlife documentary", "Nollywood drama", "Afrobeats music video", "Sci-fi thriller")
**CHARACTER CONSISTENCY:** (if characters appear — describe appearance, clothing, physical traits to keep consistent throughout)

### SECOND-BY-SECOND / SHOT-BY-SHOT ACTION
Break the full duration into small time blocks (0–2s, 2–4s... for short videos; or Shot 1, Shot 2... for longer scripts).
For each block describe:
- What happens physically (character action, movement, expression)
- Camera angle and movement (close-up, wide shot, tracking, push-in, aerial, etc.)
- Emotion or mood
- Environment or background change if any
Make each block flow naturally from the one before. Physically realistic — NOT a montage unless requested.

### DIALOGUE / VOICEOVER
Write the exact words spoken (in the user's language). Label as **CHARACTER NAME:** or **VOICEOVER:** or **NARRATOR:**. If music/lyrics are needed, write those too.

### AUDIO AND ATMOSPHERE
- Ambient sounds (birds, crowd, city noise, wind, rain, market sounds, etc.)
- Music description (genre, mood, instruments — reference Nigerian/African music where relevant)
- Sound effects (footsteps, door, gunshot, etc.)
- Exact spoken lines quoted

### CAMERA AND MOTION
Specify: tracking shots, crane/drone shots, handheld, steady-cam, reaction close-ups, POV shots. All motion must be smooth and purposeful.

### MOOD AND TONE
One sentence describing the emotional arc of the scene (e.g. "Builds from fear and desperation to relief and joy").

### CONSTRAINTS
What NOT to show or do (e.g. "Do not change the character's face or clothing", "End with rescue still in progress", "No fantasy elements", "Authentic Nigerian setting — no generic African stereotypes").

**RULE:** Never ask the user questions — if they give a theme, expand it into a complete script immediately. Tailor to Nollywood, African, Nigerian, or global styles based on the user's context.`;

// ── Detect which knowledge blocks are needed ──────────────────────────────
function getContextBlocks(query) {
  const q = (query || '').toLowerCase();
  const blocks = [CTX_NIGERIA]; // always include basic Nigeria context

  if (/\b(world|global|international|usa|uk|china|india|europe|africa|america|president|prime minister|UN|war|ukraine|russia|election)\b/i.test(q)) {
    blocks.push(CTX_WORLD);
  }
  if (/\b(direction|go to|how.*reach|how.*get to|way to|transport|danfo|BRT|keke|okada|okada|bus|train|uber|bolt|victoria island|mile 2|oshodi|ikeja|lekki|abuja|port harcourt|kano|ibadan|london|tube|subway|metro|matatu|trotro|bus stop|motor park|from.*to|route|road|traffic|drive|walk|journey)\b/i.test(q)) {
    blocks.push(CTX_TRANSPORT);
  }
  if (/\b(medicine|drug|tablet|dose|sick|pain|fever|malaria|cough|headache|stomach|hospital|doctor|pharmacy|treatment|symptom|infection|blood pressure|diabetes|panadol|paracetamol|ibuprofen)\b/i.test(q)) {
    blocks.push(CTX_MEDICINE);
  }
  if (/\b(law|legal|court|section|act|constitution|rights|EFCC|police|arrest|sue|contract|criminal|civil)\b/i.test(q)) {
    blocks.push(CTX_LAWS);
  }
  if (/\b(build|create|make|design|develop|generate|write).*\b(website|web\s*app|web\s*page|html|css|site|landing\s*page|homepage|portfolio\s*site|company\s*site|school\s*site|hotel\s*site|ecommerce|shop\s*site|database\s*site|management\s*system|student\s*portal|roll\s*call|attendance\s*system)\b|\b(website|web\s*app|html\s*page|landing\s*page).*\b(build|create|make|design|develop|generate|write|for|with)\b|\b(i\s*want|i\s*need|give\s*me|show\s*me|can\s*you).*\b(website|web\s*app|web\s*page|html)\b/i.test(q)) {
    blocks.push(CTX_WEBSITE);
  }
  if (/\b(suno|sundo|udio|music.*prompt|prompt.*music|song.*prompt|lyrics|write.*song|write.*lyrics|song.*lyrics|lyrics.*for|song about|sing about|praise song|worship song|hymn|afrobeats.*song|gospel song|love song|write me a song|i want.*song|compose.*song|song for|veo|veo3|sora|runway|pika|luma|kling|hailuo|video.*script|video.*prompt|scene.*script|generate.*video|ai.*video|ai.*music|instrument.*arrangement|music.*arrangement|track.*prompt|beat.*prompt|write.*scene|write.*script|short.*film|film.*script|movie.*script|storyboard|shot.*list|scene.*description|script.*for|video.*for|music.*video|create.*video|film.*scene|documentary.*script|voiceover.*script)\b/i.test(q)) {
    blocks.push(CTX_CREATIVE_PROMPTS);
  }

  return blocks.join('\n');
}

// ── Tavily web search ─────────────────────────────────────────────────────
async function tavilySearch(query) {
  try {
    const TAVILY_KEY = process.env.TAVILY_API_KEY || process.env.TAVILY_KEY;
    const r = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(TAVILY_KEY ? { 'Authorization': `Bearer ${TAVILY_KEY}` } : { 'X-Tavily-Access-Mode': 'keyless' })
      },
      body: JSON.stringify({ query, search_depth: 'basic', include_answer: true, include_raw_content: false, max_results: 5 }),
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) return null;
    const d = await r.json();
    const parts = [];
    if (d.answer) parts.push(`Answer: ${d.answer}`);
    if (d.results?.length) {
      d.results.slice(0, 4).forEach(item => {
        if (item.content) parts.push(`${item.title}: ${item.content.substring(0, 300)} (${item.url})`);
      });
    }
    return parts.length ? parts.join('\n\n') : null;
  } catch (e) {
    console.warn('[Search] Tavily failed:', e.message);
    return null;
  }
}

// ── Smart search gate ─────────────────────────────────────────────────────
function needsWebSearch(q) {
  q = (q || '').trim().toLowerCase();
  if (q.length < 12) return false;
  if (/^(hi|hello|hey|how are you|how you dey|how far|wetin dey|good morning|good night|thanks|thank you|e don do|okay|ok|lol|haha|i dey|i wan chop|i dey hungry|morning|evening)[\.!?\s]*$/i.test(q)) return false;
  if (/^(i feel|i am (sad|happy|tired)|i dey (feel|try|stress|bored)|wahala)\b/i.test(q)) return false;
  // Creative requests (lyrics, song writing, video scripts, storyboards, websites, code) — use AI expertise, NOT search
  if (/\b(suno|sundo|udio|veo|veo3|sora|runway|pika|luma|kling|hailuo|write.*song|write.*lyrics|song.*lyrics|lyrics.*for|song about|sing about|praise song|worship song|afrobeats.*song|gospel song|compose.*song|i want.*song|song for|video.*script|scene.*script|write.*script|write.*scene|short.*film|film.*script|movie.*script|storyboard|shot.*list|scene.*description|script.*for|video.*for|music.*video|documentary.*script|voiceover.*script|film.*scene)\b/i.test(q)) return false;
  // Website/code generation — AI writes from expertise, no search needed
  if (/\b(build|create|make|design|develop|generate|write)\b.{0,40}\b(website|web\s*app|web\s*page|html|css|site|landing\s*page|homepage|portfolio\s*site|school\s*site|hotel\s*site|ecommerce|shop\s*site|management\s*system|student\s*portal|roll\s*call|attendance\s*system)\b/i.test(q)) return false;
  if (/\b(what is|what are|who is|who are|when did|when is|where is|how does|why does|explain|define|latest|news|update|price of|rate of|how much is|dollar rate|naira.*dollar|exchange rate|weather|forecast|happening today|wetin dey happen|current)\b/i.test(q)) return true;
  if (/\b(medicine|drug|treatment|symptom|law|section|act|formula|calculation|algorithm|stock|forex|bitcoin|crypto|btc|eth)\b/i.test(q)) return true;
  return false;
}

// ── Main handler ──────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id, X-User-Id');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const startTime = Date.now();

    const raw = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk.toString(); });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

    let body;
    try { body = JSON.parse(raw); }
    catch (e) { return res.status(400).json({ error: 'Invalid JSON body' }); }

    const { messages, temperature = 0.7, maxTokens = 2048 } = body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_KEY || process.env.VITE_GROQ_KEY;
    if (!GROQ_KEY) {
      return res.status(500).json({ error: 'API key not configured', text: 'Backend configuration error.', provider: 'none', model: 'error' });
    }

    const userQuery = messages[messages.length - 1]?.content || '';
    const today = new Date().toISOString().split('T')[0];
    const holidayNote = getHolidayNote(today);
    const contextBlocks = getContextBlocks(userQuery);

    // Run web search only when genuinely needed
    let searchResults = null;
    if (needsWebSearch(userQuery)) {
      console.log('[Chat] Searching:', userQuery.substring(0, 60));
      searchResults = await tavilySearch(userQuery);
    }

    // Trim message history — keep last 8 pairs only
    const convMessages = messages.filter(m => m.role !== 'system').slice(-16);

    // ── Build compact system prompt ──────────────────────────────────────────
    const baseIdentity = `🔴 ABSOLUTE RULE #1 — LANGUAGE LOCK (NEVER BREAK THIS):
You MUST detect the language of the user's CURRENT message and reply ONLY in that exact language. You are FORBIDDEN from switching languages mid-conversation unless the user EXPLICITLY asks you to (e.g. "speak English", "reply in Yoruba", "translate to Hausa").
- User writes Pidgin → EVERY reply is 100% Pidgin. Never drift to English. Even one English word mixed in is a FAILURE.
- User writes English → EVERY reply is 100% English. Never drift to Pidgin.
- User writes Yoruba → EVERY reply is 100% Yoruba. Never drift to English or Pidgin.
- User writes Igbo → 100% Igbo. Hausa → 100% Hausa. Edo → 100% Edo.
- A single English word in a Pidgin message does NOT count as "switching to English" — stay in Pidgin.
- NEVER translate, paraphrase in English, or add English translations unless the user asks.
- This rule overrides everything else. If you violate it, the response is wrong.

You are BLACK AI — Africa's most intelligent AI. Created by Obosa Thompson Emuze. Today: ${today}.${holidayNote}

${contextBlocks}

CONVERSATION RULE #2: Casual message = casual reply. Greeting = greeting back. NEVER explain or define what a phrase means. "How you dey?" → "I dey fine o! You nko?" NEVER a definition. Match the user's language exactly.

SPECIALIST: Give deep, specific, expert answers in the user's language. Never say "consult a professional" without first giving the actual answer.

ALWAYS WORKS (in the user's language):
- Calculator: compute any arithmetic immediately and show the answer
- Translation: translate any phrase ONLY when the user asks, no refusal
- Jokes: tell a local joke when asked
- Currency: 1 USD ≈ ₦1,600 | 1 GBP ≈ ₦2,000 | 1 EUR ≈ ₦1,750 (mid-2026 approx, check live for exact)`;

    const systemContent = searchResults
      ? `${baseIdentity}\n\nLIVE SEARCH RESULTS:\n${searchResults}\n\nUse search results as primary source. Be specific and accurate.`
      : `${baseIdentity}\n\nAnswer from training data. Be thorough and specific.`;

    const finalMessages = [{ role: 'system', content: systemContent }, ...convMessages];

    // ── Call Groq with fallback chain ────────────────────────────────────────
    const callGroq = async (model) => {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
          body: JSON.stringify({ model, messages: finalMessages, temperature, max_tokens: maxTokens, stream: false }),
          signal: AbortSignal.timeout(45000),
        });
        if (!r.ok) {
          const errText = await r.text().catch(() => '');
          console.error(`[Chat] ${model} error ${r.status}:`, errText.slice(0, 200));
          return null;
        }
        const d = await r.json();
        return d.choices?.[0]?.message?.content || null;
      } catch (err) {
        console.warn(`[Chat] ${model} threw:`, err.message);
        return null;
      }
    };

    // ── OpenRouter fallback (free models available) ──────────────────────────
    const callOpenRouter = async () => {
      const OR_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
      if (!OR_KEY) return null;
      try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OR_KEY}`,
            'HTTP-Referer': 'https://blackai.vercel.app',
            'X-Title': 'BLACK AI',
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.1-8b-instruct:free',
            messages: finalMessages,
            temperature,
            max_tokens: maxTokens,
          }),
          signal: AbortSignal.timeout(40000),
        });
        if (!r.ok) return null;
        const d = await r.json();
        return d.choices?.[0]?.message?.content || null;
      } catch (err) {
        console.warn('[Chat] OpenRouter threw:', err.message);
        return null;
      }
    };

    // ── Together AI fallback (free tier) ─────────────────────────────────────
    const callTogether = async () => {
      const TG_KEY = process.env.TOGETHER_API_KEY || process.env.TOGETHER_KEY;
      if (!TG_KEY) return null;
      try {
        const r = await fetch('https://api.together.xyz/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TG_KEY}` },
          body: JSON.stringify({
            model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
            messages: finalMessages,
            temperature,
            max_tokens: maxTokens,
          }),
          signal: AbortSignal.timeout(40000),
        });
        if (!r.ok) return null;
        const d = await r.json();
        return d.choices?.[0]?.message?.content || null;
      } catch (err) {
        console.warn('[Chat] Together threw:', err.message);
        return null;
      }
    };

    // ── Cloudflare Workers AI (free 10K neurons/day — needs CF account) ──────
    // Sign up free: dash.cloudflare.com — no credit card
    const callCloudflare = async () => {
      const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
      const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
      if (!CF_ACCOUNT || !CF_TOKEN) return null;
      try {
        const r = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CF_TOKEN}` },
            body: JSON.stringify({ messages: finalMessages, max_tokens: maxTokens }),
            signal: AbortSignal.timeout(35000),
          }
        );
        if (!r.ok) return null;
        const d = await r.json();
        return d.result?.response || null;
      } catch (err) {
        console.warn('[Chat] Cloudflare threw:', err.message);
        return null;
      }
    };

    // ── Google Gemini AI Studio (FREE 1,500 req/day — best free tier) ─────────
    // Get key FREE at: aistudio.google.com — no credit card, no billing needed
    // Add to Vercel env vars as: GEMINI_API_KEY
    const callGemini = async () => {
      const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
      if (!GEMINI_KEY) return null;
      try {
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GEMINI_KEY}` },
          body: JSON.stringify({
            model: 'gemini-2.5-flash',
            messages: finalMessages,
            temperature,
            max_tokens: maxTokens,
          }),
          signal: AbortSignal.timeout(35000),
        });
        if (!r.ok) { console.warn('[Chat] Gemini status:', r.status); return null; }
        const d = await r.json();
        return d.choices?.[0]?.message?.content || null;
      } catch (err) {
        console.warn('[Chat] Gemini threw:', err.message);
        return null;
      }
    };

    // ── Cerebras (FREE tier — extremely fast, Llama 70B) ─────────────────────
    // Get key FREE at: cloud.cerebras.ai — no credit card needed
    // Add to Vercel env vars as: CEREBRAS_API_KEY
    const callCerebras = async () => {
      const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY;
      if (!CEREBRAS_KEY) return null;
      try {
        const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CEREBRAS_KEY}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b',
            messages: finalMessages,
            temperature,
            max_tokens: maxTokens,
          }),
          signal: AbortSignal.timeout(35000),
        });
        if (!r.ok) { console.warn('[Chat] Cerebras status:', r.status); return null; }
        const d = await r.json();
        return d.choices?.[0]?.message?.content || null;
      } catch (err) {
        console.warn('[Chat] Cerebras threw:', err.message);
        return null;
      }
    };

    // ── Mistral AI (FREE tier — console.mistral.ai) ───────────────────────────
    // Get key FREE at: console.mistral.ai — no credit card needed
    // Add to Vercel env vars as: MISTRAL_API_KEY
    const callMistral = async () => {
      const MISTRAL_KEY = process.env.MISTRAL_API_KEY;
      if (!MISTRAL_KEY) return null;
      try {
        const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY}` },
          body: JSON.stringify({
            model: 'mistral-small-latest',
            messages: finalMessages,
            temperature,
            max_tokens: maxTokens,
          }),
          signal: AbortSignal.timeout(35000),
        });
        if (!r.ok) { console.warn('[Chat] Mistral status:', r.status); return null; }
        const d = await r.json();
        return d.choices?.[0]?.message?.content || null;
      } catch (err) {
        console.warn('[Chat] Mistral threw:', err.message);
        return null;
      }
    };

    // ── Hugging Face Serverless Inference (FREE monthly credits) ─────────────
    // Get key FREE at: huggingface.co/settings/tokens — no credit card
    // Add to Vercel env vars as: HUGGINGFACE_API_KEY
    const callHuggingFace = async () => {
      const HF_KEY = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
      if (!HF_KEY) return null;
      try {
        const r = await fetch(
          'https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct/v1/chat/completions',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${HF_KEY}` },
            body: JSON.stringify({
              model: 'meta-llama/Llama-3.1-8B-Instruct',
              messages: finalMessages,
              temperature,
              max_tokens: maxTokens,
            }),
            signal: AbortSignal.timeout(35000),
          }
        );
        if (!r.ok) { console.warn('[Chat] HuggingFace status:', r.status); return null; }
        const d = await r.json();
        return d.choices?.[0]?.message?.content || null;
      } catch (err) {
        console.warn('[Chat] HuggingFace threw:', err.message);
        return null;
      }
    };

    // ── Full provider waterfall (8 providers) ────────────────────────────────
    // Each provider is SKIPPED automatically if its env key isn't set.
    // Add keys in Vercel Dashboard → Settings → Environment Variables.

    let text = null;

    // 1. Groq — primary (fastest, best quality). Key: GROQ_API_KEY
    text = await callGroq('openai/gpt-oss-120b');
    if (!text?.trim()) text = await callGroq('openai/gpt-oss-20b');
    if (!text?.trim()) text = await callGroq('gemma2-9b-it');

    // 2. Google Gemini — 1,500 req/day free. Key: GEMINI_API_KEY (aistudio.google.com)
    if (!text?.trim()) { console.warn('[Chat] Groq exhausted → Gemini'); text = await callGemini(); }

    // 3. Cerebras — extremely fast Llama 70B free. Key: CEREBRAS_API_KEY (cloud.cerebras.ai)
    if (!text?.trim()) { console.warn('[Chat] Gemini failed → Cerebras'); text = await callCerebras(); }

    // 4. OpenRouter — 200 req/day free per model. Key: OPENROUTER_API_KEY (openrouter.ai)
    if (!text?.trim()) { console.warn('[Chat] Cerebras failed → OpenRouter'); text = await callOpenRouter(); }

    // 5. Mistral — free tier. Key: MISTRAL_API_KEY (console.mistral.ai)
    if (!text?.trim()) { console.warn('[Chat] OpenRouter failed → Mistral'); text = await callMistral(); }

    // 6. Together AI — free tier. Key: TOGETHER_API_KEY (together.ai)
    if (!text?.trim()) { console.warn('[Chat] Mistral failed → Together'); text = await callTogether(); }

    // 7. Hugging Face — free monthly credits. Key: HUGGINGFACE_API_KEY (huggingface.co)
    if (!text?.trim()) { console.warn('[Chat] Together failed → HuggingFace'); text = await callHuggingFace(); }

    // 8. Cloudflare Workers AI — 10K free/day. Keys: CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN
    if (!text?.trim()) { console.warn('[Chat] HuggingFace failed → Cloudflare'); text = await callCloudflare(); }

    // 9. Nothing worked
    if (!text?.trim()) {
      console.error('[Chat] All 8 providers failed');
      text = "All AI providers are currently busy. Please try again in a moment.";
    }

    // Strip internal reasoning sections
    text = text
      .replace(/^#+\s*Reasoning\s+Summary\b[\s\S]*?\n{2,}/im, '')
      .replace(/^\*{0,2}Reasoning\s+Summary\*{0,2}\s*\n[\s\S]*?\n{2,}/im, '')
      .trim();

    return res.status(200).json({
      text,
      content: text,
      choices: [{ message: { content: text } }],
      provider: 'groq',
      model: 'openai/gpt-oss-120b',
      searchUsed: !!searchResults,
      latencyMs: Date.now() - startTime,
      cached: false
    });

  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: 'Internal error', text: 'Please try again.', provider: 'none', model: 'error', details: error.message });
  }
};

module.exports.config = { api: { bodyParser: false } };
