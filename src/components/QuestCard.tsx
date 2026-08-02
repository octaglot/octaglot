import { motion } from 'framer-motion';
import { useGame } from '../lib/store';
import { isComplete, questText, QUEST_REWARD } from '../lib/quests';
import { Gem, Target } from './Icons';

/* Daily quests. The reward is claimed manually: gems landing silently in the
   balance go unnoticed, whereas the claim button also announces that the quest
   is done. */

export function QuestCard() {
  const { quests, claimQuest } = useGame();
  if (!quests.length) return null;

  return (
    <section
      style={{
        border: '2px solid var(--line)',
        borderRadius: 'var(--r-lg)',
        padding: 18,
        marginBottom: 18,
      }}
    >
      <h3 style={{ fontSize: 'var(--t-body)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Target size={18} color="var(--brand)" /> Günlük görevler
      </h3>

      <div style={{ display: 'grid', gap: 14 }}>
        {quests.map((q) => {
          const done = isComplete(q);
          const pct = Math.min(100, (q.progress / q.target) * 100);

          return (
            <div key={q.idx}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--t-small)', color: 'var(--ink-2)' }}>
                  {questText(q.kind, q.target)}
                </span>
                <span style={{ fontWeight: 800, fontSize: 'var(--t-tiny)', color: 'var(--muted)', flexShrink: 0 }}>
                  {q.progress}/{q.target}
                </span>
              </div>

              <div style={{ height: 10, background: 'var(--line)', borderRadius: 'var(--r-pill)', overflow: 'hidden' }}>
                <motion.div
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: done ? 'var(--success)' : 'var(--brand)',
                    borderRadius: 'var(--r-pill)',
                  }}
                />
              </div>

              {done && !q.claimed && (
                <button
                  className="btn btn--full"
                  style={{ marginTop: 8, padding: '8px 14px', fontSize: 'var(--t-tiny)' }}
                  onClick={() => claimQuest(q.idx)}
                >
                  <Gem size={16} /> {QUEST_REWARD} · Al
                </button>
              )}
              {q.claimed && (
                <div style={{ marginTop: 6, fontSize: 'var(--t-tiny)', fontWeight: 800, color: 'var(--success-text)' }}>
                  Alındı
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
