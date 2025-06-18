import type React from 'react';

const ShipwreckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8A13 13 0 0 1 15 20M22 20V5.7C22 3 20.5 2 18 2c-2.1 0-3.5 1-4.5 2.5S11.5 6 9.5 6 6 5 5 3.5" />
    <line x1="12" y1="12" x2="12" y2="20" />
    <line x1="18" y1="12" x2="18" y2="20" />
    <line x1="6" y1="12" x2="6" y2="20" />
  </svg>
);

export default ShipwreckIcon;
