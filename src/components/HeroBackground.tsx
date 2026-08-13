/**
 * The hero key visual — and the slot the 3D scene will occupy.
 *
 * Drawn from the CI's graphic language (section 04): Focus & Origin (the point
 * of light every solution starts from), Concentric Rings (focus, expansion, the
 * ripple effect of value creation) and Depth & Dimension (layered light and
 * gradients). It reproduces the aperture ring and origin point from the CI's own
 * website render on p.23 in CSS, so the composition is right before any geometry
 * exists.
 *
 * Two CI rules shape what is here and what is not: interest comes from one
 * source at a time, never several; and there is no grain, noise or film texture
 * in the system.
 *
 * When the 3D scene lands, replace the ring and origin layers with the canvas —
 * the wrapper framing, the scrim and the ratio of the composition stay correct.
 */
export default function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* the ring sits right of centre so the left columns stay clear for type */}
      <div className="absolute left-[58%] top-1/2 -translate-y-1/2 aspect-square w-[min(64vw,660px)] -translate-x-1/2">
        {/* concentric rings — expansion outward from the point */}
        <div className="absolute inset-[-26%] rounded-full border border-white/[0.04]" />
        <div className="absolute inset-[-13%] rounded-full border border-white/[0.06]" />

        {/* the aperture ring, rim-lit from the upper left */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: '1px solid rgba(43,87,154,0.7)',
            boxShadow:
              '0 0 120px 10px rgba(43,87,154,0.3), inset 0 0 140px 12px rgba(29,53,87,0.45)',
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 185deg, rgba(150,190,255,0.95) 0deg, rgba(122,165,240,0.28) 85deg, rgba(122,165,240,0.12) 180deg, rgba(122,165,240,0.35) 275deg, rgba(150,190,255,0.8) 360deg)',
            mask: 'radial-gradient(closest-side, transparent 97%, #000 97.6%)',
            WebkitMask: 'radial-gradient(closest-side, transparent 97%, #000 97.6%)',
          }}
        />

        {/* the origin (0,0) — where value begins */}
        <div className="absolute bottom-0 left-1/2 h-px w-px -translate-x-1/2">
          <div
            className="absolute -left-[140px] -top-[140px] h-[280px] w-[280px] rounded-full"
            style={{
              background:
                'radial-gradient(closest-side, rgba(160,196,255,0.55) 0%, rgba(43,87,154,0.18) 38%, rgba(43,87,154,0) 72%)',
            }}
          />
          <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-[#DCE8FF]" />
        </div>
      </div>

      {/* horizon light — the ground the sphere rests on */}
      <div
        className="absolute inset-x-0 bottom-0 h-[38%]"
        style={{
          background:
            'radial-gradient(70% 100% at 58% 100%, rgba(43,87,154,0.22) 0%, rgba(43,87,154,0) 70%)',
        }}
      />

      {/* protection, per CI 3.9: a gradient scrim so white type stays legible —
          never a translucent capsule behind the text */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(96deg, var(--zp-void) 14%, rgba(6,11,20,0.88) 38%, rgba(6,11,20,0.38) 62%, rgba(6,11,20,0) 84%)',
        }}
      />
    </div>
  );
}
