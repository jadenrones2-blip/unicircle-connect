// Mock data for UniCircle MVP

export interface Club {
  id: string;
  name: string;
  category: string;
  description: string;
  memberCount: number;
  imageUrl: string;
  tags: string[];
  isRecruiting: boolean;
  meetingSchedule: string;
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
    name: "Tech Innovators Club",
    category: "Technology",
    description: "A community of tech enthusiasts exploring cutting-edge technologies, from AI to blockchain. We host hackathons, workshops, and industry speaker events.",
    memberCount: 156,
    imageUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&h=300&fit=crop",
    tags: ["AI", "Hackathons", "Coding"],
    isRecruiting: true,
    meetingSchedule: "Wednesdays, 6PM"
  },
  {
    id: "2",
    name: "Debate Society",
    category: "Academic",
    description: "Sharpen your critical thinking and public speaking skills. We compete in national tournaments and host weekly practice sessions.",
    memberCount: 89,
    imageUrl: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=300&fit=crop",
    tags: ["Public Speaking", "Competitions", "Critical Thinking"],
    isRecruiting: true,
    meetingSchedule: "Tuesdays & Thursdays, 5PM"
  },
  {
    id: "3",
    name: "Photography Club",
    category: "Arts & Creative",
    description: "Capture the world through your lens. We organize photo walks, exhibitions, and workshops for all skill levels.",
    memberCount: 124,
    imageUrl: "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=400&h=300&fit=crop",
    tags: ["Photography", "Art", "Exhibitions"],
    isRecruiting: false,
    meetingSchedule: "Saturdays, 10AM"
  },
  {
    id: "4",
    name: "Entrepreneurship Society",
    category: "Business",
    description: "For aspiring founders and business minds. Pitch competitions, mentorship programs, and networking with industry leaders.",
    memberCount: 203,
    imageUrl: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop",
    tags: ["Startups", "Networking", "Pitch Competitions"],
    isRecruiting: true,
    meetingSchedule: "Mondays, 7PM"
  },
  {
    id: "5",
    name: "Environmental Action",
    category: "Community Service",
    description: "Making our campus and community greener. Join us for sustainability initiatives, clean-ups, and advocacy campaigns.",
    memberCount: 78,
    imageUrl: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&h=300&fit=crop",
    tags: ["Sustainability", "Volunteering", "Advocacy"],
    isRecruiting: true,
    meetingSchedule: "Fridays, 4PM"
  },
  {
    id: "6",
    name: "Dance Crew",
    category: "Performing Arts",
    description: "Express yourself through movement! We cover various dance styles and perform at university events throughout the year.",
    memberCount: 67,
    imageUrl: "https://images.unsplash.com/photo-1535525153412-5a42439a210d?w=400&h=300&fit=crop",
    tags: ["Dance", "Performance", "Hip-Hop"],
    isRecruiting: true,
    meetingSchedule: "Mon, Wed, Fri - 8PM"
  },
  {
    id: "7",
    name: "Investment Club",
    category: "Business",
    description: "Learn about financial markets, portfolio management, and investment strategies. We manage a real student investment fund.",
    memberCount: 145,
    imageUrl: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&h=300&fit=crop",
    tags: ["Finance", "Investing", "Markets"],
    isRecruiting: false,
    meetingSchedule: "Thursdays, 6PM"
  },
  {
    id: "8",
    name: "Cultural Exchange Society",
    category: "Cultural",
    description: "Celebrating diversity through cultural festivals, language exchanges, and international food events.",
    memberCount: 189,
    imageUrl: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=300&fit=crop",
    tags: ["Culture", "Languages", "Events"],
    isRecruiting: true,
    meetingSchedule: "Sundays, 3PM"
  }
];

export const events: Event[] = [
  {
    id: "1",
    title: "Spring Recruitment Fair",
    clubId: "1",
    clubName: "Tech Innovators Club",
    date: "2025-02-15",
    time: "10:00 AM - 4:00 PM",
    location: "Student Union Hall",
    type: "recruitment",
    description: "Meet all the tech-focused clubs on campus! Perfect opportunity to find your community.",
    imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop"
  },
  {
    id: "2",
    title: "Hackathon 2025",
    clubId: "1",
    clubName: "Tech Innovators Club",
    date: "2025-02-22",
    time: "9:00 AM - 9:00 PM",
    location: "Engineering Building",
    type: "event",
    description: "24-hour coding challenge with amazing prizes. Form teams and build something incredible!"
  },
  {
    id: "3",
    title: "Public Speaking Workshop",
    clubId: "2",
    clubName: "Debate Society",
    date: "2025-02-10",
    time: "5:00 PM - 7:00 PM",
    location: "Library Room 204",
    type: "workshop",
    description: "Overcome your fear of public speaking with practical exercises and expert tips."
  },
  {
    id: "4",
    title: "Campus Photo Walk",
    clubId: "3",
    clubName: "Photography Club",
    date: "2025-02-08",
    time: "2:00 PM - 5:00 PM",
    location: "Meet at Main Gate",
    type: "social",
    description: "Explore hidden gems on campus and capture beautiful shots together."
  },
  {
    id: "5",
    title: "Startup Pitch Night",
    clubId: "4",
    clubName: "Entrepreneurship Society",
    date: "2025-02-20",
    time: "6:00 PM - 9:00 PM",
    location: "Business School Auditorium",
    type: "event",
    description: "Watch student startups pitch to real investors. Network with founders and VCs."
  },
  {
    id: "6",
    title: "Beach Cleanup Drive",
    clubId: "5",
    clubName: "Environmental Action",
    date: "2025-02-12",
    time: "8:00 AM - 12:00 PM",
    location: "City Beach",
    type: "social",
    description: "Join us for our monthly beach cleanup. Transportation and refreshments provided!"
  },
  {
    id: "7",
    title: "Dance Showcase Auditions",
    clubId: "6",
    clubName: "Dance Crew",
    date: "2025-02-18",
    time: "7:00 PM - 10:00 PM",
    location: "Student Center Dance Studio",
    type: "recruitment",
    description: "Audition for our spring showcase! All dance styles welcome."
  },
  {
    id: "8",
    title: "International Food Festival",
    clubId: "8",
    clubName: "Cultural Exchange Society",
    date: "2025-02-25",
    time: "11:00 AM - 6:00 PM",
    location: "Campus Quad",
    type: "event",
    description: "Taste cuisines from around the world! Each country booth features authentic dishes."
  }
];

export const categories = [
  "All",
  "Technology",
  "Academic",
  "Arts & Creative",
  "Business",
  "Community Service",
  "Performing Arts",
  "Cultural",
  "Sports & Fitness"
];
