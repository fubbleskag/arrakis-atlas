import type React from 'react';

const PoiIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 32 32"
    id="Layer_1"
    {...props}
  >
    <defs>
      <style>
        {`.cls-1 { fill: #f15a29; }`}
      </style>
    </defs>
    <path className="cls-1" d="M15.87.6c-5.96,0-10.85,4.87-10.85,10.81,0,2.3.74,4.44,1.98,6.2l7.54,13.03c1.06,1.38,1.76,1.12,2.64-.07l8.31-14.15c.17-.3.3-.63.41-.96.53-1.29.8-2.66.8-4.05C26.71,5.47,21.82.6,15.87.6ZM15.87,5.66c3.21,0,5.76,2.55,5.76,5.75s-2.55,5.74-5.76,5.74-5.76-2.54-5.76-5.74,2.55-5.75,5.76-5.75h0Z"/>
  </svg>
);

export default PoiIcon;
