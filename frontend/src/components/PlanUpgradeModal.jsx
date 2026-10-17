import { useRef } from 'react';
import { motion as Motion } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import useModalA11y from '../hooks/useModalA11y';

const C = {
    bg:      'rgba(30,0,4,0.85)',         // warm cherry-ink overlay
    panel:   '#4A0008',                   // --cine-bg (solid cherry dialog card)
    panel2:  'rgba(110,8,22,0.55)',       // lighter cherry (rows)
    border:  'rgba(212,175,106,0.20)',    // --cine-glass-border (gold hairline)
    text:    '#F7EFE7',                   // --cine-ivory
    textDim: 'rgba(247,239,231,0.60)',
    accent:  '#D4AF6A',                   // --cine-gold
    pink:    '#D69B74',                   // --cine-rose-gold
    ink:     '#320004',                   // deep cherry — text on gold surfaces
};

const FONTS = {
    display: 'var(--font-display, "Cormorant Garamond", Georgia, serif)',
    body:    'var(--font-body, "Inter", system-ui, sans-serif)',
};

export default function PlanUpgradeModal({ previewData, loading, error, onClose }) {
    const overlayRef = useRef(null);
    const cardRef = useRef(null);
    const { currentPlan, newPlan, prorations } = previewData || {};
    const checkoutUrl = newPlan?.checkoutUrl;

    // Escape / focus-trap / focus-return handled centrally.
    useModalA11y(cardRef, onClose);

    const handleOverlayClick = (e) => {
        if (e.target === overlayRef.current) onClose();
    };

    const handleConfirm = () => {
        if (!checkoutUrl) return;
        // Open Higgsfield checkout in a compact popup — main LP window stays open and visible
        window.open(
            checkoutUrl,
            'higgsfield-checkout',
            'width=660,height=760,left=200,top=60,resizable=yes,scrollbars=yes'
        );
        onClose();
    };

    return (
        <Motion.div
            ref={overlayRef}
            onClick={handleOverlayClick}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: C.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20,
                backdropFilter: 'blur(4px)',
            }}
        >
            <Motion.div
                ref={cardRef}
                role="dialog" aria-modal="true" aria-label="Upgrading plan" tabIndex={-1}
                initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                style={{
                background: C.panel,
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: '32px 28px',
                width: '100%', maxWidth: 480,
                fontFamily: FONTS.body,
                boxShadow: '0 32px 80px rgba(30,0,4,0.6)',
                position: 'relative', outline: 'none',
            }}>
                <button onClick={onClose} aria-label="Close" style={{
                    position: 'absolute', top: 16, right: 16,
                    background: C.panel2, border: `1px solid ${C.border}`,
                    borderRadius: 10, width: 40, height: 40,
                    color: C.text, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><X size={18} /></button>

                <h2 style={{
                    fontFamily: FONTS.display, fontSize: '1.5em',
                    fontWeight: 900, color: C.text,
                    margin: '0 0 6px',
                }}>Upgrading plan</h2>
                <p style={{ color: C.textDim, fontSize: '0.88em', margin: '0 0 24px' }}>
                    Your new plan starts now. Unused credits are applied as a discount.
                </p>

                {loading && (
                    <div style={{ textAlign: 'center', color: C.textDim, padding: '30px 0' }}>
                        Loading plan details…
                    </div>
                )}

                {error && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'rgba(239,83,80,0.1)', color: '#ef9a9a',
                        borderRadius: 10, padding: 14, fontSize: '0.88em', marginBottom: 16,
                    }}>
                        <AlertTriangle size={15} style={{ flexShrink: 0 }} /> {error}
                    </div>
                )}

                {!loading && previewData && (
                    <>
                        <PlanRow
                            label="Current plan"
                            name={`${currentPlan?.name || 'Basic'} · ${currentPlan?.billing || 'Monthly'}`}
                            price={currentPlan?.priceUSD != null ? `$${currentPlan.priceUSD}` : null}
                        />

                        <PlanRow
                            label="New plan"
                            name={`${newPlan?.name} · ${newPlan?.billing}`}
                            subtext={`${(newPlan?.credits || 0).toLocaleString()} credits/mo`}
                            originalPrice={newPlan?.originalPriceUSD && newPlan.originalPriceUSD !== newPlan.finalPriceUSD
                                ? `$${(newPlan.originalPriceUSD * 12).toFixed(0)}`
                                : null}
                            price={newPlan?.finalPriceUSD != null
                                ? `$${(newPlan.finalPriceUSD * (newPlan.billing === 'Annual' ? 12 : 1)).toFixed(0)}`
                                : null}
                            savingsPct={newPlan?.savingsPct}
                        />

                        <PlanRow
                            label="Prorations"
                            name="Unused credits"
                            price={`-$${(prorations?.unusedCredits ?? 0).toFixed(0)}`}
                        />

                        <p style={{
                            fontSize: '0.77em', color: C.textDim,
                            textAlign: 'center', margin: '20px 0',
                            lineHeight: 1.6,
                        }}>
                            By clicking Confirm, you agree to the Terms of Service and Privacy Policy.
                            Any balance or credit will be automatically applied.
                            {newPlan?.billing === 'Annual' && (
                                <> Your subscription renews at ${newPlan?.finalPriceUSD != null
                                    ? (newPlan.finalPriceUSD * 12).toFixed(0) : '—'} per year,
                                and you can cancel anytime.</>
                            )}
                        </p>

                        <button
                            onClick={handleConfirm}
                            disabled={!checkoutUrl}
                            style={{
                                display: 'block', width: '100%',
                                background: checkoutUrl ? C.accent : 'rgba(212,175,106,0.15)',
                                color: checkoutUrl ? C.ink : C.textDim,
                                border: 'none', borderRadius: 12,
                                padding: '15px', fontWeight: 800,
                                fontSize: '1em', fontFamily: FONTS.body,
                                cursor: checkoutUrl ? 'pointer' : 'not-allowed',
                                letterSpacing: '0.3px',
                                boxShadow: checkoutUrl ? `0 8px 24px ${C.accent}44` : 'none',
                                transition: 'opacity 0.2s',
                            }}
                            onMouseOver={e => { if (checkoutUrl) e.currentTarget.style.opacity = '0.88'; }}
                            onMouseOut={e => e.currentTarget.style.opacity = '1'}
                        >
                            Confirm Change
                        </button>

                        <button
                            onClick={onClose}
                            style={{
                                display: 'block', width: '100%',
                                background: 'transparent', color: C.textDim,
                                border: `1px solid ${C.border}`, borderRadius: 12,
                                padding: '13px', fontWeight: 600,
                                fontSize: '0.92em', fontFamily: FONTS.body,
                                cursor: 'pointer', marginTop: 10,
                                transition: 'color 0.2s',
                            }}
                            onMouseOver={e => e.currentTarget.style.color = C.text}
                            onMouseOut={e => e.currentTarget.style.color = C.textDim}
                        >
                            Cancel
                        </button>
                    </>
                )}
            </Motion.div>
        </Motion.div>
    );
}

function PlanRow({ label, name, subtext, price, originalPrice, savingsPct }) {
    return (
        <div style={{
            background: C.panel2,
            border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '14px 16px',
            marginBottom: 10,
        }}>
            <div style={{ fontSize: '0.78em', color: C.textDim,
                fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.8px', marginBottom: 8 }}>
                {label}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: '0.98em' }}>{name}</div>
                    {subtext && (
                        <div style={{ fontSize: '0.82em', color: C.textDim, marginTop: 2 }}>{subtext}</div>
                    )}
                </div>
                <div style={{ textAlign: 'right' }}>
                    {originalPrice && (
                        <div style={{ fontSize: '0.82em', color: C.textDim,
                            textDecoration: 'line-through' }}>{originalPrice}</div>
                    )}
                    {price && (
                        <div style={{ fontWeight: 800, color: C.text, fontSize: '1.05em' }}>{price}</div>
                    )}
                    {savingsPct && (
                        <span style={{
                            display: 'inline-block', marginTop: 4,
                            background: C.pink, color: C.ink,
                            fontSize: '0.72em', padding: '2px 8px',
                            borderRadius: 8, fontWeight: 800,
                        }}>-{savingsPct}% off</span>
                    )}
                </div>
            </div>
        </div>
    );
}
