import { Film, RefreshCw, Repeat } from 'lucide-react';

export const loopModes = [
  {
    id: 'loop' as const,
    name: 'Loop',
    description: 'Ulangi video beberapa kali',
    icon: Repeat,
    color: 'primary',
  },
  {
    id: 'boomerang' as const,
    name: 'Boomerang',
    description: 'Maju-mundur seamless',
    icon: RefreshCw,
    color: 'secondary',
  },
  {
    id: 'gif' as const,
    name: 'GIF',
    description: 'Export ke format GIF',
    icon: Film,
    color: 'warning',
  },
];
