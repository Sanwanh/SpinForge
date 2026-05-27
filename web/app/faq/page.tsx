'use client';

import * as React from 'react';
import { PageHeader, Section } from '@/components/design/atoms';
import { useT } from '@/lib/i18n';

interface FAQItemModel {
  q: string;
  a: string;
}

interface FAQCategory {
  label: string;
  color: string;
  items: FAQItemModel[];
}

function FAQItem({
  q,
  a,
  open,
  onClick,
}: FAQItemModel & { open: boolean; onClick: () => void }) {
  return (
    <div
      style={{ borderTop: '1px solid var(--border-soft)', cursor: 'pointer' }}
      onClick={onClick}
    >
      <div
        style={{
          padding: '26px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--f-ui)',
            fontWeight: 700,
            fontSize: 18,
            color: open ? 'var(--gold)' : 'var(--text)',
          }}
        >
          {q}
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: `1px solid ${open ? 'var(--gold)' : 'var(--border)'}`,
            display: 'grid',
            placeItems: 'center',
            color: open ? 'var(--gold)' : 'var(--text-mute)',
            fontSize: 18,
            fontWeight: 200,
            transform: open ? 'rotate(45deg)' : 'rotate(0)',
            transition: 'transform 0.25s, border-color 0.2s',
            flexShrink: 0,
          }}
        >
          +
        </div>
      </div>
      {open && (
        <div
          style={{
            paddingBottom: 26,
            color: 'var(--text-mute)',
            fontSize: 15,
            lineHeight: 1.7,
            maxWidth: 780,
          }}
        >
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const t = useT();
  const [open, setOpen] = React.useState(0);
  let counter = 0;

  const categories: FAQCategory[] = [
    {
      label: t.faq.catGettingStarted,
      color: 'var(--gold)',
      items: [
        { q: t.faq.q1, a: t.faq.a1 },
        { q: t.faq.q2, a: t.faq.a2 },
        { q: t.faq.q3, a: t.faq.a3 },
      ],
    },
    {
      label: t.faq.catGameMechanics,
      color: 'var(--blood)',
      items: [
        { q: t.faq.q4, a: t.faq.a4 },
        { q: t.faq.q5, a: t.faq.a5 },
        { q: t.faq.q6, a: t.faq.a6 },
      ],
    },
    {
      label: t.faq.catOnChain,
      color: 'var(--rare)',
      items: [
        { q: t.faq.q7, a: t.faq.a7 },
        { q: t.faq.q8, a: t.faq.a8 },
        { q: t.faq.q9, a: t.faq.a9 },
      ],
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={t.faq.pageEyebrow}
        title={
          <>
            {t.faq.pageTitle1}
            <br />
            {t.faq.pageTitle2}
          </>
        }
        sub={t.faq.pageSub}
        kanjiBg="問"
      />
      <Section>
        <div
          className="faq-grid sf-grid"
          style={{
            gridTemplateColumns: '0.7fr 1.6fr',
            gap: 64,
            alignItems: 'flex-start',
          }}
        >
          <div style={{ position: 'sticky', top: 100 }}>
            <div className="t-eyebrow" style={{ marginBottom: 16 }}>
              {t.faq.topics}
            </div>
            {categories.map((c, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 0',
                  borderTop: i === 0 ? '1px solid var(--border-soft)' : undefined,
                  borderBottom: '1px solid var(--border-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: c.color,
                    boxShadow: `0 0 8px ${c.color}88`,
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--f-ui)',
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {c.label}
                </span>
                <span
                  className="t-mono"
                  style={{
                    marginLeft: 'auto',
                    color: 'var(--text-dim)',
                    fontSize: 11,
                  }}
                >
                  {String(c.items.length).padStart(2, '0')}
                </span>
              </div>
            ))}
            <div style={{ marginTop: 32 }}>
              <a href="#" className="btn btn-ghost">
                {t.faq.askDiscord}
              </a>
            </div>
          </div>

          <div>
            {categories.map((c, ci) => (
              <div key={ci} style={{ marginBottom: 56 }}>
                <div
                  className="t-eyebrow"
                  style={{
                    color: c.color,
                    marginBottom: 8,
                    fontSize: 11,
                  }}
                >
                  {c.label}
                </div>
                {c.items.map((it, ii) => {
                  const idx = counter++;
                  return (
                    <FAQItem
                      key={ii}
                      q={it.q}
                      a={it.a}
                      open={open === idx}
                      onClick={() => setOpen(open === idx ? -1 : idx)}
                    />
                  );
                })}
                <div style={{ borderTop: '1px solid var(--border-soft)' }} />
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
