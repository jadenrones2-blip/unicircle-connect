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
