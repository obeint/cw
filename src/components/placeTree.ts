import type { Entity } from '../domain/types';

export interface PlaceNode {
  entity: Entity;
  children: PlaceNode[];
}
