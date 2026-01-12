// Mock data for UniCircle MVP

export type RecruitingStatus = 'open' | 'upcoming' | 'closed';

export interface Club {
  id: string;
  name: string;
  category: string;
  description: string;
  memberCount: number;
  imageUrl: string;
  tags: string[];
  recruitingStatus: RecruitingStatus;
  meetingSchedule: string;
  meetingStyle: string;
}

export interface Event {
  id: string;
  title: string;
  clubId: string;
  clubName: string;
  date: string;
  time: string;
  location: string;
  type: 'recruitment' | 'event' | 'workshop' | 'social';
  description: string;
  imageUrl?: string;
}

export const clubs: Club[] = [
  {
    id: "1",
    name: "Triton Engineering Student Council",
    category: "STEM",
    description: "The hub for engineering students at UCSD. We host industry panels, career fairs, and connect students with internship opportunities.",
    memberCount: 342,
    imageUrl: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=300&fit=crop",
    tags: ["Engineering", "Career", "Networking"],
    recruitingStatus: "open",
    meetingSchedule: "Wednesdays, 6PM",
    meetingStyle: "Weekly in-person meetings + online Slack community"
  },
  {
    id: "2",
    name: "UCSD Consulting Group",
    category: "Business",
    description: "A student-run consulting organization providing pro-bono services to startups and nonprofits. Gain real client experience.",
    memberCount: 89,
    imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop",
    tags: ["Consulting", "Strategy", "Case Studies"],
    recruitingStatus: "upcoming",
    meetingSchedule: "Tuesdays, 7PM",
    meetingStyle: "Weekly team meetings + project-based work sessions"
  },
  {
    id: "3",
    name: "Triton Gaming",
    category: "Recreation",
    description: "The largest gaming community on campus. Weekly game nights, esports tournaments, and a welcoming space for all gamers.",
    memberCount: 567,
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop",
    tags: ["Gaming", "Esports", "Community"],
    recruitingStatus: "open",
    meetingSchedule: "Fridays, 8PM",
    meetingStyle: "Casual drop-in game nights + Discord community"
  },
  {
    id: "4",
    name: "Design Co",
    category: "Arts",
    description: "UCSD's premier design community. Portfolio reviews, design workshops, and connections to the San Diego design industry.",
    memberCount: 234,
    imageUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=300&fit=crop",
    tags: ["UX/UI", "Graphic Design", "Portfolio"],
    recruitingStatus: "closed",
    meetingSchedule: "Mondays, 6PM",
    meetingStyle: "Workshops + design critiques + studio time"
  },
  {
    id: "5",
    name: "Vietnamese Student Association",
    category: "Cultural",
    description: "Celebrating Vietnamese culture through food, music, and community. Open to everyone interested in learning about our heritage.",
    memberCount: 412,
    imageUrl: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=300&fit=crop",
    tags: ["Culture", "Food", "Community"],
    recruitingStatus: "open",
    meetingSchedule: "Thursdays, 5PM",
    meetingStyle: "General meetings + event planning committees"
  },
  {
    id: "6",
    name: "ACM at UCSD",
    category: "STEM",
    description: "Association for Computing Machinery - the largest CS org on campus. Hackathons, coding workshops, and tech talks.",
    memberCount: 678,
    imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=300&fit=crop",
    tags: ["Computer Science", "Hackathons", "Coding"],
    recruitingStatus: "open",
    meetingSchedule: "Wednesdays, 7PM",
    meetingStyle: "Open events + specialized project teams"
  },
  {
    id: "7",
    name: "Triton Entrepreneur Network",
    category: "Business",
    description: "For founders and aspiring entrepreneurs. Pitch nights, startup mentorship, and connections to San Diego's startup ecosystem.",
    memberCount: 156,
    imageUrl: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop",
    tags: ["Startups", "Pitching", "Mentorship"],
    recruitingStatus: "open",
    meetingSchedule: "Thursdays, 6PM",
    meetingStyle: "Monthly speaker events + weekly office hours"
  },
  {
    id: "8",
    name: "UCSD Dance Team",
    category: "Arts",
    description: "Competitive dance team representing UCSD at regional and national competitions. All styles welcome at tryouts.",
    memberCount: 48,
    imageUrl: "https://images.unsplash.com/photo-1535525153412-5a42439a210d?w=400&h=300&fit=crop",
    tags: ["Dance", "Competition", "Performance"],
    recruitingStatus: "upcoming",
    meetingSchedule: "Mon/Wed/Fri, 8PM",
    meetingStyle: "Regular practice sessions + competitions"
  },
  {
    id: "9",
    name: "Pre-Medical Association",
    category: "STEM",
    description: "Supporting pre-med students with MCAT prep, clinical volunteering opportunities, and medical school application guidance.",
    memberCount: 523,
    imageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop",
    tags: ["Pre-Med", "Healthcare", "Volunteering"],
    recruitingStatus: "closed",
    meetingSchedule: "Tuesdays, 5PM",
    meetingStyle: "Biweekly meetings + volunteer shifts"
  },
  {
    id: "10",
    name: "Filipino Cultural Society",
    category: "Cultural",
    description: "Sharing Filipino culture through dance performances, cultural events, and community service. Everyone is welcome!",
    memberCount: 289,
    imageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop",
    tags: ["Filipino", "Dance", "Culture"],
    recruitingStatus: "open",
    meetingSchedule: "Saturdays, 2PM",
    meetingStyle: "Weekly practice + cultural shows"
  }
];

export const events: Event[] = [
  {
    id: "1",
    title: "Spring Recruitment Fair",
    clubId: "1",
    clubName: "Triton Engineering Student Council",
    date: "2025-02-15",
    time: "10:00 AM - 4:00 PM",
    location: "Price Center Ballroom",
    type: "recruitment",
    description: "Meet all the engineering clubs on campus! Perfect opportunity to find your community.",
    imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop"
  },
  {
    id: "2",
    title: "TritonHacks 2025",
    clubId: "6",
    clubName: "ACM at UCSD",
    date: "2025-02-22",
    time: "9:00 AM - 9:00 PM",
    location: "Qualcomm Room",
    type: "event",
    description: "24-hour coding challenge with prizes from top tech companies. Beginners welcome!"
  },
  {
    id: "3",
    title: "Case Competition Prep Workshop",
    clubId: "2",
    clubName: "UCSD Consulting Group",
    date: "2025-02-10",
    time: "5:00 PM - 7:00 PM",
    location: "Rady School Room 204",
    type: "workshop",
    description: "Learn frameworks and strategies for case competitions. Great for recruitment prep."
  },
  {
    id: "4",
    title: "Game Night at PC",
    clubId: "3",
    clubName: "Triton Gaming",
    date: "2025-02-08",
    time: "7:00 PM - 11:00 PM",
    location: "Price Center Game Room",
    type: "social",
    description: "Weekly game night! Smash Bros tournament, board games, and snacks provided."
  },
  {
    id: "5",
    title: "Startup Pitch Night",
    clubId: "7",
    clubName: "Triton Entrepreneur Network",
    date: "2025-02-20",
    time: "6:00 PM - 9:00 PM",
    location: "The Basement at Rady",
    type: "event",
    description: "Watch student startups pitch to real investors. Network with founders and VCs."
  },
  {
    id: "6",
    title: "Lunar New Year Celebration",
    clubId: "5",
    clubName: "Vietnamese Student Association",
    date: "2025-02-12",
    time: "6:00 PM - 10:00 PM",
    location: "Price Center Ballroom",
    type: "event",
    description: "Celebrate Lunar New Year with food, performances, and games. Free admission!"
  },
  {
    id: "7",
    title: "Spring Showcase Auditions",
    clubId: "8",
    clubName: "UCSD Dance Team",
    date: "2025-02-18",
    time: "7:00 PM - 10:00 PM",
    location: "RIMAC Arena",
    type: "recruitment",
    description: "Audition for our spring showcase! All dance styles welcome."
  },
  {
    id: "8",
    title: "Barrio Logan Cultural Night",
    clubId: "10",
    clubName: "Filipino Cultural Society",
    date: "2025-02-25",
    time: "5:00 PM - 9:00 PM",
    location: "Barrio Logan, San Diego",
    type: "social",
    description: "Explore Filipino culture in San Diego's Barrio Logan. Transportation provided."
  }
];

export const categories = [
  "All",
  "STEM",
  "Business",
  "Arts",
  "Cultural",
  "Recreation"
];
