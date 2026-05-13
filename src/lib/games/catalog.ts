import { Flame, HeartHandshake, MessageCircleHeart, Moon, Sparkles, Telescope, Trophy } from 'lucide-react';

export type Game = {
  slug: string;
  title: string;
  description: string;
  duration: string;
  tone: 'Tender' | 'Playful' | 'Deep' | 'Celebratory' | 'Flirty' | 'Visionary';
  icon: typeof HeartHandshake;
  steps: string[];
};

export const games: Game[] = [
  {
    slug: 'question-jar',
    title: 'Question Jar',
    description: 'Draw thoughtful prompts that help you rediscover each other one answer at a time.',
    duration: '10 min',
    tone: 'Tender',
    icon: MessageCircleHeart,
    steps: ['Pick a mood', 'Answer privately', 'Reveal and react', 'Save favorite answers']
  },
  {
    slug: 'memory-lane',
    title: 'Memory Lane',
    description: 'Build a shared timeline around meaningful firsts, tiny rituals, and favorite chapters.',
    duration: '15 min',
    tone: 'Deep',
    icon: HeartHandshake,
    steps: ['Choose a season', 'Add a memory', 'Attach a feeling', 'Plan a revisit']
  },
  {
    slug: 'date-spark',
    title: 'Date Spark',
    description: 'Spin up cozy date ideas tailored to the time, budget, energy, and vibe you both have.',
    duration: '5 min',
    tone: 'Playful',
    icon: Sparkles,
    steps: ['Set constraints', 'Generate ideas', 'Vote together', 'Schedule the winner']
  },
  {
    slug: 'love-awards',
    title: 'Love Awards',
    description: 'Celebrate the sweet things your partner does with delightful custom award cards.',
    duration: '8 min',
    tone: 'Celebratory',
    icon: Trophy,
    steps: ['Choose an award', 'Write a note', 'Reveal dramatically', 'Keep it in your archive']
  },
  {
    slug: 'intimacy-cards',
    title: 'Intimacy Cards',
    description: 'A deeper romantic deck for private answers, shared reveals, reactions, and favorite moments.',
    duration: '12 min',
    tone: 'Flirty',
    icon: Flame,
    steps: ['Draw a card', 'Answer privately', 'Reveal together', 'React and favorite']
  },
  {
    slug: 'late-night-talks',
    title: 'Late Night Talks',
    description: 'Slow down with long-form questions about fears, dreams, healing, purpose, and future devotion.',
    duration: '25 min',
    tone: 'Deep',
    icon: Moon,
    steps: ['Settle in', 'Write deeply', 'Reveal softly', 'Save as memory']
  },
  {
    slug: 'flirty-chaos',
    title: 'Flirty Chaos',
    description: 'Rapid-fire teasing prompts where you guess your partner, reveal scores, and celebrate matches.',
    duration: '7 min',
    tone: 'Playful',
    icon: Sparkles,
    steps: ['Draw chaos', 'Answer fast', 'Guess partner', 'Reveal score']
  },
  {
    slug: 'future-us',
    title: 'Future Us',
    description: 'Compare life visions, align on long-term dreams, and save shared goals for the love you are building.',
    duration: '18 min',
    tone: 'Visionary',
    icon: Telescope,
    steps: ['Choose a vision', 'Answer honestly', 'Compare alignment', 'Save a goal']
  }
];

export function getGame(slug: string) {
  return games.find((game) => game.slug === slug);
}
