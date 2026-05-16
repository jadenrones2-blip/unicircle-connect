import type { Club } from '@/data/mockData';

// ─── Stop‑words to ignore when extracting keywords ───
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall',
  'can', 'need', 'must', 'not', 'no', 'nor', 'so', 'if', 'then', 'than', 'too',
  'very', 'just', 'about', 'above', 'after', 'again', 'all', 'also', 'am', 'any',
  'because', 'before', 'being', 'below', 'between', 'both', 'during', 'each', 'few',
  'further', 'get', 'got', 'here', 'how', 'into', 'its', 'more', 'most', 'my', 'new',
  'now', 'only', 'other', 'our', 'out', 'own', 'over', 'same', 'she', 'he', 'it',
  'some', 'such', 'that', 'their', 'them', 'there', 'these', 'they', 'this', 'those',
  'through', 'under', 'until', 'up', 'what', 'when', 'where', 'which', 'while', 'who',
  'whom', 'why', 'you', 'your', 'we', 'us', 'me', 'him', 'her', 'his', 'hers',
  'its', 'ours', 'yours', 'theirs', 'i', 'he', 'she', 'it', 'we', 'they',
  // University / generic org filler
  'ucsd', 'uc', 'san', 'diego', 'university', 'california', 'campus', 'student',
  'students', 'club', 'clubs', 'organization', 'organizations', 'org', 'group',
  'member', 'members', 'meeting', 'meetings', 'event', 'events', 'community',
  'provide', 'provides', 'aim', 'aims', 'goal', 'goals', 'join', 'welcome',
  'dedicated', 'committed', 'strive', 'strives', 'promote', 'promotes', 'foster',
  'help', 'helps', 'support', 'supports', 'create', 'creates', 'offer', 'offers',
  'including', 'include', 'includes', 'also', 'well', 'various', 'based', 'focused',
  'within', 'across', 'opportunity', 'opportunities', 'experience', 'experiences',
  'interested', 'interest', 'participate', 'involvement', 'involved', 'engage',
  'one', 'two', 'many', 'much', 'make', 'like', 'want', 'look', 'looking',
]);

// ─── Domain keyword groups: semantically related terms that should match ───
const KEYWORD_CLUSTERS: Record<string, string[]> = {
  // STEM / Tech
  engineering: ['engineering', 'engineer', 'engineers', 'mechanical', 'electrical', 'aerospace', 'civil', 'bioengineering', 'nanoengineering'],
  computer_science: ['computer', 'computing', 'software', 'programming', 'coding', 'algorithm', 'data', 'machine learning', 'artificial intelligence', 'ai', 'ml', 'cybersecurity', 'web', 'app', 'developer', 'tech', 'technology', 'hack', 'hacking'],
  science: ['science', 'scientific', 'research', 'lab', 'laboratory', 'biology', 'chemistry', 'physics', 'neuroscience', 'cognitive', 'biochemistry', 'microbiology', 'ecology', 'genetics', 'molecular'],
  math: ['math', 'mathematics', 'statistics', 'statistical', 'quantitative', 'calculus'],
  healthcare: ['medical', 'medicine', 'health', 'healthcare', 'pre-med', 'premed', 'nursing', 'pharmacy', 'dental', 'clinical', 'physician', 'doctor', 'patient', 'hospital', 'public health', 'mental health', 'wellness'],

  // Business & Professional
  business: ['business', 'management', 'entrepreneurship', 'entrepreneur', 'startup', 'venture', 'innovation', 'consulting', 'strategy', 'corporate'],
  finance: ['finance', 'financial', 'investment', 'investing', 'banking', 'accounting', 'economics', 'economic', 'stock', 'trading', 'portfolio', 'wealth'],
  marketing: ['marketing', 'advertising', 'brand', 'branding', 'communications', 'media', 'social media', 'content', 'digital marketing', 'pr', 'public relations'],
  law: ['law', 'legal', 'policy', 'politics', 'political', 'government', 'advocacy', 'legislation', 'justice', 'pre-law'],
  consulting: ['consulting', 'consultant', 'strategy', 'advisory', 'case', 'problem solving'],

  // Arts & Creative
  arts: ['art', 'arts', 'artist', 'creative', 'design', 'graphic', 'visual', 'painting', 'drawing', 'illustration', 'sculpture', 'gallery', 'exhibition'],
  music: ['music', 'musical', 'band', 'choir', 'orchestra', 'singing', 'instrument', 'performance', 'concert', 'rhythm', 'taiko', 'a cappella', 'jazz', 'classical'],
  dance: ['dance', 'dancing', 'dancer', 'choreography', 'ballet', 'hip hop', 'contemporary', 'salsa', 'bhangra', 'k-pop'],
  theater: ['theater', 'theatre', 'drama', 'acting', 'improv', 'comedy', 'film', 'cinema', 'filmmaking', 'screenplay', 'production'],
  writing: ['writing', 'writer', 'literary', 'literature', 'poetry', 'journal', 'publication', 'editorial', 'magazine', 'newspaper', 'blog', 'publishing'],

  // Cultural & Identity
  cultural: ['cultural', 'culture', 'heritage', 'identity', 'ethnic', 'ethnicity', 'diaspora', 'indigenous', 'multicultural', 'diversity', 'inclusive', 'inclusivity'],
  asian: ['asian', 'chinese', 'japanese', 'korean', 'vietnamese', 'filipino', 'indian', 'south asian', 'southeast asian', 'pacific islander', 'aapi'],
  latinx: ['latino', 'latina', 'latinx', 'hispanic', 'chicano', 'chicana', 'mexican', 'spanish'],
  african: ['african', 'black', 'african american', 'caribbean', 'pan-african'],
  middle_eastern: ['middle eastern', 'arab', 'persian', 'iranian', 'turkish', 'south asian', 'muslim', 'islamic'],
  lgbtq: ['lgbtq', 'queer', 'pride', 'transgender', 'bisexual', 'lesbian', 'gay', 'gender', 'sexuality', 'nonbinary'],

  // Greek Life
  greek: ['fraternity', 'sorority', 'greek', 'panhellenic', 'interfraternity', 'chapter', 'brotherhood', 'sisterhood', 'pledge', 'rush'],

  // Service & Social Impact
  service: ['service', 'volunteer', 'volunteering', 'philanthropy', 'nonprofit', 'charity', 'giving', 'humanitarian', 'outreach'],
  sustainability: ['sustainability', 'sustainable', 'environment', 'environmental', 'climate', 'conservation', 'ecology', 'green', 'renewable', 'ocean', 'marine'],
  social_justice: ['social justice', 'justice', 'equity', 'equality', 'advocacy', 'activism', 'civil rights', 'human rights', 'empowerment'],

  // Sports & Fitness
  sports: ['sport', 'sports', 'athletic', 'team', 'compete', 'competition', 'competitive', 'tournament', 'league', 'intramural', 'recreation', 'recreational'],
  martial_arts: ['martial arts', 'karate', 'taekwondo', 'judo', 'kendo', 'fencing', 'boxing', 'wrestling'],
  outdoor: ['outdoor', 'hiking', 'climbing', 'surfing', 'sailing', 'camping', 'adventure', 'nature', 'wilderness'],
  fitness: ['fitness', 'gym', 'workout', 'exercise', 'yoga', 'running', 'swimming', 'cycling', 'triathlon', 'marathon'],

  // Spiritual & Religious
  spiritual: ['spiritual', 'spirituality', 'faith', 'religion', 'religious', 'church', 'worship', 'prayer', 'christian', 'catholic', 'jewish', 'buddhist', 'hindu', 'muslim', 'sikh', 'interfaith', 'meditation', 'mindfulness'],

  // Gaming & Hobbies
  gaming: ['gaming', 'game', 'games', 'esports', 'video game', 'tabletop', 'board game', 'chess', 'poker', 'trivia'],
  food: ['food', 'cooking', 'culinary', 'baking', 'cuisine', 'foodie', 'recipe', 'nutrition', 'dining'],
  photography: ['photography', 'photo', 'camera', 'visual', 'videography', 'editing'],

  // Academic & Professional Development  
  academic: ['academic', 'scholarly', 'scholarship', 'tutoring', 'mentoring', 'mentor', 'education', 'educational', 'learning', 'curriculum', 'seminar', 'symposium'],
  leadership: ['leadership', 'leader', 'executive', 'board', 'officer', 'president', 'management', 'professional development', 'career', 'networking', 'network'],
  international: ['international', 'global', 'abroad', 'exchange', 'foreign', 'world', 'diplomacy', 'united nations', 'model un'],
};

// Build a reverse lookup: keyword → cluster name
const keywordToCluster = new Map<string, string>();
for (const [cluster, keywords] of Object.entries(KEYWORD_CLUSTERS)) {
  for (const kw of keywords) {
    keywordToCluster.set(kw, cluster);
  }
}

/** Extract meaningful keywords from a club's text fields */
export function extractClubKeywords(club: Club): Set<string> {
  const text = [club.name, club.category, club.categoryBucket, club.description, ...(club.tags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const keywords = new Set<string>();

  // Check multi-word phrases first (order matters)
  for (const [cluster, phrases] of Object.entries(KEYWORD_CLUSTERS)) {
    for (const phrase of phrases) {
      if (phrase.includes(' ') && text.includes(phrase)) {
        keywords.add(cluster);
      }
    }
  }

  // Then check individual words
  const words = text.replace(/[^a-z0-9\s-]/g, '').split(/\s+/);
  for (const word of words) {
    if (word.length < 3 || STOP_WORDS.has(word)) continue;
    const cluster = keywordToCluster.get(word);
    if (cluster) {
      keywords.add(cluster);
    }
  }

  // Also add direct category/bucket as a keyword
  if (club.category) keywords.add(club.category.toLowerCase());
  if (club.categoryBucket) keywords.add(club.categoryBucket.toLowerCase());

  return keywords;
}

/** Score similarity between two clubs using keyword overlap */
export function calculateClubSimilarity(
  candidateKeywords: Set<string>,
  targetKeywords: Set<string>
): { score: number; matchedClusters: string[] } {
  const matchedClusters: string[] = [];
  let score = 0;

  for (const keyword of candidateKeywords) {
    if (targetKeywords.has(keyword)) {
      score += 1;
      matchedClusters.push(keyword);
    }
  }

  return { score, matchedClusters };
}

// Interest value → relevant search terms (used for match % scoring)
export const INTEREST_TERM_MAP: Record<string, string[]> = {
  network: ['professional', 'networking', 'career', 'industry'],
  skills: ['workshop', 'training', 'academic', 'bootcamp'],
  squad: ['social', 'community', 'recreation'],
  confidence: ['leadership', 'executive', 'board'],
  purpose: ['service', 'volunteer', 'philanthropy', 'social impact'],
  fun: ['social', 'recreation', 'events'],
  tech_career: ['tech', 'stem', 'engineering', 'computer', 'software'],
  finance_career: ['finance', 'business', 'investment', 'banking'],
  startup_career: ['entrepreneurship', 'startup', 'innovation'],
  consulting_career: ['consulting', 'strategy', 'business'],
  healthcare_career: ['pre-med', 'health', 'healthcare', 'biology'],
  research_career: ['research', 'science', 'academic'],
  creative_career: ['arts', 'design', 'creative', 'media'],
  nonprofit_career: ['nonprofit', 'social impact', 'service'],
  tech: ['tech', 'stem', 'engineering', 'computer', 'coding', 'technology'],
  business: ['business', 'consulting', 'entrepreneurship', 'finance'],
  arts: ['arts', 'design', 'creative', 'music', 'dance', 'theater'],
  science: ['science', 'research', 'pre-med', 'biology'],
  culture: ['cultural', 'identity', 'international', 'heritage'],
  fitness: ['health', 'wellness', 'fitness', 'sports', 'recreation'],
  social_impact: ['social impact', 'advocacy', 'service', 'sustainability'],
  gaming: ['gaming', 'esports', 'recreation'],
  professional: ['professional', 'industry', 'career', 'corporate'],
  chill: ['casual', 'social', 'community'],
  competitive: ['competition', 'competitive', 'tournament'],
  creative_vibe: ['creative', 'arts', 'experimental'],
};

// Human-readable labels for interest values (used in recommendation reasons)
const INTEREST_DISPLAY_MAP: Record<string, string> = {
  tech: 'Tech & Coding',
  tech_career: 'Tech',
  business: 'Business',
  finance_career: 'Finance',
  startup_career: 'Startups',
  consulting_career: 'Consulting',
  healthcare_career: 'Healthcare',
  research_career: 'Research',
  creative_career: 'Creative & Media',
  nonprofit_career: 'Nonprofit',
  law_career: 'Law',
  marketing_career: 'Marketing',
  education_career: 'Education',
  government_career: 'Government & Policy',
  arts: 'Art & Design',
  music: 'Music',
  science: 'Science',
  culture: 'Culture & Identity',
  fitness: 'Sports & Fitness',
  social_impact: 'Activism',
  gaming: 'Gaming',
  network: 'Networking',
  skills: 'Skill Building',
  squad: 'Community',
  confidence: 'Leadership',
  purpose: 'Social Impact',
  sustainability: 'Sustainability',
  dance: 'Dance',
  writing: 'Writing',
  investing: 'Investing',
  ai: 'AI & Data Science',
  film: 'Film & Photography',
  food: 'Food & Cooking',
  travel: 'Travel & Languages',
  competitive: 'Competitive Activities',
  professional: 'Professional Development',
  creative_vibe: 'Creative Projects',
};

// Maps each interest quiz answer to the semantic cluster names in KEYWORD_CLUSTERS
// This is more accurate than raw text matching — "computer", "coding", "software"
// all resolve to the same cluster so a CS club scores high on any of them.
const INTEREST_TO_CLUSTERS: Record<string, string[]> = {
  // Goal / superpower
  network:       ['leadership', 'business', 'academic'],
  skills:        ['academic', 'computer_science', 'engineering'],
  squad:         [], // too vague — don't bias any specific clubs
  confidence:    ['leadership'],
  purpose:       ['service', 'social_justice', 'sustainability'],
  fun:           [], // too vague
  // Career goals
  tech_career:        ['computer_science', 'engineering', 'math'],
  finance_career:     ['finance', 'business'],
  startup_career:     ['business'],
  consulting_career:  ['consulting', 'business'],
  healthcare_career:  ['healthcare'],
  research_career:    ['academic', 'science'],
  creative_career:    ['arts', 'writing', 'theater', 'music', 'dance', 'photography'],
  nonprofit_career:   ['service', 'social_justice'],
  law_career:         ['law'],
  marketing_career:   ['marketing', 'business'],
  education_career:   ['academic'],
  government_career:  ['law', 'social_justice'],
  undecided_career:   [],
  // Interest areas
  tech:          ['computer_science', 'engineering'],
  business:      ['business', 'finance', 'marketing', 'consulting'],
  arts:          ['arts', 'theater', 'writing'],
  science:       ['science', 'math', 'healthcare'],
  culture:       ['cultural', 'asian', 'latinx', 'african', 'middle_eastern', 'lgbtq', 'international'],
  fitness:       ['sports', 'fitness', 'outdoor', 'martial_arts'],
  social_impact: ['service', 'social_justice', 'sustainability'],
  gaming:        ['gaming'],
  music:         ['music'],
  dance:         ['dance'],
  writing:       ['writing'],
  investing:     ['finance'],
  ai:            ['computer_science'],
  film:          ['theater', 'photography'],
  food:          ['food'],
  travel:        ['international'],
  sustainability: ['sustainability'],
  spiritual:     ['spiritual'],
  // Vibe / energy
  competitive:   ['sports'],
  chill:         [],
  party:         [],
  professional:  ['leadership', 'business', 'academic'],
  creative_vibe: ['arts', 'writing', 'theater', 'music', 'dance', 'photography'],
  inclusive:     ['cultural', 'lgbtq'],
  explorer:      [],
  committed:     [],
  all_in:        ['leadership'],
};

function calcInterestScore(club: Club, interestValues: string[]): number {
  const clubClusters = extractClubKeywords(club); // semantic clusters the club belongs to

  // Collect all clusters the user cares about (deduplicated)
  const userClusters = new Set<string>();
  for (const val of interestValues) {
    const clusters = INTEREST_TO_CLUSTERS[val] ?? [];
    clusters.forEach(c => userClusters.add(c));
  }

  if (userClusters.size === 0) return 0;

  // Count how many of the user's interest clusters the club actually matches
  let matches = 0;
  for (const cluster of userClusters) {
    if (clubClusters.has(cluster)) matches++;
  }

  if (matches === 0) return 0;

  // Score = % of user's interest clusters that matched, with a small bonus for deep overlap
  const pct = (matches / userClusters.size) * 100;
  const bonus = matches >= 3 ? 12 : matches >= 2 ? 5 : 0;
  return Math.min(100, Math.round(pct + bonus));
}

function calcResumeScore(club: Club, resumeKeywords: string[]): number {
  const clubText = [club.name, club.category, club.categoryBucket, club.description, ...(club.tags || [])]
    .filter(Boolean).join(' ').toLowerCase();

  // Direct text match only — cluster matching is too broad for specific resume terms
  let hits = 0;
  for (const kw of resumeKeywords) {
    if (clubText.includes(kw.toLowerCase().trim())) hits++;
  }
  return Math.min(100, Math.round((hits / resumeKeywords.length) * 100 * 2.5));
}

export function resumeHitsClub(club: Club, resumeKeywords: string[]): boolean {
  const clubText = [club.name, club.category, club.categoryBucket, club.description, ...(club.tags || [])]
    .filter(Boolean).join(' ').toLowerCase();
  return resumeKeywords.some(kw => clubText.includes(kw.toLowerCase().trim()));
}

/** Score a club against user interest values and optional resume keywords (0–100).
 *  Weighted 60% interests / 40% resume when both are present. */
export function calculateMatchScore(
  club: Club,
  interestValues: string[],
  resumeKeywords: string[] = []
): number {
  const hasInterests = interestValues.length > 0;
  const hasResume = resumeKeywords.length > 0;

  if (!hasInterests && !hasResume) return 0;

  const interestScore = hasInterests ? calcInterestScore(club, interestValues) : 0;
  const resumeScore = hasResume ? calcResumeScore(club, resumeKeywords) : 0;

  if (hasInterests && !hasResume) return interestScore;
  if (!hasInterests && hasResume) return resumeScore;
  return Math.round(interestScore * 0.6 + resumeScore * 0.4);
}

/** Return a human-readable sentence explaining why a club matches.
 *  Checks resume keywords first (more specific), then interests. */
export function getTopMatchTerm(
  club: Club,
  interestValues: string[],
  resumeKeywords: string[] = []
): string | null {
  const clubText = [club.name, club.category, club.categoryBucket, club.description, ...(club.tags || [])]
    .filter(Boolean).join(' ').toLowerCase();
  const clubKeywords = extractClubKeywords(club);

  // Resume keywords first — they're the most specific signal
  for (const kw of resumeKeywords) {
    const lower = kw.toLowerCase().trim();
    if (lower.length < 3) continue;
    if (clubText.includes(lower)) {
      return `Matches your ${kw} background`;
    }
    const cluster = keywordToCluster.get(lower);
    if (cluster && clubKeywords.has(cluster)) {
      return `Aligns with your ${kw} skills`;
    }
  }

  // Fall back to interest-based reasons — skip meaningless values, use matched term for specificity
  const SKIP_VALUES = new Set(['fun', 'chill', 'squad', 'skills', 'network', 'confidence', 'purpose', 'competitive', 'creative_vibe', 'professional']);
  for (const val of interestValues) {
    if (SKIP_VALUES.has(val)) continue;
    const terms = INTEREST_TERM_MAP[val] || [val];
    for (const term of terms) {
      const lower = term.toLowerCase();
      if (clubText.includes(lower)) {
        const isGeneric = ['tech', 'business', 'arts', 'science', 'fitness', 'social', 'research', 'career'].includes(lower);
        if (!isGeneric && lower.length > 4) {
          return `Matches your interest in ${term}`;
        }
        const display = INTEREST_DISPLAY_MAP[val] || val.replace(/_/g, ' ');
        return `Matches your interest in ${display}`;
      }
    }
  }

  return null;
}

/** Get recommended clubs based on a set of saved clubs + user interests */
export function getRecommendationsFromSaved(
  allClubs: Club[],
  savedClubIds: Set<string>,
  userInterests: { category: string; value: string }[],
  interestMapping: Record<string, string[]>,
  limit = 6
): { club: Club; score: number; matchedCategories: string[] }[] {
  if (savedClubIds.size === 0) return [];

  const savedClubs = allClubs.filter((c) => savedClubIds.has(c.id));

  // Build a combined keyword profile from all saved clubs
  const savedKeywords = new Set<string>();
  for (const club of savedClubs) {
    const kws = extractClubKeywords(club);
    kws.forEach((kw) => savedKeywords.add(kw));
  }

  // Enrich with user quiz interests mapped to clusters
  for (const { value } of userInterests) {
    const mappedTerms = interestMapping[value] || [value];
    for (const term of mappedTerms) {
      const lower = term.toLowerCase();
      const cluster = keywordToCluster.get(lower);
      if (cluster) savedKeywords.add(cluster);
      else savedKeywords.add(lower);
    }
  }

  // Score all non-saved clubs
  const scored = allClubs
    .filter((c) => !savedClubIds.has(c.id))
    .map((club) => {
      const clubKeywords = extractClubKeywords(club);
      const { score, matchedClusters } = calculateClubSimilarity(clubKeywords, savedKeywords);
      
      // Format matched clusters for display
      const displayCategories = matchedClusters.map((c) =>
        c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
      );

      return { club, score, matchedCategories: displayCategories };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
