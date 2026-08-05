import { useState } from 'react';
import { Icon } from './Icon';
import { BodyMark } from './BodyMark';

interface Page {
  title: string;
  body: string;
  aside?: string;
  art?: 'body' | 'week' | 'split';
}

/**
 * Four pages, shown once. It explains the one thing the app would otherwise
 * be judged wrongly on — that the routines are split by when you run them,
 * not by body part — and sets the expectation that the goal is showing up,
 * not clocking minutes.
 */
const PAGES: Page[] = [
  {
    title: 'a few quiet minutes',
    body: 'Ten minutes of mobility a day, guided by a timer so you are not counting in your head. Built around climbing and running, useful for anyone who sits too much.',
    art: 'body',
  },
  {
    title: 'timing is the whole idea',
    body: 'Dynamic work goes before you climb or run — it costs you nothing. The loaded, held work that actually builds range goes on rest days, because long holds take the edge off your strength for a while.',
    aside: 'That is why there are separate routines rather than one list.',
    art: 'split',
  },
  {
    title: 'the goal is one session',
    body: 'Not a minute count. Show up, however short the routine, and the day counts. Miss one and a streak freeze covers you — you start with two.',
    aside: 'Missing a single day does not undo a habit.',
    art: 'week',
  },
  {
    title: 'the numbers that matter',
    body: 'Stats tracks minutes per body area across the week, against the point where flexibility gains flatten out. It shows what is undertrained rather than a total that only ever grows.',
    aside: 'An account is optional — it backs your history up and lets you follow friends.',
  },
];

function Art({ kind }: { kind: Page['art'] }) {
  if (kind === 'body') {
    return <BodyMark areas={['hips', 'adductors']} size="lg" />;
  }
  if (kind === 'split') {
    return (
      <div className="flex items-center gap-4 text-xs lowercase text-ink-soft">
        <span className="border border-line px-3 py-2">before training</span>
        <span className="h-px w-6 bg-line" />
        <span className="border border-pine px-3 py-2 text-pine-deep">rest day</span>
      </div>
    );
  }
  if (kind === 'week') {
    return (
      <div className="flex gap-2">
        {[1, 1, 1, 0, 1, 1, 0].map((done, i) => (
          <span
            key={i}
            className={`h-6 w-6 border ${
              done ? 'border-pine bg-pine' : 'border-line-soft'
            }`}
          />
        ))}
      </div>
    );
  }
  return null;
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const page = PAGES[index];
  const last = index === PAGES.length - 1;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-paper safe-top">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8 pt-6">
        <div className="flex justify-end">
          <button
            onClick={onDone}
            className="text-xs lowercase text-ink-soft hover:text-ink"
          >
            skip
          </button>
        </div>

        <div key={index} className="animate-reveal flex flex-1 flex-col justify-center">
          {page.art && (
            <div className="mb-12 flex justify-center">
              <Art kind={page.art} />
            </div>
          )}
          <h1 className="text-2xl lowercase">{page.title}</h1>
          <p className="measure mt-4 leading-relaxed text-ink-soft">{page.body}</p>
          {page.aside && (
            <p className="measure mt-4 border-t border-line-soft pt-4 text-sm leading-relaxed text-ink-soft">
              {page.aside}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {PAGES.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-ink' : 'bg-line'}`}
              />
            ))}
          </div>
          <button
            onClick={() => (last ? onDone() : setIndex(index + 1))}
            className="flex items-center gap-2.5 bg-pine-deep px-8 py-3.5 text-sm lowercase tracking-wide text-paper hover:brightness-110"
          >
            {last ? 'start' : 'next'}
            {!last && <Icon name="chevronRight" size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
