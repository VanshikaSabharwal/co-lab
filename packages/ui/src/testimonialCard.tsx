import React, { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string; // Optional for additional styles
}

export const Card = ({ children, className }: CardProps) => {
  return <div className={`card ${className}`}>{children}</div>;
};

interface CardSectionProps {
  children: ReactNode;
  className?: string;
}

export const CardHeader = ({ children, className }: CardSectionProps) => {
  return <div className={`card-header ${className}`}>{children}</div>;
};

export const CardTitle = ({ children, className }: CardSectionProps) => {
  return <h3 className={`card-title ${className}`}>{children}</h3>;
};

export const CardContent = ({ children, className }: CardSectionProps) => {
  return <div className={`card-content ${className}`}>{children}</div>;
};
