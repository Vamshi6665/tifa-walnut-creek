import Image from 'next/image';

/**
 * A transparent cutout (cup, drink, truffle) sized by height so a row of them
 * lines up on the same "shelf". `h` is any CSS length (clamp() works).
 */
export default function Cutout({ img, h, className = '', priority = false, sizes = '(min-width: 768px) 30vw, 50vw', shadow = true, alt }) {
  return (
    <Image
      src={img.src}
      width={img.w}
      height={img.h}
      alt={alt ?? img.alt}
      priority={priority}
      sizes={sizes}
      draggable={false}
      className={`pointer-events-none block max-w-none select-none ${shadow ? 'cup-shadow' : ''} ${className}`}
      style={{ height: h, width: 'auto' }}
    />
  );
}
