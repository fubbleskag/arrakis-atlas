import type React from 'react';

const SpiceIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    id="Layer_1"
    viewBox="0 0 32 32"
    {...props}
  >
    <defs>
      <style>
        {`.spice-cls-1 {
          fill: #6a3d72;
        }

        .spice-cls-2 {
          fill: #e1b2d2;
        }`}
      </style>
    </defs>
    <rect className="spice-cls-1" x="5.36" y="5.56" width="21.07" height="21.07" transform="translate(16.04 -6.53) rotate(45)"/>
    <polygon className="spice-cls-2" points="5.17 16 5.1 16.07 16 26.97 26.9 16.07 26.83 16 5.17 16"/>
    <polygon className="spice-cls-2" points="8.52 12.3 6.83 14 24.77 14 23.08 12.3 8.52 12.3"/>
    <polygon className="spice-cls-2" points="12.33 8.5 10.83 10 20.77 10 19.27 8.5 12.33 8.5"/>
    <circle className="spice-cls-1" cx="10.9" cy="18" r="1"/>
    <circle className="spice-cls-1" cx="15.9" cy="18" r="1"/>
    <circle className="spice-cls-1" cx="20.9" cy="18" r="1"/>
    <circle className="spice-cls-1" cx="18.9" cy="21" r="1"/>
    <circle className="spice-cls-1" cx="15.9" cy="24" r="1"/>
    <circle className="spice-cls-1" cx="12.9" cy="21" r="1"/>
  </svg>
);

export default SpiceIcon;