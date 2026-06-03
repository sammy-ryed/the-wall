export interface Confession {
  id: string;
  name: string;
  confession: string;
  cringe_score: number;
  survival_probability: number;
  roast: string;
  verdict: string;
  era: string;
  timestamp: string;
}

export const SEEDED_CONFESSIONS: Confession[] = [
  {
    id: "seed-1",
    name: "Rahul",
    confession: "I pushed to production on a Friday at 5pm and immediately went offline.",
    cringe_score: 97,
    survival_probability: 4,
    roast: "Chaos agent. The ops team has your photo on a dartboard.",
    verdict: "Career Kamikaze",
    era: "Friday Terror",
    timestamp: "2 hours ago"
  },
  {
    id: "seed-2",
    name: "Priya",
    confession: "I've been saying 'I'll refactor this later' for 3 years. It's still there.",
    cringe_score: 61,
    survival_probability: 71,
    roast: "Technical debt is just emotional debt in a trench coat.",
    verdict: "Debt Accumulator",
    era: "Legacy Lord",
    timestamp: "4 hours ago"
  },
  {
    id: "seed-3",
    name: "Arjun",
    confession: "I ghosted a recruiter from Google because I panicked during the Zoom call.",
    cringe_score: 78,
    survival_probability: 55,
    roast: "You dodged Google and hit yourself in the face on the way out.",
    verdict: "Ghost Protocol",
    era: "Fumbles Arc",
    timestamp: "6 hours ago"
  },
  {
    id: "seed-4",
    name: "Sneha",
    confession: "I told my manager I was 'almost done' for 4 consecutive days.",
    cringe_score: 82,
    survival_probability: 60,
    roast: "'Almost done' is a personality disorder at this point.",
    verdict: "Temporal Illusionist",
    era: "Delusional Arc",
    timestamp: "1 day ago"
  },
  {
    id: "seed-5",
    name: "Vikram",
    confession: "I copy-pasted from StackOverflow without reading it. It's in prod. It works. I don't know why.",
    cringe_score: 88,
    survival_probability: 80,
    roast: "Cargo cult programming achieved sentience. Congrats.",
    verdict: "Voodoo Developer",
    era: "StackOverflow Worship",
    timestamp: "1 day ago"
  },
  {
    id: "seed-6",
    name: "Anonymous",
    confession: "I fake-laughed at my CEO's joke so convincingly he used it as his talk opener at a conference.",
    cringe_score: 91,
    survival_probability: 68,
    roast: "You are now legally his court jester.",
    verdict: "Corporate Clown",
    era: "Sycophant Arc",
    timestamp: "2 days ago"
  },
  {
    id: "seed-7",
    name: "Kavya",
    confession: "I've attended every 'mandatory fun' team event while texting from the bathroom.",
    cringe_score: 55,
    survival_probability: 88,
    roast: "Tactical introvert. Respect.",
    verdict: "Bathroom Bandit",
    era: "Tactical Escape",
    timestamp: "2 days ago"
  },
  {
    id: "seed-8",
    name: "Dev",
    confession: "I broke prod, blamed it on a 'network issue', fixed it in 6 minutes, and nobody ever knew.",
    cringe_score: 73,
    survival_probability: 92,
    roast: "This is not a confession. This is a flex.",
    verdict: "Shadow Operator",
    era: "Sigma Dev Grind",
    timestamp: "3 days ago"
  }
];
