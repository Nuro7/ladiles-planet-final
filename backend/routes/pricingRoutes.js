/**
 * pricingRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/pricing → live subscription plans from the AI engine.
 *
 * Returns the same plan + credit structure shown in cloud.higgsfield.ai
 * so our pricing page stays in sync with whatever the engine charges.
 *
 * Public route — no auth needed (pricing is public info).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const axios   = require('axios');
const oauth   = require('../services/higgsfieldOAuthService');

const router = express.Router();

// Simple in-memory cache (pricing rarely changes) — refresh every 10 minutes
let _cache = null;
let _cacheAt = 0;
const CACHE_MS = 10 * 60 * 1000;

// ── HARDCODED FALLBACK PLANS ──────────────────────────────────
// When the engine returns no plans (because the OAuth session is in a
// degraded state and `show_plans_and_credits` returns []), we serve these
// instead. Numbers verified against higgsfield.ai/pricing on 2026-05-18.
const FALLBACK_PLANS = [
    {
        id              : 'plus',
        name            : 'PLUS',
        tagline         : 'For consistent and easy AI content creation',
        credits         : 1000,
        monthlyPriceUSD : 49,
        annualPriceUSD  : 39,
        monthlyOriginalUSD: 49,
        annualOriginalUSD : 49,
        mostPopular     : false,
        annualDiscount  : 20,
        annualSavingsUSD: 120,
        monthlyUrl      : 'https://higgsfield.ai/pricing',
        annualUrl       : 'https://higgsfield.ai/pricing',
        features: {
            monthly: [
                { id: 'a', text: 'Access to all video and image models', status: 'included' },
                { id: 'b', text: 'Parallel generations: up to 6 videos, 8 images', status: 'included' },
                { id: 'c', text: 'Access to all features', status: 'included' },
                { id: 'd', text: 'Early access to advanced AI features', status: 'included' },
                { id: 'e', text: '~200 Kling 3.0 videos / month', status: 'included' },
            ],
            annual: [
                { id: 'a', text: 'Access to all video and image models', status: 'included' },
                { id: 'b', text: 'Parallel generations: up to 6 videos, 8 images', status: 'included' },
                { id: 'c', text: 'Access to all features', status: 'included' },
                { id: 'd', text: 'Early access to advanced AI features', status: 'included' },
                { id: 'e', text: '~200 Kling 3.0 videos / month', status: 'included' },
            ],
        },
        unlimited      : { monthly: null, annual: null },
        credits_detail : { monthly: { amount: 1000, label: 'credits/mo.' }, annual: { amount: 1000, label: 'credits/mo.' } },
        specialDeal    : null,
    },
    {
        id              : 'ultra',
        name            : 'ULTRA',
        tagline         : 'For creators building AI projects',
        credits         : 3000,
        monthlyPriceUSD : 129,
        annualPriceUSD  : 99,
        monthlyOriginalUSD: 129,
        annualOriginalUSD : 129,
        mostPopular     : true,
        annualDiscount  : 23,
        annualSavingsUSD: 360,
        monthlyUrl      : 'https://higgsfield.ai/pricing',
        annualUrl       : 'https://higgsfield.ai/pricing',
        features: {
            monthly: [
                { id: 'a', text: 'Access to all video and image models', status: 'included' },
                { id: 'b', text: 'Parallel generations: up to 8 videos, 8 images', status: 'included' },
                { id: 'c', text: 'Access to all features', status: 'included' },
                { id: 'd', text: 'Early access to advanced AI features', status: 'included' },
                { id: 'e', text: '~500 Kling 3.0 videos / month', status: 'included' },
                { id: 'f', text: '70% cheaper per credit', status: 'included' },
            ],
            annual: [
                { id: 'a', text: 'Access to all video and image models', status: 'included' },
                { id: 'b', text: 'Parallel generations: up to 8 videos, 8 images', status: 'included' },
                { id: 'c', text: 'Access to all features', status: 'included' },
                { id: 'd', text: 'Early access to advanced AI features', status: 'included' },
                { id: 'e', text: '~500 Kling 3.0 videos / month', status: 'included' },
                { id: 'f', text: '70% cheaper per credit', status: 'included' },
                { id: 'g', text: 'One 365-day Unlimited video model included', status: 'included' },
            ],
        },
        unlimited      : { monthly: null, annual: null },
        credits_detail : { monthly: { amount: 3000, label: 'credits/mo.' }, annual: { amount: 3000, label: 'credits/mo.' } },
        specialDeal    : 'BEST VALUE',
    },
];

// ── GET /api/pricing ─────────────────────────────────────────
router.get('/', async (req, res) => {
    // Only serve cache if it actually has plans — never cache an empty result.
    if (_cache && _cache.plans?.length && Date.now() - _cacheAt < CACHE_MS) {
        return res.json({ success: true, data: _cache, cached: true });
    }

    try {
        const token = await oauth.getAccessToken();

        const payload = {
            jsonrpc : '2.0',
            id      : Date.now(),
            method  : 'tools/call',
            params  : { name: 'show_plans_and_credits', arguments: {} }
        };

        const response = await axios.post('https://mcp.higgsfield.ai/mcp', payload, {
            headers: {
                'Authorization' : `Bearer ${token}`,
                'Content-Type'  : 'application/json',
                'Accept'        : 'application/json, text/event-stream'
            },
            timeout      : 30000,
            responseType : 'text',
            validateStatus: null
        });

        // Parse SSE response
        const raw = String(response.data || '');
        const dataLines = raw.split('\n').map(l => l.trim()).filter(l => l.startsWith('data:'));
        if (!dataLines.length) throw new Error('No SSE data lines');
        const jsonStr = dataLines[dataLines.length - 1].replace(/^data:\s*/, '');
        const parsed = JSON.parse(jsonStr);
        const result = parsed.result?.structuredContent || parsed.result;

        // Normalize for frontend
        const plans = (result?.plans || []).map(p => ({
            id              : p.id,
            name            : p.name,
            tagline         : p.tagline,
            credits         : p.credits,
            monthlyPriceUSD : (p.monthly_final_price_cents || 0) / 100,
            annualPriceUSD  : (p.annual_final_price_cents  || 0) / 100,
            monthlyOriginalUSD: (p.monthly_original_price_cents || 0) / 100,
            annualOriginalUSD : (p.annual_original_price_cents  || 0) / 100,
            mostPopular     : !!p.most_popular,
            annualDiscount  : (() => {
                const orig = p.annual_original_price_cents || p.monthly_final_price_cents;
                const fin  = p.annual_final_price_cents;
                if (orig && fin && orig > fin) return Math.round((1 - fin / orig) * 100);
                return p.annual_discount?.display_percent_off || null;
            })(),
            annualSavingsUSD: (p.annual_savings_vs_monthly_cents || 0) / 100,
            monthlyUrl      : p.monthly_url,
            annualUrl       : p.annual_url,
            // Detailed features
            features: {
                monthly: p.pricing?.monthly?.mainFeatures || [],
                annual : p.pricing?.annual?.mainFeatures  || [],
            },
            unlimited: {
                monthly: p.pricing?.monthly?.unlimitedAccess || null,
                annual : p.pricing?.annual?.unlimitedAccess  || null,
            },
            credits_detail: {
                monthly: p.pricing?.monthly?.credits || null,
                annual : p.pricing?.annual?.credits  || null,
            },
            specialDeal: p.pricing?.annual?.specialDeal || p.pricing?.monthly?.specialDeal || null,
        }));

        // If the engine returned no plans (degraded OAuth session), serve
        // the hardcoded fallback so the pricing page never looks broken.
        if (!plans.length) {
            console.warn('[Pricing] Engine returned 0 plans → serving fallback plans');
            return res.json({
                success: true,
                data: { plans: FALLBACK_PLANS, fetchedAt: new Date().toISOString(), source: 'fallback' }
            });
        }

        _cache = { plans, fetchedAt: new Date().toISOString(), source: 'engine' };
        _cacheAt = Date.now();
        res.json({ success: true, data: _cache });
    } catch (err) {
        console.error('[Pricing] Failed to fetch:', err.message);
        // Even on fetch error, serve the fallback so the page works.
        res.json({
            success: true,
            data: { plans: FALLBACK_PLANS, fetchedAt: new Date().toISOString(), source: 'fallback', _error: err.message }
        });
    }
});

// ── GET /api/pricing/upgrade-preview ─────────────────────────
// Returns current plan + target plan details so the frontend can show
// the upgrade confirmation modal without leaving Ladies Planet.
router.get('/upgrade-preview', async (req, res) => {
    const { planId, billing } = req.query; // e.g. planId=ultra&billing=annual
    if (!planId || !billing) {
        return res.status(400).json({ success: false, error: 'planId and billing are required' });
    }

    try {
        const token = await oauth.getAccessToken();

        const mcpCall = async (toolName, args = {}) => {
            const response = await axios.post('https://mcp.higgsfield.ai/mcp', {
                jsonrpc: '2.0', id: Date.now(),
                method: 'tools/call',
                params: { name: toolName, arguments: args },
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/event-stream',
                },
                timeout: 20000, responseType: 'text', validateStatus: null,
            });
            const raw = String(response.data || '');
            const dataLines = raw.split('\n').map(l => l.trim()).filter(l => l.startsWith('data:'));
            if (!dataLines.length) throw new Error('No SSE data from ' + toolName);
            const jsonStr = dataLines[dataLines.length - 1].replace(/^data:\s*/, '');
            const parsed = JSON.parse(jsonStr);
            return parsed.result?.structuredContent || parsed.result;
        };

        // Fetch current plan (balance) and all plans in parallel
        const [balanceResult, plansResult] = await Promise.all([
            mcpCall('balance'),
            mcpCall('show_plans_and_credits'),
        ]);

        // Current plan from balance
        const currentPlanName = balanceResult?.subscription_plan_type || 'Basic';
        const currentPriceUSD = balanceResult?.subscription_monthly_price_usd || null;

        // Find target plan from plans list
        const allPlans = plansResult?.plans || [];
        const targetPlanRaw = allPlans.find(
            p => (p.id || '').toLowerCase() === planId.toLowerCase()
                || (p.name || '').toLowerCase() === planId.toLowerCase()
        );

        // Fallback to hardcoded plan if not found in MCP response
        const fallbackTarget = FALLBACK_PLANS.find(
            p => p.id.toLowerCase() === planId.toLowerCase()
        );

        let newPlan;
        if (targetPlanRaw) {
            const isAnnual = billing === 'annual';
            newPlan = {
                name: targetPlanRaw.name,
                billing: billing === 'annual' ? 'Annual' : 'Monthly',
                originalPriceUSD: isAnnual
                    ? (targetPlanRaw.annual_original_price_cents || 0) / 100
                    : (targetPlanRaw.monthly_original_price_cents || 0) / 100,
                finalPriceUSD: isAnnual
                    ? (targetPlanRaw.annual_final_price_cents || 0) / 100
                    : (targetPlanRaw.monthly_final_price_cents || 0) / 100,
                credits: targetPlanRaw.credits || 0,
                savingsPct: (() => {
                    if (!isAnnual) return null;
                    const orig = targetPlanRaw.annual_original_price_cents || targetPlanRaw.monthly_final_price_cents;
                    const fin  = targetPlanRaw.annual_final_price_cents;
                    if (orig && fin && orig > fin) return Math.round((1 - fin / orig) * 100);
                    return targetPlanRaw.annual_discount?.display_percent_off || null;
                })(),
                checkoutUrl: isAnnual ? targetPlanRaw.annual_url : targetPlanRaw.monthly_url,
            };
        } else if (fallbackTarget) {
            newPlan = {
                name: fallbackTarget.name,
                billing: billing === 'annual' ? 'Annual' : 'Monthly',
                originalPriceUSD: billing === 'annual' ? fallbackTarget.annualOriginalUSD : fallbackTarget.monthlyOriginalUSD,
                finalPriceUSD: billing === 'annual' ? fallbackTarget.annualPriceUSD : fallbackTarget.monthlyPriceUSD,
                credits: fallbackTarget.credits,
                savingsPct: billing === 'annual' ? fallbackTarget.annualDiscount : null,
                checkoutUrl: billing === 'annual' ? fallbackTarget.annualUrl : fallbackTarget.monthlyUrl,
            };
        } else {
            return res.status(404).json({ success: false, error: 'Plan not found: ' + planId });
        }

        res.json({
            success: true,
            data: {
                currentPlan: {
                    name: currentPlanName,
                    billing: 'Monthly',
                    priceUSD: currentPriceUSD,
                },
                newPlan,
                prorations: { unusedCredits: 0 },
            },
        });
    } catch (err) {
        console.error('[Pricing] upgrade-preview error:', err.message);
        // Graceful fallback using hardcoded data
        const fallbackTarget = FALLBACK_PLANS.find(
            p => p.id.toLowerCase() === (planId || '').toLowerCase()
        );
        if (fallbackTarget) {
            return res.json({
                success: true,
                data: {
                    currentPlan: { name: 'Basic', billing: 'Monthly', priceUSD: null },
                    newPlan: {
                        name: fallbackTarget.name,
                        billing: billing === 'annual' ? 'Annual' : 'Monthly',
                        originalPriceUSD: billing === 'annual' ? fallbackTarget.annualOriginalUSD : fallbackTarget.monthlyOriginalUSD,
                        finalPriceUSD: billing === 'annual' ? fallbackTarget.annualPriceUSD : fallbackTarget.monthlyPriceUSD,
                        credits: fallbackTarget.credits,
                        savingsPct: billing === 'annual' ? fallbackTarget.annualDiscount : null,
                        checkoutUrl: billing === 'annual' ? fallbackTarget.annualUrl : fallbackTarget.monthlyUrl,
                    },
                    prorations: { unusedCredits: 0 },
                    _fallback: true,
                },
            });
        }
        res.status(500).json({ success: false, error: err.message });
    }
});

// Proxy approach was removed: Higgsfield uses Clerk auth with production keys
// domain-locked to higgsfield.ai — server-side Origin header checks cannot be
// bypassed from any other domain regardless of proxy technique.

module.exports = router;
