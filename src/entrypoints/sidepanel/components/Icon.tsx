import type { ReactNode } from 'react';

export type IconName =
  | 'spark'
  | 'write'
  | 'settings'
  | 'connection'
  | 'appearance'
  | 'copy'
  | 'replace'
  | 'stop'
  | 'retry'
  | 'refresh'
  | 'arrow'
  | 'check'
  | 'alert';

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const shapes: Record<IconName, ReactNode> = {
  spark: (
    <>
      <path d="M10 3.5l1.7 4.8 4.8 1.7-4.8 1.7L10 16.5 8.3 11.7 3.5 10l4.8-1.7L10 3.5z" />
      <path d="M17 15.5l.85 2.4 2.4.85-2.4.85-.85 2.4-.85-2.4-2.4-.85 2.4-.85.85-2.4z" />
    </>
  ),
  write: (
    <>
      <path d="M17.2 3.2a2.1 2.1 0 0 1 3 3L8 18.4 3.5 20l1.6-4.5L17.2 3.2z" />
      <path d="M15.6 4.8l3.6 3.6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M20.6 8.87L22.65 9.93L22.65 14.07L20.6 15.13L20.29 15.87L21 18.07L18.07 21L15.87 20.29L15.13 20.6L14.07 22.65L9.93 22.65L8.87 20.6L8.13 20.29L5.93 21L3 18.07L3.71 15.87L3.4 15.13L1.35 14.07L1.35 9.93L3.4 8.87L3.71 8.13L3 5.93L5.93 3L8.13 3.71L8.87 3.4L9.93 1.35L14.07 1.35L15.13 3.4L15.87 3.71L18.07 3L21 5.93L20.29 8.13z" />
    </>
  ),
  connection: (
    <>
      <path d="M9.5 17.5H7.8A5.3 5.3 0 0 1 7.8 6.9h1.7" />
      <path d="M14.5 6.5h1.7a5.3 5.3 0 0 1 0 10.6h-1.7" />
      <path d="M8.4 12h7.2" />
    </>
  ),
  appearance: <path d="M12 3.4a6.4 6.4 0 0 0 8.9 8.9 8.9 8.9 0 1 1-8.9-8.9z" />,
  copy: (
    <>
      <rect x="9" y="9" width="11.4" height="11.4" rx="2.2" />
      <path d="M15.4 5.6A2.2 2.2 0 0 0 13.2 4H5.8A1.8 1.8 0 0 0 4 5.8v7.4a2.2 2.2 0 0 0 1.6 2.2" />
    </>
  ),
  replace: (
    <>
      <path d="M3.5 7.5h11a4 4 0 0 1 4 4v5" />
      <path d="M3.5 7.5l3.2-3.2" />
      <path d="M3.5 7.5l3.2 3.2" />
      <path d="M20.5 16.5h-11a4 4 0 0 1-4-4v-5" />
      <path d="M20.5 16.5l-3.2-3.2" />
      <path d="M20.5 16.5l-3.2 3.2" />
    </>
  ),
  stop: <rect x="6.4" y="6.4" width="11.2" height="11.2" rx="1.8" fill="currentColor" stroke="none" />,
  retry: (
    <>
      <path d="M8.99 3.73A8.8 8.8 0 1 1 4.02 8.28" />
      <path d="M3.2 3.4v5.2h5.2" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.98 8.28A8.8 8.8 0 1 1 15.01 3.73" />
      <path d="M20.6 3.4v5.2h-5.2" />
    </>
  ),
  arrow: (
    <>
      <path d="M4.5 12h15" />
      <path d="M13.2 5.7l6.3 6.3-6.3 6.3" />
    </>
  ),
  check: <path d="M20 6.5L9.4 17.1 4 11.7" />,
  alert: (
    <>
      <path d="M10.7 4.3L2.9 17.6A2 2 0 0 0 4.6 20.6h14.8a2 2 0 0 0 1.7-3L13.3 4.3a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.4v3.8" />
      <path d="M12 16.6h.01" />
    </>
  ),
};

export function Icon({ name, size = 18, strokeWidth = 1.7, className }: IconProps) {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {shapes[name]}
    </svg>
  );
}
