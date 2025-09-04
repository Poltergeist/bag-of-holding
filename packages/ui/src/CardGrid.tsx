import React from 'react';
import type { Card } from '@bag-of-holding/core';

export interface CardGridProps {
  cards: Card[];
  className?: string;
  onCardClick?: (card: Card) => void;
}

export interface CardProps {
  card: Card;
  onClick?: () => void;
}

export function CardGrid({ cards, className = '', onCardClick }: CardGridProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ${className}`}>
      {cards.map(card => (
        <CardItem
          key={card.scryfall_id}
          card={card}
          onClick={onCardClick ? () => onCardClick(card) : undefined}
        />
      ))}
    </div>
  );
}

export function CardItem({ card, onClick }: CardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md overflow-hidden ${
        onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''
      }`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
    >
      <div className="aspect-w-63 aspect-h-88 bg-gray-200">
        {/* Placeholder for card image - would be actual Scryfall image in real app */}
        <div className="flex items-center justify-center text-gray-400 text-sm p-4 text-center">
          {card.name}
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 truncate">
          {card.name}
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {card.set.toUpperCase()} #{card.collector_number}
        </p>
        <p className="text-xs text-gray-500">
          {card.mana_cost || 'No mana cost'}
        </p>
      </div>
    </div>
  );
}