import { StaticImageData } from "next/image";
import React from "react";

import Image from "@/lib/ui/useable-components/safe-image";

interface StratingImageProps {
  image: string | StaticImageData;
  alt?: string;
}

const StartingImage: React.FC<StratingImageProps> = ({
  image,
  alt = "Padharo delivery partner",
}) => {
  return (
    <div className="mx-auto mt-10 w-full max-w-5xl px-4 sm:mt-12">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 shadow-[0_28px_70px_rgba(140,29,64,0.14)] dark:border-gray-700">
        <div className="relative h-[240px] w-full sm:h-[340px] lg:h-[420px]">
          <Image
            src={image}
            alt={alt}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 1024px"
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/25 to-transparent"
        />
      </div>
    </div>
  );
};

export default StartingImage;
