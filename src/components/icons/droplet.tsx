import { FILL_OPACITY } from "./const";

export const DropletIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
    >
      <title>drop.fill</title>
      <path
        transform="matrix(0.842798353909465, 0, 0, 0.842798353909465, 3.3876543209876546, 19.1358024691358)"
        d="M10.22 3.40C15.09 3.40 18.34 0.22 18.34-4.54C18.34-6.88 17.43-9.21 16.73-10.77C15.48-13.59 13.32-16.70 11.51-19.51C11.16-20.04 10.70-20.33 10.22-20.33C9.75-20.33 9.28-20.04 8.93-19.51C7.11-16.70 4.96-13.59 3.70-10.77C3.02-9.21 2.10-6.88 2.10-4.54C2.10 0.22 5.34 3.40 10.22 3.40Z"
        fill="white"
        fillOpacity={FILL_OPACITY}
      />
    </svg>
  );
};
