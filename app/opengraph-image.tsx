import { ImageResponse } from 'next/og';

export const alt = 'Umzugsnetz - Umzug und Entrümpelung vergleichen';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          position: 'relative',
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 45%, #ecfdf5 100%)',
          color: '#0f172a',
          fontFamily: 'sans-serif',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at top left, rgba(0,94,166,0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(0,182,122,0.18), transparent 28%)',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            padding: '58px 64px',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
            }}
          >
            <div
              style={{
                height: 72,
                width: 72,
                borderRadius: 22,
                background: 'linear-gradient(135deg, #005ea6 0%, #00b67a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 34,
                fontWeight: 800,
                letterSpacing: '-0.06em',
                boxShadow: '0 18px 45px rgba(0,94,166,0.18)',
              }}
            >
              U
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.05em' }}>Umzugsnetz</div>
              <div style={{ fontSize: 18, color: '#475569', fontWeight: 600 }}>
                Deutschlandweit. Modern. Verlässlich.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 860, gap: 18 }}>
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.92)',
                border: '1px solid rgba(15,23,42,0.08)',
                padding: '10px 18px',
                fontSize: 18,
                fontWeight: 700,
                color: '#005ea6',
              }}
            >
              Kostenlose Anfrage für Umzug und Entrümpelung
            </div>
            <div
              style={{
                fontSize: 62,
                lineHeight: 1.05,
                fontWeight: 800,
                letterSpacing: '-0.05em',
              }}
            >
              Geprüfte Angebote aus Ihrer Region vergleichen.
            </div>
            <div
              style={{
                fontSize: 28,
                lineHeight: 1.35,
                color: '#334155',
                fontWeight: 500,
                maxWidth: 900,
              }}
            >
              Für Privatumzug, Firmenumzug und Entrümpelung. Schnell, unverbindlich und auf den deutschen Markt ausgerichtet.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 18,
              alignItems: 'center',
            }}
          >
            {[
              'Geprüfte Unternehmen',
              'Kostenlose Anfrage',
              'Deutschlandweite Vermittlung',
            ].map((item) => (
              <div
                key={item}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 18,
                  background: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(15,23,42,0.08)',
                  padding: '14px 18px',
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
