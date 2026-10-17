/**
 * PricingPage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Subscription pricing page — fetches live plan data from /api/pricing
 * (which proxies through the AI engine so prices stay in sync).
 *
 * Layout: Header → Monthly/Annual toggle → 2 plan cards → FAQ.
 * Theme: Art Deco "Dark Cherry Red + Champagne Gold" — matches the / landing
 *        (tokens source of truth: src/landing/landing.css `.cine-root`).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useCallback } from 'react';
import LadiesPlanetLogo from '../components/LadiesPlanetLogo';
import PlanUpgradeModal from '../components/PlanUpgradeModal';

const API = import.meta.env.VITE_API_URL || '/api';

const C = {
    bg:        '#320004',                    // deepest cherry base (behind velvet gradient)
    panel:     'rgba(92,6,18,0.42)',         // --cine-glass-bg
    panel2:    'rgba(110,8,22,0.55)',        // lighter cherry
    border:    'rgba(212,175,106,0.20)',     // --cine-glass-border (gold hairline)
    text:      '#F7EFE7',                     // --cine-ivory
    textDim:   'rgba(247,239,231,0.60)',
    textDim2:  'rgba(247,239,231,0.35)',
    accent:    '#D4AF6A',                     // --cine-gold (primary accent)
    accentHi:  '#ECD9A8',                     // --cine-gold-hi (for gold gradient)
    primary:   '#7F0C1C',                     // --cine-wine-1
    pink:      '#D69B74',                     // --cine-rose-gold (savings/warning accent)
    success:   '#D4AF6A',                     // gold (no green in theme)
    ink:       '#320004',                     // deep cherry — text on gold surfaces
};

const FONTS = {
    display: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    body:    '"Inter", "Jost", system-ui, sans-serif',
};

export default function PricingPage() {
    const [plans, setPlans] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [billing, setBilling] = useState('annual'); // 'monthly' | 'annual'

    // Upgrade modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API}/pricing`);
                const json = await res.json();
                if (!json.success) throw new Error(json.error || 'Failed to load pricing');
                setPlans(json.data.plans || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const openUpgradeModal = useCallback(async (plan, isAnnual) => {
        setModalOpen(true);
        setPreviewLoading(true);
        setPreviewError(null);
        setPreviewData(null);
        try {
            const res = await fetch(
                `${API}/pricing/upgrade-preview?planId=${encodeURIComponent(plan.id)}&billing=${isAnnual ? 'annual' : 'monthly'}`
            );
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Failed to load preview');
            setPreviewData(json.data);
        } catch (err) {
            setPreviewError(err.message);
        } finally {
            setPreviewLoading(false);
        }
    }, []);

    return (
        <div style={{
            background: `
                radial-gradient(120% 82% at 50% -14%, rgba(150,18,40,0.44), transparent 56%),
                radial-gradient(66% 52% at 82% 12%, rgba(212,175,106,0.11), transparent 60%),
                radial-gradient(85% 62% at 6% 95%, rgba(92,6,18,0.50), transparent 62%),
                linear-gradient(180deg, #5C0612 0%, #4A0008 42%, #320004 100%)`,
            backgroundAttachment: 'fixed',
            color: C.text, minHeight: '100vh',
            fontFamily: FONTS.body, fontSize: '14px',
        }}>
            {/* Header bar */}
            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 28px', borderBottom: `1px solid ${C.border}`,
            }}>
                <a href="/" style={{ textDecoration: 'none' }}>
                    <LadiesPlanetLogo height={28} variant="cream" />
                </a>
                <nav style={{ display: 'flex', gap: 22, color: C.textDim, fontSize: '0.9em' }}>
                    <a href="/studio" style={{ color: C.textDim, textDecoration: 'none' }}>Studio</a>
                    <a href="/pricing" style={{ color: C.text, fontWeight: 600, textDecoration: 'none' }}>Pricing</a>
                    <a href="/" style={{ color: C.textDim, textDecoration: 'none' }}>Gallery</a>
                </nav>
            </header>

            {/* In-platform upgrade modal — iframe masks Higgsfield URL completely */}
        {modalOpen && (
            <PlanUpgradeModal
                previewData={previewData}
                loading={previewLoading}
                error={previewError}
                onClose={() => setModalOpen(false)}
            />
        )}

        <main style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 28px 80px' }}>

                {/* Hero */}
                <div style={{ textAlign: 'center', marginBottom: 50 }}>
                    <h1 style={{
                        fontFamily: FONTS.display, fontSize: '3em',
                        fontWeight: 900, letterSpacing: '-1px', margin: 0,
                        background: `linear-gradient(104deg, ${C.accentHi} 0%, ${C.accent} 45%, ${C.pink} 100%)`,
                        WebkitBackgroundClip: 'text', backgroundClip: 'text',
                        color: 'transparent',
                    }}>Choose Your Plan</h1>
                    <p style={{ color: C.textDim, fontSize: '1.05em', marginTop: 12,
                        fontFamily: FONTS.display, fontStyle: 'italic', fontWeight: 400 }}>
                        Unlock cinematic bridal AI videos at scale
                    </p>
                </div>

                {/* Monthly / Annual toggle */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 44 }}>
                    <div style={{ display: 'inline-flex', background: C.panel2,
                        padding: 4, borderRadius: 30, border: `1px solid ${C.border}` }}>
                        {['monthly', 'annual'].map(p => (
                            <button key={p} onClick={() => setBilling(p)} style={{
                                padding: '10px 24px', borderRadius: 24, border: 'none',
                                background: billing === p ? C.accent : 'transparent',
                                color: billing === p ? C.ink : C.textDim,
                                fontWeight: 700, fontSize: '0.92em',
                                cursor: 'pointer', transition: 'all 0.2s',
                                fontFamily: FONTS.body, textTransform: 'capitalize',
                            }}>
                                {p}{p === 'annual' && (
                                    <span style={{
                                        marginLeft: 6, fontSize: '0.72em',
                                        background: billing === p ? C.ink : C.pink,
                                        color: billing === p ? C.accent : C.ink,
                                        padding: '2px 8px', borderRadius: 12, fontWeight: 800,
                                    }}>Save up to 23%</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Plan cards */}
                {loading && (
                    <div style={{ textAlign: 'center', color: C.textDim, padding: 60 }}>
                        Loading plans…
                    </div>
                )}
                {error && (
                    <div style={{ textAlign: 'center', color: '#ef9a9a',
                        padding: 30, background: 'rgba(239,83,80,0.1)', borderRadius: 12 }}>
                        ⚠ Failed to load pricing: {error}
                    </div>
                )}

                {plans && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${plans.length}, minmax(320px, 1fr))`,
                        gap: 24, maxWidth: 900, margin: '0 auto',
                    }}>
                        {plans.map(plan => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                billing={billing}
                                onUpgrade={(plan, isAnnual) => openUpgradeModal(plan, isAnnual)}
                            />
                        ))}
                    </div>
                )}

                {/* FAQ section */}
                <FAQ />
            </main>
        </div>
    );
}

// ─── Plan card ─────────────────────────────────────────
function PlanCard({ plan, billing, onUpgrade }) {
    const isAnnual = billing === 'annual';
    const price       = isAnnual ? plan.annualPriceUSD : plan.monthlyPriceUSD;
    const original    = isAnnual ? plan.annualOriginalUSD : plan.monthlyOriginalUSD;
    const featuresList = isAnnual ? plan.features.annual : plan.features.monthly;
    const credits     = isAnnual ? plan.credits_detail.annual : plan.credits_detail.monthly;
    const popular     = plan.mostPopular;

    return (
        <div style={{
            background: popular
                ? `linear-gradient(180deg, ${C.panel2} 0%, ${C.panel} 100%)`
                : C.panel,
            border: popular
                ? `2px solid ${C.accent}`
                : `1px solid ${C.border}`,
            borderRadius: 18, padding: 32,
            position: 'relative',
            boxShadow: popular ? `0 24px 60px ${C.accent}22` : 'none',
        }}>
            {/* Popular badge */}
            {popular && (
                <div style={{
                    position: 'absolute', top: -14, left: '50%',
                    transform: 'translateX(-50%)',
                    background: C.accent, color: C.ink,
                    padding: '5px 16px', borderRadius: 20,
                    fontSize: '0.74em', fontWeight: 800,
                    letterSpacing: '0.5px', textTransform: 'uppercase',
                }}>
                    ★ Most Popular
                </div>
            )}

            {/* Plan name */}
            <div style={{
                fontFamily: FONTS.display, fontSize: '2em',
                fontWeight: 900, letterSpacing: '-0.5px',
                color: popular ? C.accent : C.text,
                marginBottom: 4,
            }}>{plan.name}</div>
            <div style={{ color: C.textDim, fontSize: '0.95em',
                fontFamily: FONTS.display, fontStyle: 'italic',
                marginBottom: 22 }}>
                {plan.tagline}
            </div>

            {/* Price */}
            <div style={{ marginBottom: 22 }}>
                {isAnnual && original && original > price && (
                    <div style={{ color: C.textDim2, fontSize: '0.9em',
                        textDecoration: 'line-through' }}>${original}/mo</div>
                )}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: FONTS.display, fontSize: '3em',
                        fontWeight: 900, color: C.text }}>${price}</span>
                    <span style={{ color: C.textDim, fontSize: '1em' }}>/month</span>
                </div>
                {isAnnual && (
                    <div style={{ color: C.success, fontSize: '0.84em', marginTop: 4 }}>
                        Billed annually · Save ${plan.annualSavingsUSD}/year ({plan.annualDiscount}% off)
                    </div>
                )}
            </div>

            {/* Credits highlight */}
            <div style={{
                background: 'rgba(212,175,106,0.08)',
                border: `1px solid ${C.accent}33`,
                borderRadius: 12, padding: 14, marginBottom: 22,
            }}>
                <div style={{ fontSize: '1.4em', fontWeight: 800, color: C.accent,
                    fontFamily: FONTS.body }}>
                    {(credits?.amount ?? plan.credits).toLocaleString()} credits
                </div>
                <div style={{ color: C.textDim, fontSize: '0.84em', marginTop: 2 }}>
                    per month · {credits?.tooltip || `~${Math.floor(plan.credits/5)} videos`}
                </div>
                {credits?.promoItems && (
                    <div style={{ marginTop: 8, paddingTop: 8,
                        borderTop: `1px solid ${C.accent}22`, fontSize: '0.8em', color: C.textDim }}>
                        {credits.promoItems.map((item, i) => (
                            <div key={i}>
                                <strong style={{ color: C.text }}>{item.prefix}</strong> {item.text}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* CTA */}
            <button onClick={() => onUpgrade(plan, isAnnual)} style={{
                display: 'block', width: '100%', textAlign: 'center',
                background: popular ? C.accent : 'transparent',
                color: popular ? C.ink : C.text,
                border: popular ? 'none' : `1px solid ${C.border}`,
                padding: '14px', borderRadius: 12,
                fontWeight: 800, fontSize: '0.98em', fontFamily: FONTS.body,
                letterSpacing: '0.3px', marginBottom: 24,
                boxShadow: popular ? `0 8px 24px ${C.accent}44` : 'none',
                transition: 'all 0.2s', cursor: 'pointer',
            }}>
                {popular ? 'Activate Plan →' : 'Get Started →'}
            </button>

            {/* Features list */}
            <div style={{ fontSize: '0.78em', color: C.textDim2, marginBottom: 10,
                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                What's included
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {featuresList.map(f => (
                    <FeatureRow key={f.id} feature={f} />
                ))}
            </ul>

            {/* Unlimited/extras section */}
            {(isAnnual ? plan.unlimited.annual : plan.unlimited.monthly) && (
                <div style={{ marginTop: 22, paddingTop: 18,
                    borderTop: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: '0.74em', color: C.accent,
                        marginBottom: 12, fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                        {(isAnnual ? plan.unlimited.annual : plan.unlimited.monthly).title || 'Unlimited Access'}
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {(isAnnual ? plan.unlimited.annual : plan.unlimited.monthly).features?.map(f => (
                            <FeatureRow key={f.id} feature={f} />
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// ─── Single feature row ────────────────────────────────
function FeatureRow({ feature }) {
    const included = feature.status === 'included';
    return (
        <li style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 0', fontSize: '0.88em',
            color: included ? C.text : C.textDim2,
            opacity: included ? 1 : 0.45,
        }}>
            <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: included ? C.accent : 'transparent',
                border: included ? 'none' : `1px solid ${C.textDim2}`,
                color: C.ink, flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8em', fontWeight: 800,
            }}>
                {included ? '✓' : '×'}
            </span>
            <span style={{ flex: 1 }}>{feature.text}</span>
            {feature.badges?.map((b, i) => (
                <span key={i} style={{
                    fontSize: '0.66em', padding: '3px 7px',
                    borderRadius: 8, fontWeight: 800,
                    background: b.color === 'primary' ? C.accent
                        : b.color === 'warning' ? C.pink
                        : b.color === 'muted' ? C.panel2
                        : b.color || C.panel2,
                    color: b.color === 'primary' ? C.ink
                        : b.color === 'warning' ? C.ink
                        : C.textDim,
                    letterSpacing: '0.3px', whiteSpace: 'nowrap',
                }}>{b.label}</span>
            ))}
        </li>
    );
}

// ─── FAQ ───────────────────────────────────────────────
function FAQ() {
    const faqs = [
        {
            q: 'How are credits used?',
            a: 'Each video generation consumes credits based on duration, resolution, and quality. Most 5-second 720p videos cost 6–18 credits. Higher resolution and longer duration cost more. You can see the exact cost before generating.',
        },
        {
            q: 'Can I switch plans later?',
            a: 'Yes. Upgrade or downgrade anytime from your account settings. Unused credits roll over each month.',
        },
        {
            q: 'What\'s the difference between monthly and annual billing?',
            a: 'Annual saves you 20–23%. You\'re billed once per year at the discounted rate, and credits replenish each month.',
        },
        {
            q: 'Can I buy extra credits if I run out?',
            a: 'Yes — top-up credit packs are available anytime in addition to your subscription. Credits from top-ups stack with your monthly plan credits.',
        },
        {
            q: 'Do I need a credit card to start?',
            a: 'Yes, all plans require a payment method to activate. You can cancel anytime.',
        },
        {
            q: 'Is there a free trial?',
            a: 'New accounts start with 125 free credits (enough for a few test videos) so you can try the platform before subscribing.',
        },
    ];

    return (
        <section style={{ marginTop: 80, maxWidth: 760, margin: '80px auto 0' }}>
            <h2 style={{
                fontFamily: FONTS.display, fontSize: '2.2em',
                fontWeight: 900, textAlign: 'center', marginBottom: 30,
                color: C.text, letterSpacing: '-0.5px',
            }}>Frequently Asked</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {faqs.map((item, i) => (
                    <details key={i} style={{
                        background: C.panel, borderRadius: 12,
                        padding: '14px 20px', border: `1px solid ${C.border}`,
                        cursor: 'pointer',
                    }}>
                        <summary style={{
                            fontWeight: 600, fontSize: '0.98em',
                            color: C.text, fontFamily: FONTS.body,
                            outline: 'none', cursor: 'pointer',
                        }}>
                            {item.q}
                        </summary>
                        <div style={{
                            color: C.textDim, fontSize: '0.92em', marginTop: 10,
                            lineHeight: 1.6,
                        }}>
                            {item.a}
                        </div>
                    </details>
                ))}
            </div>
        </section>
    );
}
