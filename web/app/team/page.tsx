import * as React from 'react';
import { PageHeader, Section } from '@/components/design/atoms';

const MEMBERS = [
  { name: 'Ren Tanaka', role: 'Founder · Game Director',   kanji: '鑄', color: 'var(--gold)', handle: '@rentanaka',  bio: '前 Sega 卡牌設計師。第三代 Beyblade 玩家。相信實體陀螺的觸感不該被替代，只該被擴展。' },
  { name: 'Mira Chen',  role: 'Chief Architect · Sui',     kanji: '鏈', color: 'var(--rare)', handle: '@miramint',   bio: '前 Mysten Labs Move VM 工程師。把每場真實對戰寫成一筆不可篡改的歷史。' },
  { name: 'Kai Vargas', role: 'Visual Director',           kanji: '畫', color: 'var(--epic)', handle: '@kaivisuals', bio: '前 miHoYo 概念藝術。把五行神獸畫成既古典又賽博的形態 —— 不是日漫，不是國畫，是 SpinForge。' },
  { name: 'Jules Park', role: 'Tournament & Community',    kanji: '賽', color: 'var(--wood)', handle: '@julespark',  bio: '前 Riot 賽事總監。從 NTUST 校園賽到 Forge Cup S1 全球決賽，把場館變成節慶。' },
];

export default function TeamPage() {
  return (
    <>
      <PageHeader
        eyebrow="10 / TEAM · 鑄工"
        title={
          <>
            Built by people
            <br />
            who spin.
          </>
        }
        sub="不是行銷團隊做的 Web3 遊戲，是 Beyblade 玩家做的鏈上產品。"
        kanjiBg="工"
      />

      <Section>
        <div
          className="team-grid sf-grid"
          style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}
        >
          {MEMBERS.map((m, i) => (
            <div
              key={i}
              className="panel"
              style={{ padding: 28, position: 'relative', overflow: 'hidden' }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -30,
                  right: -30,
                  fontFamily: 'var(--f-han)',
                  fontWeight: 900,
                  fontSize: 220,
                  color: m.color,
                  opacity: 0.06,
                  lineHeight: 1,
                  userSelect: 'none',
                }}
              >
                {m.kanji}
              </div>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${m.color}33, transparent)`,
                  border: `1px solid ${m.color}`,
                  display: 'grid',
                  placeItems: 'center',
                  color: m.color,
                  fontFamily: 'var(--f-han)',
                  fontWeight: 900,
                  fontSize: 40,
                  position: 'relative',
                }}
              >
                {m.kanji}
              </div>
              <div
                className="t-mono"
                style={{
                  fontSize: 10,
                  color: m.color,
                  letterSpacing: '0.15em',
                  marginTop: 22,
                  fontWeight: 700,
                }}
              >
                {m.role.toUpperCase()}
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-display)',
                  fontWeight: 700,
                  fontSize: 26,
                  marginTop: 6,
                  position: 'relative',
                }}
              >
                {m.name}
              </div>
              <div
                className="muted"
                style={{
                  fontSize: 13,
                  marginTop: 14,
                  lineHeight: 1.55,
                  position: 'relative',
                }}
              >
                {m.bio}
              </div>
              <div
                className="t-mono"
                style={{
                  fontSize: 11,
                  color: m.color,
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: '1px solid var(--border-soft)',
                  position: 'relative',
                }}
              >
                {m.handle}
              </div>
            </div>
          ))}
        </div>

        <div
          className="panel"
          style={{
            marginTop: 64,
            padding: 56,
            background:
              'linear-gradient(135deg, rgba(212,175,55,0.08), transparent 60%)',
            textAlign: 'center',
          }}
        >
          <div className="t-eyebrow">OUR BELIEF</div>
          <p
            style={{
              fontFamily: 'var(--f-display)',
              fontWeight: 600,
              fontSize: 28,
              lineHeight: 1.35,
              maxWidth: 920,
              margin: '18px auto 0',
            }}
          >
            &ldquo;The thrill of a spinning top isn&apos;t an interaction pattern —
            <br />
            <span style={{ color: 'var(--gold)' }}>
              it&apos;s a 40-year mechanical heritage.
            </span>
            <br />
            We&apos;re not replacing it. We&apos;re giving it a memory.&rdquo;
          </p>
        </div>
      </Section>

    </>
  );
}
