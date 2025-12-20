import React from 'react';

interface SafeHTMLProps {
  as?: React.ElementType; 
  html: string | null | undefined;
  className?: string;
  [key: string]: any; 
}

export const SafeHTML = ({ as: Tag = 'div', html, className, ...props }: SafeHTMLProps) => {
  // Si no hay HTML, no renderizamos nada para evitar errores
  if (!html) return null;

  return (
    <Tag
      className={className}
      // Renderizado directo sin librerías externas
      dangerouslySetInnerHTML={{ __html: html }}
      {...props}
    />
  );
};