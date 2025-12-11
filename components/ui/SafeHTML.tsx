'use client';
import DOMPurify from 'isomorphic-dompurify';
// 1. Agregamos 'ElementType' a la importación
import { useEffect, useState, type ElementType } from 'react';

interface SafeHTMLProps {
  html: string;
  className?: string;
  // 2. Cambiamos 'keyof JSX.IntrinsicElements' por 'ElementType'
  as?: ElementType; 
}

export const SafeHTML = ({ html, className, as: Tag = 'div' }: SafeHTMLProps) => {
  const [sanitizedHtml, setSanitizedHtml] = useState('');

  useEffect(() => {
    // Limpiamos el HTML solo en el cliente para evitar errores de hidratación
    const clean = DOMPurify.sanitize(html || '', {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'span', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'], // Agregué headers por si acaso
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
    });
    setSanitizedHtml(clean);
  }, [html]);

  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};