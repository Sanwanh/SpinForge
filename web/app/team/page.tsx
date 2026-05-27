'use client';

import * as React from 'react';
import { PageHeader, Section } from '@/components/design/atoms';
import { useT } from '@/lib/i18n';

export default function TeamPage() {
  const t = useT();

  const members = [
    { name: t.team.member1Name, role: t.team.member1Role, kanji: '鑄', color: 'var(--gold)', handle: '@rentanaka',  bio: t.team.member1Bio },
    { name: t.team.member2Name, role: t.team.member2Role, kanji: '鏈', color: 'var(--rare)', handle: '@miramint',   bio: t.team.member2Bio },
    { name: t.team.member3Name, role: t.team.member3Role, kanji: '畫', color: 'var(--epic)', handle: '@kaivisuals', bio: t.team.member3Bio },
    { name: t.team.member4Name, role: t.team.member4Role, kanji: '賽', color: 'var(--wood)', handle: '@julespark',  bio: t.team.member4Bio },
  ];

  return (
    <>
      <PageHeader
        eyebrow={t.team.pageEyebrow}
        title={
          <>
            {t.team.pageTitle1}
            <br />
            {t.team.pageTitle2}
          </>
        }
        sub={t.team.pageSub}
        kanjiBg="工"
      />

      <Section>
        <div
          className="team-grid sf-grid"
          style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}
        >
          {members.map((m, i) => (
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
            background: 'linear-gradient(135deg, rgba(212,175,55,0.08), transparent 60%)',
            textAlign: 'center',
          }}
        >
          <div className="t-eyebrow">{t.team.beliefEyebrow}</div>
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
            {t.team.beliefBody1}
            <br />
            <span style={{ color: 'var(--gold)' }}>{t.team.beliefBody2}</span>
            <br />
            {t.team.beliefBody3}
          </p>
        </div>
      </Section>
    </>
  );
}
