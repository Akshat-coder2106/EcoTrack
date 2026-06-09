import { Car, Utensils, Zap, Package } from 'lucide-react';
import React from 'react';

export const CategoryIcon = ({ category, size = 14 }: { category: string; size?: number }) => {
  switch (category) {
    case 'transport': return <Car size={size} aria-label="Transport" />;
    case 'food': return <Utensils size={size} aria-label="Food" />;
    case 'energy': return <Zap size={size} aria-label="Energy" />;
    case 'goods': return <Package size={size} aria-label="Goods" />;
    default: return <Package size={size} aria-label="Other" />;
  }
};
