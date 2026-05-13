import { HeartHandshake, MessageCircleHeart, Sparkles, Trophy } from 'lucide-react';

export type Game = {
  slug: string;
  title: string;
  description: string;
  duration: string;
  tone: 'Tender' | 'Playful' | 'Deep' | 'Celebratory';
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
  }
];

export function getGame(slug: string) {
  return games.find((game) => game.slug === slug);
}
