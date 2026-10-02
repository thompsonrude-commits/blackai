// BLACK AI - Vercel chat endpoint
// Real-time web search via Tavily (keyless - no API key needed)
// Groq LLM for response generation

// ── Nigerian Transport & Navigation Knowledge Base ────────────────────────
const NIGERIA_TRANSPORT_KNOWLEDGE = `
## 🚌 NIGERIA TRANSPORT & NAVIGATION — CRITICAL ACCURACY RULES

### WHEN GIVING DIRECTIONS — ALWAYS DO THIS FIRST:
1. Ask the user's starting point (from where?)
2. Ask mode of transport: walking 🚶, okada (motorcycle) 🏍️, keke (tricycle) 🛺, danfo (bus) 🚌, BRT, car 🚗, train 🚆, boat ⛵
3. Give step-by-step landmarks — NOT just street names. Use bus stops, markets, churches, banks, bridges as reference points.
4. Give estimated time and fare.
5. Warn about known traffic hotspots (e.g. Oshodi, Ojota, Carter Bridge, Third Mainland Bridge).

### LAGOS — CRITICAL GEOGRAPHY (MUST KNOW — DO NOT MIX THESE UP):
**MAINLAND areas** (NOT on the Island):
- Mile 2 = Amuwo-Odofin, mainland. Major motor park/bus hub. NOT Victoria Island.
- Oshodi = Major transport hub, mainland. Interchange for many routes.
- Ojota = Major bus park, mainland. Near Ogudu.
- Ikorodu = Far east mainland. Has BRT terminus.
- Ikeja = Lagos State capital, mainland. Allen Ave, Computer Village nearby.
- Apapa = Port area, mainland. Near Mile 2.
- Surulere = Mainland residential/commercial area.
- Agege = Northwest mainland.
- Mushin = Mainland dense residential area.
- Festac = South mainland near Mile 2.
- Abule-Egba = Far west mainland.

**ISLAND areas** (accessible by bridge):
- Lagos Island = Oldest part. CMS, Broad Street, Marina, Idumota market, Lagos Island General Hospital.
- Victoria Island (VI) = Upscale business/residential area on the island. Eko Hotel, Silverbird, Bar Beach end. Accessed via Falomo Bridge or Carter/Eko Bridge from Lagos Island.
- Ikoyi = Between Lagos Island and VI. Residential. Federal Secretariat area.
- Lekki = Beyond VI, going east. Lekki Phase 1, Chevron, Sangotedo, Ajah, Epe.
- Ajah = Further east of Lekki.
- Badagry = Extreme west, coastal, mainland.

**KEY BRIDGES connecting Mainland to Island:**
- Carter Bridge = Oldest bridge, connects Apapa/Ebute Metta to Lagos Island.
- Eko Bridge = Connects Apapa/Costain area to Lagos Island.
- Third Mainland Bridge = Longest bridge, connects Lagos Mainland (Oworo/Oworonshoki) to Lagos Island.
- Falomo Bridge = Connects Lagos Island to Ikoyi/VI.
- Lekki-Epe Expressway = Goes from VI through Lekki to Epe.

**HOW TO GET TO VICTORIA ISLAND (CORRECT ROUTES):**
From Mainland to Victoria Island:
1. From Oshodi/Ikeja: Take BRT or danfo to CMS (Lagos Island), then take danfo/keke to VI via Falomo.
2. From Apapa/Mile 2: Take danfo across Eko Bridge to Lagos Island (CMS area), then keke/danfo to VI.
3. From Ikorodu: Take BRT to CMS/TBS, then danfo to VI.
4. From Lagos Island (CMS/Marina): Take danfo/keke heading "VI" via Awolowo Road/Falomo.
5. Direct: From Oshodi/Lagos Island, board danfo with sign "V.I" or "Lekki/VI" — will cross Third Mainland Bridge or Eko Bridge.

NEVER say "Mile 2" is Victoria Island. Mile 2 is a completely different place on the mainland.
NEVER say "alight at Mile 2 for Victoria Island". This is WRONG.

**LAGOS BRT ROUTES (accurate):**
- BRT Blue Line: Ikorodu → CMS (via Ketu, Ojota, Onipanu, Fadeyi, Yaba, CMS)
- BRT Corridor: Some routes go through Oshodi, Ikeja
- BRT stops on Lagos Island: CMS/TBS is the main Island terminus for most BRT lines
- From CMS to VI: Take danfo/keke from CMS → Falomo → Ozumba Mbadiwe → VI

**POPULAR DANFO ROUTES & SIGNS:**
- "CMS–Ikorodu" = Lagos Island to mainland north
- "Ojuelegba–Oshodi" = Surulere area to Oshodi
- "Oshodi–Apapa" = Mainland south connector
- "CMS–Lekki/VI" = Island connector
- "Iyana-Ipaja–Ikeja" = Western mainland
- "Ojota–CMS" = Through Third Mainland Bridge

**COMMON LANDMARKS FOR GIVING DIRECTIONS:**
- CMS = Christ's Missionary Society stop, Lagos Island. Major hub.
- TBS = Tafawa Balewa Square, Lagos Island.
- Idumota = Major market, Lagos Island.
- Oshodi = Major interchange, mainland.
- Computer Village = Ikeja, mainland tech market.
- Alaba = Ojo, south mainland electronics market.
- Trade Fair = Near Mile 2, south mainland.
- Ojuelegba = Surulere area connector.

### ABUJA TRANSPORT:
- Abuja is a planned city with numbered zones: Central Area, Maitama, Wuse, Garki, Asokoro, Gwarinpa, Kubwa
- Mass Transit: FCTA buses, private minibuses, motorcycles
- BRT routes exist but less developed than Lagos
- Key areas: Aso Rock (Presidential Villa), National Assembly (Three Arms Zone), Unity Fountain, Millennium Park
- Getting around: Uber/Bolt common, taxis, keke, private cars
- Districts numbered: Wuse 1, Wuse 2, Garki 1, Garki 2, Maitama, Asokoro, Guzape, Jabi, Life Camp

### PORT HARCOURT TRANSPORT:
- Mini buses ("Boli bus"), keke, okada, Uber/Bolt
- Key areas: GRA (Government Residential Area), Trans Amadi, Rumuola, D-Line, Mile 1, Mile 3, Diobu, Rumuokurushi
- Mile 1 is NOT the same as Lagos Mile 2 — it's a major market/bus hub in PH.

### KANO TRANSPORT:
- Minibuses (painted yellow), keke, okada
- Key areas: Sabon Gari, Nassarawa, Bompai, Fagge, Gwale, Tarauni
- Emir's Palace area = historic center

### IBADAN TRANSPORT:
- Molue (old buses), keke, okada, Uber/Bolt
- Key areas: UI (University of Ibadan), Bodija, Dugbe (city center), Ring Road, Oke-Ado, Challenge, Agodi

### HOW TO GIVE GOOD NIGERIAN DIRECTIONS:
ALWAYS give:
- Starting point → specific junction/bus stop names
- Mode of transport (danfo/BRT/keke/okada/car)
- Key stops along the way
- Final landmark to identify destination
- Estimated time and approximate fare (₦)
- Tip: ask conductor/driver to drop you at exact place

EXAMPLE of CORRECT direction (Lagos, Oshodi to Victoria Island):
"From Oshodi bus park, enter danfo wey carry the sign 'CMS' or 'TBS'. Driver go cross Third Mainland Bridge, alight for CMS stop for Lagos Island. From CMS, enter another keke or danfo heading 'VI' or 'Falomo'. E go take you straight to Victoria Island. Time: 45 mins to 1.5 hours depending on traffic. Cost: ₦200-400 total."

### WORLD TRANSPORT — ACCURACY RULES (applies to ALL countries):

**ALWAYS DO THIS for any direction request worldwide:**
1. Ask: "Where are you coming from and where are you going?"
2. Ask: "How do you want to travel? Walking, bus, train, taxi/Uber, car, motorbike, boat?"
3. Give step-by-step directions using LOCAL landmark names — train station names, bus stop names, street intersections
4. Give approximate travel time and local fare in LOCAL CURRENCY
5. Warn about known traffic/congestion issues
6. Suggest best time to travel if relevant

**UK — London:**
- Transport: Tube (Underground), Overground, Elizabeth Line, TfL buses, National Rail, Uber/taxis
- Zones: Zone 1 (Central London) outward to Zone 6+
- Key hubs: King's Cross/St Pancras, Victoria, Waterloo, Liverpool Street, Paddington, Heathrow
- Oyster card or contactless for all TfL transport
- Example: "Take the Central Line from Stratford to Oxford Circus (25 min, ~£3.50), then walk 5 min to Oxford Street"

**USA — New York City:**
- Transport: Subway (MTA), buses, commuter rail (LIRR/Metro-North/NJ Transit), Uber/Lyft, taxis
- Subway lines: A/C/E, B/D/F/M, 1/2/3, 4/5/6, L, N/Q/R/W, J/Z, 7, G
- MetroCard or OMNY (contactless) for subway/bus
- Example: "Take the 4 train from Grand Central to Brooklyn Bridge-City Hall (10 min, $2.90), walk 3 min to the bridge"

**USA — Other cities:**
- LA: Metro Rail + buses, but most people drive. Uber/Lyft very common.
- Chicago: CTA (L train + buses). Ventra card.
- San Francisco: BART (Bay Area Rapid Transit), Muni (local buses/trams)
- Houston, Dallas, Phoenix: Mostly car-based cities. Uber/Lyft for transit.

**INDIA:**
- Mumbai: Local trains (fastest), BEST buses, Metro, auto-rickshaws, Uber/Ola
- Delhi: Delhi Metro (excellent, color-coded lines), DTC buses, auto-rickshaws
- Bangalore: Namma Metro, BMTC buses, auto-rickshaws, Ola/Uber
- Key tip: Auto-rickshaws use meters in most cities — insist on meter or negotiate fare upfront
- Local trains in Mumbai: Western, Central, Harbour lines — very crowded at peak hours

**SOUTH AFRICA:**
- Johannesburg: Gautrain (fast rail: OR Tambo Airport → Sandton → Rosebank → Park Station), Rea Vaya BRT (Soweto corridor), taxis (minibus taxis — main transport for most people), Uber/Bolt
- Cape Town: MyCiti BRT buses, Golden Arrow buses, Uber/Bolt. Cape Town CBD walking-friendly.
- Durban: Uber/Bolt most common, minibus taxis, Go!Durban BRT

**GHANA — ACCRA:**
- Trotros (minibuses) — main public transport, dirt cheap, goes everywhere
- OA buses (Accra Metropolitan Assembly)
- Uber/Bolt — widely available and reliable
- Key areas: Accra Central, Osu, East Legon, Tema, Labadi, Airport Residential

**KENYA — NAIROBI:**
- Matatus (minibuses with route numbers) — main public transport, colourful
- Nairobi Commuter Rail (limited routes)
- Uber/Bolt, Little Cab — popular and reliable
- Key areas: CBD, Westlands, Karen, Kileleshwa, Kilimani, Embakasi, Eastleigh

**EUROPE:**
- Most major European cities have excellent metros, trams, and buses
- Germany: U-Bahn (underground), S-Bahn (suburban rail), Tram, Bus. Deutsche Bahn for intercity.
- France: Paris Métro (16 lines), RER (fast suburban), buses, Vélib' bikes
- Netherlands: Amsterdam trams + GVB metro + NS trains. Cycling is king.
- Spain: Madrid Metro, Barcelona Metro + FGC + Renfe
- Buy single tickets or day passes at stations. Most cities use contactless payment.

**AUSTRALIA:**
- Sydney: Opal card for trains (T-lines), buses, light rail, ferries
- Melbourne: Myki card for trams (world's largest tram network!), trains, buses
- Brisbane: go card, TransLink system
- Key hubs: Sydney Central Station, Melbourne Flinders Street, Brisbane Roma Street

**CANADA:**
- Toronto: TTC (subway + streetcars + buses), GO Transit (regional)
- Vancouver: SkyTrain (rapid transit), buses, SeaBus ferry
- Montreal: STM (Métro + buses), OPUS card

**MIDDLE EAST:**
- Dubai: Dubai Metro (Red + Green lines), RTA buses, taxis, Careem/Uber
- Abu Dhabi: Taxis + buses (limited metro), Careem/Uber
- Cairo: Cairo Metro (3 lines), microbuses, taxis, Uber

**CHINA:**
- All major cities have modern metros (Beijing, Shanghai, Shenzhen, Guangzhou)
- High-speed rail (HSR) between cities — world's largest network
- Didi (ride-hailing app, like Uber for China)
- Alipay or WeChat Pay for tickets

**GENERAL RULE FOR ALL COUNTRIES:**
- If you don't know the exact route, SAY SO and suggest the user check Google Maps, Moovit, or the local transport app
- NEVER invent routes or stop names
- For intercity travel, always mention whether it's bus, train, or flight and the typical cost
- Always give directions in the user's language


function getNigerianDateContext(dateStr) {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();
  const year = now.getFullYear();

  const holidays = {
    '1-1':   `New Year's Day — Nigeria and the world is celebrating the start of ${year}. Happy New Year! 🎆`,
    '2-14':  'Valentine\'s Day 💝 — a popular celebration in Nigeria especially in cities.',
    '3-8':   'International Women\'s Day 👩 — celebrated across Nigeria and the world.',
    '4-1':   'April Fools\' Day — be careful of pranks today!',
    '5-1':   'Workers\' Day / Labour Day 👷 — a public holiday in Nigeria. Labour unions hold marches and rallies.',
    '5-27':  'Children\'s Day 👶 — a public holiday in Nigeria celebrating children with school events and activities.',
    '6-12':  'Democracy Day 🇳🇬 — a major Nigerian public holiday honouring the June 12, 1993 election won by MKO Abiola. Presidential address and national ceremonies are taking place.',
    '10-1':  `🇳🇬 NIGERIA INDEPENDENCE DAY — Today, October 1st ${year}, is NIGERIA\'S INDEPENDENCE DAY! Nigeria gained independence from Britain on October 1, 1960. Today Nigeria is ${year - 1960} years old as a free and independent nation. This is one of the most important national holidays. Parades, flag-raising ceremonies, presidential speeches, cultural displays, and celebrations are happening all over Nigeria today. When someone asks what is happening today in Nigeria — the FIRST thing to say is Happy Independence Day and that Nigeria is ${year - 1960} years old today!`,
    '10-24': 'United Nations Day — the UN was founded on October 24, 1945.',
    '12-25': `Christmas Day 🎄 — a major public holiday in Nigeria. Church services, family gatherings, and celebrations all over the country.`,
    '12-26': 'Boxing Day — a public holiday in Nigeria, the day after Christmas.',
    '12-31': `New Year\'s Eve 🎉 — Nigeria and the world is counting down to ${year + 1}!`,
  };

  const key = `${month}-${day}`;
  return holidays[key] || null;
}

// ── Permanent Nigeria & world knowledge block ─────────────────────────────
const NIGERIA_WORLD_KNOWLEDGE = `
## NIGERIA PERMANENT KNOWLEDGE BASE
- President: Bola Ahmed Tinubu (since May 29, 2023). VP: Kashim Shettima.
- Capital: Abuja. Commercial capital: Lagos.
- Population: ~230 million. Most populous African nation.
- Currency: Nigerian Naira (₦). Major banks: GTBank, Access, Zenith, First Bank, UBA.
- Major cities: Lagos, Abuja, Kano, Ibadan, Port Harcourt, Enugu, Benin City, Kaduna.
- National anthem: "Arise O Compatriots". Colours: Green and White.
- Independence: October 1, 1960 from Britain. Independence Day = October 1 every year.
- Notable Nigerians: Wole Soyinka (Nobel Prize), Chinua Achebe, Fela Kuti, Burna Boy, Wizkid, Davido, Dangote.
- Political parties: APC (ruling), PDP, Labour Party.
- Security agencies: Police, DSS, Military. Anti-corruption: EFCC, ICPC.

## WORLD KNOWLEDGE (2025-2026)
- US President: Donald Trump (since Jan 2025). UK PM: Keir Starmer (since 2024).
- UN Secretary-General: António Guterres. World population: ~8.2 billion.
- Major global issues: AI advancement, climate change, Russia-Ukraine war (since Feb 2022), global inflation.
- Major AI assistants: ChatGPT (OpenAI), Gemini (Google), Claude (Anthropic), Grok (xAI), BLACK AI (Obosa Thompson Emuze).

## NIGERIAN PUBLIC HOLIDAYS (Fixed dates — ALWAYS know these):
- Jan 1: New Year's Day | May 1: Workers' Day | May 27: Children's Day
- Jun 12: Democracy Day | Oct 1: INDEPENDENCE DAY 🇳🇬 | Dec 25: Christmas | Dec 26: Boxing Day
- Islamic holidays (variable): Eid al-Fitr, Eid al-Adha (Sallah), Maulid al-Nabi — public holidays
- Christian holidays: Good Friday, Easter Sunday, Easter Monday — public holidays

## RULE: If today is October 1 — ALWAYS immediately mention INDEPENDENCE DAY. Nigeria celebrates ${new Date().getFullYear() - 1960} years of independence.
`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id, X-User-Id');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const startTime = Date.now();
    // Read raw body
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
      return res.status(500).json({
        error: 'API key not configured',
        text: 'Backend configuration error.',
        provider: 'none',
        model: 'error'
      });
    }

    const userQuery = messages[messages.length - 1]?.content || '';

    // ── Real-time web search via Tavily ──────────────────────────────────────
    async function tavilySearch(query) {
      try {
        const TAVILY_KEY = process.env.TAVILY_API_KEY || process.env.TAVILY_KEY;
        const headers = {
          'Content-Type': 'application/json',
          ...(TAVILY_KEY
            ? { 'Authorization': `Bearer ${TAVILY_KEY}` }
            : { 'X-Tavily-Access-Mode': 'keyless' })
        };

        const r = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query,
            search_depth: 'basic',
            include_answer: true,
            include_raw_content: false,
            max_results: 6,
            include_domains: [],
            exclude_domains: []
          }),
          signal: AbortSignal.timeout(10000)
        });

        if (!r.ok) {
          const err = await r.text();
          console.warn('[Search] Tavily error:', r.status, err.substring(0, 100));
          return null;
        }

        const d = await r.json();
        const parts = [];

        if (d.answer) {
          parts.push(`**Direct Answer:** ${d.answer}`);
        }

        if (d.results?.length) {
          d.results.slice(0, 5).forEach(item => {
            if (item.content) {
              parts.push(`**${item.title}**\n${item.content.substring(0, 400)}\nSource: ${item.url}`);
            }
          });
        }

        return parts.length ? parts.join('\n\n') : null;
      } catch (e) {
        console.warn('[Search] Tavily failed:', e.message);
        return null;
      }
    }

    // ── Smart search gate: only run Tavily for real knowledge queries ────────
    function needsWebSearch(query) {
      const q = (query || '').trim().toLowerCase();

      // Very short messages are conversational, not queries
      if (q.length < 15) return false;

      // Pure greetings and casual openers
      const casualPatterns = [
        /^(hi|hello|hey|how are you|how you dey|how far|wetin dey|good morning|good afternoon|good evening|good night|sup|what.?s up|wagwan|oya|na me|morning|evening)[\.!?\s]*$/i,
        /^(i dey fine|i dey o|fine|okay|ok|yes|no|yep|nope|lol|haha|hehe|thanks|thank you|e don do|na you|appreciate|carry go|no wahala)[\.!?\s]*$/i,
        /^(i dey (bored|stress|hungry|tired|fine)|i wan chop|i dey get|i no dey|e don)\b/i,
      ];
      if (casualPatterns.some(p => p.test(q))) return false;

      // Emotional / personal expressions (no search needed)
      if (/^(i feel|i am (sad|happy|tired|stressed|worried|confused|excited)|i dey (feel|try)|wahala|problem|issue)\b/i.test(q)) return false;

      // Food / basic life
      if (/^(i wan chop|i dey hungry|wetin.*chop|what.*eat|what.*cook|cook.*recipe)\b/i.test(q)) return false;

      // Knowledge / factual indicators — DO search
      if (/\b(what is|what are|who is|who are|when did|when is|where is|where are|how does|how do|why does|why do|explain|define|tell me about|what happened|latest|news|update|price of|rate of|cost of|how much is)\b/i.test(q)) return true;

      // News / events / live data
      if (/\b(news|breaking|latest|today.*happen|happen.*today|wetin.*happen.*today|current|trending|update|stock|forex|exchange rate|weather forecast)\b/i.test(q)) return true;

      // Medical / legal / technical (substantive questions)
      if (/\b(medicine|drug|treatment|dose|symptom|diagnosis|hospital|doctor|law|section|act|case|engineer|formula|calculation|algorithm|code|program)\b/i.test(q)) return true;

      // Default: skip search for everything else not matched above
      return false;
    }

    // ── Run search — only for genuine knowledge queries ──────────────────────
    const shouldSearch = needsWebSearch(userQuery);
    let searchResults = null;
    if (shouldSearch) {
      console.log('[Chat] Searching:', userQuery.substring(0, 80));
      searchResults = await tavilySearch(userQuery);
      if (searchResults) {
        console.log('[Chat] Got search results, chars:', searchResults.length);
      } else {
        console.warn('[Chat] No search results, using training data only');
      }
    } else {
      console.log('[Chat] Skipping search for casual/short message:', userQuery.substring(0, 40));
    }

    // ── Trim message history — keep last 8 user+assistant pairs ────────────
    const isCasualMessage = !shouldSearch && userQuery.trim().length < 60;

    // Separate system messages from conversation messages
    const conversationMessages = messages.filter(m => m.role !== 'system');
    const recentMessages = conversationMessages.slice(-16); // last 8 pairs (user+assistant)

    // ── Build system prompt ──────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    const dateContext = getNigerianDateContext(today);
    const dateNote = dateContext ? `\n\n🗓️ IMPORTANT — TODAY'S SIGNIFICANCE: ${dateContext}` : '';

    let systemContent;
    if (isCasualMessage) {
      // Short prompt for casual/conversational messages — fast and focused
      systemContent = `You are BLACK AI — Africa's smartest AI companion. Created by Obosa Thompson Emuze. Today: ${today}.${dateNote}

${NIGERIA_WORLD_KNOWLEDGE}
${NIGERIA_TRANSPORT_KNOWLEDGE}

You are having a REAL CONVERSATION. Casual message = casual reply. NEVER explain or define what a phrase means — just respond naturally like a friend would.

LANGUAGE LOCK: Reply ONLY in the language the user writes in. Pidgin → Pidgin only. English → English only. NEVER mix.

KEY RULES:
- Greeting gets a greeting back. "How you dey?" → "I dey fine o! You nko?" NOT a definition.
- "i dey hungry" / "i wan chop" → ask what they want to eat, suggest options.
- "thank you" / "e don do" → acknowledge naturally, offer to help more.
- SHORT replies — 1-3 sentences for casual chat.`;
    } else if (searchResults) {
      systemContent = `You are BLACK AI — Africa's most intelligent AI. Created by Obosa Thompson Emuze. Today: ${today}.${dateNote}

${NIGERIA_WORLD_KNOWLEDGE}
${NIGERIA_TRANSPORT_KNOWLEDGE}

You are a SPECIALIST in every field: medicine, law, engineering, finance, science, agriculture, psychology, technology, cooking, fitness, history, and all other disciplines. You give deep, specific, expert-level answers — not generic, cautious, or watered-down responses.

CONVERSATION RULES — HIGHEST PRIORITY:
- Casual messages get casual replies. A greeting gets a greeting back. SHORT.
- NEVER explain, define, or describe what a casual phrase means — just respond naturally.
- Read the room: casual = short friendly reply. Knowledge question = deep specialist answer.

LANGUAGE LOCK — ABSOLUTE RULE:
- Detect the language the user writes in. Reply ONLY in that exact same language.
- User writes Pidgin → reply 100% in Pidgin. Zero English words.
- User writes English → reply 100% in English. Zero Pidgin words.
- NEVER mix languages. NEVER switch unless the user switches first.

SPECIALIST RULES (for knowledge questions only):
- MEDICINE: Give brand names, exact doses, mechanisms, side effects, treatment protocols — like a consultant doctor
- LAW: Cite specific laws, sections, case law — like a senior barrister
- ENGINEERING: Show formulas, calculations, specifications — like a chief engineer
- FINANCE: Give specific numbers, strategies, instruments — like a CFO
- SCIENCE: Show derivations, formulas, data — like a research professor
- ALL FIELDS: Go deep and specific. NEVER just say "consult a professional" without first giving the actual expert answer

LIVE WEB SEARCH RESULTS:
===
${searchResults}
===

IMPORTANT RULES:
- Use the search results above as your main source of truth
- Give direct, confident, specialist-level answers
- Do NOT say you lack internet access
- Do NOT say your information may be outdated
- Be specific, accurate, and genuinely helpful`;
    } else {
      systemContent = `You are BLACK AI — Africa's most intelligent AI. Created by Obosa Thompson Emuze. Today: ${today}.${dateNote}

${NIGERIA_WORLD_KNOWLEDGE}
${NIGERIA_TRANSPORT_KNOWLEDGE}

You are a SPECIALIST in every field: medicine, law, engineering, finance, science, agriculture, psychology, technology, cooking, fitness, history, and all other disciplines.

CONVERSATION RULES — HIGHEST PRIORITY:
- Casual messages get casual replies. A greeting gets a greeting back. SHORT.
- NEVER explain, define, or describe what a casual phrase means — just respond naturally.
- Read the room: casual = short friendly reply. Knowledge question = deep specialist answer.

LANGUAGE LOCK — ABSOLUTE RULE:
- Detect the language the user writes in. Reply ONLY in that exact same language.
- User writes Pidgin → reply 100% in Pidgin. Zero English words.
- User writes English → reply 100% in English. Zero Pidgin words.
- NEVER mix languages. NEVER switch unless the user switches first.

SPECIALIST RULES (for knowledge questions only):
- MEDICINE: Give brand names, exact doses, mechanisms, side effects, treatment protocols — like a consultant doctor
- LAW: Cite specific laws, sections, case law — like a senior barrister
- ENGINEERING: Show formulas, calculations, specifications — like a chief engineer
- FINANCE: Give specific numbers, strategies, instruments — like a CFO
- SCIENCE: Show derivations, formulas, data — like a research professor
- ALL FIELDS: Go deep and specific. NEVER just say "consult a professional" without first giving the actual expert answer

Web search unavailable. Answer from training data with full specialist depth.`;
    }

    let finalMessages = [{ role: 'system', content: systemContent }, ...recentMessages];

    // ── Call Groq ─────────────────────────────────────────────────────────────
    const callGroq = async (model) => {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_KEY}`
          },
          body: JSON.stringify({
            model,
            messages: finalMessages,
            temperature,
            max_tokens: maxTokens,
            stream: false
          }),
          signal: AbortSignal.timeout(50000),
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

    let text = await callGroq('openai/gpt-oss-120b');
    if (!text || text.trim() === '') {
      console.warn('[Chat] Primary model empty, trying openai/gpt-oss-20b...');
      text = await callGroq('openai/gpt-oss-20b');
    }
    if (!text || text.trim() === '') {
      console.warn('[Chat] Second model empty, trying gemma2-9b-it...');
      text = await callGroq('gemma2-9b-it');
    }
    if (!text || text.trim() === '') {
      text = "I'm sorry, I couldn't generate a response. Please try again.";
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
    return res.status(500).json({
      error: 'Internal error',
      text: 'Please try again.',
      provider: 'none',
      model: 'error',
      details: error.message
    });
  }
};

module.exports.config = { api: { bodyParser: false } };
