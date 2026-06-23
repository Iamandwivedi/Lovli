import React from 'react';
import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors } from '@/theme';

// Single icon system for the whole app. Feather has a consistent ~1.5px stroke
// that matches the v2 "thin-line" direction. Use this wrapper instead of
// importing Feather directly so default size/color stay uniform.

type FeatherName = ComponentProps<typeof Feather>['name'];

export interface IconProps {
  name: FeatherName;
  size?: number;
  color?: string;
  style?: ComponentProps<typeof Feather>['style'];
}

export function Icon({ name, size = 20, color = colors.textMuted, style }: IconProps) {
  return <Feather name={name} size={size} color={color} style={style} />;
}

export type { FeatherName as IconName };
