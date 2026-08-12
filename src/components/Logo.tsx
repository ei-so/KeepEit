import React from 'react';

export interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  let containerSize = 'w-8 h-8 p-1.5';
  let iconSize = 'w-5 h-5';

  if (size === 'xs') {
    containerSize = 'w-5 h-5 p-0.5';
    iconSize = 'w-3.5 h-3.5';
  } else if (size === 'sm') {
    containerSize = 'w-7 h-7 p-1';
    iconSize = 'w-5 h-5';
  } else if (size === 'md') {
    containerSize = 'w-9 h-9 p-1.5';
    iconSize = 'w-6 h-6';
  } else if (size === 'lg') {
    containerSize = 'w-12 h-12 p-2';
    iconSize = 'w-8 h-8';
  }

  return (
    <div
      className={`inline-flex items-center justify-center bg-[#121215] border border-zinc-800 rounded-keepeit shrink-0 shadow-xs ${containerSize} ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        fill="none"
        className={iconSize}
      >
        <path
          d="M328.661 0.0553261L444.425 0.0684962C466.915 0.153993 489.408 0.131 511.901 0C491.941 23.5225 471.833 46.9325 451.578 70.2299L307.953 237.67L421.355 390.196L512 511.932L319.675 511.899L270.623 511.958C266.972 511.961 250.836 512.162 248.105 511.657C239.246 475.595 229.37 439.698 220.308 403.676C218.668 397.148 216.86 390.631 215.467 384.053C224.135 378.501 229.831 374.08 235.943 365.868C246.081 352.028 249.941 334.948 246.666 318.416C243.554 302.088 233.673 287.596 219.202 278.137C204.711 268.607 186.767 264.958 169.393 268.002C151.986 271.12 136.597 280.603 126.597 294.379C116.561 308.236 112.762 325.27 116.029 341.759C119.889 361.002 130.711 373.515 147.411 384.359C140.419 414.992 131.041 446.344 123.716 477.029C120.975 488.508 117.402 500.413 115.02 511.925L0 511.915L0.0559321 0.178417L167.58 0.122141L167.608 197.348C220.753 131.479 276.098 66.2089 328.661 0.0553261Z"
          fill="#FAFAFA"
        />
      </svg>
    </div>
  );
};

