import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: '#020617',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 7,
          border: '1px solid #10b981',
          position: 'relative',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" stroke="#10b981" />
          <path d="M3 9h18" stroke="#38bdf8" />
          <path d="M3 15h18" stroke="#10b981" strokeOpacity="0.5" />
          <path d="M9 3v18" stroke="#38bdf8" />
          <path d="M15 3v18" stroke="#10b981" strokeOpacity="0.5" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
