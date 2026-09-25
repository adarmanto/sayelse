interface IconProps {
  name: 'spark' | 'write' | 'history' | 'settings' | 'copy' | 'replace' | 'stop' | 'retry' | 'refresh' | 'trash' | 'arrow' | 'check' | 'alert';
  size?: number;
}

const paths: Record<IconProps['name'], string> = {
  spark: 'M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2z',
  write: 'M4 20l4.2-1 10.9-10.9a2.2 2.2 0 0 0-3.2-3.2L5 15.8 4 20zm9.8-13.2l3.4 3.4M4 20h5',
  history: 'M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6M12 7v5l3 2',
  settings: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zm8-3.2a8 8 0 0 0-.1-1.1l2-1.6-2-3.4-2.4 1a8 8 0 0 0-1.9-1.1L15.3 3h-4l-.4 2.8a8 8 0 0 0-1.9 1.1l-2.4-1-2 3.4 2 1.6a8 8 0 0 0 0 2.2l-2 1.6 2 3.4 2.4-1a8 8 0 0 0 1.9 1.1l.4 2.8h4l.4-2.8a8 8 0 0 0 1.9-1.1l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  copy: 'M8 8V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3M6 8h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z',
  replace: 'M4 7h10a4 4 0 0 1 4 4v6M4 7l3-3M4 7l3 3M20 17H10a4 4 0 0 1-4-4V7M20 17l-3-3M20 17l-3 3',
  stop: 'M7 7h10v10H7z',
  retry: 'M20 11a8 8 0 0 0-14.5-4.6L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.6L20 16m0 4v-4h-4',
  refresh: 'M20 11a8 8 0 0 0-14.9-4M4 5v4h4M4 13a8 8 0 0 0 14.9 4M20 19v-4h-4',
  trash: 'M5 7h14M10 11v5M14 11v5M7 7l1 13h8l1-13M9 7V4h6v3',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  check: 'M5 12l4 4L19 6',
  alert: 'M12 4l9 16H3L12 4zm0 5v5m0 3h.01',
};

export function Icon({ name, size = 18 }: IconProps) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
