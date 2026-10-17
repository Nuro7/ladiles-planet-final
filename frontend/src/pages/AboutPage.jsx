import { motion } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';
import Footer from '../components/Footer';

const VALUES = [
  { title: 'Innovation',  desc: 'We push the boundaries of AI and fashion technology to give every bride a magical, effortless experience.' },
  { title: 'Inclusivity', desc: 'Every body, every culture, every style — our collection celebrates the beautiful diversity of brides worldwide.' },
  { title: 'Excellence',  desc: 'We obsess over every detail — from rendering accuracy to the silkiness of our interface — because you deserve perfection.' },
];

export function AboutPage() {
  return (
    <main style={{ minHeight: '100vh', paddingTop: 72 }}>
      <section style={{ padding: '80px 24px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        >
          <p style={{
            fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: '#B76E79', marginBottom: 16, fontWeight: 500,
          }}>
            ✦ Our Story
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(40px, 6vw, 80px)',
            fontWeight: 300, color: '#FAF6F1',
            marginBottom: 32, lineHeight: 1.1,
          }}>
            Redefining the<br />
            <span className="text-rose-gradient">Bridal Experience</span>
          </h1>
          <p style={{
            fontSize: 17, fontWeight: 300,
            color: 'rgba(250,246,241,0.6)',
            lineHeight: 1.8, marginBottom: 60,
            maxWidth: 680, margin: '0 auto 60px',
          }}>
            Ladies Planet was born from a simple belief: every bride deserves to see herself
            in her perfect dress before the big day. Our AI-powered Bridal Wall brings that
            vision to life — no appointments, no alteration guesswork, just pure magic.
          </p>
        </motion.div>

        {/* Values */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20, textAlign: 'left',
        }}>
          {VALUES.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
            >
              <GlassCard padding="28px 24px">
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22, fontWeight: 400,
                  color: '#D4A0A7', marginBottom: 12,
                }}>
                  {v.title}
                </div>
                <p style={{
                  fontSize: 14, fontWeight: 300,
                  color: 'rgba(250,246,241,0.55)',
                  lineHeight: 1.7,
                }}>
                  {v.desc}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default AboutPage;
