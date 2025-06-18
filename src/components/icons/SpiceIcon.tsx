import type React from 'react';

const SpiceIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M8 20s.88-2.03 2-3.5c1.22-1.63 2-3.5 2-3.5s.88 2.03 2 3.5c1.22 1.63 2 3.5 2 3.5" />
    <path d="M8 13s.88-2.03 2-3.5c1.22-1.63 2-3.5 2-3.5s.88 2.03 2 3.5c1.22 1.63 2 3.5 2 3.5" />
     <path d="M8 6s.88-2.03 2-3.5C11.22.87 12 1 12 1s.88 2.03 2 3.5c1.22 1.63 2 3.5 2 3.5" />
  </svg>
);

export default SpiceIcon;
