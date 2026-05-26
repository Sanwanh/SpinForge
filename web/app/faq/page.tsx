'use client';

import * as React from 'react';
import { PageHeader, Section } from '@/components/design/atoms';

interface FAQItemModel {
  q: string;
  a: string;
}

interface FAQCategory {
  label: string;
  color: string;
  items: FAQItemModel[];
}

const CATEGORIES: FAQCategory[] = [
  {
    label: 'Getting Started',
    color: 'var(--gold)',
    items: [
      {
        q: '我需要先有一顆實體陀螺才能玩嗎？',
        a: '不一定。模式 03 (純線上模擬) 不需要實體陀螺，只要錢包就能開戰。但模式 01 (實體+鏈上紀錄) 與模式 02 (實體+卡牌) 都需要一顆已註冊的 Rotor —— 那才是 SpinForge 最有感的體驗。',
      },
      {
        q: '我可以用自己手邊的陀螺嗎？還是一定要買官方的？',
        a: '都可以。官方授權陀螺透過 QR/NFC 掃描成為「認證 Rotor」，可參加所有正式賽。自帶陀螺需要手動註冊照片，成為「社群 Rotor」，可參加友誼賽與校園賽，但不能領取官方獎金。',
      },
      {
        q: '完全沒玩過 Web3 也可以開始嗎？',
        a: '可以。我們提供 Google / Email / Sui zkLogin 三種登入方式。錢包與 SPARK 會在你第一次需要的時候才出現 —— 不會一開始就要求你連結 MetaMask。',
      },
    ],
  },
  {
    label: 'Game Mechanics',
    color: 'var(--blood)',
    items: [
      {
        q: '卡牌會直接改變現實的物理結果嗎？',
        a: '不會，這是我們堅持的設計原則。卡牌只影響賽事任務 (例如「本場若用 Burst Finish 獲勝額外 +10 分」) 與賽季積分，不會讓你的實體陀螺突然變強。鏈上資產的價值，來自履歷與資格，不是物理優勢。',
      },
      {
        q: '比賽結果怎麼確認？會不會有人作弊？',
        a: 'MVP 階段是雙方點擊確認。中期會引入裁判帳號 (校園賽、官方賽)。長期目標是手機錄影 + AI 自動判定停轉、出界、爆裂等狀態。任何模式下，結果都需要對手確認才能上鏈。',
      },
      {
        q: 'Launch Power Meter 是什麼？它會影響結果嗎？',
        a: '賽前的擺動式發射力測試，75-95 區為甜蜜點，88-92 為完美值。它對應「角動量加成 (Angular Momentum Multiplier)」, 從 ×0.00 到 ×2.00 影響戰報判定中的某些卡牌條件。長期目標是接上 BLE 真實發射器，讀取你實體出手的真實力道。',
      },
    ],
  },
  {
    label: 'On-Chain & Economy',
    color: 'var(--rare)',
    items: [
      {
        q: 'Spin Passport 是 NFT 嗎？可以轉售嗎？',
        a: '是 Sui Object，本質類似 NFT，但設計上更接近「履歷」而非「圖片」。Rotor Passport 可以轉讓 (代表你把陀螺與履歷一起交給別人)，但徽章與賽事紀錄是 soulbound —— 它們屬於玩家本人，不能單獨交易。',
      },
      {
        q: '為什麼選 Sui？Gas 費會很貴嗎？',
        a: 'Sui 的 Move 模型讓 Rotor、BattleRecord 都可以做成 first-class object，讀寫成本低且支援大量並發，非常適合遊戲場景。一場比賽上鏈的 gas 大約 0.0002 SUI (低於 $0.001 USD)，且我們會補貼新玩家前 100 場。',
      },
      {
        q: '$SPARK 是什麼？它怎麼進入流通？',
        a: '$SPARK 是遊戲內的角動量代幣 —— 抽包、Forge、Marketplace 手續費、賽事報名都需要它。10% 透過公售進入流通，38% 為玩家獎勵，Team/Treasury/Liquidity/Marketing 為其餘部分。TGE 預計 Q3 2026。',
      },
    ],
  },
];

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
  const [open, setOpen] = React.useState(0);
  let counter = 0;
  return (
    <>
      <PageHeader
        eyebrow="11 / FAQ"
        title={
          <>
            Common
            <br />
            questions.
          </>
        }
        sub="找不到答案？來 Discord 直接問我們。"
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
              Topics
            </div>
            {CATEGORIES.map((c, i) => (
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
                Ask in Discord
              </a>
            </div>
          </div>

          <div>
            {CATEGORIES.map((c, ci) => (
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
